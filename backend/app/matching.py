"""
Resume-Job Matching Algorithm
Provides semantic matching between job postings and candidate resumes.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import re


@dataclass
class MatchResult:
    score: float  # 0-100
    matching_skills: List[str]
    missing_skills: List[str]
    experience_match: float  # 0-100
    location_match: float  # 0-100
    reasons: List[str]


class JobResumeMatcher:
    """Match resumes to job postings based on multiple criteria."""
    
    def __init__(self):
        self.skill_weights = {
            'required': 2.0,
            'nice_to_have': 1.0
        }
    
    def calculate_match(
        self,
        resume: Dict[str, Any],
        job: Dict[str, Any]
    ) -> MatchResult:
        """Calculate comprehensive match score between a resume and job."""
        
        matching_skills = []
        missing_skills = []
        reasons = []
        
        # 1. Skills Match (40% of total score)
        skills_score, matched, missing = self._calculate_skills_match(
            resume.get('skills', []),
            job.get('required_skills', []),
            job.get('nice_to_have_skills', [])
        )
        matching_skills = matched
        missing_skills = missing
        
        if matched:
            reasons.append(f"Matches {len(matched)} required/nice-to-have skills")
        
        # 2. Experience Level Match (20% of total score)
        experience_score = self._calculate_experience_match(
            resume.get('work_experience', []),
            job.get('experience_level', '')
        )
        if experience_score >= 80:
            reasons.append("Experience level matches job requirements")
        
        # 3. Location Match (15% of total score)
        location_score = self._calculate_location_match(
            resume.get('preferred_location', ''),
            resume.get('remote_preference', 'any'),
            job.get('location', ''),
            job.get('is_remote', False),
            job.get('is_hybrid', False)
        )
        if location_score >= 80:
            reasons.append("Location preferences align")
        
        # 4. Keyword/Semantic Match (15% of total score)
        keyword_score = self._calculate_keyword_match(
            resume.get('keywords', []),
            job.get('keywords', []),
            job.get('description', '')
        )
        if keyword_score >= 70:
            reasons.append("Strong keyword alignment with job description")
        
        # 5. Title Match (10% of total score)
        title_score = self._calculate_title_match(
            resume.get('work_experience', []),
            job.get('title', '')
        )
        if title_score >= 70:
            reasons.append("Previous roles similar to this position")
        
        # Calculate weighted total score
        total_score = (
            skills_score * 0.40 +
            experience_score * 0.20 +
            location_score * 0.15 +
            keyword_score * 0.15 +
            title_score * 0.10
        )
        
        # Boost score for highly qualified candidates
        if len(matched) >= len(job.get('required_skills', [])) * 0.8 and experience_score >= 80:
            total_score = min(100, total_score * 1.1)
            reasons.append("Highly qualified candidate")
        
        return MatchResult(
            score=round(total_score, 1),
            matching_skills=matching_skills,
            missing_skills=missing_skills,
            experience_match=round(experience_score, 1),
            location_match=round(location_score, 1),
            reasons=reasons
        )
    
    def _calculate_skills_match(
        self,
        resume_skills: List[str],
        required_skills: List[str],
        nice_to_have_skills: List[str]
    ) -> Tuple[float, List[str], List[str]]:
        """Calculate skills match score."""
        if not required_skills and not nice_to_have_skills:
            return 100, [], []
        
        resume_skills_lower = [s.lower() for s in resume_skills]
        
        matched = []
        missing = []
        score = 0
        max_score = 0
        
        # Check required skills (weighted more heavily)
        for skill in required_skills:
            max_score += self.skill_weights['required']
            if any(self._skill_matches(skill.lower(), rs) for rs in resume_skills_lower):
                score += self.skill_weights['required']
                matched.append(skill)
            else:
                missing.append(skill)
        
        # Check nice-to-have skills
        for skill in nice_to_have_skills:
            max_score += self.skill_weights['nice_to_have']
            if any(self._skill_matches(skill.lower(), rs) for rs in resume_skills_lower):
                score += self.skill_weights['nice_to_have']
                matched.append(skill)
        
        if max_score == 0:
            return 100, matched, missing
        
        return (score / max_score) * 100, matched, missing
    
    def _skill_matches(self, job_skill: str, resume_skill: str) -> bool:
        """Check if a resume skill matches a job skill (with fuzzy matching)."""
        job_skill = job_skill.lower().strip()
        resume_skill = resume_skill.lower().strip()
        
        # Exact match
        if job_skill == resume_skill:
            return True
        
        # Contains match
        if job_skill in resume_skill or resume_skill in job_skill:
            return True
        
        # Common variations
        variations = {
            'javascript': ['js', 'ecmascript'],
            'typescript': ['ts'],
            'python': ['py'],
            'react': ['reactjs', 'react.js'],
            'node': ['nodejs', 'node.js'],
            'aws': ['amazon web services'],
            'gcp': ['google cloud platform', 'google cloud'],
            'azure': ['microsoft azure'],
            'machine learning': ['ml'],
            'artificial intelligence': ['ai'],
            'user interface': ['ui'],
            'user experience': ['ux'],
        }
        
        for main, alts in variations.items():
            all_forms = [main] + alts
            if job_skill in all_forms and resume_skill in all_forms:
                return True
        
        return False
    
    def _calculate_experience_match(
        self,
        work_experience: List[Dict[str, Any]],
        required_level: str
    ) -> float:
        """Calculate experience level match."""
        if not required_level:
            return 100
        
        # Calculate total years of experience
        total_years = self._calculate_total_years_experience(work_experience)
        
        # Define expected years for each level
        level_expectations = {
            'entry': (0, 2),
            'mid': (2, 5),
            'senior': (5, 10),
            'lead': (7, 15),
            'executive': (10, 50)
        }
        
        required_level = required_level.lower()
        if required_level not in level_expectations:
            return 100  # Unknown level, assume match
        
        min_years, max_years = level_expectations[required_level]
        
        if total_years >= min_years:
            if total_years <= max_years + 2:  # Allow some flexibility
                return 100
            else:
                # Overqualified but still good
                return 90
        else:
            # Calculate partial match
            ratio = total_years / min_years if min_years > 0 else 1
            return min(100, ratio * 100)
    
    def _calculate_total_years_experience(
        self,
        work_experience: List[Dict[str, Any]]
    ) -> float:
        """Calculate total years of work experience."""
        total_months = 0
        
        for job in work_experience:
            start = job.get('start_date', '')
            end = job.get('end_date', '')
            is_current = job.get('is_current', False)
            
            # Parse dates (simplified - assumes YYYY or YYYY-MM format)
            try:
                start_year = int(start.split('-')[0]) if start else None
                if is_current or not end:
                    end_year = datetime.now().year
                else:
                    end_year = int(end.split('-')[0]) if end else start_year
                
                if start_year and end_year:
                    months = (end_year - start_year) * 12
                    total_months += max(0, months)
            except (ValueError, IndexError):
                continue
        
        return total_months / 12
    
    def _calculate_location_match(
        self,
        preferred_location: str,
        remote_preference: str,
        job_location: str,
        is_remote: bool,
        is_hybrid: bool
    ) -> float:
        """Calculate location compatibility."""
        
        # If job is remote and candidate wants remote = perfect match
        if is_remote and remote_preference == 'remote':
            return 100
        
        # If job is hybrid and candidate wants hybrid = perfect match
        if is_hybrid and remote_preference == 'hybrid':
            return 100
        
        # If candidate prefers remote but job isn't remote
        if remote_preference == 'remote' and not is_remote:
            return 30
        
        # Check location match
        if preferred_location and job_location:
            pref = preferred_location.lower()
            job_loc = job_location.lower()
            
            if pref in job_loc or job_loc in pref:
                return 100
            
            # Check for state/country match (simplified)
            pref_parts = pref.split(',')
            job_parts = job_loc.split(',')
            
            if len(pref_parts) > 1 and len(job_parts) > 1:
                if pref_parts[-1].strip() == job_parts[-1].strip():  # Same state/country
                    return 70
        
        # If candidate is flexible
        if remote_preference == 'any':
            return 80
        
        return 50
    
    def _calculate_keyword_match(
        self,
        resume_keywords: List[str],
        job_keywords: List[str],
        job_description: str
    ) -> float:
        """Calculate keyword/semantic match."""
        if not job_keywords and not job_description:
            return 100
        
        resume_kw_set = set(k.lower() for k in resume_keywords)
        
        # Extract keywords from job description
        desc_keywords = set()
        if job_description:
            # Simple keyword extraction (in production, use NLP)
            words = re.findall(r'\b[A-Za-z]{4,}\b', job_description.lower())
            desc_keywords = set(words)
        
        all_job_keywords = set(k.lower() for k in job_keywords) | desc_keywords
        
        if not all_job_keywords:
            return 100
        
        matches = resume_kw_set & all_job_keywords
        
        return (len(matches) / len(all_job_keywords)) * 100
    
    def _calculate_title_match(
        self,
        work_experience: List[Dict[str, Any]],
        job_title: str
    ) -> float:
        """Calculate job title similarity."""
        if not job_title or not work_experience:
            return 50  # Neutral
        
        job_title_lower = job_title.lower()
        best_match = 0
        
        for job in work_experience:
            exp_title = job.get('title', '').lower()
            if not exp_title:
                continue
            
            # Exact match
            if job_title_lower == exp_title:
                return 100
            
            # Contains match
            if job_title_lower in exp_title or exp_title in job_title_lower:
                best_match = max(best_match, 80)
            
            # Word overlap
            job_words = set(job_title_lower.split())
            exp_words = set(exp_title.split())
            if job_words and exp_words:
                overlap = len(job_words & exp_words) / len(job_words | exp_words)
                best_match = max(best_match, overlap * 100)
        
        return best_match
    
    def rank_candidates(
        self,
        resumes: List[Dict[str, Any]],
        job: Dict[str, Any],
        min_score: float = 0
    ) -> List[Tuple[Dict[str, Any], MatchResult]]:
        """Rank candidates by match score for a given job."""
        results = []
        
        for resume in resumes:
            match = self.calculate_match(resume, job)
            if match.score >= min_score:
                results.append((resume, match))
        
        # Sort by score descending
        results.sort(key=lambda x: x[1].score, reverse=True)
        
        return results
    
    def find_matching_jobs(
        self,
        resume: Dict[str, Any],
        jobs: List[Dict[str, Any]],
        min_score: float = 0
    ) -> List[Tuple[Dict[str, Any], MatchResult]]:
        """Find jobs that match a candidate's resume."""
        results = []
        
        for job in jobs:
            match = self.calculate_match(resume, job)
            if match.score >= min_score:
                results.append((job, match))
        
        # Sort by score descending
        results.sort(key=lambda x: x[1].score, reverse=True)
        
        return results


# Import datetime here to avoid circular import
from datetime import datetime

# Singleton instance
matcher = JobResumeMatcher()
