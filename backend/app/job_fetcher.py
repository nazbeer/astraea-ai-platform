"""
Global Job Fetcher Module
Fetches job listings from multiple sources for worldwide coverage including India.
"""

import os
import requests
import random
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

class GlobalJobFetcher:
    """Fetch real job listings from multiple global sources."""
    
    def __init__(self):
        # API Keys (optional - falls back to mock data if not configured)
        self.adzuna_app_id = os.getenv("ADZUNA_APP_ID", "")
        self.adzuna_api_key = os.getenv("ADZUNA_API_KEY", "")
        self.jooble_api_key = os.getenv("JOOBLE_API_KEY", "")
        
        # Country configurations for better coverage
        self.country_configs = {
            'us': {'name': 'United States', 'currency': 'USD', 'salary_range': (80000, 200000)},
            'gb': {'name': 'United Kingdom', 'currency': 'GBP', 'salary_range': (40000, 120000)},
            'in': {'name': 'India', 'currency': 'INR', 'salary_range': (600000, 2500000)},
            'ca': {'name': 'Canada', 'currency': 'CAD', 'salary_range': (70000, 180000)},
            'au': {'name': 'Australia', 'currency': 'AUD', 'salary_range': (80000, 180000)},
            'de': {'name': 'Germany', 'currency': 'EUR', 'salary_range': (50000, 120000)},
            'sg': {'name': 'Singapore', 'currency': 'SGD', 'salary_range': (60000, 180000)},
            'ae': {'name': 'UAE', 'currency': 'AED', 'salary_range': (150000, 450000)},
        }
    
    def fetch_jobs(
        self,
        query: str = "",
        location: str = "",
        work_type: str = "",  # 'remote', 'onsite', 'hybrid', ''
        experience_level: str = "",
        page: int = 1,
        limit: int = 20,
        country: str = ""
    ) -> List[Dict[str, Any]]:
        """Fetch jobs from multiple sources for global coverage."""
        all_jobs = []
        
        # Try multiple countries if no specific country
        countries_to_search = [country] if country else ['us', 'in', 'gb', 'ca', 'au', 'de']
        
        # Limit per source
        per_source_limit = max(limit // len(countries_to_search), 5)
        
        for ctry in countries_to_search:
            # Try Adzuna API
            if self.adzuna_app_id and self.adzuna_api_key:
                try:
                    jobs = self._fetch_adzuna_jobs(
                        query, location, work_type, ctry, page, per_source_limit
                    )
                    all_jobs.extend(jobs)
                except Exception as e:
                    print(f"Adzuna API failed for {ctry}: {e}")
            
            # Try Jooble API (good for India and global)
            if self.jooble_api_key:
                try:
                    jobs = self._fetch_jooble_jobs(
                        query, location, work_type, ctry, page, per_source_limit
                    )
                    all_jobs.extend(jobs)
                except Exception as e:
                    print(f"Jooble API failed: {e}")
        
        # If no API results or APIs not configured, use enhanced mock data
        if len(all_jobs) < limit:
            mock_jobs = self._get_enhanced_mock_jobs(
                query, location, work_type, experience_level, limit - len(all_jobs), countries_to_search
            )
            all_jobs.extend(mock_jobs)
        
        # Shuffle to mix sources
        random.shuffle(all_jobs)
        
        return all_jobs[:limit]
    
    def _fetch_adzuna_jobs(
        self,
        query: str,
        location: str,
        work_type: str,
        country: str,
        page: int,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch jobs from Adzuna API."""
        base_url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/{page}"
        
        params = {
            "app_id": self.adzuna_app_id,
            "app_key": self.adzuna_api_key,
            "results_per_page": limit,
            "what": query or "software developer",
            "max_days_old": 30,
            "sort_by": "date",
        }
        
        if location:
            params["where"] = location
        
        # Work type filtering
        if work_type == "remote":
            params["what"] = f"{params['what']} remote"
        
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        jobs = []
        for result in data.get("results", []):
            job = self._normalize_job(result, country, "adzuna")
            jobs.append(job)
        
        return jobs
    
    def _fetch_jooble_jobs(
        self,
        query: str,
        location: str,
        work_type: str,
        country: str,
        page: int,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch jobs from Jooble API."""
        url = f"https://jooble.org/api/{self.jooble_api_key}"
        
        keywords = query or "software developer"
        if work_type == "remote":
            keywords += " remote"
        
        body = {
            "keywords": keywords,
            "location": location or "",
            "page": page,
            "result_on_page": limit,
        }
        
        response = requests.post(url, json=body, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        jobs = []
        for result in data.get("jobs", []):
            job = self._normalize_jooble_job(result, country)
            jobs.append(job)
        
        return jobs
    
    def _normalize_job(self, adzuna_job: Dict, country: str, source: str) -> Dict[str, Any]:
        """Normalize Adzuna job to our format."""
        config = self.country_configs.get(country, self.country_configs['us'])
        
        title = adzuna_job.get("title", "")
        description = adzuna_job.get("description", "")
        
        # Detect remote/hybrid from title/description
        is_remote = any(word in (title + description).lower() for word in 
                       ['remote', 'work from home', 'wfh', 'telecommute'])
        is_hybrid = 'hybrid' in (title + description).lower()
        
        return {
            "external_id": f"{source}_{adzuna_job.get('id', '')}",
            "title": title,
            "description": description[:2000],
            "requirements": "",
            "responsibilities": "",
            "employment_type": self._detect_employment_type(title),
            "experience_level": self._detect_experience_level(title),
            "category": adzuna_job.get("category", {}).get("label", "Software Engineering"),
            "location": adzuna_job.get("location", {}).get("display_name", config['name']),
            "is_remote": is_remote,
            "is_hybrid": is_hybrid,
            "salary_min": adzuna_job.get("salary_min"),
            "salary_max": adzuna_job.get("salary_max"),
            "salary_currency": adzuna_job.get("salary_currency", config['currency']),
            "required_skills": self._extract_skills_from_description(description),
            "nice_to_have_skills": [],
            "company": {
                "name": adzuna_job.get("company", {}).get("display_name", "Company"),
                "description": "",
            },
            "application_url": adzuna_job.get("redirect_url", ""),
            "external_source": source,
            "country": country,
            "posted_at": adzuna_job.get("created_at", datetime.utcnow().isoformat()),
        }
    
    def _normalize_jooble_job(self, jooble_job: Dict, country: str) -> Dict[str, Any]:
        """Normalize Jooble job to our format."""
        config = self.country_configs.get(country, self.country_configs['us'])
        
        title = jooble_job.get("title", "")
        description = jooble_job.get("snippet", "")
        
        is_remote = any(word in title.lower() for word in ['remote', 'work from home', 'wfh'])
        is_hybrid = 'hybrid' in title.lower()
        
        # Parse salary if available
        salary_min, salary_max = None, None
        salary_text = jooble_job.get("salary", "")
        if salary_text:
            salary_nums = re.findall(r'[\d,]+', salary_text.replace(',', ''))
            if len(salary_nums) >= 2:
                salary_min, salary_max = int(salary_nums[0]), int(salary_nums[1])
        
        return {
            "external_id": f"jooble_{jooble_job.get('id', '')}",
            "title": title,
            "description": description,
            "requirements": "",
            "responsibilities": "",
            "employment_type": self._detect_employment_type(title),
            "experience_level": self._detect_experience_level(title),
            "category": "Software Engineering",
            "location": jooble_job.get("location", config['name']),
            "is_remote": is_remote,
            "is_hybrid": is_hybrid,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_currency": config['currency'],
            "required_skills": self._extract_skills_from_description(description),
            "nice_to_have_skills": [],
            "company": {
                "name": jooble_job.get("company", "Company"),
                "description": "",
            },
            "application_url": jooble_job.get("link", ""),
            "external_source": "jooble",
            "country": country,
            "posted_at": datetime.utcnow().isoformat(),
        }
    
    def _detect_employment_type(self, title: str) -> str:
        """Detect employment type from job title."""
        title_lower = title.lower()
        if any(word in title_lower for word in ['contract', 'contractor', 'freelance']):
            return "contract"
        elif any(word in title_lower for word in ['part-time', 'part time']):
            return "part-time"
        elif any(word in title_lower for word in ['intern', 'internship', 'trainee']):
            return "internship"
        return "full-time"
    
    def _detect_experience_level(self, title: str) -> str:
        """Detect experience level from job title."""
        title_lower = title.lower()
        if any(word in title_lower for word in ['senior', 'sr.', 'lead', 'principal', 'staff']):
            return "senior"
        elif any(word in title_lower for word in ['manager', 'director', 'head of']):
            return "lead"
        elif any(word in title_lower for word in ['junior', 'jr.', 'entry', 'associate', 'intern', 'trainee']):
            return "entry"
        return "mid"
    
    def _extract_skills_from_description(self, description: str) -> List[str]:
        """Extract skills from job description."""
        common_skills = [
            "python", "javascript", "java", "c++", "c#", "go", "rust", "ruby", "php",
            "react", "angular", "vue", "node", "express", "django", "flask", "spring",
            "sql", "postgresql", "mysql", "mongodb", "redis",
            "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
            "machine learning", "tensorflow", "pytorch", "data science",
            "git", "agile", "scrum", "ci/cd", "jenkins",
        ]
        
        desc_lower = description.lower()
        found_skills = []
        for skill in common_skills:
            if skill in desc_lower:
                found_skills.append(skill.title())
        return found_skills[:10]
    
    def _get_enhanced_mock_jobs(
        self,
        query: str,
        location: str,
        work_type: str,
        experience_level: str,
        limit: int,
        countries: List[str]
    ) -> List[Dict[str, Any]]:
        """Generate comprehensive mock jobs for global coverage."""
        
        base_jobs = [
            # US Jobs
            {
                "title": "Senior Software Engineer",
                "company": "Google",
                "location": "Mountain View, CA",
                "country": "us",
                "is_remote": True,
                "is_hybrid": False,
                "salary_min": 180000,
                "salary_max": 280000,
                "currency": "USD",
                "skills": ["Python", "Java", "Kubernetes", "Distributed Systems"],
            },
            {
                "title": "Full Stack Developer",
                "company": "Meta",
                "location": "New York, NY",
                "country": "us",
                "is_remote": True,
                "is_hybrid": True,
                "salary_min": 140000,
                "salary_max": 200000,
                "currency": "USD",
                "skills": ["React", "Node.js", "GraphQL", "PostgreSQL"],
            },
            # India Jobs
            {
                "title": "Software Development Engineer",
                "company": "Amazon",
                "location": "Bangalore, India",
                "country": "in",
                "is_remote": False,
                "is_hybrid": True,
                "salary_min": 1800000,
                "salary_max": 3500000,
                "currency": "INR",
                "skills": ["Java", "Python", "AWS", "System Design"],
            },
            {
                "title": "Senior Frontend Developer",
                "company": "Flipkart",
                "location": "Bangalore, India",
                "country": "in",
                "is_remote": True,
                "is_hybrid": False,
                "salary_min": 2500000,
                "salary_max": 4500000,
                "currency": "INR",
                "skills": ["React", "TypeScript", "Next.js", "Tailwind CSS"],
            },
            {
                "title": "Data Scientist",
                "company": "Paytm",
                "location": "Noida, India",
                "country": "in",
                "is_remote": False,
                "is_hybrid": True,
                "salary_min": 1500000,
                "salary_max": 3000000,
                "currency": "INR",
                "skills": ["Python", "Machine Learning", "SQL", "TensorFlow"],
            },
            {
                "title": "DevOps Engineer",
                "company": "Infosys",
                "location": "Pune, India",
                "country": "in",
                "is_remote": True,
                "is_hybrid": False,
                "salary_min": 1200000,
                "salary_max": 2500000,
                "currency": "INR",
                "skills": ["AWS", "Docker", "Kubernetes", "Jenkins"],
            },
            {
                "title": "Backend Developer (Go)",
                "company": "Razorpay",
                "location": "Bangalore, India",
                "country": "in",
                "is_remote": True,
                "is_hybrid": True,
                "salary_min": 2000000,
                "salary_max": 4000000,
                "currency": "INR",
                "skills": ["Go", "PostgreSQL", "Redis", "Microservices"],
            },
            {
                "title": "Mobile App Developer",
                "company": "Swiggy",
                "location": "Hyderabad, India",
                "country": "in",
                "is_remote": False,
                "is_hybrid": True,
                "salary_min": 1600000,
                "salary_max": 3200000,
                "currency": "INR",
                "skills": ["Flutter", "Dart", "Firebase", "REST APIs"],
            },
            # UK Jobs
            {
                "title": "Python Developer",
                "company": "Revolut",
                "location": "London, UK",
                "country": "gb",
                "is_remote": True,
                "is_hybrid": True,
                "salary_min": 70000,
                "salary_max": 110000,
                "currency": "GBP",
                "skills": ["Python", "FastAPI", "PostgreSQL", "AWS"],
            },
            # Germany Jobs
            {
                "title": "Senior Backend Engineer",
                "company": "Zalando",
                "location": "Berlin, Germany",
                "country": "de",
                "is_remote": True,
                "is_hybrid": False,
                "salary_min": 75000,
                "salary_max": 110000,
                "currency": "EUR",
                "skills": ["Java", "Spring Boot", "Kafka", "AWS"],
            },
            # Singapore Jobs
            {
                "title": "Cloud Architect",
                "company": "Grab",
                "location": "Singapore",
                "country": "sg",
                "is_remote": False,
                "is_hybrid": True,
                "salary_min": 120000,
                "salary_max": 180000,
                "currency": "SGD",
                "skills": ["AWS", "Terraform", "Kubernetes", "Python"],
            },
            # Canada Jobs
            {
                "title": "Machine Learning Engineer",
                "company": "Shopify",
                "location": "Toronto, Canada",
                "country": "ca",
                "is_remote": True,
                "is_hybrid": False,
                "salary_min": 130000,
                "salary_max": 190000,
                "currency": "CAD",
                "skills": ["Python", "PyTorch", "MLOps", "AWS"],
            },
            # UAE Jobs
            {
                "title": "Solutions Architect",
                "company": "Careem",
                "location": "Dubai, UAE",
                "country": "ae",
                "is_remote": False,
                "is_hybrid": True,
                "salary_min": 350000,
                "salary_max": 550000,
                "currency": "AED",
                "skills": ["AWS", "Microservices", "System Design", "Java"],
            },
            # Remote-first companies
            {
                "title": "Staff Engineer",
                "company": "GitLab",
                "location": "Remote (Global)",
                "country": "us",
                "is_remote": True,
                "is_hybrid": False,
                "salary_min": 200000,
                "salary_max": 300000,
                "currency": "USD",
                "skills": ["Ruby", "Go", "Kubernetes", "PostgreSQL"],
            },
            {
                "title": "Security Engineer",
                "company": "Stripe",
                "location": "Remote (Global)",
                "country": "us",
                "is_remote": True,
                "is_hybrid": False,
                "salary_min": 180000,
                "salary_max": 260000,
                "currency": "USD",
                "skills": ["Python", "Go", "Security", "Cryptography"],
            },
        ]
        
        # Generate variations
        jobs = []
        companies_pool = [
            ("Netflix", "us"), ("Airbnb", "us"), ("Uber", "us"), ("LinkedIn", "us"),
            ("Adobe", "us"), ("Salesforce", "us"), ("Twitter/X", "us"), ("Spotify", "us"),
            ("TCS", "in"), ("Wipro", "in"), ("HCL", "in"), ("Tech Mahindra", "in"),
            ("Zomato", "in"), ("Ola", "in"), ("BYJU's", "in"), ("CRED", "in"),
            ("Deloitte", "gb"), ("Accenture", "gb"), ("BP", "gb"), ("HSBC", "gb"),
        ]
        
        titles_pool = [
            "Software Engineer", "Senior Developer", "Tech Lead", "Principal Engineer",
            "Full Stack Engineer", "Backend Engineer", "Frontend Engineer",
            "DevOps Engineer", "Site Reliability Engineer", "Platform Engineer",
            "Data Engineer", "ML Engineer", "AI Engineer",
            "Mobile Developer", "iOS Developer", "Android Developer",
            "Cloud Engineer", "Security Engineer", "QA Engineer",
        ]
        
        indian_cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Gurgaon", "Noida"]
        
        # Create more variations
        for i in range(limit):
            if i < len(base_jobs):
                job_data = base_jobs[i]
            else:
                # Generate random job
                company, country = random.choice(companies_pool)
                title = random.choice(titles_pool)
                
                config = self.country_configs.get(country, self.country_configs['us'])
                
                if country == "in":
                    location = f"{random.choice(indian_cities)}, India"
                else:
                    location = config['name']
                
                salary_min, salary_max = config['salary_range']
                actual_salary_min = random.randint(salary_min, salary_max // 2)
                actual_salary_max = random.randint(actual_salary_min, salary_max)
                
                job_data = {
                    "title": title,
                    "company": company,
                    "location": location,
                    "country": country,
                    "is_remote": random.choice([True, False, False]),
                    "is_hybrid": random.choice([True, False]),
                    "salary_min": actual_salary_min,
                    "salary_max": actual_salary_max,
                    "currency": config['currency'],
                    "skills": random.sample(["Python", "Java", "React", "AWS", "Kubernetes", "SQL", "Node.js"], k=3),
                }
            
            # Apply filters
            if work_type == "remote" and not job_data.get("is_remote"):
                continue
            if work_type == "onsite" and job_data.get("is_remote"):
                continue
            if work_type == "hybrid" and not job_data.get("is_hybrid"):
                continue
            
            # Create full job object
            job = {
                "external_id": f"mock_{i}_{job_data['title'].replace(' ', '_').lower()}",
                "title": job_data["title"],
                "description": f"Join {job_data['company']} as a {job_data['title']}. You will work on cutting-edge projects and collaborate with talented teams.",
                "requirements": f"- Experience with {', '.join(job_data['skills'])}\n- Strong problem-solving skills\n- Good communication abilities",
                "responsibilities": "- Develop and maintain software applications\n- Collaborate with cross-functional teams\n- Write clean, maintainable code",
                "employment_type": "full-time",
                "experience_level": self._detect_experience_level(job_data["title"]),
                "category": "Software Engineering",
                "location": job_data["location"],
                "is_remote": job_data.get("is_remote", False),
                "is_hybrid": job_data.get("is_hybrid", False),
                "salary_min": job_data.get("salary_min"),
                "salary_max": job_data.get("salary_max"),
                "salary_currency": job_data.get("currency", "USD"),
                "required_skills": job_data.get("skills", []),
                "nice_to_have_skills": [],
                "company": {
                    "name": job_data["company"],
                    "description": f"{job_data['company']} is a leading technology company.",
                },
                "application_url": f"https://careers.{job_data['company'].lower().replace(' ', '')}.com/jobs",
                "external_source": "mock",
                "country": job_data.get("country", "us"),
                "posted_at": (datetime.utcnow() - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            jobs.append(job)
        
        return jobs[:limit]


# Import re for regex
import re

# Singleton instance
job_fetcher = GlobalJobFetcher()
