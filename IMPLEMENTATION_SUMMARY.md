# Google OAuth Implementation - Changes Summary

This document summarizes all changes made to implement Google OAuth SSO authentication.

## Overview

The system has been migrated from username/password authentication to **Google OAuth 2.0 SSO**. Users now sign in exclusively using their Google accounts.

## Backend Changes

### 1. Dependencies (`requirements.txt`)
- **Removed**: `passlib[bcrypt]`, `bcrypt==4.0.1`
- **Added**: `google-auth`, `google-auth-oauthlib`, `requests`

### 2. Database Model (`app/models.py`)
**User Model Changes**:
- **Removed**: `hashed_password` field
- **Added**: 
  - `email` (unique, indexed) - User's Google email
  - `google_id` (unique, indexed) - Google user ID
- **Modified**: `username` - Now stores display name from Google

### 3. Schemas (`app/schemas.py`)
- **Removed**: `UserCreate` schema (username/password)
- **Added**: `GoogleAuthRequest` schema (Google OAuth token)

### 4. Authentication (`app/auth.py`)
- **Removed**: 
  - `pwd_context` (bcrypt password hashing)
  - `verify_password()` function
  - `get_password_hash()` function
- **Added**:
  - `GOOGLE_CLIENT_ID` configuration
  - `verify_google_token()` function - Verifies Google OAuth tokens

### 5. Security (`app/security.py`)
- **Modified**: `authenticate()` function now uses email instead of username for user lookup

### 6. Configuration (`app/config.py`)
- **Added**: `GOOGLE_CLIENT_ID` setting from environment variable

### 7. API Endpoints (`app/main.py`)
- **Removed**:
  - `POST /auth/signup` - Username/password signup
  - `POST /auth/token` - Username/password login
- **Added**:
  - `POST /auth/google` - Google OAuth authentication endpoint
    - Accepts Google OAuth token
    - Creates new user or logs in existing user
    - Returns JWT token for API access
- **Modified**:
  - `GET /profile` - Now includes email in response

## Frontend Changes

### 1. Dependencies (`package.json`)
- **Added**: `@react-oauth/google@^0.12.1`

### 2. Layout (`app/layout.tsx`)
- **Added**: `GoogleOAuthProvider` wrapper for entire app
- **Modified**: Made component client-side with `'use client'`
- **Removed**: Static metadata export (incompatible with client components)

### 3. Login Page (`app/login/page.tsx`)
- **Completely rewritten** to use Google Sign-In button
- **Removed**: 
  - Username/password input fields
  - Signup/login toggle
  - Form submission logic
- **Added**:
  - `GoogleLogin` component from `@react-oauth/google`
  - `handleGoogleSuccess()` - Processes Google OAuth response
  - `handleGoogleError()` - Handles authentication errors

## New Files Created

### 1. Backend Environment Template (`backend/.env.example`)
```
APP_API_KEY=your_openai_api_key_here
MODEL_NAME=gpt-4o-mini
EMBED_MODEL=text-embedding-3-small
RATE_LIMIT=20
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

### 2. Frontend Environment Template (`frontend/.env.local.example`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

### 3. Setup Guide (`GOOGLE_OAUTH_SETUP.md`)
Comprehensive step-by-step guide for:
- Creating Google Cloud project
- Configuring OAuth consent screen
- Creating OAuth credentials
- Configuring application

### 4. Migration Script (`backend/migrate_to_google_oauth.py`)
Python script to migrate existing database:
- Backs up existing users table
- Creates new users table with Google OAuth fields
- Provides rollback on errors

### 5. Updated README (`README.md`)
- Added Google OAuth feature highlight
- Updated setup instructions
- Added authentication section
- Updated API endpoints documentation

## Authentication Flow

### Old Flow (Username/Password)
1. User enters username and password
2. Backend verifies password hash
3. Returns JWT token

### New Flow (Google OAuth)
1. User clicks "Sign in with Google"
2. Google OAuth popup appears
3. User selects Google account
4. Frontend receives Google OAuth token
5. Frontend sends token to backend `/auth/google`
6. Backend verifies token with Google
7. Backend creates/updates user in database
8. Backend returns JWT token
9. Frontend stores JWT token
10. User is authenticated

## Security Improvements

1. **No Password Storage**: Passwords are never stored in the database
2. **Google's Security**: Leverages Google's robust authentication system
3. **Token Verification**: Backend verifies tokens directly with Google
4. **Automatic Updates**: User info (name, email) automatically updates on each login

## Migration Path

For existing deployments:

1. **Install new dependencies**:
   ```bash
   cd backend
   pip install google-auth google-auth-oauthlib requests
   
   cd ../frontend
   yarn add @react-oauth/google
   ```

2. **Setup Google OAuth** (see GOOGLE_OAUTH_SETUP.md)

3. **Configure environment variables**:
   - Add `GOOGLE_CLIENT_ID` to backend `.env`
   - Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to frontend `.env.local`

4. **Migrate database**:
   ```bash
   cd backend
   python migrate_to_google_oauth.py
   ```

5. **Restart services**

## Breaking Changes

⚠️ **Important**: This is a breaking change!

- All existing users will need to sign in again with Google
- Old username/password credentials will no longer work
- User data is preserved but linked to Google accounts going forward

## Testing Checklist

- [ ] Google Sign-In button appears on login page
- [ ] Clicking button opens Google OAuth popup
- [ ] Successful authentication redirects to main app
- [ ] User profile shows correct email and name
- [ ] JWT token is stored in localStorage
- [ ] Protected routes require authentication
- [ ] Logout clears token and redirects to login
- [ ] Multiple sign-ins with same Google account work correctly
- [ ] Different Google accounts create different users

## Environment Variables Required

### Backend
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID

### Frontend
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth Client ID (same as backend)

## Support

For setup issues, refer to:
- `GOOGLE_OAUTH_SETUP.md` - Detailed setup guide
- Google OAuth documentation: https://developers.google.com/identity/protocols/oauth2
