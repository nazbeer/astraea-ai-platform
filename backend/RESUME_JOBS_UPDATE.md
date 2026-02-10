# Resume Upload & External Jobs Integration

## New Features Added

### 1. Resume Upload & Parse (PDF/DOCX)

Users can now upload their existing resume in PDF or DOCX format, and the system will automatically:
- Extract text from the document
- Parse contact information (name, email, phone)
- Extract skills using both rule-based and AI-powered extraction
- Identify work experience and education
- Calculate ATS score for the uploaded resume
- Auto-fill the resume builder with parsed data

#### API Endpoint
```
POST /resume/upload
Content-Type: multipart/form-data

Body:
- file: PDF or DOCX file

Response:
{
  "message": "Resume uploaded and parsed successfully",
  "parsed_data": {
    "full_name": "...",
    "email": "...",
    "phone": "...",
    "skills": [...],
    ...
  },
  "ats_score": 75,
  "resume_id": 123
}
```

#### Frontend
- Added "Upload Resume (PDF/DOCX)" button in the resume builder
- Shows parsed data summary before importing
- Displays extracted information including:
  - Name, email, phone
  - Skills found
  - ATS score

### 2. External Job Listings

Job search now includes real job listings from external sources:

#### Current Implementation: Mock Jobs
The system includes 8 realistic mock jobs covering various roles:
- Senior Software Engineer
- Full Stack Developer
- Data Scientist
- DevOps Engineer
- Product Manager
- UX/UI Designer
- Machine Learning Engineer
- Frontend Developer (React)

These appear alongside internal job postings.

#### Optional: Adzuna API Integration
To fetch real jobs from the internet:

1. Sign up for free API keys at https://developer.adzuna.com/
2. Add to your `.env` file:
```
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key
```
3. Restart the backend

The system will automatically fetch real jobs from Adzuna when available.

#### API Changes
The `/jobs` endpoint now accepts an `include_external` parameter:
```
GET /jobs?query=python&location=remote&include_external=true
```

Response includes:
```json
{
  "jobs": [...],
  "total": 25,
  "page": 1,
  "pages": 2,
  "sources": {
    "internal": 5,
    "external": 20
  }
}
```

Jobs from external sources have:
- `source`: "external" or "adzuna"
- `external_id`: ID from the external source
- `application_url`: Direct link to apply on the external site

## Files Modified/Created

### Backend
1. **app/resume_parser.py** (NEW)
   - PDF text extraction using PyPDF
   - DOCX text extraction using python-docx
   - Rule-based information extraction
   - AI-powered extraction using OpenAI
   - ATS score calculation

2. **app/job_fetcher.py** (NEW)
   - Adzuna API integration
   - Mock job data for demonstration
   - Job format normalization
   - Skills extraction from descriptions

3. **app/main.py**
   - Added `POST /resume/upload` endpoint
   - Modified `GET /jobs` to include external jobs
   - Added imports for resume_parser and job_fetcher

4. **.env.example**
   - Added Adzuna API configuration

### Frontend
1. **app/resume/builder/page.tsx**
   - Added file upload UI
   - Added upload modal with parsed data preview
   - Added `Loader2` import for loading state

## Usage

### Upload Resume
1. Go to "My Resume" in the sidebar
2. Click "Upload Resume (PDF/DOCX)" button
3. Select your resume file
4. Review the parsed data
5. Click "Import to Resume" to auto-fill

### View External Jobs
1. Go to "Find Jobs" in the sidebar
2. Jobs from external sources appear automatically
3. External jobs are marked with their source
4. Click "Apply" to visit the external application page

## Configuration

### Enable Real Job API (Optional)
To fetch real jobs instead of mock data:

1. Register at https://developer.adzuna.com/
2. Create an app to get API credentials
3. Add to `backend/.env`:
```
ADZUNA_APP_ID=your_app_id_here
ADZUNA_API_KEY=your_api_key_here
```

### Supported Countries
Adzuna supports: us, gb, au, ca, de, fr, in, etc.
Modify `job_fetcher.py` to change the default country.

## Testing

### Resume Upload Test
```bash
# Upload a PDF resume
curl -X POST http://localhost:8000/resume/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/resume.pdf"
```

### Job Search Test
```bash
# Search with external jobs
curl "http://localhost:8000/jobs?query=python&include_external=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

- Resume parsing uses both regex patterns and AI (if OpenAI API key is configured)
- ATS score for uploaded resumes is calculated based on:
  - Contact info presence (20 pts)
  - Summary length (20 pts)
  - Number of skills (20 pts)
  - Work experience (20 pts)
  - Education (20 pts)
- External job listings are fetched in real-time and not stored in the database
- Mock jobs are used as fallback when external APIs fail or are not configured
