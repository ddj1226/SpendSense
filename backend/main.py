# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import database, models, routes.goals as goals
from routes import auth, plaid_api


load_dotenv()
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Spend Sense API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(plaid_api.router)
app.include_router(goals.router)

@app.get("/")
def read_root():
    return {"status": "API is running"}