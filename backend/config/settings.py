"""
Django settings for resume backend project.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
ROOT_DIR = BASE_DIR.parent  # project root where .env is

# Load environment variables from the root .env
load_dotenv(ROOT_DIR / ".env")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# Host / security configuration
# -----------------------------
# In development we default to localhost/127.0.0.1.
# In production we EXPECT ALLOWED_HOSTS to be set via environment (.env / docker-compose.prod.yml).
# However, we ALWAYS append localhost/127.0.0.1 so that:
# - internal health checks (curl/wget from inside containers)
# - CI pipelines (GitHub Actions) that call the service via localhost
# do not trip Django's Invalid HTTP_HOST safety check.
#
# This keeps external host checking strict (only what you define in ALLOWED_HOSTS),
# while still allowing internal localhost-based checks.

default_dev_hosts = 'localhost,127.0.0.1'
allowed_hosts_env = os.getenv('ALLOWED_HOSTS', '')

if allowed_hosts_env:
    # Production / explicit configuration: use only what is in ALLOWED_HOSTS env
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(',') if host.strip()]
else:
    # Development fallback: allow localhost only
    ALLOWED_HOSTS = [host.strip() for host in default_dev_hosts.split(',')]

# Always allow localhost/127.0.0.1 for internal health checks (CI, docker exec, etc.)
for internal_host in ('localhost', '127.0.0.1'):
    if internal_host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(internal_host)

# Domain for email links
DOMAIN = os.getenv('DOMAIN', 'localhost:5173')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    # 'rest_framework_simplejwt.token_blacklist',  # Disabled - incompatible with djongo/MongoDB
    'corsheaders',
    
    # Local apps
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# OAuth Provider Configuration
# These will be set via environment variables
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '').strip()
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '').strip()
LINKEDIN_CLIENT_ID = os.getenv('LINKEDIN_CLIENT_ID', '').strip()
LINKEDIN_CLIENT_SECRET = os.getenv('LINKEDIN_CLIENT_SECRET', '').strip()
GITHUB_CLIENT_ID = os.getenv('GITHUB_CLIENT_ID', '').strip()
GITHUB_CLIENT_SECRET = os.getenv('GITHUB_CLIENT_SECRET', '').strip()
XING_CLIENT_ID = os.getenv('XING_CLIENT_ID', '').strip()
XING_CLIENT_SECRET = os.getenv('XING_CLIENT_SECRET', '').strip()

# DeepSeek — OpenAI-compatible HTTP API (cheaper than GPT for many workloads).
# Keys: https://platform.deepseek.com/ — set DEEPSEEK_API_KEY in .env (never commit it).
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '').strip()
DEEPSEEK_BASE_URL = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com').strip().rstrip('/')
# e.g. deepseek-chat, deepseek-reasoner, or newer IDs from DeepSeek model list
DEEPSEEK_MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat').strip()
DEEPSEEK_MAX_OUTPUT_TOKENS = int(os.getenv('DEEPSEEK_MAX_OUTPUT_TOKENS', '1024'))
# Larger budget for structured resume scoring JSON
DEEPSEEK_RESUME_SCORE_MAX_TOKENS = int(os.getenv('DEEPSEEK_RESUME_SCORE_MAX_TOKENS', '2048'))
# Resume upload → structured JSON (large completion)
DEEPSEEK_RESUME_PARSE_MAX_TOKENS = int(os.getenv('DEEPSEEK_RESUME_PARSE_MAX_TOKENS', '4096'))
# Resume ↔ job match (JSON score + short rationale)
DEEPSEEK_JOB_MATCH_MAX_TOKENS = int(os.getenv('DEEPSEEK_JOB_MATCH_MAX_TOKENS', '1024'))
# When true, log raw model text + parsed/structured result (may contain PII)
DEEPSEEK_LOG_AI_RESPONSES = os.getenv('DEEPSEEK_LOG_AI_RESPONSES', '').strip().lower() in (
    '1', 'true', 'yes', 'on',
)
DEEPSEEK_LOG_MAX_CHARS = int(os.getenv('DEEPSEEK_LOG_MAX_CHARS', '12000'))
DEEPSEEK_LOG_RESULT_MAX_CHARS = int(os.getenv('DEEPSEEK_LOG_RESULT_MAX_CHARS', '32000'))

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database - MongoDB with djongo
mongo_username = os.getenv('MONGODB_USERNAME', '')
mongo_password = os.getenv('MONGODB_PASSWORD', '')

# Build CLIENT config conditionally based on whether auth is needed
mongo_client_config = {
    'host': os.getenv('MONGODB_HOST', 'mongodb'),  # Docker service name
    'port': int(os.getenv('MONGODB_PORT', 27017)),
}

# Only add authentication if username and password are provided
if mongo_username and mongo_password:
    mongo_client_config.update({
        'username': mongo_username,
        'password': mongo_password,
        'authSource': 'admin',
        'authMechanism': 'SCRAM-SHA-1',
    })

DATABASES = {
    'default': {
        'ENGINE': 'djongo',
        'NAME': os.getenv('MONGODB_NAME', 'resume_db'),
        'CLIENT': mongo_client_config
    }
}

# Shared, process-safe cache. Used to memoize AI resume scores so an identical
# resume always returns the same score — across all gunicorn workers and repeat
# presses — instead of a fresh (jittery) DeepSeek call each time. File-based so
# it needs no extra service (Redis/Memcached) and is shared within the container.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': os.getenv('DJANGO_CACHE_DIR', '/tmp/resume_django_cache'),
        'TIMEOUT': 60 * 60 * 24 * 30,  # 30 days
        'OPTIONS': {'MAX_ENTRIES': 5000},
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:3000'
).split(',')

CORS_ALLOW_CREDENTIALS = True

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# JWT Settings
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# Email Configuration
# Priority: SendGrid (if API key is set) > SMTP (fallback)
# SendGrid provides better deliverability and is recommended for production
# Email Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')

# Generic SMTP configuration (can be used as Mailgun SMTP or any other provider)
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.mailgun.org')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '').strip()
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '').strip()

# Mailgun API configuration (used by custom helpers in email_verification.py)
MAILGUN_API_KEY = os.getenv('MAILGUN_API_KEY', '').strip()
MAILGUN_DOMAIN = os.getenv('MAILGUN_DOMAIN', '').strip()
MAILGUN_BASE_URL = os.getenv('MAILGUN_BASE_URL', 'https://api.mailgun.net').strip()

# Email FROM address configuration
# Should match a verified sender address for the configured provider
default_from = os.getenv('DEFAULT_FROM_EMAIL', '').strip()
if default_from:
    # Extract email from "Display Name <email@domain.com>" format if present
    import re
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', default_from)
    if email_match:
        DEFAULT_FROM_EMAIL = email_match.group(0)
    else:
        DEFAULT_FROM_EMAIL = default_from
else:
    # Fallback: use authenticated email for SMTP, or a sensible default
    DEFAULT_FROM_EMAIL = EMAIL_HOST_USER or 'noreply@123resume.de'

# Set SERVER_EMAIL to match for error reporting
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Logging Configuration - Suppress verbose Django messages
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'suppress_system_checks': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'loggers': {
        # Suppress Django system check messages
        'django.utils.autoreload': {
            'handlers': ['null'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.core.management': {
            'handlers': ['null'],
            'level': 'ERROR',
            'propagate': False,
        },
        # Suppress runserver startup messages
        'django.server': {
            'handlers': ['null'],
            'level': 'ERROR',
            'propagate': False,
        },
        # Keep our application logs
        'api': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        # Keep errors
        'django': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}
