"""
PDF Generation Views using Playwright
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from bson import ObjectId
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from urllib.parse import urlsplit
import base64
import json
import logging

logger = logging.getLogger(__name__)

# The HTML comes from the user's browser, so it can name any URL (browser
# extensions inject their own files, too). Only our CSS and Google Fonts are
# needed: photos are data: URIs. Anything else is blocked, which also keeps
# the server's browser from reaching internal services.
PDF_ALLOWED_HOSTS = {
    '123resume.de', 'www.123resume.de',
    'fonts.googleapis.com', 'fonts.gstatic.com',
    'localhost', '127.0.0.1',
}


def _pdf_request_allowed(url: str) -> bool:
    parts = urlsplit(url)
    if parts.scheme in ('data', 'blob', 'about'):
        return True
    return parts.scheme in ('http', 'https') and parts.hostname in PDF_ALLOWED_HOSTS


def generate_pdf_from_html(html_content: str) -> bytes:
    """
    Generate PDF from HTML content using Playwright (synchronous)
    """
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.route('**/*', lambda route: route.continue_()
                   if _pdf_request_allowed(route.request.url) else route.abort())
        # Match browser PDF output: layout uses print CSS (same as page.pdf default)
        page.emulate_media(media='print')

        # Wait for CSS and fonts, but a slow or never-ending request must not
        # fail the download: past the limit, print what has loaded.
        try:
            page.set_content(html_content, wait_until='load', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=5000)
        except PlaywrightTimeoutError:
            logger.warning('PDF: page still loading after the time limit, printing as is')

        # Generate PDF with A4 format and zero margins (padding is handled in CSS)
        # prefer_css_page_size ensures @page rules and margin boxes are respected
        pdf_bytes = page.pdf(
            format='A4',
            margin={
                'top': '0mm',
                'right': '0mm',
                'bottom': '0mm',  # Keep 0 - CSS @page handles it
                'left': '0mm'
            },
            print_background=True,
            prefer_css_page_size=True,  # Important for @page rules and margin boxes
        )

        browser.close()
        return pdf_bytes


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_resume_pdf(request, resume_id):
    """
    Generate PDF for a resume
    
    Expects POST request with HTML content in the request body as JSON:
    {
        "html": "<html>...</html>" or base64 encoded string
    }
    """
    try:
        # Validate resume exists and belongs to user
        from pymongo import MongoClient
        import os
        
        # Connect to MongoDB
        connection_string = os.getenv('MONGODB_CONNECTION_STRING')
        if connection_string:
            try:
                client = MongoClient(connection_string)
                client.admin.command('ping')
            except Exception:
                connection_string = None
        
        if not connection_string:
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
        
        # Validate ObjectId
        try:
            resume_object_id = ObjectId(resume_id)
        except Exception:
            return Response(
                {'error': 'Invalid resume ID format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if resume exists and belongs to user
        resume_doc = db.resumes.find_one({'_id': resume_object_id, 'user_id': request.user.id})
        if not resume_doc:
            return Response(
                {'error': 'Resume not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get HTML from request body
        html_content = request.data.get('html') or request.POST.get('html')
        
        if not html_content:
            return Response(
                {'error': 'HTML content is required. Please provide rendered HTML in request body.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Decode base64 HTML if needed, or use directly
        try:
            # Try to decode as base64 first
            html_content = base64.b64decode(html_content).decode('utf-8')
        except:
            # If decoding fails, use as-is (might be plain HTML)
            pass
        
        # Generate PDF
        pdf_bytes = generate_pdf_from_html(html_content)
        
        # Return PDF as response
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="resume_{resume_id}.pdf"'
        return response
        
    except Exception as e:
        import traceback
        return Response(
            {'error': f'Failed to generate PDF: {str(e)}', 'detail': str(traceback.format_exc())},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

