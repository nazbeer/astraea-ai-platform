"""
Billing and Monetization Module
Handles Stripe integration, subscriptions, payments, and usage tracking.
"""

import os
import stripe
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

# Initialize Stripe with API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

# Subscription Plans Configuration
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free",
        "display_name": "Free",
        "description": "Get started with basic features",
        "price_monthly": 0,
        "price_yearly": 0,
        "features": {
            "chat_messages": 50,
            "custom_models": 0,
            "resume_generations": 3,
            "job_applications": 5,
            "api_access": False,
            "priority_support": False,
        },
        "limits": {
            "monthly_credits": 100,
            "max_custom_models": 0,
            "max_chat_sessions": 10,
            "max_resume_generations": 3,
            "max_job_applications": 5,
        }
    },
    "pro": {
        "name": "Pro",
        "display_name": "Pro",
        "description": "Unlimited access for professionals",
        "price_monthly": 999,  # $9.99
        "price_yearly": 9990,  # $99.90 (2 months free)
        "features": {
            "chat_messages": -1,  # Unlimited
            "custom_models": 5,
            "resume_generations": -1,  # Unlimited
            "job_applications": -1,  # Unlimited
            "api_access": True,
            "priority_support": True,
        },
        "limits": {
            "monthly_credits": -1,  # Unlimited
            "max_custom_models": 5,
            "max_chat_sessions": -1,
            "max_resume_generations": -1,
            "max_job_applications": -1,
        }
    },
    "enterprise": {
        "name": "Enterprise",
        "display_name": "Enterprise",
        "description": "For teams and organizations",
        "price_monthly": 4999,  # $49.99
        "price_yearly": 49990,  # $499.90
        "features": {
            "chat_messages": -1,
            "custom_models": -1,  # Unlimited
            "resume_generations": -1,
            "job_applications": -1,
            "api_access": True,
            "priority_support": True,
            "dedicated_support": True,
            "custom_integrations": True,
        },
        "limits": {
            "monthly_credits": -1,
            "max_custom_models": -1,
            "max_chat_sessions": -1,
            "max_resume_generations": -1,
            "max_job_applications": -1,
        }
    }
}

# Credit Packs
CREDIT_PACKS = [
    {
        "id": "credits_small",
        "name": "Small Pack",
        "credits": 500,
        "price": 499,  # $4.99
    },
    {
        "id": "credits_medium",
        "name": "Medium Pack",
        "credits": 1500,
        "price": 1299,  # $12.99
    },
    {
        "id": "credits_large",
        "name": "Large Pack",
        "credits": 5000,
        "price": 3999,  # $39.99
    },
]

# Job Posting Packages for Employers
JOB_POSTING_PACKAGES = [
    {
        "id": "job_basic",
        "name": "Basic Job Posting",
        "description": "Post a job for 30 days",
        "job_postings": 1,
        "featured_duration_days": 0,
        "resume_database_access": False,
        "price": 9900,  # $99.00
    },
    {
        "id": "job_featured",
        "name": "Featured Job Posting",
        "description": "Featured job for 30 days with resume database access",
        "job_postings": 1,
        "featured_duration_days": 30,
        "resume_database_access": True,
        "price": 29900,  # $299.00
    },
    {
        "id": "job_bundle_5",
        "name": "5 Job Pack",
        "description": "Post 5 jobs with featured placement",
        "job_postings": 5,
        "featured_duration_days": 30,
        "resume_database_access": True,
        "price": 99900,  # $999.00
    },
]


