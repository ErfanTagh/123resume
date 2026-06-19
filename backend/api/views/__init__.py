"""
API Views for Resume/CV operations
"""
from .resume_views import (
    resume_list,
    resume_detail,
    public_resume_detail,
    resume_public_profile_toggle,
)
from .parse_views import parse_resume
from .health_views import health_check
from .pdf_views import generate_resume_pdf
from .blog_views import blog_post_list, blog_post_detail
from .sitemap_views import generate_sitemap
from .match_views import match_resume_to_job, generate_resume_cover_letter, tailor_resume_suggestions
from .job_application_views import job_application_list, job_application_detail
from .feedback_views import send_feedback
from .ai_views import resume_assistant_chat, resume_score, suggest_work_bullet, improve_work_description

__all__ = [
    'resume_list',
    'resume_detail',
    'public_resume_detail',
    'resume_public_profile_toggle',
    'parse_resume',
    'health_check',
    'generate_resume_pdf',
    'blog_post_list',
    'blog_post_detail',
    'generate_sitemap',
    'match_resume_to_job',
    'generate_resume_cover_letter',
    'tailor_resume_suggestions',
    'job_application_list',
    'job_application_detail',
    'send_feedback',
    'resume_assistant_chat',
    'resume_score',
    'suggest_work_bullet',
    'improve_work_description',
]

