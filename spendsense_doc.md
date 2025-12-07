# SpendSense
## An ML/AI-Powered Financial Planning Application

---

## Table of Contents
1. [Introduction](#introduction)
2. [Goals](#goals)
3. [Target Audience](#target-audience)
4. [Requirements](#requirements)
5. [Architecture](#architecture)
6. [User Experience Design](#user-experience-design)
7. [Database Design](#database-design)
8. [Technical Design](#technical-design)
9. [API Specifications](#api-specifications)
10. [Security Considerations](#security-considerations)

---

## Introduction

### Project Overview and Purpose

SpendSense is an intelligent financial companion designed to go beyond simple expense tracking. While traditional apps tell users where their money went, SpendSense uses **Machine Learning (Linear Regression)** to predict where their money is going and **Generative AI (Google Gemini)** to act as a personalized financial coach. 

The purpose is to empower users with **proactive financial foresight** rather than reactive regret.

---

## Goals

- **Secure Aggregation**: Seamlessly aggregate accounts (Checking, Savings, Credit) via Plaid
- **Smart Visualization**: Provide clear, immediate visuals of spending habits (Category Pie Charts) and balance trends
- **Predictive Analysis**: Use ML to forecast future net worth based on historical spending patterns
- **Actionable AI Coaching**: Deliver personalized, human-like advice using Large Language Models (LLM) to help users stay on track with their goals

---

## Target Audience

- **Young professionals and students** who want to save for specific goals (e.g., "Save $3,000 for a trip")
- **Users who find spreadsheets too manual** and traditional budgeting apps too passive

---

## Requirements

### Functional Requirements

| Requirement | Description |
|------------|-------------|
| **Authentication** | Users must be able to sign up and log in securely (JWT) |
| **Bank Linking** | Users must be able to link bank accounts via Plaid Link |
| **Dashboard** | System must display current net worth, recent transactions, and spending breakdown by category |
| **Goal Forecasting** | Users can input a target amount and date; the system must calculate if they are "On Track" using historical regression |
| **AI Insights** | The system must generate a unique, text-based financial insight for every forecast request |

### Non-Functional Requirements

| Requirement | Description |
|------------|-------------|
| **Security** | Access tokens (Plaid) must be encrypted. No raw banking credentials stored |
| **Usability** | UI must be clean, utilizing visual cues (Green/Orange) to indicate financial health |

---

## Architecture

### High-Level System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │ ◄─────► │   Backend    │ ◄─────► │  PostgreSQL │
│   (React)   │         │  (FastAPI)   │         │  Database   │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼─────┐ ┌─────▼──────┐ ┌────▼─────┐
         │ Plaid API  │ │ ML Engine  │ │  Gemini  │
         │ (Banking)  │ │ (sklearn)  │ │   API    │
         └────────────┘ └────────────┘ └──────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **Visualization**: Recharts (Composed Charts, Pie Charts)
- **Icons**: Lucide React

#### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy
- **ML Library**: Scikit-Learn (Linear Regression) & NumPy

#### Database
- **DB**: PostgreSQL

#### External APIs
- **Plaid API**: For fetching transactions and balance data
- **Google Gemini API (1.5 Flash)**: For generating natural language financial insights

---

## User Experience Design

### User Personas and User Flows

#### Primary User Flow
1. **Onboarding**: Landing Page → Sign Up → Login
2. **Setup**: "Connect Bank" (Plaid Link) → Success
3. **Monitoring**: Dashboard loads → user sees Balance Cards & Spending Pie Chart
4. **Forecasting**: User enters Goal → System runs ML → Charts Trend Line + AI Advice appears

### Design Principles and Style Guide

- **Clean, minimal interface** with focus on data visualization
- **Responsive design** for mobile and desktop
- **Accessible color palette** with sufficient contrast

---

## Database Design

### Data Model and Schema

#### Users Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | PRIMARY KEY | Unique user identifier |
| `email` | String | UNIQUE, NOT NULL | User's email address |
| `hashed_password` | String | NOT NULL | Bcrypt-hashed password |
| `plaid_access_token` | String | NULLABLE | Encrypted Plaid access token |
| `bank_connected` | Boolean | DEFAULT FALSE | Bank connection status |
| `created_at` | Timestamp | DEFAULT NOW() | Account creation timestamp |

### Relationships Between Entities

Currently single-table architecture. Future expansion may include:

- **Transactions Cache Table**: For faster historical queries

### Data Storage Considerations

**⚠️ Sensitive Data**: `plaid_access_token` is the most critical asset. In production, this column should be encrypted at rest using **Fernet** or similar encryption library.

---

## Technical Design

### Module Breakdown and Component Interactions

#### 1. Auth Module (`routes/auth.py`)
Handles JWT generation, password hashing (bcrypt), and session management.

#### 2. Plaid Service (`routes/plaid_api.py`)
- Exchanges public tokens for access tokens
- Fetches transactions (standardizes categories)
- Calculates real-time Net Worth (Assets - Liabilities)

#### 3. ML Engine (`ml_utils.py`)
- **Data Reconstruction**: Reconstructs historical daily balances by "undoing" transactions from the current balance
- **Regression**: Fits `sklearn.LinearRegression` to historical days to predict future trajectory

#### 4. Goal & AI Service (`routes/goals.py`)
Orchestrates the flow: Fetch Data → Run ML → Feed Stats to Gemini → Return JSON to frontend

### Component Interaction: The "Forecast" Flow

```
1. Frontend sends POST /api/goals/forecast
   {target_amount: 3000, date: "2025-06-01"}
   
2. Backend queries Database for plaid_access_token

3. Backend calls Plaid API
   → Gets current balance and 180 days of transactions
   
4. Backend calls forecast_balance() (ML Utility)
   a. Reconstructs history
   b. Trains Linear Model
   c. Predicts future balance
   
5. Backend calls Gemini API
   Prompt: "User has $X, predicted to have $Y. Goal is $Z. Give advice."
   
6. Backend returns combined JSON
   {history, prediction, insight} → Frontend
```

---

## API Specifications

**Base URL**: `http://localhost:8000`

### Authentication Endpoints

#### POST `/api/auth/signup`
**Description**: Registers a new user and hashes their password


---

#### POST `/api/auth/login`
**Description**: Authenticates a user and returns an access token

---

### Plaid Integration Endpoints

#### POST `/api/plaid/create_link_token`
**Description**: Generates a temporary token to initialize the Plaid Link frontend widget

**Headers**: `Authorization: Bearer <token>`



---

#### POST `/api/plaid/exchange_public_token`
**Description**: Exchanges the temporary public token for a permanent access token to save in the database


---

#### POST `/api/plaid/transactions`
**Description**: Fetches real-time account balances and up to 180 days of transaction history

**Headers**: `Authorization: Bearer <token>`
 

---

### Goal Forecasting Endpoints

#### POST `/api/goals/forecast`
**Description**: Reconstructs historical net worth, runs linear regression to predict future balance, and generates AI-powered financial advice

**Headers**: `Authorization: Bearer <token>`

---

## Security Considerations

### Current Implementation
- **Password Security**: Passwords are hashed using bcrypt before storage
- **JWT Authentication**: Access tokens expire after configurable duration
- **HTTPS**: All API communication should use HTTPS in production


### Future Enhancements
- **Token Encryption**: Encrypt `plaid_access_token` at rest using Fernet or AES-256
- **2FA**: Add two-factor authentication for enhanced account security
- **Audit Logging**: Track all financial data access for security monitoring
- **Data Retention Policy**: Implement automatic purging of old transaction data
- **Security Headers**: Add CSP, HSTS, and other security headers
- **Input Validation**: Enhanced server-side validation for all endpoints

---


### Development Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate 
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```


---
