"""
Work experience extraction from resume text
"""
import re
from typing import Dict, List, Any
from .utils import month_to_number


def extract_work_experience_block_based(text: str, sections: Dict[str, str] = None) -> List[Dict]:
    """
    Block-based work experience extraction (conservative)
    Anchors on date ranges, groups nearby lines into blocks
    """
    work_experiences = []
    
    print("\n" + "-" * 80)
    print("💼 WORK EXPERIENCE EXTRACTION (Block-based)")
    print("-" * 80)
    
    # ONLY extract from experience section
    experience_text = ""
    if sections and "experience" in sections:
        experience_text = sections["experience"]
        print(f"  Section found: {len(experience_text)} chars")
    else:
        print(f"  ⚠️ No EXPERIENCE section found")
        return [{
            "position": "",
            "company": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "description": "",
            "responsibilities": [],
            "technologies": [],
            "competencies": []
        }]
    
    if not experience_text:
        return [{
            "position": "",
            "company": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "description": "",
            "responsibilities": [],
            "technologies": [],
            "competencies": []
        }]
    
    print(f"  📄 Experience section text (first 500 chars):")
    print(f"  {repr(experience_text[:500])}")
    print()
    
    # Step 1: Find all date ranges (anchor points)
    # Support multiple formats: Month YYYY, MM/YYYY, YYYY
    date_range_patterns = [
        # Format: Month YYYY - Month YYYY or Present
        re.compile(
            r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*[-–]\s*'
            r'(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+)?(\d{4}|Present|present)',
            re.IGNORECASE
        ),
        # Format: MM/YYYY - MM/YYYY or Present
        re.compile(
            r'(\d{1,2})/(\d{4})\s*[-–]\s*(\d{1,2})?/?(\d{4}|Present|present)?',
            re.IGNORECASE
        ),
        # Format: YYYY - YYYY or Present
        re.compile(
            r'(\d{4})\s*[-–]\s*(\d{4}|Present|present)',
            re.IGNORECASE
        ),
    ]
    
    lines = experience_text.split('\n')
    date_matches = []
    for i, line in enumerate(lines):
        for pattern_idx, pattern in enumerate(date_range_patterns):
            for match in pattern.finditer(line):
                date_matches.append({
                    'line_idx': i,
                    'match': match,
                    'line': line,
                    'pattern_idx': pattern_idx
                })
    
    print(f"  🔍 Found {len(date_matches)} date ranges")
    
    # Step 2: Build experience blocks first (title → company/date → bullets)
    # Group date matches and build complete blocks
    processed_blocks = set()  # Track processed line indices to avoid duplicates
    
    for date_info in date_matches:
        line_idx = date_info['line_idx']
        match = date_info['match']
        pattern_idx = date_info['pattern_idx']
        
        # Skip if this line was already processed as part of another block
        if line_idx in processed_blocks:
            continue
        
        date_line = lines[line_idx]
        
        # Extract date info based on pattern type
        start_date = ""
        end_date = ""
        
        if pattern_idx == 0:  # Month YYYY format
            start_month = match.group(1)
            start_year = match.group(2)
            end_month = match.group(3) if match.lastindex >= 3 else None
            end_year = match.group(4) if match.lastindex >= 4 else None
            
            start_date = f"{start_year}-{month_to_number(start_month)}" if start_month and start_year else ""
            # Only use "Present" if the word actually exists in the line
            has_present = 'present' in date_line.lower()
            if end_year and end_year.lower() == 'present' and has_present:
                end_date = ""
            elif end_year and end_year.lower() not in ['present', '']:
                end_date = f"{end_year}-{month_to_number(end_month)}" if end_month else f"{end_year}-12"
            else:
                end_date = ""
        elif pattern_idx == 1:  # MM/YYYY format
            start_month = match.group(1)
            start_year = match.group(2)
            end_month = match.group(3) if match.lastindex >= 3 and match.group(3) else None
            end_year = match.group(4) if match.lastindex >= 4 and match.group(4) else None
            
            start_date = f"{start_year}-{start_month.zfill(2)}" if start_month and start_year else ""
            # Only use "Present" if the word actually exists in the line
            has_present = 'present' in date_line.lower()
            if end_year and end_year.lower() == 'present' and has_present:
                end_date = ""
            elif end_year and end_year.lower() not in ['present', '']:
                end_date = f"{end_year}-{end_month.zfill(2)}" if end_month else f"{end_year}-12"
            else:
                end_date = ""
        elif pattern_idx == 2:  # YYYY format
            start_year = match.group(1)
            end_year = match.group(2) if match.lastindex >= 2 else None
            
            start_date = f"{start_year}-01" if start_year else ""
            # Only use "Present" if the word actually exists in the line
            has_present = 'present' in date_line.lower()
            if end_year and end_year.lower() == 'present' and has_present:
                end_date = ""
            elif end_year and end_year.lower() not in ['present', '']:
                end_date = end_year
            else:
                end_date = ""
        
        # Define block: 5 lines before date, 10 lines after (for description)
        block_start = max(0, line_idx - 5)
        block_end = min(len(lines), line_idx + 10)
        block_lines = lines[block_start:block_end]
        
        # Build block structure: title → company/date → bullets
        position = ""
        company = ""
        
        # Step 1: Extract job title from lines BEFORE date (title comes first)
        # Look backwards more carefully - title might be 2-3 lines before
        # Also check if title contains "/" or "|" - these are strong indicators
        for i in range(line_idx - 1, max(0, line_idx - 5), -1):
            line = lines[i].strip()
            if not line or line.startswith(('•', '-', '*')):
                continue
            
            # Strong indicator: line contains "/" or "|" (common in job titles like "Engineer / Developer")
            if '/' in line or '|' in line:
                if 5 <= len(line) <= 100:  # Reasonable length
                    position = line
                    break
            
            # Check if line contains job title keywords (more comprehensive)
            job_title_keywords = ['developer', 'engineer', 'manager', 'analyst', 'specialist', 
                                 'architect', 'scientist', 'director', 'lead', 'senior', 'junior',
                                 'consultant', 'coordinator', 'assistant', 'full-stack', 'full stack',
                                 'working student', 'student', 'intern']
            if any(keyword in line.lower() for keyword in job_title_keywords):
                position = line
                break
            
            # Or if it's capitalized and reasonable length (but not a company name)
            if (re.match(r'^[A-Z][a-zA-Z\s/|()-]+$', line) and 5 <= len(line) <= 80 and
                not re.search(r'\d{4}', line)):  # Not a date
                position = line
                break
        
        # Step 2: Extract company from date line OR its own line
        # First, check if company is on the date line
        company_patterns = [
            re.compile(r'([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3})\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}/)', re.IGNORECASE),
            re.compile(r'([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3})\s+\d{4}', re.IGNORECASE),
        ]
        for pattern in company_patterns:
            company_match = pattern.search(date_line)
            if company_match:
                company = company_match.group(1).strip()
                break
        
        # If no company on date line, check previous lines (company can be on its own line)
        if not company:
            for i in range(line_idx - 1, max(0, line_idx - 3), -1):
                line = lines[i].strip()
                # Skip bullet points, short lines, and lines that look like job titles
                if not line or line.startswith(('•', '-', '*')) or len(line) < 3:
                    continue
                # Skip if this line was already used as a job title
                if line == position:
                    continue
                # Check if line looks like a company name (capitalized, not a date, reasonable length)
                if (re.match(r'^[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*$', line) and 
                    3 <= len(line) <= 50 and
                    not re.search(r'\d{4}', line)):  # Not a date
                    company = line
                    break
        
        # Step 3: Extract description (bullet points after date)
        description_lines = []
        for i in range(line_idx + 1, min(len(lines), line_idx + 8)):
            line = lines[i].strip()
            if line.startswith(('•', '-', '*')):
                description_lines.append(line.lstrip('•-* ').strip())
            elif line and len(line) > 10:
                # Non-bullet description line (but stop if we hit another date/company)
                if re.search(r'\d{4}', line):  # Likely another experience entry
                    break
                description_lines.append(line)
        
        # Mark this block as processed
        for idx in range(block_start, min(block_end, len(lines))):
            processed_blocks.add(idx)
        
        # Only add if we have at least a company or position
        if company or position:
            work_experiences.append({
                "position": position,
                "company": company,
                "location": "",
                "startDate": start_date,
                "endDate": end_date,
                "description": '\n'.join(description_lines) if description_lines else "",
                "responsibilities": [
                    {"responsibility": line} for line in description_lines
                ],
                "technologies": [],
                "competencies": []
            })
            print(f"  ✓ {position or '(no title)'} at {company or '(no company)'} ({start_date} - {end_date})")
    
    print(f"  📊 Extracted {len(work_experiences)} work experience entries")
    return work_experiences if work_experiences else [{
        "position": "",
        "company": "",
        "location": "",
        "startDate": "",
        "endDate": "",
        "description": "",
        "responsibilities": [],
        "technologies": [],
        "competencies": []
    }]


def extract_work_experience_with_fallback(text: str, sections: Dict[str, str] = None) -> List[Dict]:
    """
    Extract work experience with fallback: try section first, then full text
    Returns partial results instead of empty sections
    """
    # Try section-based extraction first
    if sections and "experience" in sections:
        result = extract_work_experience_block_based(text, sections)
        if result and any(exp.get('company') or exp.get('position') for exp in result):
            return result
    
    # Fallback: extract from full text using block-based patterns
    print(f"  ⚠️ No EXPERIENCE section found, extracting from full text")
    return extract_work_experience_block_based(text, None)

