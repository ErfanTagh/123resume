"""
Personal information extraction from resume text
"""
import re
from typing import Dict, Any


def extract_personal_info(raw_text: str = "", flat_text: str = "", sections: Dict[str, str] = None) -> Dict[str, Any]:
    """Extract personal information from text"""
    personal_info = {
        "firstName": "",
        "lastName": "",
        "email": "",
        "phone": "",
        "location": "",
        "professionalTitle": "",
        "profileImage": "",
        "linkedin": "",
        "github": "",
        "website": "",
        "summary": "",
        "interests": [],
    }
    
    # Extract email and phone using flat_text (light cleanup helps regex)
    if flat_text:
        # Extract email (more robust pattern)
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, flat_text)
        if emails:
            personal_info["email"] = emails[0].lower()
        
        # Extract phone (international format) - require 8+ digits to avoid postal codes
        phone_patterns = [
            r'\+?\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{4,}',  # International (8+ digits)
            r'\(\d{3}\)\s?\d{3}[-.\s]?\d{4}',  # US format (10 digits)
            r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4,}',  # Standard (8+ digits)
        ]
        for pattern in phone_patterns:
            phones = re.findall(pattern, flat_text)
            if phones:
                phone = re.sub(r'[\s\-\(\)]', '', phones[0])
                # Verify it has at least 8 digits
                digit_count = sum(c.isdigit() for c in phone)
                if digit_count >= 8:
                    personal_info["phone"] = phone
                    break
    
    # Extract name using raw_text (preserves layout)
    if raw_text:
        
        # Strategy 1: Check the very beginning of raw text (handle multiple spaces and all caps)
        # Pattern 1: Normal case (First Last) - single space
        beginning_match = re.match(r'^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', raw_text.strip())
        # Pattern 2: All caps with multiple spaces (AMIN  SEDGHI) - this is the key pattern for this case
        all_caps_match = re.match(r'^([A-Z]{2,}\s{1,}[A-Z]{2,}(?:\s{1,}[A-Z]{2,})?)', raw_text.strip())
        # Pattern 3: Mixed case with multiple spaces
        mixed_spaces_match = re.match(r'^([A-Z][A-Za-z]+\s{2,}[A-Z][A-Za-z]+(?:\s{2,}[A-Z][A-Za-z]+)?)', raw_text.strip())
        
        potential_name = None
        match_type = None
        if all_caps_match:
            potential_name = all_caps_match.group(1)
            match_type = "all_caps"
        elif beginning_match:
            potential_name = beginning_match.group(1)
            match_type = "normal"
        elif mixed_spaces_match:
            potential_name = mixed_spaces_match.group(1)
            match_type = "mixed_spaces"
        
        if potential_name:
            # Normalize spaces and check if it's a valid name
            name_parts = re.split(r'\s+', potential_name.strip())
            
            # STRICT: Only accept 2 words (first name + last name)
            # Job titles often come right after, so limit to 2 words to avoid including them
            if len(name_parts) == 2:
                # Words that should NOT be in a name
                invalid_name_words = {'the', 'and', 'for', 'with', 'from', 'contact', 'email', 'phone', 'date', 'birth', 'number', 'present', 'working', 'student', 'software', 'engineer', 'developer'}
                
                # Check if name parts themselves are invalid
                name_has_invalid_word = any(word.lower() in invalid_name_words for word in name_parts)
                
                # Check what comes after the name
                remaining_text = raw_text[len(potential_name):].strip()
                next_words = remaining_text.split()[:3] if remaining_text else []
                next_word = next_words[0].lower() if next_words else ""
                
                # If name is at the very beginning of raw text (first 50 chars), it's very likely the actual name
                name_position = raw_text.find(potential_name)
                name_at_start = name_position < 50
                
                # Reject if next word is a job title keyword
                job_title_keywords = {'software', 'engineer', 'developer', 'manager', 'analyst', 'specialist', 
                                     'architect', 'scientist', 'director', 'lead', 'senior', 'junior'}
                next_word_is_job_title = next_word in job_title_keywords
                
                # Accept if:
                # 1. Name parts are valid (not common words)
                # 2. Name is at start of text
                # 3. Next word is NOT a job title keyword
                if (not name_has_invalid_word and name_at_start and not next_word_is_job_title):
                    # Capitalize properly (handle all caps)
                    if match_type == "all_caps":
                        # All caps names should be capitalized (AMIN -> Amin)
                        personal_info["firstName"] = name_parts[0].capitalize()
                        personal_info["lastName"] = name_parts[1].capitalize()
                    else:
                        personal_info["firstName"] = name_parts[0]
                        personal_info["lastName"] = name_parts[1]
        
        # Strategy 2: Search entire text for name patterns followed by job titles
        if not personal_info["firstName"]:
            name_title_pattern = r'\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s{2,}([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'
            matches = list(re.finditer(name_title_pattern, raw_text))
            for match in matches:
                potential_name = match.group(1)
                potential_title = match.group(2)
                name_parts = potential_name.split()
                
                # Check if the title part looks like a job title
                title_words = potential_title.split()
                job_keywords = ['web', 'software', 'full', 'react', 'java', 'python', 'front', 'back', 'senior', 'junior',
                               'application', 'developer', 'engineer', 'designer', 'manager', 'student', 'working', 
                               'intern', 'stack', 'end', 'native', 'mobile', 'devops', 'architect', 'specialist']
                has_job_keyword = any(keyword in ' '.join(title_words).lower() for keyword in job_keywords)
                
                if 2 <= len(name_parts) <= 3 and has_job_keyword:
                    # Check if name is not a common phrase
                    common_phrases = ['the', 'and', 'for', 'with', 'from', 'to', 'at', 'in', 'on', 
                                     'contact', 'email', 'phone', 'address', 'linkedin', 'github',
                                     'master', 'bachelor', 'degree', 'university', 'college',
                                     'projects', 'experience', 'education', 'skills', 'languages',
                                     'certifications', 'interests']
                    if not any(word.lower() in common_phrases for word in name_parts):
                        personal_info["firstName"] = name_parts[0]
                        personal_info["lastName"] = ' '.join(name_parts[1:])
                        break
        
        # Strategy 3: Check the END of the raw text (where name often appears in some resume formats)
        if not personal_info["firstName"]:
            end_text = raw_text[-1000:] if len(raw_text) > 1000 else raw_text
            end_lines = end_text.split('\n')[-10:]  # Last 10 lines
            
            for i, line in enumerate(end_lines):
                line = line.strip()
                if not line or len(line) < 3:
                    continue
                
                # Look for name pattern at start of line
                name_match = re.match(r'^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', line)
                if name_match:
                    potential_name = name_match.group(1)
                    name_parts = potential_name.split()
                    if 2 <= len(name_parts) <= 3:
                        # Check if followed by job title or is standalone
                        remaining = line[len(potential_name):].strip()
                        job_indicators = ['developer', 'engineer', 'manager', 'designer', 'analyst', 'specialist',
                                         'application', 'web', 'software', 'full', 'stack', 'front', 'back', 'end',
                                         'student', 'working', 'intern', 'assistant']
                        if not remaining or any(indicator in remaining.lower() for indicator in job_indicators):
                            common_phrases = ['the', 'and', 'for', 'with', 'from', 'contact', 'email', 'phone', 'present', 'working']
                            if not any(word.lower() in common_phrases for word in name_parts):
                                personal_info["firstName"] = name_parts[0]
                                personal_info["lastName"] = ' '.join(name_parts[1:])
                                break
        
        # Strategy 4: REFINED - Extract name from single line only, top 3 non-empty lines
        # Limit to 2-3 words, reject if next line is indented or looks like job title
        if not personal_info["firstName"]:
            lines = raw_text.split('\n')
            # Get top 3 non-empty lines
            non_empty_lines = []
            for line in lines[:10]:  # Check first 10 lines for non-empty ones
                stripped = line.strip()
                if stripped and len(stripped) >= 3:
                    non_empty_lines.append((line, stripped))
                    if len(non_empty_lines) >= 3:
                        break
            
            for i, (original_line, line) in enumerate(non_empty_lines):
                # Skip lines with common resume section keywords
                skip_keywords = ["resume", "cv", "curriculum vitae", "contact", "profile", "summary", 
                               "experience", "education", "skills", "projects", "projekte", "berufserfahrung",
                               "email", "phone", "address", "linkedin", "github"]
                if any(keyword in line.lower() for keyword in skip_keywords):
                    continue
                
                # Extract name from this single line only (2-3 words)
                # Pattern: Full line is just a name (2-3 capitalized words)
                name_match = re.match(r'^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})$', line)
                if name_match:
                    name_parts = line.split()
                    if 2 <= len(name_parts) <= 3:
                        # Check next line - reject if heavily indented or looks like job title
                        if i + 1 < len(non_empty_lines):
                            next_line = non_empty_lines[i + 1][1]
                            # Check if next line is heavily indented (starts with 3+ spaces in original)
                            next_original = non_empty_lines[i + 1][0]
                            is_indented = len(next_original) - len(next_original.lstrip()) >= 3
                            
                            # Check if next line looks like a job title
                            job_title_keywords = ['developer', 'engineer', 'manager', 'analyst', 'specialist', 
                                                 'architect', 'scientist', 'director', 'lead', 'senior', 'junior',
                                                 'application', 'web', 'software', 'full', 'stack', 'front', 'back',
                                                 'student', 'working', 'intern', 'assistant', 'entwickler']
                            looks_like_job_title = any(keyword in next_line.lower() for keyword in job_title_keywords)
                            
                            # Reject if next line is indented or looks like job title
                            if is_indented or looks_like_job_title:
                                continue
                        
                        # Accept the name
                        personal_info["firstName"] = name_parts[0]
                        personal_info["lastName"] = ' '.join(name_parts[1:])
                        break
        
        # Extract LinkedIn
        linkedin_pattern = r'linkedin\.com/in/[\w-]+'
        linkedin_matches = re.findall(linkedin_pattern, flat_text, re.IGNORECASE)
        if linkedin_matches:
            personal_info["linkedin"] = f"https://{linkedin_matches[0]}"
        
        # Extract GitHub
        github_patterns = [
            r'github\.com/[\w-]+',
            r'[\w-]+\.github\.io',
        ]
        for pattern in github_patterns:
            github_matches = re.findall(pattern, flat_text, re.IGNORECASE)
            if github_matches:
                github_url = github_matches[0]
                if not github_url.startswith('http'):
                    if '.github.io' in github_url:
                        personal_info["github"] = f"https://{github_url}"
                    else:
                        personal_info["github"] = f"https://github.com/{github_url.split('/')[-1]}"
                else:
                    personal_info["github"] = github_url
                break
    
    # Which fields were found, never their values: logs must not hold user data
    found = [k for k in ('firstName', 'lastName', 'email', 'phone', 'linkedin', 'github') if personal_info.get(k)]
    print(f"  Personal info found: {', '.join(found) or 'nothing'}")

    return personal_info

