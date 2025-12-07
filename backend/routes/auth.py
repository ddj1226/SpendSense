from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import database, models, auth

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- Schemas ---
class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    first_name: str
    bank_connected: bool 



# --- Routes ---
@router.post("/signup", response_model=Token)
def signup(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = auth.get_password_hash(user.password)
    new_user = models.User(
        first_name=user.first_name, last_name=user.last_name, 
        email=user.email, hashed_password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {
        "access_token": access_token, "token_type": "bearer", 
        "user_id": new_user.id, "first_name": new_user.first_name,
        "bank_connected": False # New users always start False
    }

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Logic Check: If they have a token in DB, make sure flag is True
    is_connected = db_user.plaid_access_token is not None

    access_token = auth.create_access_token(data={"sub": db_user.email})
    return {
        "access_token": access_token, "token_type": "bearer", 
        "user_id": db_user.id, "first_name": db_user.first_name,
        "bank_connected": is_connected
    }