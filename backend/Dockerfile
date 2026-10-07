FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including for ML libraries and Playwright)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install packages with special handling for dependency conflicts
# Install pymongo and sqlparse first
RUN pip install --no-cache-dir pymongo==3.12.3 sqlparse==0.2.4

# Install djongo without dependencies (to avoid conflicts)
RUN pip install --no-cache-dir --no-deps djongo==1.3.6

# Install Django 3.2 LTS (compatible with sqlparse 0.2.4)
RUN pip install --no-cache-dir Django==3.2.23

# Install remaining packages
RUN pip install --no-cache-dir \
    djangorestframework==3.14.0 \
    djangorestframework-simplejwt==5.3.1 \
    django-cors-headers==4.3.1 \
    python-dotenv==1.0.0 \
    PyJWT==2.8.0 \
    requests>=2.31.0 \
    requests-oauthlib>=1.3.1 \
    "openai>=1.54.0"

# Install ML dependencies for resume parsing
# Install PyTorch CPU version (smaller, no CUDA needed)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install other ML packages
RUN pip install --no-cache-dir \
    transformers>=4.20.0 \
    pdfplumber>=0.9.0 \
    PyPDF2>=3.0.0

# Install Playwright for PDF generation
RUN pip install --no-cache-dir playwright>=1.40.0

# Install Playwright browsers (Chromium for PDF generation)
RUN playwright install chromium
RUN playwright install-deps chromium

# Claude SDK (AI features). Its own layer so the heavy layers above stay cached.
RUN pip install --no-cache-dir "anthropic>=1.11.0,<2"

# Copy project files
COPY . .

# Create directory for SQLite (fallback database)
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]

