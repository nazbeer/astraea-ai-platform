"""
Migration script to add billing and subscription support to the database.
Run this after updating your models.py
"""

import os
import sys
from sqlalchemy import create_engine, text, Column, Integer, String, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Meherin%402019!@db.xkhgkyhcebwyfyozzudm.supabase.co:5432/postgres")

def migrate():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Starting billing migration...")
        
        # 1. Add new columns to users table
        print("Adding billing columns to users table...")
        columns_to_add = [
            ("credits", "INTEGER DEFAULT 100"),
            ("credits_used", "INTEGER DEFAULT 0"),
            ("subscription_status", "VARCHAR DEFAULT 'active'"),
            ("subscription_current_period_end", "TIMESTAMP"),
            ("stripe_customer_id", "VARCHAR"),
            ("stripe_subscription_id", "VARCHAR"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f'ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}'))
                print(f"  ✓ Added column: {col_name}")
            except Exception as e:
                print(f"  ✗ Error adding {col_name}: {e}")
        
        # 2. Update tier column default if needed
        try:
            conn.execute(text("ALTER TABLE users ALTER COLUMN tier SET DEFAULT 'free'"))
            print("  ✓ Updated tier default to 'free'")
        except Exception as e:
            print(f"  ✗ Error updating tier default: {e}")
        
        # 3. Create subscriptions table
        print("\nCreating subscriptions table...")
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    stripe_price_id VARCHAR,
                    monthly_price INTEGER DEFAULT 0,
                    yearly_price INTEGER DEFAULT 0,
                    features JSONB DEFAULT '[]'::jsonb,
                    job_applications_limit INTEGER DEFAULT 10,
                    ai_generations_limit INTEGER DEFAULT 50,
                    saved_jobs_limit INTEGER DEFAULT 50,
                    has_resume_templates BOOLEAN DEFAULT FALSE,
                    has_advanced_analytics BOOLEAN DEFAULT FALSE,
                    has_priority_support BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            print("  ✓ Created subscriptions table")
        except Exception as e:
            print(f"  ✗ Error creating subscriptions table: {e}")
        
        # 4. Create invoices table
        print("\nCreating invoices table...")
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS invoices (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    stripe_invoice_id VARCHAR,
                    amount INTEGER DEFAULT 0,
                    currency VARCHAR DEFAULT 'usd',
                    status VARCHAR DEFAULT 'open',
                    invoice_pdf VARCHAR,
                    period_start TIMESTAMP,
                    period_end TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            print("  ✓ Created invoices table")
        except Exception as e:
            print(f"  ✗ Error creating invoices table: {e}")
        
        # 5. Create usage_records table
        print("\nCreating usage_records table...")
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS usage_records (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    usage_type VARCHAR NOT NULL,
                    quantity INTEGER DEFAULT 1,
                    credits_used INTEGER DEFAULT 0,
                    extra_data JSONB DEFAULT '{}'::jsonb,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            print("  ✓ Created usage_records table")
        except Exception as e:
            print(f"  ✗ Error creating usage_records table: {e}")
        
        # 6. Create payments table
        print("\nCreating payments table...")
        try:
            conn.execute(text('''
                CREATE TABLE IF NOT EXISTS payments (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    stripe_payment_id VARCHAR,
                    amount INTEGER DEFAULT 0,
                    currency VARCHAR DEFAULT 'usd',
                    status VARCHAR DEFAULT 'pending',
                    payment_type VARCHAR DEFAULT 'subscription',
                    description VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            print("  ✓ Created payments table")
        except Exception as e:
            print(f"  ✗ Error creating payments table: {e}")
        
        # 7. Insert default subscription plans
        print("\nInserting default subscription plans...")
        default_plans = [
            {
                "name": "Free",
                "monthly_price": 0,
                "yearly_price": 0,
                "features": '["Basic AI chat", "10 job applications/day", "50 saved jobs", "Basic resume builder"]',
                "job_applications_limit": 10,
                "ai_generations_limit": 50,
                "saved_jobs_limit": 50,
                "has_resume_templates": False,
                "has_advanced_analytics": False,
                "has_priority_support": False,
            },
            {
                "name": "Pro",
                "monthly_price": 999,  # $9.99
                "yearly_price": 9990,  # $99.90
                "features": '["Unlimited AI chat", "Unlimited job applications", "Unlimited saved jobs", "ATS resume templates", "Advanced analytics", "Priority support"]',
                "job_applications_limit": -1,  # unlimited
                "ai_generations_limit": -1,  # unlimited
                "saved_jobs_limit": -1,  # unlimited
                "has_resume_templates": True,
                "has_advanced_analytics": True,
                "has_priority_support": True,
            },
            {
                "name": "Enterprise",
                "monthly_price": 4999,  # $49.99
                "yearly_price": 49990,  # $499.90
                "features": '["Everything in Pro", "Custom AI training", "API access", "Dedicated support", "Team collaboration", "Custom integrations"]',
                "job_applications_limit": -1,
                "ai_generations_limit": -1,
                "saved_jobs_limit": -1,
                "has_resume_templates": True,
                "has_advanced_analytics": True,
                "has_priority_support": True,
            },
        ]
        
        for plan in default_plans:
            try:
                # First check if plan exists
                result = conn.execute(text('SELECT id FROM subscriptions WHERE name = :name'), {'name': plan['name']})
                if result.fetchone():
                    print(f"  ✓ Plan already exists: {plan['name']}")
                    continue
                    
                conn.execute(text('''
                    INSERT INTO subscriptions (name, monthly_price, yearly_price, features, 
                        job_applications_limit, ai_generations_limit, saved_jobs_limit,
                        has_resume_templates, has_advanced_analytics, has_priority_support)
                    VALUES (:name, :monthly_price, :yearly_price, :features,
                        :job_applications_limit, :ai_generations_limit, :saved_jobs_limit,
                        :has_resume_templates, :has_advanced_analytics, :has_priority_support)
                '''), {
                    'name': plan['name'],
                    'monthly_price': plan['monthly_price'],
                    'yearly_price': plan['yearly_price'],
                    'features': plan['features'],
                    'job_applications_limit': plan['job_applications_limit'],
                    'ai_generations_limit': plan['ai_generations_limit'],
                    'saved_jobs_limit': plan['saved_jobs_limit'],
                    'has_resume_templates': plan['has_resume_templates'],
                    'has_advanced_analytics': plan['has_advanced_analytics'],
                    'has_priority_support': plan['has_priority_support'],
                })
                conn.commit()
                print(f"  ✓ Inserted plan: {plan['name']}")
            except Exception as e:
                print(f"  ✗ Error inserting plan {plan['name']}: {e}")
                conn.rollback()
        
        # 8. Migrate existing users to have default credits
        print("\nMigrating existing users...")
        try:
            # Set free tier users to have 100 credits
            conn.execute(text('''
                UPDATE users 
                SET credits = 100, credits_used = 0, tier = COALESCE(tier, 'free')
                WHERE tier = 'free' OR tier IS NULL
            '''))
            print("  ✓ Updated free tier users")
            
            # Set pro/enterprise users to have unlimited credits (-1)
            conn.execute(text('''
                UPDATE users 
                SET credits = -1, credits_used = 0
                WHERE tier IN ('pro', 'enterprise')
            '''))
            print("  ✓ Updated premium users")
        except Exception as e:
            print(f"  ✗ Error migrating users: {e}")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
