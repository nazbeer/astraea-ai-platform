"""
Usage limit enforcement and tracking for premium features
"""
from functools import wraps
from typing import Callable, Optional
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
from app.security import authenticate
from app.billing import track_usage, CREDIT_COSTS
import logging

log = logging.getLogger(__name__)

def require_credits(
    usage_type: str,
    quantity: int = 1,
    error_message: Optional[str] = None
):
    """
    Decorator to require credits for an endpoint.
    
    Usage:
        @app.post("/resume/generate")
        @require_credits("resume_generation")
        def generate_resume(...):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user or not db:
                raise HTTPException(status_code=500, detail="Missing user or db in endpoint")
            
            # Check if user has enough credits
            credits_remaining = current_user.credits - current_user.credits_used
            cost = CREDIT_COSTS.get(usage_type, 1) * quantity
            
            # Unlimited credits for premium tiers
            if current_user.credits == -1:
                # Still track usage but don't deduct
                track_usage(current_user, usage_type, quantity)
                return await func(*args, **kwargs)
            
            if credits_remaining < cost:
                msg = error_message or f"Insufficient credits. Required: {cost}, Available: {credits_remaining}"
                raise HTTPException(
                    status_code=402,  # Payment Required
                    detail={
                        "error": "insufficient_credits",
                        "message": msg,
                        "required": cost,
                        "available": credits_remaining,
                        "upgrade_url": "/billing"
                    }
                )
            
            # Track usage
            track_usage(current_user, usage_type, quantity)
            
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user or not db:
                raise HTTPException(status_code=500, detail="Missing user or db in endpoint")
            
            credits_remaining = current_user.credits - current_user.credits_used
            cost = CREDIT_COSTS.get(usage_type, 1) * quantity
            
            if current_user.credits == -1:
                track_usage(current_user, usage_type, quantity)
                return func(*args, **kwargs)
            
            if credits_remaining < cost:
                msg = error_message or f"Insufficient credits. Required: {cost}, Available: {credits_remaining}"
                raise HTTPException(
                    status_code=402,
                    detail={
                        "error": "insufficient_credits",
                        "message": msg,
                        "required": cost,
                        "available": credits_remaining,
                        "upgrade_url": "/billing"
                    }
                )
            
            track_usage(current_user, usage_type, quantity)
            return func(*args, **kwargs)
        
        # Return appropriate wrapper based on whether function is async
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator


def check_tier_access(required_tier: str):
    """
    Decorator to check if user has required tier access.
    
    Usage:
        @app.get("/premium/feature")
        @check_tier_access("pro")
        def premium_feature(...):
            ...
    """
    TIER_LEVELS = {"free": 0, "pro": 1, "enterprise": 2}
    
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            
            if not current_user:
                raise HTTPException(status_code=500, detail="Missing user in endpoint")
            
            user_level = TIER_LEVELS.get(current_user.tier, 0)
            required_level = TIER_LEVELS.get(required_tier, 1)
            
            if user_level < required_level:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "tier_too_low",
                        "message": f"This feature requires {required_tier} tier or higher",
                        "current_tier": current_user.tier,
                        "required_tier": required_tier,
                        "upgrade_url": "/billing"
                    }
                )
            
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            
            if not current_user:
                raise HTTPException(status_code=500, detail="Missing user in endpoint")
            
            user_level = TIER_LEVELS.get(current_user.tier, 0)
            required_level = TIER_LEVELS.get(required_tier, 1)
            
            if user_level < required_level:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "tier_too_low",
                        "message": f"This feature requires {required_tier} tier or higher",
                        "current_tier": current_user.tier,
                        "required_tier": required_tier,
                        "upgrade_url": "/billing"
                    }
                )
            
            return func(*args, **kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator


def get_user_limits(user: models.User) -> dict:
    """Get the usage limits for a user based on their tier"""
    from app.billing import SUBSCRIPTION_PLANS
    
    plan = SUBSCRIPTION_PLANS.get(user.tier, SUBSCRIPTION_PLANS["free"])
    
    return {
        "monthly_credits": plan["limits"]["monthly_credits"],
        "daily_applications": plan["limits"]["job_applications_per_day"],
        "max_saved_jobs": plan["limits"]["max_saved_jobs"],
        "features": plan["features"],
    }
