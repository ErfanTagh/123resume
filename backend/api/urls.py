"""
URL routing for API endpoints
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views, auth_views, social_views

app_name = 'api'

urlpatterns = [
    # Public endpoints
    path('health/', views.health_check, name='health-check'),
    
    # Authentication endpoints
    path('auth/register/', auth_views.register, name='register'),
    path('auth/login/', auth_views.login, name='login'),
    path('auth/logout/', auth_views.logout, name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/profile/', auth_views.user_profile, name='user-profile'),
    path('auth/verify-email/', auth_views.verify_email, name='verify-email'),
    path('auth/resend-verification/', auth_views.resend_verification, name='resend-verification'),
    path('auth/forgot-password/', auth_views.forgot_password, name='forgot-password'),
    path('auth/reset-password/', auth_views.reset_password, name='reset-password'),
    
    # Social authentication endpoints
    path('auth/social/<str:provider>/url/', social_views.social_login_url, name='social-login-url'),
    path('auth/social/<str:provider>/callback/', social_views.social_login_callback, name='social-login-callback'),
    
    # Public hosted profile (no auth)
    path('public/resume/<str:pk>/', views.public_resume_detail, name='public-resume-detail'),

    path('job-applications/', views.job_application_list, name='job-application-list'),
    path('job-applications/<str:pk>/', views.job_application_detail, name='job-application-detail'),

    # Resume endpoints (protected)
    path('resumes/', views.resume_list, name='resume-list'),
    path('resumes/parse/', views.parse_resume, name='resume-parse'),  # Must come before <str:pk> pattern
    path('resumes/<str:resume_id>/pdf/', views.generate_resume_pdf, name='resume-pdf'),
    path('resumes/<str:resume_id>/match/', views.match_resume_to_job, name='resume-match'),
    path('resumes/<str:resume_id>/cover-letter/', views.generate_resume_cover_letter, name='resume-cover-letter'),
    path('resumes/<str:resume_id>/tailor/', views.tailor_resume_suggestions, name='resume-tailor'),
    path('resumes/<str:pk>/public-profile/', views.resume_public_profile_toggle, name='resume-public-profile-toggle'),
    path('resumes/<str:pk>/', views.resume_detail, name='resume-detail'),
    
    # Blog post endpoints
    path('blog-posts/', views.blog_post_list, name='blog-post-list'),
    path('blog-posts/<str:post_id>/', views.blog_post_detail, name='blog-post-detail'),
    
    # Sitemap endpoint
    path('sitemap.xml', views.generate_sitemap, name='sitemap'),

    # Feedback / contact endpoint
    path('feedback/', views.send_feedback, name='send-feedback'),

    # AI resume assistant (DeepSeek, authenticated only)
    path('ai/resume-assistant/', views.resume_assistant_chat, name='resume-assistant-chat'),
    path('ai/resume-score/', views.resume_score, name='resume-score'),
    path('ai/work-bullet-suggest/', views.suggest_work_bullet, name='work-bullet-suggest'),
    path('ai/work-description-improve/', views.improve_work_description, name='work-description-improve'),
]

