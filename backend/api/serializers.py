"""
Serializers for API data validation and transformation
"""
from rest_framework import serializers


class InterestSerializer(serializers.Serializer):
    interest = serializers.CharField(max_length=100, required=False, allow_blank=True)


class TechnologySerializer(serializers.Serializer):
    technology = serializers.CharField(max_length=100, required=False, allow_blank=True)


class CompetencySerializer(serializers.Serializer):
    competency = serializers.CharField(max_length=100, required=False, allow_blank=True)


class ResponsibilitySerializer(serializers.Serializer):
    responsibility = serializers.CharField(max_length=500, required=False, allow_blank=True)


class HighlightSerializer(serializers.Serializer):
    highlight = serializers.CharField(max_length=500, required=False, allow_blank=True)


class CourseSerializer(serializers.Serializer):
    course = serializers.CharField(max_length=200, required=False, allow_blank=True)


class EducationDescriptionSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=500, required=False, allow_blank=True)


class PersonalInfoSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    professional_title = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True
    )
    profile_image = serializers.CharField(
        required=False, 
        allow_blank=True
    )
    email = serializers.EmailField()
    phone = serializers.CharField(
        max_length=50, 
        required=False, 
        allow_blank=True
    )
    location = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True
    )
    linkedin = serializers.CharField(required=False, allow_blank=True, max_length=500)
    github = serializers.CharField(required=False, allow_blank=True, max_length=500)
    website = serializers.CharField(required=False, allow_blank=True, max_length=500)
    summary = serializers.CharField(required=False, allow_blank=True)
    interests = InterestSerializer(many=True, required=False)


class WorkExperienceSerializer(serializers.Serializer):
    position = serializers.CharField(max_length=200, required=False, allow_blank=True)
    company = serializers.CharField(max_length=200, required=False, allow_blank=True)
    location = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True
    )
    start_date = serializers.CharField(
        max_length=20, 
        required=False, 
        allow_blank=True
    )
    end_date = serializers.CharField(
        max_length=20, 
        required=False, 
        allow_blank=True
    )
    description = serializers.CharField(required=False, allow_blank=True)
    responsibilities = ResponsibilitySerializer(many=True, required=False)
    technologies = TechnologySerializer(many=True, required=False)
    competencies = CompetencySerializer(many=True, required=False)
    link = serializers.CharField(required=False, allow_blank=True, max_length=500)


class EducationSerializer(serializers.Serializer):
    degree = serializers.CharField(max_length=200, required=False, allow_blank=True)
    institution = serializers.CharField(max_length=200, required=False, allow_blank=True)
    location = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True
    )
    start_date = serializers.CharField(
        max_length=20, 
        required=False, 
        allow_blank=True
    )
    end_date = serializers.CharField(
        max_length=20, 
        required=False, 
        allow_blank=True
    )
    field = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True
    )
    key_courses = CourseSerializer(
        many=True, 
        required=False
    )
    descriptions = EducationDescriptionSerializer(
        many=True, 
        required=False
    )
    link = serializers.CharField(required=False, allow_blank=True, max_length=500)


class ProjectSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True
    )
    description = serializers.CharField(required=False, allow_blank=True)
    highlights = HighlightSerializer(many=True, required=False)
    technologies = TechnologySerializer(many=True, required=False)
    start_date = serializers.CharField(
        max_length=20, 
        required=False, 
        allow_blank=True
    )
    end_date = serializers.CharField(
        max_length=20, 
        required=False, 
        allow_blank=True
    )
    link = serializers.CharField(required=False, allow_blank=True, max_length=500)


class CertificateSerializer(serializers.Serializer):
    name = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True
    )
    organization = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True
    )
    issue_date = serializers.CharField(
        max_length=20, 
        required=False, 
        allow_blank=True
    )
    expiration_date = serializers.CharField(
        max_length=20, 
        required=False, 
        allow_blank=True
    )
    credential_id = serializers.CharField(
        max_length=200, 
        required=False, 
        allow_blank=True
    )
    url = serializers.CharField(required=False, allow_blank=True, max_length=500)


class LanguageSerializer(serializers.Serializer):
    language = serializers.CharField(max_length=100, required=False, allow_blank=True)
    proficiency = serializers.CharField(max_length=50, required=False, allow_blank=True)


class SkillSerializer(serializers.Serializer):
    skill = serializers.CharField(max_length=100, required=False, allow_blank=True)


class SkillGroupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    skills = SkillSerializer(many=True, required=False)


class ResumeSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True, source='_id')
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    personal_info = PersonalInfoSerializer()
    work_experience = WorkExperienceSerializer(many=True, required=False, allow_empty=True)
    education = EducationSerializer(many=True, required=False, allow_empty=True)
    projects = ProjectSerializer(many=True, required=False)
    certificates = CertificateSerializer(many=True, required=False)
    languages = LanguageSerializer(many=True, required=False)
    skills = SkillSerializer(many=True, required=False)
    skill_groups = SkillGroupSerializer(many=True, required=False)
    template = serializers.CharField(max_length=50, required=False, allow_blank=True)
    section_order = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True
    )
    styling = serializers.DictField(required=False, allow_null=True)  # Styling options (font, colors, etc.)
    # Quality scores (calculated on frontend, accepted from request)
    completeness_score = serializers.FloatField(required=False, allow_null=True, min_value=0.0, max_value=10.0)
    clarity_score = serializers.FloatField(required=False, allow_null=True, min_value=0.0, max_value=10.0)
    formatting_score = serializers.FloatField(required=False, allow_null=True, min_value=0.0, max_value=10.0)
    impact_score = serializers.FloatField(required=False, allow_null=True, min_value=0.0, max_value=10.0)
    overall_score = serializers.FloatField(required=False, allow_null=True, min_value=0.0, max_value=10.0)
    
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class BlogPostSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=200)
    title = serializers.CharField(max_length=500)
    excerpt = serializers.CharField()
    category = serializers.CharField(max_length=100)
    read_time = serializers.CharField(max_length=50)
    date = serializers.CharField(max_length=50)
    gradient = serializers.CharField(max_length=200)
    icon_color = serializers.CharField(max_length=100)
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    content = serializers.CharField()
    language = serializers.CharField(max_length=10, default='en')
    published = serializers.BooleanField(default=False, required=False)
    scheduled_publish_at = serializers.DateTimeField(required=False, allow_null=True)

