import json
import logging
import re
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

TECH_SKILLS_DICTIONARY = [
    # Languages
    "Python", "Java", "C++", "C", "C#", "JavaScript", "TypeScript", "Go", "Rust", "SQL",
    "HTML", "CSS", "Kotlin", "Swift", "PHP", "Ruby",
    # Frameworks & Libraries
    "React", "Node.js", "Express", "Next.js", "FastAPI", "Django", "Flask", "Spring Boot",
    "Tailwind CSS", "Redux", "Vue.js", "Angular",
    # Databases & Caches
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "SQLite",
    # Cloud & DevOps
    "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git", "GitHub", "Linux", "CI/CD",
    # CS Fundamentals
    "Data Structures", "Algorithms", "System Design", "OOP", "DBMS", "Computer Networks", "Operating Systems",
    # Machine Learning & Data
    "Machine Learning", "Deep Learning", "Pandas", "NumPy", "Scikit-Learn", "PyTorch", "TensorFlow", "NLP"
]

SKILL_RECOMMENDATION_MAP = {
    "Python": ["FastAPI", "Docker", "PyTest", "PostgreSQL"],
    "Java": ["Spring Boot", "Microservices", "Docker", "Hibernate"],
    "C++": ["Data Structures", "Algorithms", "System Design"],
    "JavaScript": ["React", "TypeScript", "Node.js", "Next.js"],
    "React": ["TypeScript", "Next.js", "Tailwind CSS", "Redux"],
    "SQL": ["Database Indexing", "PostgreSQL", "Query Optimization"],
    "Machine Learning": ["PyTorch", "Data Preprocessing", "Model Deployment", "FastAPI"],
}

PROJECT_SUGGESTIONS_MAP = {
    "Docker": "Containerize a full-stack multi-container web application using Docker Compose.",
    "FastAPI": "Develop a high-throughput REST API with asynchronous database queries and JWT security.",
    "React": "Build an interactive responsive dashboard with state management and real-time updates.",
    "System Design": "Design and document a scalable distributed URL shortener or real-time chat architecture.",
    "Microservices": "Implement decoupled microservices communicating through REST or an event message broker.",
    "PostgreSQL": "Design a normalized database schema with complex JOINs, foreign key constraints, and indexes.",
}

def clean_skill(name: str) -> str:
    return name.strip()

def extract_skills_deterministically(text: str) -> List[str]:
    """Find known technical skills mentioned in arbitrary text case-insensitively."""
    found = []
    text_lower = f" {text.lower()} "
    for skill in TECH_SKILLS_DICTIONARY:
        # Match whole word boundary to prevent false positives (e.g. "C" in "CSS")
        pattern = rf"(?:\b|_){re.escape(skill.lower())}(?:\b|_)"
        if re.search(pattern, text_lower):
            found.append(skill)
    return sorted(list(set(found)))

async def call_gemini_api(prompt: str) -> Optional[str]:
    """
    Direct asynchronous HTTP call to Google Gemini Generative Language API.
    Uses precise timeouts and json parsing with graceful error return.
    """
    if not settings.GEMINI_API_KEY:
        return None

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            res = await client.post(api_url, json=payload)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
            else:
                logger.warning(f"Gemini API returned status {res.status_code}: {res.text[:200]}")
                return None
    except Exception as e:
        logger.warning(f"Gemini API request failed ({e}). Falling back to deterministic engine.")
        return None

async def analyze_resume_ai(
    resume_text: str,
    existing_skills: List[str],
) -> Dict[str, Any]:
    """
    Analyzes resume content to extract skills, suggest additions, and provide profile tips.
    Supports Google Gemini with transparent deterministic fallback.
    """
    # 1. Attempt Gemini if configured
    if settings.AI_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        prompt = f"""
You are an expert technical university placement advisor.
Analyze the following student resume text and profile skills.
Return ONLY a valid JSON object matching this structure:
{{
  "identified_skills": ["List", "of", "technical", "skills", "found"],
  "suggested_skills": ["Recommended", "complementary", "skills", "to", "learn"],
  "summary": "2-3 sentences concise professional profile evaluation",
  "improvement_tips": ["Tip 1", "Tip 2", "Tip 3"]
}}

Resume text:
\"\"\"{resume_text[:4000]}\"\"\"

Current Listed Skills: {', '.join(existing_skills)}
"""
        raw_json = await call_gemini_api(prompt)
        if raw_json:
            try:
                parsed = json.loads(raw_json)
                parsed["provider_used"] = "gemini"
                return parsed
            except Exception:
                pass

    # 2. Deterministic Engine (Mock / Fallback)
    skills_in_resume = extract_skills_deterministically(resume_text)
    combined_skills = sorted(list(set(existing_skills + skills_in_resume)))

    suggested = []
    for s in combined_skills:
        for rec in SKILL_RECOMMENDATION_MAP.get(s, []):
            if rec not in combined_skills and rec not in suggested:
                suggested.append(rec)
    if not suggested:
        suggested = ["Docker", "Git", "REST APIs", "Unit Testing", "System Design"]

    tips = [
        "Include measurable impact metrics in project bullet points (e.g., 'reduced processing time by 40%').",
        "Add live deployment links and GitHub repository URLs for your primary technical projects.",
        "Ensure your Class 10th and 12th percentages and current CGPA match official college transcripts.",
        "Highlight proficiency with version control (Git) and collaborative development workflows.",
    ]

    summary = (
        f"Profile demonstrates foundational strengths in {', '.join(combined_skills[:4]) if combined_skills else 'computer science concepts'}. "
        f"Adding practical projects showcasing {', '.join(suggested[:3])} will significantly boost placement competitiveness."
    )

    return {
        "identified_skills": skills_in_resume if skills_in_resume else existing_skills,
        "suggested_skills": suggested[:6],
        "summary": summary,
        "improvement_tips": tips,
        "provider_used": "mock",
    }

