# Quick Setup Guide - Google OAuth

## Prerequisites
✅ Google Cloud account  
✅ Node.js & Python installed  
✅ Existing Astraea AI Platform codebase  

## Setup Steps (5 minutes)

### 1️⃣ Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized origins: `http://localhost:3000`
6. Copy the Client ID

### 2️⃣ Configure Backend
```bash
cd backend
cp .env.example .env
```
Edit `.env` and add:
```
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

### 3️⃣ Configure Frontend
```bash
cd frontend
cp .env.local.example .env.local
```
Edit `.env.local` and add:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
```

### 4️⃣ Install Dependencies
```bash
# Backend
cd backend
source aivenv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
yarn install
```

### 5️⃣ Migrate Database (if upgrading)
```bash
cd backend
python migrate_to_google_oauth.py
```

### 6️⃣ Run the Application
```bash
# Terminal 1 - Backend
cd backend
source aivenv/bin/activate
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
yarn dev
```

### 7️⃣ Test
1. Open http://localhost:3000/login
2. Click "Sign in with Google"
3. Select your Google account
4. ✨ You're in!

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid Client ID" | Check Client ID matches in both .env files |
| "Redirect URI mismatch" | Add `http://localhost:3000` to authorized origins |
| "Access blocked" | Add your email as test user in OAuth consent screen |
| Module not found | Run `pip install -r requirements.txt` and `yarn install` |

## What Changed?

### ❌ Removed
- Username/password login
- Password hashing
- Signup form

### ✅ Added
- Google Sign-In button
- OAuth token verification
- Automatic user creation
- Email-based authentication

## Key Files Modified

**Backend:**
- `requirements.txt` - Added Google OAuth libraries
- `app/models.py` - User model now uses email + google_id
- `app/auth.py` - Google token verification
- `app/main.py` - New `/auth/google` endpoint

**Frontend:**
- `package.json` - Added @react-oauth/google
- `app/layout.tsx` - GoogleOAuthProvider wrapper
- `app/login/page.tsx` - Google Sign-In button

## Need Help?

📖 Full documentation: `GOOGLE_OAUTH_SETUP.md`  
📝 Implementation details: `IMPLEMENTATION_SUMMARY.md`  
🔧 Migration script: `backend/migrate_to_google_oauth.py`

## Security Notes

🔒 Never commit `.env` or `.env.local` files  
🔒 Use HTTPS in production  
🔒 Rotate credentials regularly  
🔒 Different Client IDs for dev/prod
