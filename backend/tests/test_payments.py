import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import stripe

from backend.models import User

@patch("stripe.checkout.Session.create")
@patch("stripe.Customer.create")
def test_create_checkout_session_new_customer(mock_customer_create, mock_session_create, client, test_user_token, db_session):
    # Setup mock customer
    mock_customer = MagicMock()
    mock_customer.id = "cus_mock123"
    mock_customer_create.return_value = mock_customer
    
    # Setup mock session
    mock_session = MagicMock()
    mock_session.id = "cs_mock123"
    mock_session.url = "https://checkout.stripe.com/c/pay/cs_mock123"
    mock_session_create.return_value = mock_session
    
    headers = {"Authorization": f"Bearer {test_user_token}"}
    response = client.post("/api/payments/create-checkout-session", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["sessionId"] == "cs_mock123"
    assert data["url"] == "https://checkout.stripe.com/c/pay/cs_mock123"
    
    # Check DB update
    user = db_session.query(User).filter_by(email="test@coachonurai.com").first()
    assert user.stripe_customer_id == "cus_mock123"

@patch("stripe.Webhook.construct_event")
def test_webhook_invalid_signature(mock_construct_event, client):
    mock_construct_event.side_effect = stripe.error.SignatureVerificationError("Invalid sig", "sig_header")
    
    response = client.post(
        "/api/payments/webhook", 
        data=b"fake payload",
        headers={"stripe-signature": "fake_sig"}
    )
    
    assert response.status_code == 400
    assert "Invalid signature" in response.json()["detail"]

@patch("stripe.Webhook.construct_event")
def test_webhook_checkout_completed(mock_construct_event, client, test_user_token, db_session):
    # Ensure user has the correct customer ID
    user = db_session.query(User).filter_by(email="test@coachonurai.com").first()
    user.stripe_customer_id = "cus_mock_webhook"
    db_session.commit()
    
    # Setup the mock event
    mock_event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "customer": "cus_mock_webhook",
                "subscription": "sub_mock123"
            }
        }
    }
    mock_construct_event.return_value = mock_event
    
    response = client.post(
        "/api/payments/webhook", 
        data=b"fake payload",
        headers={"stripe-signature": "fake_sig"}
    )
    assert response.status_code == 200
    
    db_session.refresh(user)
    assert user.is_premium is True
    assert user.stripe_subscription_id == "sub_mock123"
    assert user.subscription_status == "active"

@patch("stripe.Webhook.construct_event")
def test_webhook_subscription_deleted(mock_construct_event, client, test_user, db_session):
    # Ensure user has true premium initially
    user = db_session.query(User).filter_by(email="test@coachonurai.com").first()
    user.stripe_customer_id = "cus_mock_del"
    user.is_premium = True
    user.subscription_status = "active"
    db_session.commit()
    
    # Setup mock event
    mock_event = {
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "customer": "cus_mock_del"
            }
        }
    }
    mock_construct_event.return_value = mock_event
    
    response = client.post("/api/payments/webhook", data=b"fake payload", headers={"stripe-signature": "fake_sig"})
    assert response.status_code == 200
    
    db_session.refresh(user)
    assert user.is_premium is False
    assert user.subscription_status == "canceled"

@patch("stripe.Webhook.construct_event")
def test_webhook_subscription_updated_past_due(mock_construct_event, client, test_user, db_session):
    user = db_session.query(User).filter_by(email="test@coachonurai.com").first()
    user.stripe_customer_id = "cus_mock_upd"
    user.is_premium = True
    user.subscription_status = "active"
    db_session.commit()
    
    mock_event = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "customer": "cus_mock_upd",
                "status": "past_due"
            }
        }
    }
    mock_construct_event.return_value = mock_event
    
    response = client.post("/api/payments/webhook", data=b"fake payload", headers={"stripe-signature": "fake_sig"})
    assert response.status_code == 200
    
    db_session.refresh(user)
    assert user.is_premium is False
    assert user.subscription_status == "past_due"
