"""
Models for CV/Resume data
"""
from djongo import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


class Interest(models.Model):
    interest = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.interest or ''


class Technology(models.Model):
    technology = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.technology or ''


class Competency(models.Model):
    competency = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.competency or ''


class Responsibility(models.Model):
    responsibility = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.responsibility or ''


class Highlight(models.Model):
    highlight = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.highlight or ''


class Course(models.Model):
    course = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.course or ''


class PersonalInfo(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    professional_title = models.CharField(max_length=200, blank=True, null=True)
    profile_image = models.URLField(blank=True, null=True)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    github = models.URLField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    summary = models.TextField(blank=True, null=True)
    interests = models.ArrayField(model_container=Interest, blank=True, null=True)

    class Meta:
        abstract = True


class WorkExperience(models.Model):
    position = models.CharField(max_length=200, blank=True, null=True)
    company = models.CharField(max_length=200, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    start_date = models.CharField(max_length=20, blank=True, null=True)
    end_date = models.CharField(max_length=20, blank=True, null=True)
    description = models.TextField(blank=True, null=True)  # Keep for backward compatibility
    responsibilities = models.ArrayField(model_container=Responsibility, blank=True, null=True)
    technologies = models.ArrayField(model_container=Technology, blank=True, null=True)
    competencies = models.ArrayField(model_container=Competency, blank=True, null=True)
    link = models.URLField(blank=True, null=True)

    class Meta:
        abstract = True


class Education(models.Model):
    degree = models.CharField(max_length=200, blank=True, null=True)
    institution = models.CharField(max_length=200, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    start_date = models.CharField(max_length=20, blank=True, null=True)
    end_date = models.CharField(max_length=20, blank=True, null=True)
    field = models.CharField(max_length=200, blank=True, null=True)
    key_courses = models.ArrayField(model_container=Course, blank=True, null=True)
    link = models.URLField(blank=True, null=True)

    class Meta:
        abstract = True


class Project(models.Model):
    name = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)  # Keep for backward compatibility
    highlights = models.ArrayField(model_container=Highlight, blank=True, null=True)
    technologies = models.ArrayField(model_container=Technology, blank=True, null=True)
    start_date = models.CharField(max_length=20, blank=True, null=True)
    end_date = models.CharField(max_length=20, blank=True, null=True)
    link = models.URLField(blank=True, null=True)

    class Meta:
        abstract = True


class Certificate(models.Model):
    name = models.CharField(max_length=200, blank=True, null=True)
    organization = models.CharField(max_length=200, blank=True, null=True)
    issue_date = models.CharField(max_length=20, blank=True, null=True)
    expiration_date = models.CharField(max_length=20, blank=True, null=True)
    credential_id = models.CharField(max_length=200, blank=True, null=True)
    url = models.URLField(blank=True, null=True)

    class Meta:
        abstract = True


class Publication(models.Model):
    title = models.CharField(max_length=500, blank=True, null=True)
    publisher = models.CharField(max_length=300, blank=True, null=True)
    publication_date = models.CharField(max_length=20, blank=True, null=True)
    url = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        abstract = True


class Language(models.Model):
    language = models.CharField(max_length=100, blank=True, null=True)
    proficiency = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        abstract = True


class Skill(models.Model):
    skill = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        abstract = True


class Resume(models.Model):
    """Main Resume/CV model that contains all user information"""
    _id = models.ObjectIdField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resumes')
    name = models.CharField(max_length=200, blank=True, null=True)  # User-defined resume name
    personal_info = models.EmbeddedField(model_container=PersonalInfo)
    work_experience = models.ArrayField(model_container=WorkExperience, blank=True, null=True)
    education = models.ArrayField(model_container=Education, blank=True, null=True)
    projects = models.ArrayField(model_container=Project, blank=True, null=True)
    certificates = models.ArrayField(model_container=Certificate, blank=True, null=True)
    publications = models.ArrayField(model_container=Publication, blank=True, null=True)
    languages = models.ArrayField(model_container=Language, blank=True, null=True)
    skills = models.ArrayField(model_container=Skill, blank=True, null=True)
    # Presentation settings
    template = models.CharField(max_length=50, default='modern')
    section_order = models.JSONField(blank=True, null=True)
    
    # Quality scores (0-10 scale)
    completeness_score = models.FloatField(default=0.0)
    clarity_score = models.FloatField(default=0.0)
    formatting_score = models.FloatField(default=0.0)
    impact_score = models.FloatField(default=0.0)
    overall_score = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'resumes'
        ordering = ['-created_at']

    def __str__(self):
        return f"Resume - {self.personal_info.first_name} {self.personal_info.last_name} (User: {self.user.username})"


class EmailVerification(models.Model):
    """Email verification tokens for user registration"""
    _id = models.ObjectIdField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_verification')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'email_verifications'
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def __str__(self):
        return f"Verification for {self.user.username} - Verified: {self.is_verified}"


class PasswordReset(models.Model):
    """Password reset tokens"""
    _id = models.ObjectIdField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_resets')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'password_resets'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=1)  # 1 hour expiry for security
        super().save(*args, **kwargs)
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def __str__(self):
        return f"Password reset for {self.user.username} - Used: {self.is_used}"


class BlogPost(models.Model):
    """Blog post model for storing blog articles"""
    _id = models.ObjectIdField(primary_key=True)
    id = models.CharField(max_length=200, db_index=True)  # URL slug
    title = models.CharField(max_length=500)
    excerpt = models.TextField()
    category = models.CharField(max_length=100)
    read_time = models.CharField(max_length=50)
    date = models.CharField(max_length=50)
    gradient = models.CharField(max_length=200)
    icon_color = models.CharField(max_length=100)
    image = models.CharField(max_length=500, blank=True, null=True)
    content = models.TextField()
    language = models.CharField(max_length=10, default='en')  # 'en' or 'de'
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blog_posts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published = models.BooleanField(default=False)  # Default to draft
    scheduled_publish_at = models.DateTimeField(blank=True, null=True)  # For scheduled publishing

    class Meta:
        db_table = 'blog_posts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['id', 'language']),
            models.Index(fields=['published', 'language']),
        ]

    def __str__(self):
        return f"{self.title} ({self.language})"

