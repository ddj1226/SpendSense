from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import database, models
import datetime
import os
from ml_utils import forecast_balance
from routes.plaid_api import client as plaid_client
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
import google.generativeai as genai
from collections import defaultdict

# --- CONFIG ---
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    AI_AVAILABLE = True
else:
    AI_AVAILABLE = False

router = APIRouter(prefix="/api/goals", tags=["goals"])

class GoalRequest(BaseModel):
    user_id: int
    target_amount: float
    target_date: str 

@router.post("/forecast")
def forecast_goal(goal: GoalRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == goal.user_id).first()
    if not user or not user.plaid_access_token:
        raise HTTPException(status_code=400, detail="Connect bank first")
    
    access_token = user.plaid_access_token
    
    try:
        # 1. NET WORTH CALCULATION
        bal_res = plaid_client.accounts_balance_get(AccountsBalanceGetRequest(access_token=access_token))
        net_balance = 0.0
        for acc in bal_res['accounts']:
            bal = acc.balances.current or 0
            if acc.type == "depository" or acc.type == "investment": 
                net_balance += bal
            elif acc.type == "credit" or acc.type == "loan":
                net_balance -= bal # Debt subtracts from net worth

        # 2. GET TRANSACTIONS (180 Days for Trend)
        start_date = (datetime.datetime.now() - datetime.timedelta(days=180)).date()
        end_date = datetime.datetime.now().date()
        
        tx_res = plaid_client.transactions_get(TransactionsGetRequest(
            access_token=access_token, start_date=start_date, end_date=end_date,
            options=TransactionsGetRequestOptions(count=500)
        ))
        transactions = [t.to_dict() for t in tx_res['transactions']]

    except Exception as e:
        print(f"Plaid Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch bank data")

    # 3. FORECAST
    goal_date_obj = datetime.datetime.strptime(goal.target_date, "%Y-%m-%d").date()
    days_until = (goal_date_obj - end_date).days
    
    if days_until <= 0: return {"error": "Goal date must be in the future"}

    forecast_result = forecast_balance(net_balance, transactions, days_until)
    projected_balance = float(forecast_result["prediction"])
    history_data = forecast_result["history"]
    on_track = bool(projected_balance >= goal.target_amount)

    # 4. CALCULATE TOP SPENDING CATEGORIES (Last 60 Days)
    category_totals = defaultdict(float)
    cutoff_date = (datetime.datetime.now() - datetime.timedelta(days=60)).date()

    for t in transactions:
        if t['date'] >= cutoff_date:
            if t['amount'] > 0:
                cat_name = "Uncategorized"
                if t['personal_finance_category']:
                    cat_name = t['personal_finance_category']['primary'].replace("_", " ").title()
                elif t['category']:
                    cat_name = t['category'][0]
                
                category_totals[cat_name] += t['amount']

    top_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:3]
    top_cat_str = ", ".join([f"{c[0]} (${c[1]:.0f})" for c in top_categories])

    # 5. GENERATE AI INSIGHT
    insight = "AI unavailable"
    if AI_AVAILABLE:
        try:
            
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = f"""
            Act as a smart, empathetic financial coach.
            
            User Status:
            - Current Net Worth: ${net_balance:.2f}
            - Goal: Save ${goal.target_amount} by {goal.target_date}
            - Projected Trend: ${projected_balance:.2f} ({'ON TRACK' if on_track else 'OFF TRACK'})
            
            Their Top Spending Areas (Last 2 Months):
            {top_cat_str}
            
            Task:
            Write a 2-sentence insight.
            1. First sentence: React to their progress (Celebrate if on track, encourage if off track).
            2. Second sentence: Give specific advice referencing their actual top spending categories above.
            
            Do not use markdown. Keep it conversational.
            """
            
            response = model.generate_content(prompt)
            insight = response.text.strip()
        except Exception as e:
            print(f"Gemini Error: {e}")
            insight = "AI could not generate insight."
    else:
         diff = abs(projected_balance - goal.target_amount)
         insight = f"Projected to {'exceed' if on_track else 'miss'} goal by ${diff:.0f}."

    return {
        "current_balance": net_balance,
        "projected_balance": projected_balance,
        "is_on_track": on_track,
        "ai_insight": insight,
        "history": history_data
    }


@router.post("/analyze_spending")
def analyze_spending(request: GoalRequest, db: Session = Depends(database.get_db)):
    
    user = db.query(models.User).filter(models.User.id == request.user_id).first()
    if not user or not user.plaid_access_token:
        raise HTTPException(status_code=400, detail="Connect bank first")

    # 1. Fetch Last 60 Days (Limit to 100)
    start_date = (datetime.datetime.now() - datetime.timedelta(days=60)).date()
    end_date = datetime.datetime.now().date()
    
    try:
        
        tx_res = plaid_client.transactions_get(TransactionsGetRequest(
            access_token=user.plaid_access_token, 
            start_date=start_date, 
            end_date=end_date,
            options=TransactionsGetRequestOptions(count=100) 
        ))
        transactions = [t.to_dict() for t in tx_res['transactions']]
        
    except Exception as e:
        print(f"PLAID ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # 2. Filter Data
    tx_summary = ""
    for t in transactions:
        if t['amount'] > 0: # Expenses only
            # Format: "- Netflix ($15.99) [Subscription]"
            cat = t['category'][0] if t['category'] else 'General'
            tx_summary += f"- {t['name']} (${t['amount']}) [{cat}]\n"

    # 3. Ask Gemini
    analysis_result = "AI Analysis Unavailable"
    if AI_AVAILABLE:
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            prompt = f"""
            Analyze these anonymized bank transactions (Last 60 Days):
            {tx_summary}

            Your Goal: Find "Gray Charges" (Subscriptions) and "Savings Opportunities".
            Tone: Casual, like a savvy friend. Use emojis where appropriate.
            
            Output Format (Return ONLY this list):
            1. [Subscription 📺] Name ($Amount) - Is this actually essential?
            2. [Habit ☕] Pattern found. Suggest a cheaper swap.
            3. [Tip 💡] One specific, easy tip to save money based on this data.
            
            Keep it brief and punchy. No corporate speak.
            """
            response = model.generate_content(prompt)
            analysis_result = response.text.strip()
            
        except Exception as e:
            print(f"GEMINI ERROR: {e}")
            analysis_result = "Could not generate analysis (AI Error)."

    return {"analysis": analysis_result}