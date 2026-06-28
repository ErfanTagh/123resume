"""
API Views for Resume/CV operations
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from .models import Resume
from .serializers import ResumeSerializer, BlogPostSerializer
# Backend scorer removed - scores are now calculated on frontend
from bson import ObjectId
from datetime import datetime
import os
import sys
from pymongo import MongoClient


def format_mongo_date(date_value):
    """Convert MongoDB date to ISO string format"""
    if not date_value:
        return None
    
    # Handle bson datetime objects first (they're common in MongoDB)
    try:
        from bson import datetime as bson_datetime
        if isinstance(date_value, bson_datetime.datetime):
            # BSON datetime already has isoformat() method
            return date_value.isoformat()
    except (ImportError, AttributeError, TypeError):
        pass
    
    # Handle Python datetime objects
    if hasattr(date_value, 'isoformat'):
        try:
            result = date_value.isoformat()
            # Ensure it's a string
            if result:
                return result
        except (AttributeError, TypeError):
            pass
    
    # Handle string dates - if already ISO format, return as is
    if isinstance(date_value, str):
        # If it's already an ISO string, return it
        if 'T' in date_value:
            return date_value
        # Try to parse common formats
        try:
            # Try parsing as ISO format
            dt = datetime.fromisoformat(date_value.replace('Z', '+00:00'))
            return dt.isoformat()
        except (ValueError, AttributeError):
            # If parsing fails, return the string as is
            return date_value
    
    # Last resort: convert to string
    try:
        return str(date_value)
    except Exception:
        return None


def get_date_or_now(date_value):
    """Get date from MongoDB or return current date if missing"""
    formatted = format_mongo_date(date_value)
    if formatted:
        return formatted
    # Return current date as fallback
    return datetime.utcnow().isoformat()


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def resume_list(request):
    """
    List all resumes for the authenticated user
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if request.method == 'GET':
        try:
            # Get raw data from MongoDB without instantiating abstract models
            from pymongo import MongoClient
            from bson import ObjectId as BsonObjectId
            import os
            
            # Connect to MongoDB directly
            # First try to use connection string if available
            connection_string = os.getenv('MONGODB_CONNECTION_STRING')
            if connection_string:
                # Try using connection string, but if it fails, fall back to individual vars
                try:
                    client = MongoClient(connection_string)
                    # Test the connection
                    client.admin.command('ping')
                except Exception:
                    # Connection string might have encoding issues, use individual vars
                    connection_string = None
            
            if not connection_string:
                # Use individual env vars (more reliable for special characters)
                mongo_host = os.getenv('MONGODB_HOST', 'localhost')
                mongo_port = int(os.getenv('MONGODB_PORT', 27017))
                mongo_db = os.getenv('MONGODB_NAME', 'resume_db')
                mongo_username = os.getenv('MONGODB_USERNAME', '')
                mongo_password = os.getenv('MONGODB_PASSWORD', '')
                
                # Create authenticated connection
                if mongo_username and mongo_password:
                    client = MongoClient(
                        mongo_host,
                        mongo_port,
                        username=mongo_username,
                        password=mongo_password,
                        authSource='admin',
                        authMechanism='SCRAM-SHA-1'
                    )
                else:
                    client = MongoClient(mongo_host, mongo_port)
            
            mongo_db = os.getenv('MONGODB_NAME', 'resume_db')
            
            db = client[mongo_db]
            
            # Get resumes for this user
            user_id = request.user.id
            resumes_cursor = db.resumes.find({'user_id': user_id})
            
            resumes_data = []
            for resume_doc in resumes_cursor:
                # Get dates with fallback
                created_at_raw = resume_doc.get('created_at')
                updated_at_raw = resume_doc.get('updated_at')
                
                resume_dict = {
                    'id': str(resume_doc['_id']),
                    'name': resume_doc.get('name', ''),  # Include resume name
                    'personal_info': resume_doc.get('personal_info', {}),
                    'work_experience': resume_doc.get('work_experience', []),
                    'education': resume_doc.get('education', []),
                    'projects': resume_doc.get('projects', []),
                    'certificates': resume_doc.get('certificates', []),
                    'languages': resume_doc.get('languages', []),
                    'skills': resume_doc.get('skills', []),
                    'template': resume_doc.get('template', 'modern'),
                    'section_order': resume_doc.get('section_order', [
                        'summary',
                        'workExperience',
                        'education',
                        'projects',
                        'certificates',
                        'skills',
                        'languages',
                        'interests',
                    ]),
                    'styling': resume_doc.get('styling', {}),  # Include styling field
                    'completeness_score': resume_doc.get('completeness_score', 0.0),
                    'clarity_score': resume_doc.get('clarity_score', 0.0),
                    'formatting_score': resume_doc.get('formatting_score', 0.0),
                    'impact_score': resume_doc.get('impact_score', 0.0),
                    'overall_score': resume_doc.get('overall_score', 0.0),
                    'created_at': get_date_or_now(created_at_raw),
                    'updated_at': get_date_or_now(updated_at_raw),
                }
                resumes_data.append(resume_dict)
            
            return Response(resumes_data)
        except Exception as e:
            logger.error(f"Error listing resumes: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'POST':
        import logging
        import sys
        logger = logging.getLogger(__name__)
        
        # Verbose request logging removed - only styling-specific logs remain
        
        # Debug: Log raw request data to see what's being sent
        print(f"DEBUG: Raw request.data personal_info: {request.data.get('personal_info', {})}", file=sys.stderr)
        if 'personal_info' in request.data:
            raw_pi = request.data['personal_info']
            print(f"DEBUG: Raw professional_title = {raw_pi.get('professional_title', 'NOT FOUND')}", file=sys.stderr)
            print(f"DEBUG: Raw linkedin = {raw_pi.get('linkedin', 'NOT FOUND')}", file=sys.stderr)
            print(f"DEBUG: Raw github = {raw_pi.get('github', 'NOT FOUND')}", file=sys.stderr)
            print(f"DEBUG: Raw website = {raw_pi.get('website', 'NOT FOUND')}", file=sys.stderr)
        
        serializer = ResumeSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Setup MongoDB connection
                from pymongo import MongoClient
                from bson import ObjectId as BsonObjectId
                import os
                
                # First try to use connection string if available
                connection_string = os.getenv('MONGODB_CONNECTION_STRING')
                if connection_string:
                    try:
                        client = MongoClient(connection_string)
                        client.admin.command('ping')
                    except Exception:
                        connection_string = None
                
                if not connection_string:
                    # In Docker, use service name 'mongodb', otherwise 'localhost'
                    mongo_host = os.getenv('MONGODB_HOST', 'mongodb')
                    mongo_port = int(os.getenv('MONGODB_PORT', 27017))
                    mongo_db = os.getenv('MONGODB_NAME', 'resume_db')
                    mongo_username = os.getenv('MONGODB_USERNAME', '')
                    mongo_password = os.getenv('MONGODB_PASSWORD', '')
                    
                    if mongo_username and mongo_password:
                        client = MongoClient(
                            mongo_host,
                            mongo_port,
                            username=mongo_username,
                            password=mongo_password,
                            authSource='admin',
                            authMechanism='SCRAM-SHA-1'
                        )
                    else:
                        client = MongoClient(mongo_host, mongo_port)
                
                mongo_db = os.getenv('MONGODB_NAME', 'resume_db')
                db = client[mongo_db]
                
                # Save data from validated_data
                data = serializer.validated_data
                
                # Debug: Log personal_info to see what's being saved
                print(f"DEBUG: personal_info in validated_data: {data.get('personal_info', {})}", file=sys.stderr)
                personal_info = data.get('personal_info', {})
                print(f"DEBUG: professional_title = {personal_info.get('professional_title', 'NOT FOUND')}", file=sys.stderr)
                print(f"DEBUG: linkedin = {personal_info.get('linkedin', 'NOT FOUND')}", file=sys.stderr)
                print(f"DEBUG: github = {personal_info.get('github', 'NOT FOUND')}", file=sys.stderr)
                print(f"DEBUG: website = {personal_info.get('website', 'NOT FOUND')}", file=sys.stderr)
                
                # Get quality scores from request (calculated on frontend)
                # Default to 0.0 if not provided (should always be provided by frontend)
                quality_scores = {
                    'completeness_score': data.get('completeness_score', 0.0),
                    'clarity_score': data.get('clarity_score', 0.0),
                    'formatting_score': data.get('formatting_score', 0.0),
                    'impact_score': data.get('impact_score', 0.0),
                    'overall_score': data.get('overall_score', 0.0),
                }
                
                # Prepare document for MongoDB
                # Ensure personal_info includes all fields, even if empty
                personal_info_raw = request.data.get('personal_info', {})
                personal_info_validated = data.get('personal_info', {})
                # Merge to ensure all fields from request are preserved (in case serializer omits empty strings)
                personal_info_final = {
                    'first_name': personal_info_validated.get('first_name', personal_info_raw.get('first_name', '')),
                    'last_name': personal_info_validated.get('last_name', personal_info_raw.get('last_name', '')),
                    'professional_title': personal_info_validated.get('professional_title', personal_info_raw.get('professional_title', '')),
                    'profile_image': personal_info_validated.get('profile_image', personal_info_raw.get('profile_image', '')),
                    'email': personal_info_validated.get('email', personal_info_raw.get('email', '')),
                    'phone': personal_info_validated.get('phone', personal_info_raw.get('phone', '')),
                    'location': personal_info_validated.get('location', personal_info_raw.get('location', '')),
                    'linkedin': personal_info_validated.get('linkedin', personal_info_raw.get('linkedin', '')),
                    'github': personal_info_validated.get('github', personal_info_raw.get('github', '')),
                    'website': personal_info_validated.get('website', personal_info_raw.get('website', '')),
                    'summary': personal_info_validated.get('summary', personal_info_raw.get('summary', '')),
                    'interests': personal_info_validated.get('interests', personal_info_raw.get('interests', [])),
                }
                
                # Minimal logging of styling when creating resume
                styling_from_request = data.get('styling', {})
                print(f"[STYLING LOG] resume_list POST (create): has_styling_in_request={'styling' in request.data}, has_styling_in_validated={'styling' in data}, styling_keys={list(styling_from_request.keys()) if isinstance(styling_from_request, dict) else None}, font_size={styling_from_request.get('font_size') if isinstance(styling_from_request, dict) else None}", file=sys.stderr)
                
                resume_doc = {
                    'user_id': request.user.id,
                    'name': data.get('name', ''),  # Include resume name
                    'personal_info': personal_info_final,
                    'work_experience': data.get('work_experience', []),
                    'education': data.get('education', []),
                    'projects': data.get('projects', []),
                    'certificates': data.get('certificates', []),
                    'languages': data.get('languages', []),
                    'skills': data.get('skills', []),
                    'template': data.get('template', 'modern'),
                    'section_order': data.get('section_order', [
                        'summary',
                        'workExperience',
                        'education',
                        'projects',
                        'certificates',
                        'skills',
                        'languages',
                        'interests',
                    ]),
                    'styling': data.get('styling', {}),  # Include styling field
                    'completeness_score': quality_scores.get('completeness_score', 0.0),
                    'clarity_score': quality_scores.get('clarity_score', 0.0),
                    'formatting_score': quality_scores.get('formatting_score', 0.0),
                    'impact_score': quality_scores.get('impact_score', 0.0),
                    'overall_score': quality_scores.get('overall_score', 0.0),
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow(),
                }
                
                # Insert into MongoDB
                result = db.resumes.insert_one(resume_doc)
                resume_id = result.inserted_id
                
                # Retrieve the created resume
                created_doc = db.resumes.find_one({'_id': resume_id})
                
                # Minimal logging of styling after creation
                created_styling = created_doc.get('styling')
                print(f"[STYLING LOG] resume_list POST (after create): resume_id={resume_id}, has_styling={created_styling is not None}, styling_keys={list(created_styling.keys()) if isinstance(created_styling, dict) else None}, font_size={(created_styling or {}).get('font_size') if isinstance(created_styling, dict) else None}", file=sys.stderr)
                
                # Format response
                resume_dict = {
                    'id': str(created_doc['_id']),
                    'name': created_doc.get('name', ''),  # Include resume name
                    'personal_info': created_doc.get('personal_info', {}),
                    'work_experience': created_doc.get('work_experience', []),
                    'education': created_doc.get('education', []),
                    'projects': created_doc.get('projects', []),
                    'certificates': created_doc.get('certificates', []),
                    'languages': created_doc.get('languages', []),
                    'skills': created_doc.get('skills', []),
                    'template': created_doc.get('template', 'modern'),
                    'section_order': created_doc.get('section_order', [
                        'summary',
                        'workExperience',
                        'education',
                        'projects',
                        'certificates',
                        'skills',
                        'languages',
                        'interests',
                    ]),
                    'styling': created_doc.get('styling', {}),  # Include styling field
                    'completeness_score': created_doc.get('completeness_score', 0.0),
                    'clarity_score': created_doc.get('clarity_score', 0.0),
                    'formatting_score': created_doc.get('formatting_score', 0.0),
                    'impact_score': created_doc.get('impact_score', 0.0),
                    'overall_score': created_doc.get('overall_score', 0.0),
                    'created_at': get_date_or_now(created_doc.get('created_at')),
                    'updated_at': get_date_or_now(created_doc.get('updated_at')),
                }
                
                return Response(resume_dict, status=status.HTTP_201_CREATED)
            except Exception as e:
                import traceback
                error_traceback = traceback.format_exc()
                error_message = str(e)
                logger.error(f"Error saving resume: {error_message}")
                logger.error(error_traceback)
                print(f"ERROR SAVING RESUME: {error_message}")
                print(error_traceback)
                return Response(
                    {'error': error_message, 'detail': error_traceback.split('\n')[-5:] if error_traceback else []},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        logger.error(f"Serializer validation failed: {serializer.errors}")
        print(f"DEBUG: Serializer errors: {serializer.errors}", file=sys.stderr)
        print(f"DEBUG: Request data keys: {list(request.data.keys())}", file=sys.stderr)
        if 'personal_info' in request.data:
            print(f"DEBUG: personal_info keys: {list(request.data['personal_info'].keys()) if isinstance(request.data['personal_info'], dict) else 'NOT A DICT'}", file=sys.stderr)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def resume_detail(request, pk):
    """
    Retrieve, update or delete a resume (only if it belongs to the authenticated user)
    """
    # Setup MongoDB connection for all methods
    from pymongo import MongoClient
    from bson import ObjectId as BsonObjectId
    import os
    
    # First try to use connection string if available
    connection_string = os.getenv('MONGODB_CONNECTION_STRING')
    if connection_string:
        # Try using connection string, but if it fails, fall back to individual vars
        try:
            client = MongoClient(connection_string)
            # Test the connection
            client.admin.command('ping')
        except Exception:
            # Connection string might have encoding issues, use individual vars
            connection_string = None
    
    if not connection_string:
        # Use individual env vars (more reliable for special characters)
        mongo_host = os.getenv('MONGODB_HOST', 'localhost')
        mongo_port = int(os.getenv('MONGODB_PORT', 27017))
        mongo_db = os.getenv('MONGODB_NAME', 'resume_db')
        mongo_username = os.getenv('MONGODB_USERNAME', '')
        mongo_password = os.getenv('MONGODB_PASSWORD', '')
        
        # Create authenticated connection
        if mongo_username and mongo_password:
            client = MongoClient(
                mongo_host,
                mongo_port,
                username=mongo_username,
                password=mongo_password,
                authSource='admin',
                authMechanism='SCRAM-SHA-1'
            )
        else:
            client = MongoClient(mongo_host, mongo_port)
    
    mongo_db = os.getenv('MONGODB_NAME', 'resume_db')
    db = client[mongo_db]
    
    # Validate ObjectId format
    try:
        resume_id = BsonObjectId(pk)
    except Exception:
        return Response(
            {'error': 'Invalid resume ID format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if request.method == 'GET':
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Get the specific resume
            resume_doc = db.resumes.find_one({'_id': resume_id, 'user_id': request.user.id})
            
            if not resume_doc:
                return Response(
                    {'error': 'Resume not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Minimal logging to trace styling presence without PII
            styling_from_db = resume_doc.get('styling')
            print(f"[STYLING LOG] resume_detail GET: resume_id={resume_doc.get('_id')}, has_styling={styling_from_db is not None}, styling_keys={list(styling_from_db.keys()) if isinstance(styling_from_db, dict) else None}, font_size={(styling_from_db or {}).get('font_size') if isinstance(styling_from_db, dict) else None}", file=sys.stderr)

            resume_dict = {
                'id': str(resume_doc['_id']),
                'name': resume_doc.get('name', ''),  # Include resume name
                'personal_info': resume_doc.get('personal_info', {}),
                'work_experience': resume_doc.get('work_experience', []),
                'education': resume_doc.get('education', []),
                'projects': resume_doc.get('projects', []),
                'certificates': resume_doc.get('certificates', []),
                'languages': resume_doc.get('languages', []),
                'skills': resume_doc.get('skills', []),
                'template': resume_doc.get('template', 'modern'),
                'section_order': resume_doc.get('section_order', [
                    'summary',
                    'workExperience',
                    'education',
                    'projects',
                    'certificates',
                    'skills',
                    'languages',
                    'interests',
                ]),
                'styling': resume_doc.get('styling', {}),  # Include styling field
                'completeness_score': resume_doc.get('completeness_score', 0.0),
                'clarity_score': resume_doc.get('clarity_score', 0.0),
                'formatting_score': resume_doc.get('formatting_score', 0.0),
                'impact_score': resume_doc.get('impact_score', 0.0),
                'overall_score': resume_doc.get('overall_score', 0.0),
                'created_at': get_date_or_now(resume_doc.get('created_at')),
                'updated_at': get_date_or_now(resume_doc.get('updated_at')),
            }
            return Response(resume_dict)
        except Exception as e:
            logger.error(f"Error serializing resume: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    elif request.method == 'PUT':
        import logging
        logger = logging.getLogger(__name__)

        serializer = ResumeSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Quality scores are calculated on the frontend and sent only on a
                # full save (e.g. "Complete CV"). Per-step autosave PUTs omit them.
                # IMPORTANT: only update score fields that are actually provided —
                # otherwise an autosave would wipe a previously computed score back
                # to 0.0, making the resume listing disagree with the score the user
                # saw. Absent scores are left untouched (preserved in MongoDB).
                data = serializer.validated_data
                _score_keys = (
                    'completeness_score',
                    'clarity_score',
                    'formatting_score',
                    'impact_score',
                    'overall_score',
                )
                quality_scores = {
                    key: data.get(key)
                    for key in _score_keys
                    if key in data and data.get(key) is not None
                }
                
                # Update the resume in MongoDB
                # Ensure personal_info includes all fields, even if empty
                personal_info_raw = request.data.get('personal_info', {})
                personal_info_validated = data.get('personal_info', {})
                # Merge to ensure all fields from request are preserved (in case serializer omits empty strings)
                personal_info_final = {
                    'first_name': personal_info_validated.get('first_name', personal_info_raw.get('first_name', '')),
                    'last_name': personal_info_validated.get('last_name', personal_info_raw.get('last_name', '')),
                    'professional_title': personal_info_validated.get('professional_title', personal_info_raw.get('professional_title', '')),
                    'profile_image': personal_info_validated.get('profile_image', personal_info_raw.get('profile_image', '')),
                    'email': personal_info_validated.get('email', personal_info_raw.get('email', '')),
                    'phone': personal_info_validated.get('phone', personal_info_raw.get('phone', '')),
                    'location': personal_info_validated.get('location', personal_info_raw.get('location', '')),
                    'linkedin': personal_info_validated.get('linkedin', personal_info_raw.get('linkedin', '')),
                    'github': personal_info_validated.get('github', personal_info_raw.get('github', '')),
                    'website': personal_info_validated.get('website', personal_info_raw.get('website', '')),
                    'summary': personal_info_validated.get('summary', personal_info_raw.get('summary', '')),
                    'interests': personal_info_validated.get('interests', personal_info_raw.get('interests', [])),
                }
                
                # Minimal logging of styling coming from frontend / serializer (no PII)
                print(f"[STYLING LOG] resume_detail PUT (before update): resume_id={resume_id}, has_styling_in_request={'styling' in request.data}, has_styling_in_validated={'styling' in data}, validated_styling_keys={list((data.get('styling') or {}).keys()) if isinstance(data.get('styling'), dict) else None}", file=sys.stderr)

                # Update the resume in MongoDB
                update_data = serializer.validated_data.copy()
                update_data['personal_info'] = personal_info_final  # Use merged personal_info
                # Drop any score keys the copy may carry (incl. nulls), then set only
                # the ones actually provided, so omitted scores stay as they were.
                for key in _score_keys:
                    update_data.pop(key, None)
                update_data.update(quality_scores)  # Add provided scores only
                update_data['updated_at'] = datetime.utcnow()  # Set updated_at timestamp
                
                result = db.resumes.update_one(
                    {'_id': resume_id, 'user_id': request.user.id},
                    {'$set': update_data}
                )
                
                if result.matched_count == 0:
                    return Response(
                        {'error': 'Resume not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Return updated resume
                updated_doc = db.resumes.find_one({'_id': resume_id})

                # Minimal logging of styling after update (to compare with request)
                updated_styling = updated_doc.get('styling')
                print(f"[STYLING LOG] resume_detail PUT (after update): resume_id={updated_doc.get('_id')}, has_styling={updated_styling is not None}, styling_keys={list(updated_styling.keys()) if isinstance(updated_styling, dict) else None}, font_size={(updated_styling or {}).get('font_size') if isinstance(updated_styling, dict) else None}", file=sys.stderr)

                resume_dict = {
                    'id': str(updated_doc['_id']),
                    'name': updated_doc.get('name', ''),  # Include resume name
                    'personal_info': updated_doc.get('personal_info', {}),
                    'work_experience': updated_doc.get('work_experience', []),
                    'education': updated_doc.get('education', []),
                    'projects': updated_doc.get('projects', []),
                    'certificates': updated_doc.get('certificates', []),
                    'languages': updated_doc.get('languages', []),
                    'skills': updated_doc.get('skills', []),
                    'template': updated_doc.get('template', 'modern'),
                    'section_order': updated_doc.get('section_order', [
                        'summary',
                        'workExperience',
                        'education',
                        'projects',
                        'certificates',
                        'skills',
                        'languages',
                        'interests',
                    ]),
                    'styling': updated_doc.get('styling', {}),  # Include styling field
                    'completeness_score': updated_doc.get('completeness_score', 0.0),
                    'clarity_score': updated_doc.get('clarity_score', 0.0),
                    'formatting_score': updated_doc.get('formatting_score', 0.0),
                    'impact_score': updated_doc.get('impact_score', 0.0),
                    'overall_score': updated_doc.get('overall_score', 0.0),
                    'created_at': get_date_or_now(updated_doc.get('created_at')),
                    'updated_at': get_date_or_now(updated_doc.get('updated_at')),
                }
                return Response(resume_dict)
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        result = db.resumes.delete_one({'_id': resume_id, 'user_id': request.user.id})
        
        if result.deleted_count == 0:
            return Response(
                {'error': 'Resume not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {'message': 'Resume deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def parse_resume(request):
    """
    Parse uploaded resume (PDF or text) and return structured data
    
    POST /api/resumes/parse/
    Accepts:
    - file: PDF or text file (optional - backend will extract text using pdfplumber)
    - text: Plain text string (optional - if frontend already extracted)
    
    Returns structured resume data matching CVFormData format
    """
    try:
        from .resume_parser import get_resume_parser
        from .pdf_parser import extract_text_from_pdf
        
        text = None
        
        # Check if file is uploaded (backend will extract text using pdfplumber)
        if 'file' in request.FILES:
            file = request.FILES['file']
            print(f"\n📄 File: {file.name} ({file.content_type}, {file.size} bytes)")
            
            # Check file type
            if file.content_type == 'application/pdf':
                text = extract_text_from_pdf(file)
                if not text:
                    return Response(
                        {"error": "Failed to extract text from PDF. Please ensure the PDF contains readable text."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            elif file.content_type == 'text/plain':
                text = file.read().decode('utf-8')
            else:
                return Response(
                    {"error": "Unsupported file type. Please upload PDF or text file."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check if text is provided directly (frontend already extracted)
        elif 'text' in request.data:
            text = request.data['text']
        else:
            return Response(
                {"error": "Please provide either a file or text"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not text or len(text.strip()) == 0:
            return Response(
                {"error": "No text content found. Please provide a valid resume file or text."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse the resume
        print("🤖 Initializing resume parser...")
        parser = get_resume_parser()
        parsed_data = parser.parse_text(text)
        print(f"✅ Parsed data keys: {list(parsed_data.keys())}")
        print(f"✅ Personal info: {parsed_data.get('personalInfo', {})}")
        print(f"✅ Work experience count: {len(parsed_data.get('workExperience', []))}")
        print(f"✅ Education count: {len(parsed_data.get('education', []))}")
        print(f"✅ Skills count: {len(parsed_data.get('skills', []))}")
        print(f"✅ Projects count: {len(parsed_data.get('projects', []))}")
        print(f"✅ Certificates count: {len(parsed_data.get('certificates', []))}")
        print(f"✅ Languages count: {len(parsed_data.get('languages', []))}")
        
        return Response(parsed_data, status=status.HTTP_200_OK)
        
    except ImportError as e:
        import traceback
        print(f"Import error: {e}")
        print(traceback.format_exc())
        return Response(
            {"error": "Resume parsing service is not available. Please ensure ML dependencies are installed."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        import traceback
        print(f"Error parsing resume: {e}")
        print(traceback.format_exc())
        return Response(
            {"error": f"Failed to parse resume: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])  # GET is public, POST requires auth check inside
def blog_post_list(request):
    """
    List all published blog posts or create a new one
    GET: Public - returns all published posts for a language
    POST: Requires authentication - creates a new blog post
    """
    # Get MongoDB connection
    connection_string = os.getenv('MONGODB_CONNECTION_STRING')
    if not connection_string:
        connection_string = f"mongodb://{os.getenv('MONGODB_HOST', 'localhost')}:{os.getenv('MONGODB_PORT', '27017')}"
    
    try:
        client = MongoClient(connection_string)
        db = client[os.getenv('MONGODB_NAME', 'resume_db')]
        collection = db['blog_posts']
    except Exception as e:
        return Response({'error': f'Database connection failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    if request.method == 'GET':
        # Public endpoint - get all published posts (including scheduled that are due)
        language = request.query_params.get('language', 'en')
        include_drafts = request.query_params.get('include_drafts', 'false').lower() == 'true'
        
        try:
            now = datetime.utcnow()
            
            # Build query - published posts or scheduled posts that are due
            query = {
                'language': language,
                '$or': [
                    {'published': True},
                    {
                        'published': False,
                        'scheduled_publish_at': {'$lte': now}  # Scheduled posts that are due
                    }
                ]
            }
            
            # If authenticated and requesting drafts, include them
            if include_drafts and request.user.is_authenticated:
                query = {'language': language}  # Show all posts for authenticated users
                # Filter by current user's posts
                query['author_id'] = str(request.user.id)
            
            posts = list(collection.find(query).sort('created_at', -1))
            
            # Auto-publish scheduled posts that are due
            for post in posts:
                scheduled_at = post.get('scheduled_publish_at')
                if scheduled_at and not post.get('published', False):
                    if isinstance(scheduled_at, datetime):
                        if scheduled_at <= now:
                            # Auto-publish
                            collection.update_one(
                                {'_id': post.get('_id')},
                                {'$set': {'published': True}}
                            )
                            post['published'] = True
            
            # Convert ObjectId to string and clean up
            for post in posts:
                if '_id' in post:
                    post['id'] = str(post.get('_id', post.get('id', '')))
                    del post['_id']
                # Ensure id field exists
                if 'id' not in post:
                    post['id'] = str(post.get('_id', ''))
                # Format scheduled_publish_at if present
                if 'scheduled_publish_at' in post and post['scheduled_publish_at']:
                    if isinstance(post['scheduled_publish_at'], datetime):
                        post['scheduled_publish_at'] = post['scheduled_publish_at'].isoformat()
            
            # Filter out drafts for public requests
            if not include_drafts or not request.user.is_authenticated:
                posts = [p for p in posts if p.get('published', False) or (p.get('scheduled_publish_at') and datetime.fromisoformat(p['scheduled_publish_at'].replace('Z', '+00:00')) <= now)]
            
            return Response(posts)
        except Exception as e:
            return Response({'error': f'Failed to fetch blog posts: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        # Protected endpoint - create new post
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = BlogPostSerializer(data=request.data)
        if serializer.is_valid():
            try:
                post_data = serializer.validated_data.copy()
                post_data['author_id'] = str(request.user.id)
                post_data['created_at'] = datetime.utcnow()
                post_data['updated_at'] = datetime.utcnow()
                
                # Handle scheduled publishing
                scheduled_at = post_data.get('scheduled_publish_at')
                if scheduled_at:
                    # Convert string to datetime if needed
                    if isinstance(scheduled_at, str):
                        try:
                            scheduled_at = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
                        except:
                            scheduled_at = datetime.fromisoformat(scheduled_at)
                    post_data['scheduled_publish_at'] = scheduled_at
                    # If scheduled time is in the past, publish immediately
                    if scheduled_at <= datetime.utcnow():
                        post_data['published'] = True
                    else:
                        # Keep as draft until scheduled time
                        post_data['published'] = post_data.get('published', False)
                else:
                    # No scheduled time - use published status as provided
                    if 'published' not in post_data:
                        post_data['published'] = False  # Default to draft
                
                # Check if post with this ID and language already exists
                existing = collection.find_one({
                    'id': post_data['id'],
                    'language': post_data.get('language', 'en')
                })
                
                if existing:
                    # Update existing
                    collection.update_one(
                        {'id': post_data['id'], 'language': post_data.get('language', 'en')},
                        {'$set': post_data}
                    )
                    return Response(serializer.data, status=status.HTTP_200_OK)
                else:
                    # Create new
                    collection.insert_one(post_data)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': f'Failed to save blog post: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])  # GET is public, PUT/DELETE require auth check inside
def blog_post_detail(request, post_id):
    """
    Get, update, or delete a specific blog post
    GET: Public - returns the post if published
    PUT/DELETE: Requires authentication
    """
    # Get MongoDB connection
    connection_string = os.getenv('MONGODB_CONNECTION_STRING')
    if not connection_string:
        connection_string = f"mongodb://{os.getenv('MONGODB_HOST', 'localhost')}:{os.getenv('MONGODB_PORT', '27017')}"
    
    try:
        client = MongoClient(connection_string)
        db = client[os.getenv('MONGODB_NAME', 'resume_db')]
        collection = db['blog_posts']
    except Exception as e:
        return Response({'error': f'Database connection failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    language = request.query_params.get('language', 'en')
    
    try:
        post = collection.find_one({'id': post_id, 'language': language})
    except Exception as e:
        return Response({'error': f'Failed to fetch blog post: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    if not post:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        # Public endpoint - return if published or scheduled and due
        now = datetime.utcnow()
        scheduled_at = post.get('scheduled_publish_at')
        is_published = post.get('published', False)
        is_scheduled_due = scheduled_at and not is_published
        
        # Check if scheduled post is due
        if is_scheduled_due:
            if isinstance(scheduled_at, datetime):
                if scheduled_at <= now:
                    # Auto-publish and return
                    collection.update_one(
                        {'_id': post.get('_id')},
                        {'$set': {'published': True}}
                    )
                    post['published'] = True
                else:
                    # Not due yet - only show to author
                    if not request.user.is_authenticated or str(post.get('author_id')) != str(request.user.id):
                        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
            elif isinstance(scheduled_at, str):
                try:
                    scheduled_dt = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
                    if scheduled_dt <= now:
                        collection.update_one(
                            {'_id': post.get('_id')},
                            {'$set': {'published': True}}
                        )
                        post['published'] = True
                    else:
                        if not request.user.is_authenticated or str(post.get('author_id')) != str(request.user.id):
                            return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
                except:
                    pass
        
        # If not published and not scheduled due, only show to author
        if not is_published and not is_scheduled_due:
            if not request.user.is_authenticated or str(post.get('author_id')) != str(request.user.id):
                return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Clean up ObjectId
        if '_id' in post:
            post['id'] = str(post.get('_id', post.get('id', '')))
            del post['_id']
        if 'id' not in post:
            post['id'] = post_id
        
        return Response(post)
    
    elif request.method in ['PUT', 'DELETE']:
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if request.method == 'PUT':
            serializer = BlogPostSerializer(data=request.data)
            if serializer.is_valid():
                try:
                    post_data = serializer.validated_data.copy()
                    post_data['updated_at'] = datetime.utcnow()
                    
                    # Handle scheduled publishing
                    scheduled_at = post_data.get('scheduled_publish_at')
                    if scheduled_at:
                        # Convert string to datetime if needed
                        if isinstance(scheduled_at, str):
                            try:
                                scheduled_at = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
                            except:
                                scheduled_at = datetime.fromisoformat(scheduled_at)
                        post_data['scheduled_publish_at'] = scheduled_at
                        # If scheduled time is in the past, publish immediately
                        if scheduled_at <= datetime.utcnow():
                            post_data['published'] = True
                    
                    collection.update_one(
                        {'id': post_id, 'language': language},
                        {'$set': post_data}
                    )
                    return Response(serializer.data)
                except Exception as e:
                    return Response({'error': f'Failed to update blog post: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            try:
                collection.delete_one({'id': post_id, 'language': language})
                return Response(status=status.HTTP_204_NO_CONTENT)
            except Exception as e:
                return Response({'error': f'Failed to delete blog post: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Simple health check endpoint (public)
    """
    try:
        # Check if parser is available
        from .resume_parser import get_resume_parser
        parser = get_resume_parser()
        parser_status = "available"
        
        # Test parser with sample text if requested
        test_text = request.query_params.get('test', None)
        if test_text:
            print(f"🧪 Testing parser with sample text: {test_text[:100]}...")
            try:
                test_result = parser.parse_text(test_text[:500])  # Limit to 500 chars for testing
                parser_status = f"working - extracted {len(test_result.get('workExperience', []))} work exp, {len(test_result.get('education', []))} education entries"
                print(f"✅ Parser test successful")
            except Exception as e:
                parser_status = f"error: {str(e)}"
                print(f"❌ Parser test failed: {e}")
    except Exception as e:
        parser_status = f"not_available: {str(e)}"
    
    return Response({
        'status': 'healthy',
        'message': 'Resume API is running',
        'resume_parser': parser_status
    })

