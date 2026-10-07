"""
Utility functions for resume parsing
"""
from typing import Dict, Any


def month_to_number(month: str) -> str:
    """Convert month name to 2-digit number"""
    months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    return months.get(month.lower(), '01')


def get_empty_structure() -> Dict[str, Any]:
    """Return empty structure matching CVFormData format"""
    return {
        "personalInfo": {
            "firstName": "",
            "lastName": "",
            "email": "",
            "phone": "",
            "location": "",
            "professionalTitle": "",
            "profileImage": "",
            "linkedin": "",
            "github": "",
            "website": "",
            "summary": "",
            "interests": [],
        },
        "workExperience": [{
            "position": "",
            "company": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "description": "",
            "responsibilities": [],
            "technologies": [],
            "competencies": []
        }],
        "education": [{
            "degree": "",
            "institution": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "field": "",
            "keyCourses": []
        }],
        "skills": [],
        "projects": [],
        "certificates": [],
        "publications": [],
        "languages": [],
        "sectionOrder": ["summary", "workExperience", "education", "projects", "certificates", "publications", "skills", "languages", "interests"],
        "template": "modern",
    }

