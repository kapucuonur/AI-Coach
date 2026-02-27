import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.auth_utils import get_current_user
from pydantic import BaseModel

router = APIRouter()

# Secrets will be fetched dynamically per request to ensure Render updates apply immediately

# You'll need to create a product in Stripe and put its Price ID in the environment
FRONTEND_URL = os.getenv("FRONTEND_URL", os.getenv("VITE_API_URL", "http://localhost:5173").replace("/api", ""))
if FRONTEND_URL == "http://localhost:8000":
    FRONTEND_URL = "http://localhost:5173"

@router.post("/create-checkout-session")
def create_checkout_session(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        # Check if they already have a customer ID
        customer_id = current_user.stripe_customer_id
        price_id = os.getenv("STRIPE_PRICE_ID")
        
        # DEBUG: Print exact keys loaded in production
        hk = stripe.api_key[:12] if stripe.api_key else "None"
        print(f"[DEBUG] Loaded Stripe Key: {hk}..., PriceID: {price_id}")
        
        if not customer_id:
            # Create a new Stripe customer
            customer = stripe.Customer.create(email=current_user.email)
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            db.commit()

        try:
            # Create the Checkout Session
            checkout_session = stripe.checkout.Session.create(
                customer=customer_id,
                automatic_payment_methods={"enabled": True},
                line_items=[
                    {
                        'price': price_id,
                        'quantity': 1,
                    },
                ],
                mode='subscription',
                success_url=f"{FRONTEND_URL}/dashboard?checkout=success",
                cancel_url=f"{FRONTEND_URL}/dashboard?checkout=canceled",
                metadata={"user_email": current_user.email}
            )
        except stripe.error.InvalidRequestError as e:
            # If the customer ID is invalid (e.g. from test mode but trying to use live key)
            if "No such customer" in str(e):
                print(f"Customer {customer_id} not found in Stripe. Creating a new one...")
                # Create a new Stripe customer
                customer = stripe.Customer.create(email=current_user.email)
                customer_id = customer.id
                current_user.stripe_customer_id = customer_id
                db.commit()
                
                # Retry checkout creation with new customer
                checkout_session = stripe.checkout.Session.create(
                    customer=customer_id,
                    automatic_payment_methods={"enabled": True},
                    line_items=[
                        {
                            'price': price_id,
                            'quantity': 1,
                        },
                    ],
                    mode='subscription',
                    success_url=f"{FRONTEND_URL}/dashboard?checkout=success",
                    cancel_url=f"{FRONTEND_URL}/dashboard?checkout=canceled",
                    metadata={"user_email": current_user.email}
                )
            else:
                raise e
        
        return {"sessionId": checkout_session.id, "url": checkout_session.url}
    except Exception as e:
        print(f"Checkout error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
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

    return {"status": "success"}
