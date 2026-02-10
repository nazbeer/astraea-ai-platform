import math
import requests
import os

def calculator(expression: str):
    """
    Evaluates a mathematical expression.
    Safe evaluation of basic math operations.
    """
    allowed_names = {
        k: v for k, v in math.__dict__.items() if not k.startswith("__")
    }
    allowed_names.update({"abs": abs, "round": round})
    
    code = compile(expression, "<string>", "eval")
    for name in code.co_names:
        if name not in allowed_names:
            raise NameError(f"Use of {name} is not allowed")
    
    return eval(code, {"__builtins__": {}}, allowed_names)

def search(query: str):
    """
    Simulates a web search since we don't have a real search API key configured yet.
    """
    return f"Simulated search results for: {query}. (Integrate Serper/DuckDuckGo here for real results)"

def search_jobs(keywords: str = "", location: str = "", remote: bool = False, job_type: str = ""):
    """
    Search for job openings based on keywords, location, and filters.
    Uses Jooble API to fetch real job listings.
    
    Args:
        keywords: Job title, skills, or company (e.g., "software engineer", "python developer")
        location: City, state, or country (e.g., "San Francisco", "Remote")
        remote: Whether to filter for remote jobs only
        job_type: Type of employment (e.g., "full-time", "part-time", "contract")
    
    Returns:
        List of matching job openings with details
    """
    try:
        jooble_api_key = os.getenv("JOOBLE_API_KEY", "")
        
        if not jooble_api_key:
            return "Job search API not configured. Please set JOOBLE_API_KEY environment variable."
        
        url = f"https://jooble.org/api/{jooble_api_key}"
        
        payload = {
            "keywords": keywords,
            "location": location,
            "page": 1,
            "result_on_page": 10
        }
        
        # Add remote filter to keywords if specified
        if remote:
            payload["keywords"] = f"{keywords} remote".strip()
        
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            jobs = data.get("jobs", [])
            
            if not jobs:
                return f"No jobs found for '{keywords}' in '{location}'. Try broadening your search."
            
            # Format job listings
            results = []
            for i, job in enumerate(jobs[:5], 1):
                title = job.get("title", "Unknown Title")
                company = job.get("company", "Unknown Company")
                loc = job.get("location", "Location not specified")
                snippet = job.get("snippet", "No description available")
                salary = job.get("salary", "")
                job_type_info = job.get("type", "")
                link = job.get("link", "")
                
                job_text = f"""
{i}. {title}
   Company: {company}
   Location: {loc}
   {f"Salary: {salary}" if salary else ""}
   {f"Type: {job_type_info}" if job_type_info else ""}
   Description: {snippet[:200]}...
   {f"Apply: {link}" if link else ""}
"""
                results.append(job_text)
            
            return f"Found {len(jobs)} jobs for '{keywords}' in '{location}':\n" + "\n".join(results)
        else:
            return f"Error searching jobs: HTTP {response.status_code}"
            
    except Exception as e:
        return f"Error searching jobs: {str(e)}. Note: You can also browse jobs at /jobs page."

def get_job_market_insights(role: str, location: str = ""):
    """
    Get insights about the job market for a specific role.
    
    Args:
        role: The job role to analyze (e.g., "software engineer", "data scientist")
        location: Optional location for localized insights
    
    Returns:
        Market insights including demand, salary ranges, and required skills
    """
    insights = {
        "software engineer": {
            "demand": "Very High",
            "avg_salary_us": "$90,000 - $180,000",
            "top_skills": ["Python", "JavaScript", "React", "AWS", "SQL"],
            "growth": "22% (Much faster than average)"
        },
        "data scientist": {
            "demand": "High", 
            "avg_salary_us": "$95,000 - $165,000",
            "top_skills": ["Python", "Machine Learning", "SQL", "Statistics", "TensorFlow"],
            "growth": "35% (Much faster than average)"
        },
        "product manager": {
            "demand": "High",
            "avg_salary_us": "$85,000 - $160,000",
            "top_skills": ["Agile", "User Research", "Data Analysis", "Communication", "Roadmapping"],
            "growth": "10% (Faster than average)"
        },
        "ux designer": {
            "demand": "High",
            "avg_salary_us": "$75,000 - $140,000",
            "top_skills": ["Figma", "User Research", "Prototyping", "Visual Design", "HTML/CSS"],
            "growth": "16% (Much faster than average)"
        },
        "devops engineer": {
            "demand": "Very High",
            "avg_salary_us": "$100,000 - $190,000",
            "top_skills": ["AWS/Azure", "Docker", "Kubernetes", "CI/CD", "Terraform"],
            "growth": "27% (Much faster than average)"
        }
    }
    
    role_lower = role.lower()
    
    # Find matching role
    matched_role = None
    for key in insights:
        if key in role_lower or role_lower in key:
            matched_role = key
            break
    
    if matched_role:
        data = insights[matched_role]
        loc_str = f" in {location}" if location else ""
        return f"""
Job Market Insights for {role.title()}{loc_str}:

📊 Demand: {data['demand']}
💰 Average Salary (US): {data['avg_salary_us']}
📈 Growth: {data['growth']}

🔧 Top Skills:
{chr(10).join([f"  • {skill}" for skill in data['top_skills']])}

Tip: Use the job search tool to find current openings!
"""
    else:
        return f"""
I don't have specific market data for '{role}'. However, you can:

1. Use the job search tool to find current openings
2. Check salary sites like Glassdoor or Levels.fyi
3. Browse our job board at /jobs

Would you like me to search for {role} jobs for you?
"""

# Tool Definitions for OpenAI
TOOLS_DEFINITION = [
    {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Calculate a math expression",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The math expression to evaluate, e.g. '2 + 2' or 'math.sqrt(16)'",
                    }
                },
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search",
            "description": "Search the web for information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
         "type": "function",
        "function": {
            "name": "rag_retrieve",
            "description": "Retrieve information from the internal knowledge base",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The query to search in knowledge base",
                    }
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_jobs",
            "description": "Search for job openings and opportunities. Use this when users ask about jobs, careers, hiring, or want to find job listings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "keywords": {
                        "type": "string",
                        "description": "Job title, skills, or keywords to search for (e.g., 'software engineer', 'python developer', 'marketing manager')",
                    },
                    "location": {
                        "type": "string",
                        "description": "City, state, country, or 'Remote' for location-based filtering",
                    },
                    "remote": {
                        "type": "boolean",
                        "description": "Set to true to search for remote jobs only",
                    },
                    "job_type": {
                        "type": "string",
                        "description": "Type of employment: 'full-time', 'part-time', 'contract', or 'internship'",
                    }
                },
                "required": ["keywords"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_job_market_insights",
            "description": "Get insights about the job market for a specific role including salary ranges, demand, and required skills. Use this when users ask about job market trends, salary expectations, or career prospects.",
            "parameters": {
                "type": "object",
                "properties": {
                    "role": {
                        "type": "string",
                        "description": "The job role to get insights for (e.g., 'software engineer', 'data scientist')",
                    },
                    "location": {
                        "type": "string",
                        "description": "Optional location for localized insights",
                    }
                },
                "required": ["role"],
            },
        },
    }
]

AVAILABLE_TOOLS = {
    "calculator": calculator,
    "search": search,
    "search_jobs": search_jobs,
    "get_job_market_insights": get_job_market_insights,
    # rag_retrieve is handled specially in main.py usually, or we wrap it here if we pass the RAG instance
}
