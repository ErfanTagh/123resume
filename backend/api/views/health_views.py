"""
Health check views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Simple health check endpoint (public)
    """
    try:
        # Check if parser is available
        from ..resume_parser import get_resume_parser
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

