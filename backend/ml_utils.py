from prophet import Prophet
import pandas as pd
import datetime
import logging

cmdstanpy_logger = logging.getLogger("cmdstanpy")
cmdstanpy_logger.disabled = True

def forecast_balance(current_balance, transactions, days_in_future):
    """
    Uses Facebook Prophet to forecast future balance based on reconstructed history.
    """
    if not transactions:
        return {"prediction": current_balance, "history": []}

    # 1. Prepare Transaction Data
    tx_by_date = {}
    for t in transactions:
        d_str = str(t['date'])
        if d_str not in tx_by_date: tx_by_date[d_str] = 0.0

        tx_by_date[d_str] += t['amount']

    daily_balances = []
    running_balance = current_balance
    today = datetime.date.today()
    
    # 2. Reconstruct History (180 days)
    for i in range(180):
        target_date = today - datetime.timedelta(days=i)
        date_str = str(target_date)
        
        daily_balances.append({
            "ds": date_str,      
            "y": round(running_balance, 2) 
        })

        if date_str in tx_by_date:
            running_balance += tx_by_date[date_str]

    daily_balances.reverse()

    # 3. FIT PROPHET MODEL
    try:
        df = pd.DataFrame(daily_balances)
                
        m = Prophet(daily_seasonality=True, yearly_seasonality=False) 
        m.fit(df)


        future = m.make_future_dataframe(periods=days_in_future)
        forecast = m.predict(future)

        final_prediction = forecast.iloc[-1]['yhat']
        

        history_output = []
        
        forecast_map = dict(zip(forecast['ds'].astype(str), forecast['yhat']))
        
        for item in daily_balances:
            date_key = item['ds']
            trend_val = forecast_map.get(date_key, item['y'])
            
            history_output.append({
                "date": date_key,
                "balance": item['y'],
                "trend": round(trend_val, 2)
            })
            
        return {
            "prediction": round(final_prediction, 2),
            "history": history_output
        }

    except Exception as e:
        print(f"PROPHET ERROR: {e}")
        return {
            "prediction": current_balance,
            "history": [{"date": d['ds'], "balance": d['y'], "trend": d['y']} for d in daily_balances]
        }