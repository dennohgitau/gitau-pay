"""
Pesapal STK Push API Backend
FastAPI backend for handling Pesapal STK push requests
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional
import uvicorn
from datetime import datetime
import time
import requests
from typing import Dict
import os

app = FastAPI(
    title="Gitau Pay API",
    description="Modern API for Pesapal STK Push payments",
    version="1.0.0"
)

# CORS configuration - read from environment or use defaults
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pesapal Configuration
PRODUCTION_BASE_URL = "https://pay.pesapal.com/v3/api"
SANDBOX_BASE_URL = "https://cybqa.pesapal.com/pesapalv3/api"

# Production Credentials - can be overridden with environment variables
CONSUMER_KEY = os.getenv("PESAPAL_CONSUMER_KEY", "xlPKBxhNDBlPJLrhhaUvmLbhy/TNfPow")
CONSUMER_SECRET = os.getenv("PESAPAL_CONSUMER_SECRET", "xSmpeJVxq2MR/AJwA1q5wYzKgM4=")

# Use production by default, can be overridden with environment variable
USE_SANDBOX = os.getenv("PESAPAL_USE_SANDBOX", "false").lower() == "true"
BASE_URL = SANDBOX_BASE_URL if USE_SANDBOX else PRODUCTION_BASE_URL

# Default IPN ID (can be configured via environment variable)
DEFAULT_IPN_ID = os.getenv("PESAPAL_IPN_ID", "70ebc157-9160-4190-b873-db09599ff08b")


class PesapalSTK:
    """Pesapal STK Push API Client"""
    
    def __init__(self, consumer_key: str, consumer_secret: str, base_url: str = PRODUCTION_BASE_URL):
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.base_url = base_url
        self.token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
    
    def authenticate(self) -> Dict:
        """Authenticate and get JWT token"""
        url = f"{self.base_url}/Auth/RequestToken"
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        payload = {
            "consumer_key": self.consumer_key,
            "consumer_secret": self.consumer_secret
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "200" and data.get("token"):
                self.token = data["token"]
                if data.get("expiryDate"):
                    expiry_str = data["expiryDate"].replace("Z", "+00:00")
                    if "." in expiry_str and "+" in expiry_str:
                        parts = expiry_str.split(".")
                        if len(parts) == 2:
                            decimal_part = parts[1].split("+")[0]
                            if len(decimal_part) > 6:
                                expiry_str = parts[0] + "." + decimal_part[:6] + "+" + parts[1].split("+")[1]
                    try:
                        self.token_expiry = datetime.fromisoformat(expiry_str)
                    except ValueError:
                        expiry_str = expiry_str.split(".")[0] + "+00:00"
                        self.token_expiry = datetime.fromisoformat(expiry_str)
                return data
            else:
                raise Exception(f"Authentication failed: {data.get('message', 'Unknown error')}")
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"Authentication request failed: {str(e)}")
    
    def send_stk_push(
        self,
        phone_number: str,
        amount: float,
        merchant_reference: str,
        description: str,
        notification_id: str,
        callback_url: str,
        customer_email: Optional[str] = None,
        customer_name: Optional[str] = None
    ) -> Dict:
        """Send STK push to phone number"""
        if not self.token:
            raise Exception("Not authenticated. Call authenticate() first.")
        
        url = f"{self.base_url}/transactions/stk"
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Format phone number
        formatted_phone = phone_number.replace("+254", "0").replace("254", "0", 1)
        if not formatted_phone.startswith("0"):
            formatted_phone = "0" + formatted_phone
        
        # Split customer name
        first_name = ""
        last_name = ""
        if customer_name:
            name_parts = customer_name.split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        payload = {
            "msisdn": formatted_phone,
            "payment_method": "MpesaKE",
            "id": merchant_reference,
            "currency": "KES",
            "amount": str(amount),
            "description": description,
            "callback_url": callback_url,
            "notification_id": notification_id,
            "billing_address": {
                "email_address": customer_email or f"{formatted_phone}@pesapal.com",
                "phone_number": formatted_phone,
                "country_code": "KE",
                "first_name": first_name,
                "middle_name": "",
                "last_name": last_name,
                "line_1": "",
                "line_2": "",
                "city": "",
                "state": "",
                "postal_code": "",
                "zip_code": ""
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "200":
                return data
            else:
                error_msg = data.get("error", {}).get("message", data.get("message", "Unknown error"))
                raise Exception(f"STK push failed: {error_msg}")
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"STK push request failed: {str(e)}")
    
    def get_transaction_status(self, order_tracking_id: str) -> Dict:
        """Get transaction status"""
        if not self.token:
            raise Exception("Not authenticated. Call authenticate() first.")
        
        url = f"{self.base_url}/Transactions/GetTransactionStatus"
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        params = {
            "orderTrackingId": order_tracking_id
        }
        
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"Get transaction status request failed: {str(e)}")


# Request/Response Models
class STKPushRequest(BaseModel):
    phone_number: str = Field(..., description="Customer phone number (e.g., 0723241024)")
    amount: float = Field(..., gt=0, description="Payment amount in KES")
    description: Optional[str] = Field(None, description="Payment description")
    customer_name: Optional[str] = Field(None, description="Customer name")
    customer_email: Optional[str] = Field(None, description="Customer email")
    
    @validator('phone_number')
    def validate_phone(cls, v):
        # Remove spaces and common separators
        cleaned = v.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        # Remove +254 or 254 prefix if present
        if cleaned.startswith("+254"):
            cleaned = "0" + cleaned[4:]
        elif cleaned.startswith("254"):
            cleaned = "0" + cleaned[3:]
        # Ensure it starts with 0 and has 10 digits
        if not cleaned.startswith("0"):
            cleaned = "0" + cleaned
        if len(cleaned) != 10 or not cleaned[1:].isdigit():
            raise ValueError("Phone number must be a valid Kenyan number (10 digits starting with 0)")
        return cleaned


class STKPushResponse(BaseModel):
    success: bool
    message: str
    order_tracking_id: Optional[str] = None
    merchant_reference: Optional[str] = None


class TransactionStatusResponse(BaseModel):
    success: bool
    status: Optional[str] = None
    status_code: Optional[str] = None
    payment_status_description: Optional[str] = None
    confirmation_code: Optional[str] = None


# Initialize client
client = PesapalSTK(CONSUMER_KEY, CONSUMER_SECRET, BASE_URL)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Gitau Pay API is running",
        "version": "1.0.0"
    }


@app.post("/api/stk-push", response_model=STKPushResponse)
async def send_stk_push(request: STKPushRequest):
    """Send STK push to customer phone"""
    try:
        # Authenticate
        client.authenticate()
        
        # Generate merchant reference
        merchant_ref = f"STK-{int(time.time())}"
        
        # Default description
        description = request.description or f"Payment of KES {request.amount}"
        
        # Send STK push
        response = client.send_stk_push(
            phone_number=request.phone_number,
            amount=request.amount,
            merchant_reference=merchant_ref,
            description=description,
            notification_id=DEFAULT_IPN_ID,
            callback_url="https://pesapal.com/callback",
            customer_email=request.customer_email,
            customer_name=request.customer_name
        )
        
        return STKPushResponse(
            success=True,
            message="STK push sent successfully. Please check your phone to complete the payment.",
            order_tracking_id=response.get("order_tracking_id"),
            merchant_reference=merchant_ref
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/transaction-status/{order_tracking_id}", response_model=TransactionStatusResponse)
async def get_transaction_status(order_tracking_id: str):
    """Get transaction status by order tracking ID"""
    try:
        # Authenticate
        client.authenticate()
        
        # Get status
        response = client.get_transaction_status(order_tracking_id)
        
        return TransactionStatusResponse(
            success=True,
            status=response.get("status"),
            status_code=str(response.get("status_code", "")),
            payment_status_description=response.get("payment_status_description"),
            confirmation_code=response.get("confirmation_code")
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