async def evaluate_job_match_ai(
    student_profile: Dict[str, Any],
    job: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compares student credentials against job requirements.
    Calculates advisory match percentage, matching skills, skill gaps, and learning roadmaps.
    """
    company_name = job.get("company_name", "Company")
    job_title = job.get("title", "Software Engineer")
    required_skills = [clean_skill(s) for s in job.get("required_skills", [])]
    job_desc = job.get("description", "")

    # Extract all skills from job description too
    job_extracted = extract_skills_deterministically(job_desc)
    all_job_skills = sorted(list(set(required_skills + job_extracted)))

    # Gather student skills
    student_skills = student_profile.get("skills", [])
    student_langs = student_profile.get("programming_languages", [])
    resume_text = student_profile.get("resume_extracted_text", "")
    resume_skills = extract_skills_deterministically(resume_text) if resume_text else []

    all_student_skills = sorted(list(set(student_skills + student_langs + resume_skills)))

    # 1. Attempt Gemini if configured
    if settings.AI_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        prompt = f"""
You are an expert AI campus placement advisor.
Evaluate how well this student's profile matches the job requirements.
Return ONLY a valid JSON object matching this structure:
{{
  "match_score": integer between 0 and 100,
  "matching_skills": ["List", "of", "skills", "matching", "the", "job"],
  "missing_skills": ["List", "of", "job", "requirements", "student", "lacks"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "project_ideas": ["Project idea 1", "Project idea 2"]
}}

Company: {company_name}
Role Title: {job_title}
Job Requirements: {', '.join(all_job_skills)}
Job Description: {job_desc[:1500]}

Student Skills: {', '.join(all_student_skills)}
Resume Excerpt: {resume_text[:2000]}
"""
        raw_json = await call_gemini_api(prompt)
        if raw_json:
            try:
                parsed = json.loads(raw_json)
                parsed["job_id"] = str(job.get("_id", ""))
                parsed["company_name"] = company_name
                parsed["job_title"] = job_title
                parsed["provider_used"] = "gemini"
                return parsed
            except Exception:
                pass

    # 2. Deterministic Matching Engine
    student_lower = {s.lower() for s in all_student_skills}
    matching = []
    missing = []

    for req in all_job_skills:
        if req.lower() in student_lower:
            matching.append(req)
        else:
            missing.append(req)

    # Calculate match score
    if all_job_skills:
        ratio = len(matching) / len(all_job_skills)
        base_score = int(ratio * 75)
    else:
        base_score = 60

    # Extra credit for profile completeness / CGPA
    cgpa = student_profile.get("cgpa", 0.0)
    cgpa_bonus = int(min(cgpa / 10.0 * 15, 15))
    has_resume = bool(student_profile.get("resume_filename"))
    resume_bonus = 10 if has_resume else 0

    total_score = min(max(base_score + cgpa_bonus + resume_bonus, 15), 98)

    # Recommendations and Project Ideas
    recs = []
    for miss in missing[:3]:
        recs.append(f"Strengthen your practical knowledge in {miss} by completing a hands-on tutorial or micro-project.")
    if not recs:
        recs.append("Your technical skill set is well aligned with this position! Focus on mock interview problem solving.")

    recs.append(f"Review core system design principles and behavioral questions typical for {company_name}.")

    project_ideas = []
    for miss in missing[:2]:
        if miss in PROJECT_SUGGESTIONS_MAP:
            project_ideas.append(PROJECT_SUGGESTIONS_MAP[miss])
        else:
            project_ideas.append(f"Build a showcase project that prominently demonstrates practical usage of {miss}.")

    if not project_ideas:
        project_ideas.append("Build a high-performance full-stack application demonstrating cloud deployment and unit testing.")

    return {
        "job_id": str(job.get("_id", "")),
        "company_name": company_name,
        "job_title": job_title,
        "match_score": total_score,
        "matching_skills": matching,
        "missing_skills": missing,
        "recommendations": recs,
        "project_ideas": project_ideas,
        "provider_used": "mock",
    }
