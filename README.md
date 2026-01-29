# Astraea AI Platform

Astraea is a FAANG-grade, production-ready AI platform with streaming LLM responses, RAG, Redis memory, and a full-stack architecture.

## Features
- **Google OAuth Authentication** - Secure sign-in with Google SSO
- Real-time token streaming
- Retrieval-Augmented Generation (FAISS)
- Redis-backed memory
- API auth + rate limiting
- Observability + health checks
- Cloud-native Docker deployment

## Stack
FastAPI • OpenAI • FAISS • Redis • Next.js • Docker • Google OAuth

## Quick Start

### 1. Setup Google OAuth
Follow the detailed guide in [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) to configure Google OAuth authentication.

### 2. Configure Environment Variables

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your credentials
```

**Frontend** (`frontend/.env.local`):
```bash
cp frontend/.env.local.example frontend/.env.local
# Edit frontend/.env.local and add your Google Client ID
```

### 3. Run Backend
```bash
cd backend
source aivenv/bin/activate  # Activate virtual environment
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Or with Docker:
```bash
docker build -t backend .
docker run -p 8000:8000 --env-file .env backend
```

### 4. Run Frontend
```bash
cd frontend
yarn install
yarn dev
```

## Database Migration

If you're upgrading from the old username/password system, run the migration script:

```bash
cd backend
python migrate_to_google_oauth.py
```

## Authentication

The platform now uses **Google OAuth 2.0** for authentication:
- Users sign in with their Google account
- No passwords are stored in the database
- Secure JWT tokens for API access
- Automatic user creation on first sign-in

## API Endpoints

- `POST /auth/google` - Authenticate with Google OAuth token
- `GET /profile` - Get user profile
- `POST /chat` - Send chat message (requires authentication)
- `GET /history` - Get chat history (requires authentication)
- `GET /health` - Health check

## License
MIT
