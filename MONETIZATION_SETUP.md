# Monetization Implementation Guide

This document describes the billing and subscription system that has been implemented.

## Overview

The platform now supports subscription-based monetization with the following tiers:

- **Free**: 100 credits/month, 10 job applications/day, 50 saved jobs
- **Pro**: $9.99/month ($99.90/year) - Unlimited everything
- **Enterprise**: $49.99/month ($499.90/year) - Everything in Pro + API access

## Features

### Backend (Python/FastAPI)

1. **Database Models** (`app/models.py`):
   - `User` - Added `credits`, `credits_used`, `subscription_status`, `stripe_customer_id`, etc.
   - `Subscription` - Plan definitions
   - `Invoice` - Payment records
   - `UsageRecord` - Usage tracking
   - `Payment` - Payment history

2. **Billing Module** (`app/billing.py`):
   - Stripe integration
   - Checkout session creation
   - Webhook handling
   - Usage tracking
   - Credit management

3. **API Endpoints** (`app/main.py`):
   - `GET /billing/plans` - List all plans
   - `GET /billing/current` - Get current subscription
   - `POST /billing/checkout` - Create checkout session
   - `POST /billing/credits/checkout` - Buy credit packs
   - `POST /billing/cancel` - Cancel subscription
   - `GET /billing/payments` - Payment history
   - `GET /billing/usage` - Usage statistics
   - `POST /billing/webhook` - Stripe webhooks

4. **Usage Limits** (`app/usage_limits.py`):
   - `@require_credits` decorator for endpoints
   - `@check_tier_access` decorator for premium features

### Frontend (Next.js/React)

1. **Billing Pages**:
   - `/billing` - Pricing page with plan selection
   - `/billing/history` - Payment history
   - `/billing/usage` - Usage statistics
   - `/billing/success` - Checkout success
   - `/billing/cancel` - Checkout cancelled

2. **Components**:
   - `SubscriptionBadge` - Shows tier badge
   - `CreditsDisplay` - Shows remaining credits

3. **Sidebar Update**:
   - Shows subscription tier
   - Shows credits remaining
   - Link to billing page

## Setup Instructions

### 1. Environment Variables

Add to `backend/.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Database Migration

Run the migration script:
```bash
cd backend
python migrate_billing.py
```

This will:
- Add billing columns to users table
- Create subscriptions, invoices, usage_records, and payments tables
- Insert default subscription plans (Free, Pro, Enterprise)

### 3. Stripe Configuration

1. Create products and prices in Stripe Dashboard:
   - Pro Monthly: $9.99
   - Pro Yearly: $99.90
   - Enterprise Monthly: $49.99
   - Enterprise Yearly: $499.90

2. Update `STRIPE_PRICE_IDS` in `backend/app/billing.py` with your actual Stripe price IDs.

3. Set up webhook endpoint:
   - URL: `https://yourdomain.com/billing/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `invoice.paid`
     - `customer.subscription.deleted`

### 4. Credit Costs

Update `CREDIT_COSTS` in `backend/app/billing.py` to set costs for features:
```python
CREDIT_COSTS = {
    "resume_generation": 5,
    "cover_letter_generation": 3,
    "job_application": 1,
    "ai_chat": 1,
}
```

## Protecting Premium Features

### Using the require_credits Decorator

```python
from app.usage_limits import require_credits

@app.post("/resume/generate")
@require_credits("resume_generation")
def generate_resume(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    # This endpoint now requires 5 credits
    pass
```

### Using the check_tier_access Decorator

```python
from app.usage_limits import check_tier_access

@app.get("/premium/feature")
@check_tier_access("pro")
def premium_feature(
    current_user: models.User = Depends(authenticate),
):
    # Only Pro and Enterprise users can access
    pass
```

### Manual Credit Check

```python
from app.billing import check_credits, deduct_credits

@app.post("/some/feature")
def some_feature(
    current_user: models.User = Depends(authenticate),
    db: Session = Depends(get_db),
):
    # Check if user has enough credits
    has_credits, remaining = check_credits(current_user, 10)
    if not has_credits:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    
    # Deduct credits
    deduct_credits(current_user, 10)
    db.commit()
    
    # Process feature
    return {"result": "success"}
```

## Testing

### Test Credit Purchase Flow
1. Go to `/billing`
2. Select a credit pack
3. Complete Stripe test checkout (use card `4242 4242 4242 4242`)
4. Verify credits are added

### Test Subscription Flow
1. Go to `/billing`
2. Select Pro plan
3. Complete checkout
4. Verify subscription is active in profile

### Test Usage Limits
1. Use up credits on free plan
2. Try to use a premium feature
3. Should get "Insufficient credits" error
4. Upgrade to Pro
5. Feature should work

## Webhook Testing (Local)

Use Stripe CLI for local webhook testing:
```bash
stripe login
stripe listen --forward-to localhost:8000/billing/webhook
```

Copy the webhook signing secret and add to `.env`.

## Notes

- Free users get 100 credits per month (resets monthly)
- Pro/Enterprise users have unlimited credits (`credits = -1`)
- Credit packs are one-time purchases that never expire
- Usage is tracked in the `usage_records` table
- All payment records are stored in the `payments` table