class BillingManager:
    """Manage billing, subscriptions, and payments"""
    
    def __init__(self):
        self.stripe_enabled = bool(stripe.api_key)
    
    def get_or_create_customer(self, user) -> str:
        """Get or create Stripe customer for user"""
        if not self.stripe_enabled:
            raise Exception("Stripe is not configured")
        
        if user.stripe_customer_id:
            try:
                # Verify customer exists
                customer = stripe.Customer.retrieve(user.stripe_customer_id)
                return customer.id
            except stripe.error.InvalidRequestError:
                # Customer was deleted, create new one
                pass
        
        # Create new customer
        customer = stripe.Customer.create(
            email=user.email,
            name=user.username,
            metadata={
                "user_id": user.id,
                "user_type": user.user_type,
            }
        )
        return customer.id
    
    def create_subscription(self, user, plan_id: str, interval: str = "month") -> Dict[str, Any]:
        """Create a subscription for user"""
        if not self.stripe_enabled:
            raise Exception("Stripe is not configured")
        
        plan = SUBSCRIPTION_PLANS.get(plan_id)
        if not plan:
            raise ValueError(f"Invalid plan: {plan_id}")
        
        # Get or create customer
        customer_id = self.get_or_create_customer(user)
        
        # Get Stripe price ID
        price_id = self._get_stripe_price_id(plan_id, interval)
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"],
        )
        
        return {
            "subscription_id": subscription.id,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret,
            "status": subscription.status,
        }
    
    def cancel_subscription(self, user) -> bool:
        """Cancel user's subscription"""
        if not self.stripe_enabled or not user.stripe_subscription_id:
            return False
        
        try:
            stripe.Subscription.delete(user.stripe_subscription_id)
            return True
        except stripe.error.StripeError:
            return False
    
    def create_checkout_session(self, user, price_id: str, mode: str = "subscription") -> str:
        """Create Stripe Checkout session"""
        if not self.stripe_enabled:
            raise Exception("Stripe is not configured")
        
        customer_id = self.get_or_create_customer(user)
        
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode=mode,  # "subscription" or "payment"
            success_url=f"{self._get_frontend_url()}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{self._get_frontend_url()}/billing/cancel",
            metadata={
                "user_id": user.id,
            }
        )
        
        return session.url
    
    def create_credit_purchase_session(self, user, pack_id: str) -> str:
        """Create checkout session for credit purchase"""
        pack = next((p for p in CREDIT_PACKS if p["id"] == pack_id), None)
        if not pack:
            raise ValueError(f"Invalid credit pack: {pack_id}")
        
        customer_id = self.get_or_create_customer(user)
        
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"{pack['name']} - {pack['credits']} Credits",
                    },
                    "unit_amount": pack["price"],
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{self._get_frontend_url()}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{self._get_frontend_url()}/billing/cancel",
            metadata={
                "user_id": user.id,
                "purchase_type": "credits",
                "credits": pack["credits"],
            }
        )
        
        return session.url
    
    def handle_webhook(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        if not self.stripe_enabled:
            return {"status": "disabled"}
        
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError:
            raise Exception("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise Exception("Invalid signature")
        
        # Handle events
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            self._handle_checkout_completed(session)
        
        elif event["type"] == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            self._handle_invoice_paid(invoice)
        
        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            self._handle_subscription_cancelled(subscription)
        
        return {"status": "success", "type": event["type"]}
    
    def _handle_checkout_completed(self, session):
        """Handle successful checkout"""
        user_id = session.get("metadata", {}).get("user_id")
        purchase_type = session.get("metadata", {}).get("purchase_type")
        
        if purchase_type == "credits":
            credits = int(session.get("metadata", {}).get("credits", 0))
            # Add credits to user (will be done in main.py)
            pass
    
    def _handle_invoice_paid(self, invoice):
        """Handle successful invoice payment"""
        # Update subscription status
        pass
    
    def _handle_subscription_cancelled(self, subscription):
        """Handle subscription cancellation"""
        # Update user subscription status
        pass
    
    def _get_stripe_price_id(self, plan_id: str, interval: str) -> str:
        """Get Stripe price ID for plan"""
        # In production, these would be stored in the database
        price_ids = {
            "pro_monthly": os.getenv("STRIPE_PRICE_PRO_MONTHLY", ""),
            "pro_yearly": os.getenv("STRIPE_PRICE_PRO_YEARLY", ""),
            "enterprise_monthly": os.getenv("STRIPE_PRICE_ENTERPRISE_MONTHLY", ""),
            "enterprise_yearly": os.getenv("STRIPE_PRICE_ENTERPRISE_YEARLY", ""),
        }
        
        key = f"{plan_id}_{interval}"
        return price_ids.get(key, "")
    
    def _get_frontend_url(self) -> str:
        """Get frontend URL"""
        return os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    def check_feature_access(self, user, feature: str) -> bool:
        """Check if user has access to a feature"""
        plan = SUBSCRIPTION_PLANS.get(user.tier, SUBSCRIPTION_PLANS["free"])
        features = plan.get("features", {})
        
        # -1 means unlimited
        limit = features.get(feature, 0)
        return limit == -1 or limit > 0
    
    def get_usage_limit(self, user, resource: str) -> int:
        """Get usage limit for a resource (-1 for unlimited)"""
        plan = SUBSCRIPTION_PLANS.get(user.tier, SUBSCRIPTION_PLANS["free"])
        limits = plan.get("limits", {})
        return limits.get(resource, 0)
    
    def calculate_credits_for_usage(self, usage_type: str, quantity: int = 1) -> int:
        """Calculate credits needed for usage"""
        credit_costs = {
            "chat_message": 1,
            "chat_message_gpt4": 5,
            "custom_model_creation": 50,
            "custom_model_usage": 2,
            "resume_generation": 20,
            "resume_ats_score": 5,
            "job_application": 10,
            "api_call": 1,
        }
        return credit_costs.get(usage_type, 1) * quantity


# Usage Tracking
def track_usage(user, usage_type: str, quantity: int = 1, extra_data: dict = None):
    """Track user usage and deduct credits"""
    from app.database import SessionLocal
    from app import models
    
    db = SessionLocal()
    try:
        # Calculate credits
        billing = BillingManager()
        credits_needed = billing.calculate_credits_for_usage(usage_type, quantity)
        
        # Create usage record
        usage = models.UsageRecord(
            user_id=user.id,
            usage_type=usage_type,
            quantity=quantity,
            credits_used=credits_needed,
            extra_data=extra_data or {}
        )
        db.add(usage)
        
        # Update user credits
        user.credits_used += credits_needed
        
        # Check if user has unlimited credits (Pro/Enterprise)
        limit = billing.get_usage_limit(user, "monthly_credits")
        if limit != -1:  # Not unlimited
            remaining = user.credits - user.credits_used
            if remaining < 0:
                raise Exception("Insufficient credits")
        
        db.commit()
        return True
    finally:
        db.close()


# Singleton instance
billing_manager = BillingManager()
