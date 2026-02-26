import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.auth_utils import get_current_user
from pydantic import BaseModel

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# You'll need to create a product in Stripe and put its Price ID in the environment
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID", "price_test_fallback")
FRONTEND_URL = os.getenv("FRONTEND_URL", os.getenv("VITE_API_URL", "http://localhost:5173").replace("/api", ""))
if FRONTEND_URL == "http://localhost:8000":
    FRONTEND_URL = "http://localhost:5173"

@router.post("/create-checkout-session")
def create_checkout_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Check if they already have a customer ID
        customer_id = current_user.stripe_customer_id
        
        if not customer_id:
            # Create a new Stripe customer
            customer = stripe.Customer.create(email=current_user.email)
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            db.commit()

        # Create the Checkout Session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[
                {
                    'price': STRIPE_PRICE_ID,
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=f"{FRONTEND_URL}/dashboard?checkout=success",
            cancel_url=f"{FRONTEND_URL}/dashboard?checkout=canceled",
            metadata={"user_email": current_user.email}
        )
        
        return {"sessionId": checkout_session.id, "url": checkout_session.url}
    except Exception as e:
        print(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
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

    return {"status": "success"}
