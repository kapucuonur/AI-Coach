import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.auth_utils import get_current_user
from pydantic import BaseModel

import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Configure Stripe API Key at module level
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def _create_stripe_session(customer_id: str, price_id: str, user_email: str) -> stripe.checkout.Session:
    return stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=['card'],
        line_items=[{'price': price_id, 'quantity': 1}],
        mode='subscription',
        subscription_data={"trial_period_days": 7},
        success_url=f"{FRONTEND_URL}/dashboard?checkout=success",
        cancel_url=f"{FRONTEND_URL}/dashboard?checkout=canceled",
        metadata={"user_email": user_email}
    )

@router.post("/create-checkout-session")
def create_checkout_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Check if they already have a customer ID
        customer_id = current_user.stripe_customer_id
        price_id = os.getenv("STRIPE_PRICE_ID")
        
        logger.debug(f"Stripe initializing checkout, PriceID configured: {bool(price_id)}")
        
        if not customer_id:
            # Create a new Stripe customer
            customer = stripe.Customer.create(email=current_user.email)
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            db.commit()

        try:
            # Create the Checkout Session
            checkout_session = _create_stripe_session(customer_id, price_id, current_user.email)
        except stripe.error.InvalidRequestError as e:
            # If the customer ID is invalid (e.g. from test mode but trying to use live key)
            if "No such customer" in str(e):
                logger.info(f"Customer {customer_id} not found in Stripe. Creating a new one...")
                # Create a new Stripe customer
                customer = stripe.Customer.create(email=current_user.email)
                customer_id = customer.id
                current_user.stripe_customer_id = customer_id
                db.commit()
                
                # Retry checkout creation with new customer
                checkout_session = _create_stripe_session(customer_id, price_id, current_user.email)
            else:
                raise e
        
        return {"sessionId": checkout_session.id, "url": checkout_session.url}
    except Exception as e:
        print(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Fulfill the purchase...
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        
        if customer_id:
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
            if user:
                user.is_premium = True
                user.stripe_subscription_id = subscription_id
                user.subscription_status = "active"
                db.commit()

    elif event['type'] == 'customer.subscription.deleted':
        # Handle subscription canceled/unpaid
        subscription = event['data']['object']
        customer_id = subscription.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.is_premium = False
            user.subscription_status = "canceled"
            db.commit()
            
    elif event['type'] == 'customer.subscription.updated':
        # Handle subscription plan changes, status changes (past_due, unpaid, active)
        subscription = event['data']['object']
        customer_id = subscription.get("customer")
        status = subscription.get("status")
        
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.subscription_status = status
            if status in ['active', 'trialing']:
                user.is_premium = True
            else:
                user.is_premium = False
            db.commit()

    return {"status": "success"}
