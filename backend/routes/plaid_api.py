import os
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import database, models
from dotenv import load_dotenv
from datetime import datetime, timedelta 
from plaid.model.transactions_get_request import TransactionsGetRequest 
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions 
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest 
import json
load_dotenv()


router = APIRouter(prefix="/api/plaid", tags=["plaid"])

# --- Config ---
configuration = plaid.Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
        'clientId': os.getenv('PLAID_CLIENT_ID'),
        'secret': os.getenv('PLAID_SECRET'),
    }
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

# --- Schemas ---
class LinkTokenResponse(BaseModel):
    link_token: str

class ExchangeTokenRequest(BaseModel):
    public_token: str
    user_id: int

class TransactionRequest(BaseModel):
    user_id: int

# --- Routes ---
@router.post("/create_link_token", response_model=LinkTokenResponse)
def create_link_token():
    
    client_user_id = 'hackathon_user_123' 
    request = LinkTokenCreateRequest(
        products=[Products("transactions")],
        client_name="Spend Sense",
        country_codes=[CountryCode('US')],
        language='en',
        user=LinkTokenCreateRequestUser(client_user_id=client_user_id)
    )
    response = client.link_token_create(request)
    return {"link_token": response.link_token}

@router.post("/exchange_public_token")
def exchange_public_token(request: ExchangeTokenRequest, db: Session = Depends(database.get_db)):
    # 1. Exchange the temporary public_token for a permanent access_token
    exchange_request = ItemPublicTokenExchangeRequest(public_token=request.public_token)
    exchange_response = client.item_public_token_exchange(exchange_request)
    access_token = exchange_response['access_token']
    
    # 2. Find the user and save the token
    user = db.query(models.User).filter(models.User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.plaid_access_token = access_token
    user.bank_connected = True 
    db.commit()
    
    return {"message": "Success"}



@router.post("/transactions")
def get_transactions(request: TransactionRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == request.user_id).first()
    if not user or not user.plaid_access_token:
        raise HTTPException(status_code=400, detail="User not connected to bank")
    
    access_token = user.plaid_access_token

    try:
        # 1. Fetch Balance
        balance_request = AccountsBalanceGetRequest(access_token=access_token)
        balance_response = client.accounts_balance_get(balance_request)
        accounts = balance_response['accounts']

        # Fetch Transactions
        start_date = (datetime.now() - timedelta(days=30)).date()
        end_date = datetime.now().date()
        
        transaction_request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
            options=TransactionsGetRequestOptions(
                count=100, 
            )
        )
        transaction_response = client.transactions_get(transaction_request)

        transactions = transaction_response['transactions']
                
        
        return {
            "accounts": [
                {
                    "name": str(a.name),
                    "balance": float(a.balances.current) if a.balances.current else 0.0,
                    "type": str(a.subtype) if a.subtype else str(a.type) 
                } 
                for a in accounts
            ],
            "transactions": [
                {
                    "date": str(t.date),
                    "name": str(t.name),
                    "amount": float(t.amount),
                    "category": (
                        t.personal_finance_category.primary.replace("_", " ").title() 
                        if t.personal_finance_category 
                        else (t.category[0] if t.category else "Uncategorized")
                    )
                } 
                for t in transactions
            ]
        }

    except plaid.ApiException as e:
        print(f"Plaid Error: {e}") 
        raise HTTPException(status_code=500, detail="Error fetching data from Plaid")
    except Exception as e:
        print(f"General Error: {e}") 
        raise HTTPException(status_code=500, detail=str(e))