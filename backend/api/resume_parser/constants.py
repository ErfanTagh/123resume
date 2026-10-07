"""
Constants for resume parsing
"""
import re

# Section headers for section-based parsing
SECTION_HEADERS = {
    "education": ["education", "academic background", "academic", "qualifications"],
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "employment",
        "work history",
    ],
    "skills": ["skills", "technical skills", "core competencies", "competencies"],
    "projects": ["projects", "project experience"],
    "certifications": ["certifications", "certificates", "certificate"],
    "publications": ["publications", "publication", "papers", "research"],
    "summary": ["summary", "profile", "about", "objective"],
    "languages": ["languages", "language"],
    "interests": ["interests", "hobbies"],
}

# Section header patterns for two-column layouts (headers can appear mid-line)
SECTION_HEADER_PATTERNS = {
    "experience": re.compile(r'\b(?:work\s+)?experience\b', re.IGNORECASE),
    "education": re.compile(r'\beducation\b', re.IGNORECASE),
    "skills": re.compile(r'\bskills?\b', re.IGNORECASE),
    "projects": re.compile(r'\bprojects?\b', re.IGNORECASE),
    "certifications": re.compile(r'\bcertifications?\b', re.IGNORECASE),
    "publications": re.compile(r'\bpublications?\b|\bpapers\b', re.IGNORECASE),
    "languages": re.compile(r'\blanguages?\b', re.IGNORECASE),
    "interests": re.compile(r'\binterests?\b', re.IGNORECASE),
}

DEGREE_KEYWORDS = [
    "bachelor", "master", "phd", "ph.d", "doctorate",
    "b.sc", "m.sc", "b.a", "m.a", "mba", "b.tech", "m.tech",
    "associate", "diploma", "certificate"
]

