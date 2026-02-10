# Astraea AI Platform

Astraea is a FAANG-grade, production-ready AI platform with streaming LLM responses, RAG, Redis memory, Google OAuth authentication, and a comprehensive Job Hunting platform.

## Features

### AI Platform
- **Google OAuth Authentication** - Secure sign-in with Google SSO
- **Multi-Model Chat** - Access GPT-4, GPT-4o Mini, GPT-3.5 Turbo, and custom models
- **Real-time Token Streaming** - Instant AI responses
- **Retrieval-Augmented Generation (FAISS)** - Document-based AI responses
- **Redis-backed Memory** - Persistent conversation context
- **AI Agents** - Autonomous agents with tool calling
- **Custom Models** - Train and deploy custom AI models
- **API Auth + Rate Limiting** - Secure API access

### Job Hunting Platform
- **For Candidates:**
  - Job search with advanced filters (location, remote/hybrid, salary, skills)
  - ATS-friendly Resume Builder with PDF/DOCX export
  - AI-generated cover letters
  - One-click job applications
  - Application tracking dashboard
  - Job recommendations based on resume matching
  - Save jobs for later

- **For Organizations:**
  - Company profile management
  - Job posting and management
  - Application tracking with match scores
  - Candidate search and filtering
  - AI-powered candidate-job matching

## Stack

FastAPI • OpenAI • FAISS • Redis • Next.js • SQLAlchemy • ReportLab • Google OAuth

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

The platform uses **Google OAuth 2.0** for authentication:
- Users sign in with their Google account
- No passwords are stored in the database
- Secure JWT tokens for API access
- Automatic user creation on first sign-in

## API Endpoints

### Authentication
- `POST /auth/google` - Authenticate with Google OAuth token
- `GET /profile` - Get user profile
- `PATCH /profile/user-type` - Set user type (candidate/organization)

### Chat & AI
- `POST /chat` - Send chat message (requires authentication)
- `GET /history` - Get chat history (requires authentication)
- `GET /models` - List custom models

### Job Platform

#### Resume Management
- `GET /resume` - Get user's resume
- `POST /resume` - Create/update resume
- `POST /resume/generate-pdf` - Generate PDF resume
- `POST /resume/generate-docx` - Generate DOCX resume
- `GET /resume/ats-score` - Get ATS compatibility score

#### Job Management
- `GET /jobs` - Search and filter jobs
- `POST /jobs` - Create job posting (organization only)
- `GET /jobs/:id` - Get job details
- `POST /jobs/:id/save` - Save job
- `GET /jobs/recommended` - Get recommended jobs

#### Applications
- `POST /applications` - Apply to job
- `GET /applications/my` - Get my applications
- `GET /applications/received` - Get applications for my jobs (recruiters)
- `PATCH /applications/:id` - Update application status

#### Candidate Search (Organizations)
- `POST /resumes/search` - Search candidate resumes
- `POST /jobs/:id/match-candidates` - Find matching candidates

### System
- `GET /health` - Health check

## Job Platform Usage

### For Job Seekers

1. **Create Your Resume**
   - Navigate to "My Resume" from the sidebar
   - Fill in your personal information, experience, education, skills
   - Check your ATS score
   - Export as PDF or DOCX

2. **Find Jobs**
   - Click "Find Jobs" in the sidebar
   - Use filters to narrow down opportunities
   - Save interesting jobs for later
   - View job details and requirements

3. **Apply**
   - Click "Apply Now" on a job listing
   - Review your resume match score
   - Optionally generate an AI cover letter
   - Submit your application

4. **Track Applications**
   - View all your applications in "My Applications"
   - See application status (pending, reviewing, shortlisted, hired, rejected)
   - Review match scores and reasons

### For Recruiters

1. **Setup Company Profile**
   - Go to "Recruiter Dashboard"
   - Create your company profile
   - Add company details and branding

2. **Post Jobs**
   - Click "Post New Job"
   - Fill in job details, requirements, and skills
   - Set salary range and location
   - Publish the job

3. **Review Applications**
   - View incoming applications with match scores
   - See candidate resumes and skills
   - Update application status
   - Shortlist or reject candidates

4. **Find Candidates**
   - Use "Find Candidates" to search public resumes
   - Filter by skills, location, ATS score
   - View matching candidates for specific jobs

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│   OpenAI    │
│   (Next.js) │◀────│  (FastAPI)  │◀────│    API      │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐   ┌────────┐   ┌────────┐
         │ SQLite │   │ FAISS  │   │ Redis  │
         │   DB   │   │  RAG   │   │ Memory │
         └────────┘   └────────┘   └────────┘
```

## License

MIT

## Support

For detailed implementation information, see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
