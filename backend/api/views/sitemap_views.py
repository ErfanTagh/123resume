"""
Sitemap generation view
Generates dynamic XML sitemap including all published blog posts
"""
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from datetime import datetime
import os
from pymongo import MongoClient


@api_view(['GET'])
@permission_classes([AllowAny])
def generate_sitemap(request):
    """
    Generate dynamic XML sitemap including:
    - Static pages
    - All published blog posts (both languages)
    """
    # Get MongoDB connection (same logic as resume_views.py)
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
        mongo_username = os.getenv('MONGODB_USERNAME', '')
        mongo_password = os.getenv('MONGODB_PASSWORD', '')
        
        try:
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
        except Exception as e:
            # If database connection fails, return static sitemap
            return generate_static_sitemap()
    
    try:
        db = client[os.getenv('MONGODB_NAME', 'resume_db')]
        blog_collection = db['blog_posts']
    except Exception as e:
        # If database connection fails, return static sitemap
        return generate_static_sitemap()
    
    # Get all published blog posts (both languages)
    try:
        now = datetime.utcnow()
        blog_posts = list(blog_collection.find({
            'published': True,
            '$or': [
                {'scheduled_publish_at': {'$exists': False}},
                {'scheduled_publish_at': {'$lte': now}}
            ]
        }).sort('created_at', -1))
    except Exception:
        blog_posts = []
    
    # Base URL
    base_url = 'https://123resume.de'
    
    # Start building XML
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
        '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
        '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
    ]
    
    # Static pages
    static_pages = [
        {'loc': '/', 'priority': '1.0', 'changefreq': 'weekly', 'lastmod': datetime.now().strftime('%Y-%m-%d')},
        {'loc': '/about', 'priority': '0.8', 'changefreq': 'monthly', 'lastmod': datetime.now().strftime('%Y-%m-%d')},
        {'loc': '/templates', 'priority': '0.9', 'changefreq': 'monthly', 'lastmod': datetime.now().strftime('%Y-%m-%d')},
        {'loc': '/pricing', 'priority': '0.8', 'changefreq': 'monthly', 'lastmod': datetime.now().strftime('%Y-%m-%d')},
        {'loc': '/blog', 'priority': '0.8', 'changefreq': 'weekly', 'lastmod': datetime.now().strftime('%Y-%m-%d')},
        # Posts written into the frontend (src/lib/blogPosts.ts), not stored in blog_posts
        {'loc': '/blog/edit-resume-with-claude', 'priority': '0.9', 'changefreq': 'monthly', 'lastmod': '2026-10-27'},
        {'loc': '/contact', 'priority': '0.7', 'changefreq': 'monthly', 'lastmod': datetime.now().strftime('%Y-%m-%d')},
        {'loc': '/privacy', 'priority': '0.3', 'changefreq': 'yearly', 'lastmod': datetime.now().strftime('%Y-%m-%d')},
        {'loc': '/terms', 'priority': '0.3', 'changefreq': 'yearly', 'lastmod': datetime.now().strftime('%Y-%m-%d')},
    ]
    
    # Add static pages
    for page in static_pages:
        xml_lines.append('  <url>')
        xml_lines.append(f'    <loc>{base_url}{page["loc"]}</loc>')
        xml_lines.append(f'    <lastmod>{page["lastmod"]}</lastmod>')
        xml_lines.append(f'    <changefreq>{page["changefreq"]}</changefreq>')
        xml_lines.append(f'    <priority>{page["priority"]}</priority>')
        xml_lines.append('  </url>')
    
    # Add blog posts
    for post in blog_posts:
        post_id = post.get('id') or str(post.get('_id', ''))
        if not post_id:
            continue
        
        # Get lastmod date from post
        lastmod = datetime.now().strftime('%Y-%m-%d')  # Default to today
        if 'updated_at' in post and post['updated_at']:
            if isinstance(post['updated_at'], datetime):
                lastmod = post['updated_at'].strftime('%Y-%m-%d')
            elif isinstance(post['updated_at'], str):
                try:
                    dt = datetime.fromisoformat(post['updated_at'].replace('Z', '+00:00'))
                    lastmod = dt.strftime('%Y-%m-%d')
                except:
                    pass
        elif 'created_at' in post and post['created_at']:
            if isinstance(post['created_at'], datetime):
                lastmod = post['created_at'].strftime('%Y-%m-%d')
            elif isinstance(post['created_at'], str):
                try:
                    dt = datetime.fromisoformat(post['created_at'].replace('Z', '+00:00'))
                    lastmod = dt.strftime('%Y-%m-%d')
                except:
                    pass
        
        xml_lines.append('  <url>')
        xml_lines.append(f'    <loc>{base_url}/blog/{post_id}</loc>')
        xml_lines.append(f'    <lastmod>{lastmod}</lastmod>')
        xml_lines.append('    <changefreq>monthly</changefreq>')
        xml_lines.append('    <priority>0.7</priority>')
        xml_lines.append('  </url>')
    
    # Close XML
    xml_lines.append('</urlset>')
    
    # Return XML response
    response = HttpResponse('\n'.join(xml_lines), content_type='application/xml')
    return response


def generate_static_sitemap():
    """Fallback static sitemap if database is unavailable"""
    base_url = 'https://123resume.de'
    today = datetime.now().strftime('%Y-%m-%d')
    
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>{base_url}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>{base_url}/about</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>{base_url}/templates</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>{base_url}/pricing</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>{base_url}/blog</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>{base_url}/blog/edit-resume-with-claude</loc>
    <lastmod>2026-10-27</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>{base_url}/contact</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>{base_url}/privacy</loc>
    <lastmod>{today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>{base_url}/terms</loc>
    <lastmod>{today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>'''
    
    return HttpResponse(xml, content_type='application/xml')

