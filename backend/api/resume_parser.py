"""
Resume Parser using regex-based extraction
Section-based parsing for accurate extraction
"""
from typing import Dict, List, Any, Optional
import threading
import re


class ResumeParser:
    """Singleton Resume Parser with lazy loading"""
    _instance = None
    _lock = threading.Lock()
    
    # Section headers for section-based parsing
    SECTION_HEADERS = {
        "education": ["education", "academic background", "academic", "qualifications"],
        "experience": [
            "experience",
            "work experience",
            "professional experience",
            "employment history",
            "employment",
            "work history",
        ],
        "skills": ["skills", "technical skills", "core competencies", "competencies"],
        "projects": ["projects", "project experience"],
        "certifications": ["certifications", "certificates", "certificate"],
        "summary": ["summary", "profile", "about", "objective"],
        "languages": ["languages", "language"],
        "interests": ["interests", "hobbies"],
    }
    
    # Section header patterns for two-column layouts (headers can appear mid-line)
    SECTION_HEADER_PATTERNS = {
        "experience": re.compile(r'\b(?:work\s+)?experience\b', re.IGNORECASE),
        "education": re.compile(r'\beducation\b', re.IGNORECASE),
        "skills": re.compile(r'\bskills?\b', re.IGNORECASE),
        "projects": re.compile(r'\bprojects?\b', re.IGNORECASE),
        "certifications": re.compile(r'\bcertifications?\b', re.IGNORECASE),
        "languages": re.compile(r'\blanguages?\b', re.IGNORECASE),
        "interests": re.compile(r'\binterests?\b', re.IGNORECASE),
    }
    
    DEGREE_KEYWORDS = [
        "bachelor", "master", "phd", "ph.d", "doctorate",
        "b.sc", "m.sc", "b.a", "m.a", "mba", "b.tech", "m.tech",
        "associate", "diploma", "certificate"
    ]
    
    def __new__(cls):
        """Singleton pattern to ensure only one model instance"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(ResumeParser, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """Initialize the parser (only once)"""
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self._initialized = True
    
    def _normalize_text(self, text: str) -> str:
        """
        Text normalization: trim whitespace, collapse spacing, preserve line breaks
        This is the primary normalization - always run on original text
        """
        lines = text.split('\n')
        normalized_lines = []
        
        for line in lines:
            # Trim leading/trailing whitespace
            line = line.strip()
            # Collapse excessive internal spacing (3+ spaces to single space)
            line = re.sub(r' {3,}', ' ', line)
            # Preserve the line (even if empty, to maintain structure)
            normalized_lines.append(line)
        
        return '\n'.join(normalized_lines)
    
    def _detect_two_column_hint(self, text: str) -> Dict[str, Any]:
        """
        Conservative two-column detection - treat as HINT only, not mode switch
        Returns hints about potential columns, but original text is always used for section detection
        """
        lines = text.split('\n')
        two_column_hints = []
        personal_info_hints = []
        
        for line in lines:
            # Only detect if there's a large whitespace gap (8+ spaces) - more conservative
            if re.search(r'\s{8,}', line):
                parts = re.split(r'\s{8,}', line, 1)
                if len(parts) == 2:
                    left = parts[0].strip()
                    right = parts[1].strip()
                    
                    # Only consider it a column if both parts have meaningful content
                    if len(left) > 3 and len(right) > 3:
                        two_column_hints.append({
                            'left': left,
                            'right': right,
                            'original': line
                        })
                        # Left column might be personal info
                        if any(keyword in left.lower() for keyword in ['contact', 'phone', 'email', '@', '+']):
                            personal_info_hints.append(left)
        
        return {
            'has_hint': len(two_column_hints) > 0,
            'hint_count': len(two_column_hints),
            'personal_info_hints': personal_info_hints
        }
    
    def _create_flat_text(self, text: str) -> str:
        """
        Create a lightly cleaned version for email/phone regex only
        Preserves newlines but fixes broken email/phone patterns
        """
        # Fix common email patterns with spaces (but preserve newlines)
        text = re.sub(r'(\w+)\s*@\s*(\w+)\s*\.\s*(\w+)', r'\1@\2.\3', text, flags=re.IGNORECASE)
        text = re.sub(r'(\S+?)\s+@\s+(\S+?)\s+\.\s+(\S+)', r'\1@\2.\3', text, flags=re.IGNORECASE)
        # Only normalize spaces within lines (not newlines)
        text = re.sub(r'[ \t]+', ' ', text)
        return text
    
    def _is_header_like(self, line: str) -> bool:
        """
        Check if a line looks like a section header (conservative)
        Headers are: short, mostly alphabetic, not bullet points, not sentences
        """
        line = line.strip()
        if not line or len(line) < 3:
            return False
        
        # Too long to be a header (likely a sentence)
        if len(line) > 50:
            return False
        
        # Contains bullet points - not a header
        if re.search(r'[•\-\*\+]\s+', line):
            return False
        
        # Contains sentence-ending punctuation - likely a sentence
        if re.search(r'[.!?]\s*$', line):
            return False
        
        # Mostly alphabetic (at least 60% letters)
        alpha_count = sum(1 for c in line if c.isalpha())
        if alpha_count / len(line) < 0.6:
            return False
        
        # Not all caps (headers are usually title case or mixed)
        if line.isupper() and len(line) > 10:
            return False
        
        return True
    
    def _normalize_header(self, line: str) -> str:
        """Normalize a header line for section detection"""
        # Remove ALL whitespace first, then remove non-letters, lowercase
        normalized = re.sub(r'\s+', '', line.lower())
        normalized = re.sub(r'[^a-z]', '', normalized)
        return normalized
    
    def _split_into_sections(self, text: str) -> Dict[str, str]:
        """
        Split resume text into sections based on headers
        FIXED: Handles multi-column layouts where headers have leading whitespace
        """
        sections: Dict[str, List[str]] = {}
        current_section = "other"
        sections[current_section] = []
        
        # Build header lookup with normalized keys (no whitespace)
        header_lookup = {}
        for section, variants in self.SECTION_HEADERS.items():
            for variant in variants:
                # Normalize variant (remove all whitespace and non-letters)
                normalized = self._normalize_header(variant)
                header_lookup[normalized] = section
        
        lines = text.split('\n')
        found_sections = []
        
        for line in lines:
            original_line = line
            line = line.strip()
            
            # Skip empty lines
            if not line:
                sections[current_section].append(original_line)
                continue
            
            # CONSERVATIVE: Only check if line looks like a header
            if not self._is_header_like(line):
                # Not header-like, add to current section
                sections[current_section].append(original_line)
                continue
            
            # Check if this header-like line matches a known section header
            matched_section = None
            normalized = self._normalize_header(line)
            
            # Strategy 1: Exact match (most reliable)
            if normalized in header_lookup:
                matched_section = header_lookup[normalized]
            
            # Strategy 2: Header appears at start of line (for two-column layouts)
            if not matched_section:
                for header_normalized, section in header_lookup.items():
                    if len(header_normalized) >= 4:
                        # Check if normalized line starts with header
                        if normalized.startswith(header_normalized):
                            # Verify it's a word boundary (not part of longer word)
                            remaining = normalized[len(header_normalized):]
                            if not remaining or not remaining[0].isalpha():
                                matched_section = section
                                break
                        # Check if header appears in middle (for two-column: "Contact | Work Experience")
                        idx = normalized.find(header_normalized)
                        if idx >= 0 and idx > 0:
                            # Preceded by non-letter and followed by non-letter or end
                            before_ok = not normalized[idx-1].isalpha()
                            after_idx = idx + len(header_normalized)
                            after_ok = after_idx >= len(normalized) or not normalized[after_idx].isalpha()
                            if before_ok and after_ok:
                                matched_section = section
                                break
            
            if matched_section:
                print(f"  🎯 Found section '{matched_section}' in line: {line.strip()[:60]}...")
                current_section = matched_section
                sections.setdefault(current_section, [])
                if current_section not in found_sections:
                    found_sections.append(current_section)
                
                # Extract content after the header (if any on same line)
                line_after_header = line
                for header_variant in self.SECTION_HEADERS.get(matched_section, []):
                    header_pattern = re.compile(re.escape(header_variant), re.IGNORECASE)
                    if header_pattern.search(line):
                        line_after_header = re.sub(
                            r'^.*?' + re.escape(header_variant) + r'[:\s]*',
                            '',
                            line,
                            flags=re.IGNORECASE,
                            count=1
                        ).strip()
                        break
                
                # Only add if there's content after the header
                if line_after_header and len(line_after_header) > 5:
                    sections[current_section].append(line_after_header)
            else:
                # Add line to current section
                sections[current_section].append(line)
        
        # Convert lists to strings
        result = {
            section: '\n'.join(lines).strip()
            for section, lines in sections.items()
            if lines and section != "other"
        }
        
        # Include "other" section if it has meaningful content
        if sections.get("other") and len('\n'.join(sections["other"]).strip()) > 50:
            result["other"] = '\n'.join(sections["other"]).strip()
        
        print(f"📑 Sections found: {', '.join(found_sections) if found_sections else 'none'}")
        
        # Debug: Print section info
        for section in found_sections:
            if section in result:
                content = result[section]
                print(f"  📄 {section}: {len(content)} chars, {content.count(chr(10))} lines")
        
        return result
    
    def parse_text(self, text: str) -> Dict[str, Any]:
        """
        Parse resume text and extract structured information using regex-based extraction
        Preserves layout and newlines for accurate section detection
        
        Args:
            text: Resume text to parse (raw text with newlines preserved)
        
        Returns a dictionary matching your CVFormData structure
        """
        print("\n" + "=" * 80)
        print("📄 RESUME PARSING STARTED")
        print("=" * 80)
        
        # Keep raw text with newlines preserved for section detection and parsing
        raw_text = text
        print(f"📏 Text: {len(text)} chars, {text.count(chr(10))} lines")
        
        # Show extracted text (first 500 chars)
        print(f"\n📝 EXTRACTED TEXT (first 500 chars):")
        print("-" * 80)
        print(text[:500])
        print("-" * 80)
        
        # Create flat text version ONLY for email/phone regex (light cleanup)
        flat_text = self._create_flat_text(text)
        
        try:
            # Step 1: Text normalization (trim whitespace, collapse spacing, preserve line breaks)
            normalized_text = self._normalize_text(raw_text)
            
            # Step 2: Detect two-column hints (conservative, just a hint)
            column_hints = self._detect_two_column_hint(normalized_text)
            personal_info_hints = column_hints.get('personal_info_hints', [])
            personal_info_text = '\n'.join(personal_info_hints) if personal_info_hints else ""
            
            if column_hints.get('has_hint'):
                print(f"  📐 Two-column hint detected ({column_hints['hint_count']} lines) - using as hint only")
            
            # Step 3: Split text into sections using normalized text (ALWAYS on original)
            sections = self._split_into_sections(normalized_text)
            
            # Step 4: Extract data with fallback to full text if section missing
            combined_personal_text = personal_info_text + '\n' + raw_text[:500] if personal_info_text else raw_text
            
            parsed_data = {
                "personalInfo": self._extract_personal_info(combined_personal_text, flat_text, sections),
                "workExperience": self._extract_work_experience_with_fallback(normalized_text, sections),
                "education": self._extract_education_with_fallback(normalized_text, sections),
                "skills": self._extract_skills_with_fallback(normalized_text, sections),
                "projects": self._extract_projects(raw_text, sections),
                "certificates": self._extract_certificates(raw_text, sections),
                "languages": self._extract_languages_with_fallback(raw_text, sections),
            }
            
            # Print summary
            print("\n" + "=" * 80)
            print("📊 PARSING SUMMARY")
            print("=" * 80)
            print(f"✅ Personal Info: {parsed_data['personalInfo'].get('firstName', '')} {parsed_data['personalInfo'].get('lastName', '')} | {parsed_data['personalInfo'].get('email', '')} | {parsed_data['personalInfo'].get('phone', '')}")
            print(f"✅ Work Experience: {len(parsed_data.get('workExperience', []))} entries")
            print(f"✅ Education: {len(parsed_data.get('education', []))} entries")
            print(f"✅ Skills: {len(parsed_data.get('skills', []))} entries")
            print(f"✅ Projects: {len(parsed_data.get('projects', []))} entries")
            print(f"✅ Certificates: {len(parsed_data.get('certificates', []))} entries")
            print(f"✅ Languages: {len(parsed_data.get('languages', []))} entries")
            print("=" * 80 + "\n")
            
            return parsed_data
        except Exception as e:
            print(f"\n❌ Error parsing resume: {e}")
            import traceback
            traceback.print_exc()
            return self._get_empty_structure()
    
    def _extract_personal_info(self, raw_text: str = "", flat_text: str = "", sections: Dict[str, str] = None) -> Dict[str, Any]:
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
        
        # Print extracted personal info
        print(f"  Name: {personal_info['firstName']} {personal_info['lastName']}")
        print(f"  Email: {personal_info['email']}")
        print(f"  Phone: {personal_info['phone']}")
        print(f"  LinkedIn: {personal_info['linkedin']}")
        print(f"  GitHub: {personal_info['github']}")
        
        return personal_info
    
    def _extract_work_experience(self, text: str, sections: Dict[str, str] = None) -> List[Dict]:
        """Extract work experience from text"""
        work_experiences = []
        
        print("\n" + "-" * 80)
        print("💼 WORK EXPERIENCE EXTRACTION")
        print("-" * 80)
        
        # ONLY extract from experience section (no full-text fallback)
        experience_text = ""
        if sections and "experience" in sections:
            experience_text = sections["experience"]
            print(f"  Section found: {len(experience_text)} chars")
        else:
            print(f"  ⚠️ No EXPERIENCE section found")
            experience_text = ""
        
        # Regex-based extraction from experience section only
        if experience_text:
            print(f"  📄 Experience section text (first 500 chars):")
            print(f"  {repr(experience_text[:500])}")
            print()
            
            # Improved pattern: Look for work experience blocks
            # Pattern: Job Title (optional) Company Date - Date
            # Example: "React Native Developer(Working Student) Neocosmo Feb 2022 - Feb 2024"
            
            # Comprehensive job title patterns (including "React Native Developer")
            job_title_pattern = r'(?:Senior|Junior|Lead|Principal|Staff|Working\s+Student)?\s*(?:Software|Web|Full.?Stack|Front.?end|Back.?end|Mobile|React\s+Native|React|Node|Python|Java|C\+\+|\.NET|iOS|Android)?\s*(?:Developer|Engineer|Architect|Programmer|Specialist|Manager|Director|Scientist|Analyst|Assistant|Associate|Professor|Researcher)'
            
            print(f"  🔍 Job title pattern: {job_title_pattern}")
            print()
            
            # Pattern 1: Job Title (with optional parentheses) Company Month YYYY - Month YYYY
            # This handles formats like:
            # - "React Native Developer(Working Student) Neocosmo Feb 2022 - Feb 2024"
            # - "Software Engineer at Company Jan 2020 - Present"
            work_exp_pattern = re.compile(
                r'(?P<position>' + job_title_pattern + r'(?:\s*\([^)]+\))?)?\s*'  # Optional job title with optional parentheses
                r'(?P<company>[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*)\s+'  # Company name (capitalized words)
                r'(?P<start_month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+'  # Start month
                r'(?P<start_year>\d{4})\s*[-–]\s*'  # Start year and dash
                r'(?:(?P<end_month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+)?'  # Optional end month
                r'(?P<end_year>\d{4}|Present|present)?',  # End year or Present
                re.IGNORECASE
            )
            
            print(f"  🔍 Work experience pattern: {work_exp_pattern.pattern[:200]}...")
            print()
            
            # Pattern 2: Look for job titles that appear on previous lines
            # Sometimes the format is:
            # "React Native Developer(Working Student)"
            # "Neocosmo Feb 2022 - Feb 2024"
            # So we need to look backwards from company+date matches
            
            matches = list(work_exp_pattern.finditer(experience_text))
            print(f"  🔍 Found {len(matches)} matches with work_exp_pattern")
            print()
            for match in matches:
                position = match.group('position') or ""
                company = match.group('company') or ""
                start_month = match.group('start_month') or ""
                start_year = match.group('start_year') or ""
                end_month = match.group('end_month') or ""
                end_year = match.group('end_year') or ""
                
                # If position is empty, look backwards from the match to find job title
                if not position:
                    match_start = match.start()
                    # Look back up to 200 characters for a job title
                    lookback_start = max(0, match_start - 200)
                    lookback_text = experience_text[lookback_start:match_start]
                    
                    # Try to find job title pattern in the lookback text
                    job_title_match = re.search(
                        r'(' + job_title_pattern + r'(?:\s*\([^)]+\))?)\s*$',  # Job title at end of lookback
                        lookback_text,
                        re.IGNORECASE
                    )
                    if job_title_match:
                        position = job_title_match.group(1).strip()
                
                # Format dates as YYYY-MM
                start_date = f"{start_year}-{self._month_to_number(start_month)}" if start_month and start_year else ""
                if end_year and end_year.lower() not in ['present', '']:
                    end_date = f"{end_year}-{self._month_to_number(end_month)}" if end_month else f"{end_year}-12"
                else:
                    end_date = ""
                
                # Clean up position (remove extra spaces, parentheses content if needed)
                if position:
                    position = re.sub(r'\s+', ' ', position).strip()
                    # Keep parentheses content but clean spacing
                    # Don't remove parentheses - they might contain useful info like "(Working Student)"
                
                # Filter out false positives
                if company and len(company) > 2:
                    # Skip if company is a month name
                    if company.lower() not in ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'present']:
                        work_experiences.append({
                            "position": position,
                            "company": company,
                            "location": "",
                            "startDate": start_date,
                            "endDate": end_date,
                            "description": "",
                            "responsibilities": [],
                            "technologies": [],
                            "competencies": []
                        })
                        print(f"  ✓ {position or '(no title)'} at {company} ({start_date} - {end_date})")
            
            # Also try simpler patterns to catch entries that the main pattern missed
            # Use this even if we found some entries, to catch all of them
            print(f"  🔍 Trying alternative extraction patterns to catch all entries...")
            
            # Pattern 1: Company followed by date range (simpler, catches more)
            simple_pattern = re.compile(
                r'([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*)\s+'  # Company
                r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*[-–]\s*'  # Start date
                r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(\d{4}|Present|present)?',  # End date
                re.IGNORECASE
            )
            
            # Track companies we've already found
            found_companies = {exp.get('company', '').lower() for exp in work_experiences}
            
            for match in simple_pattern.finditer(experience_text):
                company = match.group(1)
                start_month = match.group(2)
                start_year = match.group(3)
                end_month = match.group(4)
                end_year = match.group(5)
                
                # Skip if we already have this company
                if company.lower() in found_companies:
                    continue
                
                start_date = f"{start_year}-{self._month_to_number(start_month)}" if start_month and start_year else ""
                if end_year and end_year.lower() not in ['present', '']:
                    end_date = f"{end_year}-{self._month_to_number(end_month)}" if end_month else f"{end_year}-12"
                else:
                    end_date = ""
                
                if company and len(company) > 2:
                    # Look backwards for job title
                    match_start = match.start()
                    lookback_start = max(0, match_start - 200)
                    lookback_text = experience_text[lookback_start:match_start]
                    
                    position = ""
                    job_title_match = re.search(
                        r'(' + job_title_pattern + r'(?:\s*\([^)]+\))?)\s*$',
                        lookback_text,
                        re.IGNORECASE
                    )
                    if job_title_match:
                        position = job_title_match.group(1).strip()
                    
                    work_experiences.append({
                        "position": position,
                        "company": company,
                        "location": "",
                        "startDate": start_date,
                        "endDate": end_date,
                        "description": "",
                        "responsibilities": [],
                        "technologies": [],
                        "competencies": []
                    })
                    found_companies.add(company.lower())
                    print(f"  ✓ {position or '(no title)'} at {company} ({start_date} - {end_date})")
        
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
    
    def _month_to_number(self, month: str) -> str:
        """Convert month name to 2-digit number"""
        months = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
            'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        }
        return months.get(month.lower(), '01')
    
    def _extract_work_experience_block_based(self, text: str, sections: Dict[str, str] = None) -> List[Dict]:
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
                
                start_date = f"{start_year}-{self._month_to_number(start_month)}" if start_month and start_year else ""
                # Only use "Present" if the word actually exists in the line
                has_present = 'present' in date_line.lower()
                if end_year and end_year.lower() == 'present' and has_present:
                    end_date = ""
                elif end_year and end_year.lower() not in ['present', '']:
                    end_date = f"{end_year}-{self._month_to_number(end_month)}" if end_month else f"{end_year}-12"
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
    
    def _extract_work_experience_with_fallback(self, text: str, sections: Dict[str, str] = None) -> List[Dict]:
        """
        Extract work experience with fallback: try section first, then full text
        Returns partial results instead of empty sections
        """
        # Try section-based extraction first
        if sections and "experience" in sections:
            result = self._extract_work_experience_block_based(text, sections)
            if result and any(exp.get('company') or exp.get('position') for exp in result):
                return result
        
        # Fallback: extract from full text using block-based patterns
        print(f"  ⚠️ No EXPERIENCE section found, extracting from full text")
        return self._extract_work_experience_block_based(text, None)
    
    def _extract_education_block_based(self, text: str, sections: Dict[str, str] = None) -> List[Dict]:
        """
        Block-based education extraction (conservative)
        Anchors on degree keywords, associates institutions loosely
        """
        education = []
        
        print("\n" + "-" * 80)
        print("🎓 EDUCATION EXTRACTION (Block-based)")
        print("-" * 80)
        
        # ONLY extract from education section
        education_text = ""
        if sections and "education" in sections:
            education_text = sections["education"]
            print(f"  Section found: {len(education_text)} chars")
        else:
            print(f"  ⚠️ No EDUCATION section found")
            return [{
                "degree": "",
                "institution": "",
                "location": "",
                "startDate": "",
                "endDate": "",
                "field": "",
                "keyCourses": []
            }]
        
        if not education_text:
            return [{
                "degree": "",
                "institution": "",
                "location": "",
                "startDate": "",
                "endDate": "",
                "field": "",
                "keyCourses": []
            }]
        
        print(f"  📄 Education section text (first 500 chars):")
        print(f"  {repr(education_text[:500])}")
        print()
        
        lines = education_text.split('\n')
        
        # Step 1: Find degree keywords (anchor points)
        degree_patterns = [
            re.compile(r'(?:B\.?Sc\.?|Bachelor(?:\'?s)?)\s+(?:of\s+)?(?:Science|Engineering|Arts|Computer Science|Software Engineering)?', re.IGNORECASE),
            re.compile(r'(?:M\.?Sc\.?|Master(?:\'?s)?)\s+(?:of\s+)?(?:Science|Engineering|Arts|Computer Science)?', re.IGNORECASE),
            re.compile(r'(?:Ph\.?D\.?|Doctorate)\s+(?:of\s+)?(?:Philosophy|Science|Engineering)?', re.IGNORECASE),
        ]
        
        degree_blocks = []
        for i, line in enumerate(lines):
            for pattern in degree_patterns:
                if pattern.search(line):
                    # Define block: current line + 3 lines after
                    block_start = i
                    block_end = min(len(lines), i + 4)
                    block_lines = lines[block_start:block_end]
                    block_text = '\n'.join(block_lines)
                    
                    # Extract degree
                    degree_match = pattern.search(line)
                    degree = degree_match.group(0).strip() if degree_match else ""
                    
                    degree_blocks.append({
                        'line_idx': i,
                        'degree': degree,
                        'block_lines': block_lines,
                        'block_text': block_text
                    })
                    print(f"    Found degree: '{degree}' at line {i+1}")
                    break
        
        # Step 2: For each degree block, find institution and dates
        for block_info in degree_blocks:
            block_lines = block_info['block_lines']
            degree = block_info['degree']
            
            edu_entry = {
                "degree": degree,
                "institution": "",
                "location": "",
                "startDate": "",
                "endDate": "",
                "field": "",
                "keyCourses": []
            }
            
            # Find institution in block (look for University/College/Institute)
            # General pattern that works for most institutions
            institution_patterns = [
                # Full pattern: Name + University/College/Institute/School
                re.compile(r'(.+?)\s+(University|College|Institute|School)', re.IGNORECASE),
                # Pattern for abbreviations followed by location (e.g., "MIT Cambridge", "RPTU Kaiserslautern")
                # Only match if it's capitalized and looks like an institution
                re.compile(r'([A-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)+)', re.IGNORECASE),
            ]
            
            for line in block_lines:
                for pattern in institution_patterns:
                    match = pattern.search(line)
                    if match:
                        # If pattern has groups, check if we got the full institution name
                        if len(match.groups()) >= 2:
                            # Pattern like "Name University" - include the full match
                            full_institution = match.group(0).strip()
                            institution = full_institution
                        else:
                            # Pattern like abbreviation + location
                            institution = match.group(1).strip()
                            # Validate: should be reasonable length and not a date
                            if len(institution) < 3 or re.search(r'\d{4}', institution):
                                continue
                        
                        if institution and len(institution) > 2:
                            # Additional validation: skip if it looks like a course name or other text
                            skip_keywords = ['grade', 'seminar', 'course', 'language', 'visualization', 'highest']
                            if any(keyword in institution.lower() for keyword in skip_keywords):
                                continue
                            edu_entry["institution"] = institution
                            print(f"      Found institution: '{institution}'")
                            break
                if edu_entry["institution"]:
                    break
            
            # Find dates in block (loose association)
            # Support MM/YYYY - MM/YYYY explicitly, only use "Present" if word exists
            date_patterns = [
                # Format: MM/YYYY - MM/YYYY or Present
                re.compile(r'(\d{1,2})/(\d{4})\s*[-–]\s*(\d{1,2})?/?(\d{4}|Present|present)?', re.IGNORECASE),
                # Format: Month YYYY - Month YYYY or Present
                re.compile(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*[-–]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*(\d{4}|Present|present)?', re.IGNORECASE),
                # Format: YYYY - YYYY or Present
                re.compile(r'(\d{4})\s*[-–]\s*(\d{4}|Present|present)?', re.IGNORECASE),
            ]
            
            # Check if "Present" exists in the block text (only use if it does)
            block_text_lower = '\n'.join(block_lines).lower()
            has_present_word = 'present' in block_text_lower
            
            for line in block_lines:
                for pattern_idx, pattern in enumerate(date_patterns):
                    match = pattern.search(line)
                    if match:
                        if pattern_idx == 0:  # MM/YYYY format
                            start_month = match.group(1)
                            start_year = match.group(2)
                            end_month = match.group(3) if match.lastindex >= 3 and match.group(3) else None
                            end_year = match.group(4) if match.lastindex >= 4 and match.group(4) else None
                            
                            edu_entry["startDate"] = f"{start_year}-{start_month.zfill(2)}"
                            if end_year:
                                # Only use "Present" if the word actually exists in text
                                if end_year.lower() == 'present' and has_present_word:
                                    edu_entry["endDate"] = ""
                                elif end_year.lower() != 'present':
                                    edu_entry["endDate"] = f"{end_year}-{end_month.zfill(2)}" if end_month else end_year
                            else:
                                edu_entry["endDate"] = ""
                        elif pattern_idx == 1:  # Month YYYY format
                            start_month = match.group(1)
                            start_year = match.group(2)
                            end_year = match.group(3) if len(match.groups()) >= 3 else None
                            
                            edu_entry["startDate"] = f"{start_year}-{self._month_to_number(start_month)}"
                            if end_year:
                                # Only use "Present" if the word actually exists in text
                                if end_year.lower() == 'present' and has_present_word:
                                    edu_entry["endDate"] = ""
                                elif end_year.lower() != 'present':
                                    edu_entry["endDate"] = end_year
                            else:
                                edu_entry["endDate"] = ""
                        else:  # YYYY format
                            start_year = match.group(1)
                            end_year = match.group(2) if len(match.groups()) >= 2 else None
                            
                            edu_entry["startDate"] = f"{start_year}-01"
                            if end_year:
                                # Only use "Present" if the word actually exists in text
                                if end_year.lower() == 'present' and has_present_word:
                                    edu_entry["endDate"] = ""
                                elif end_year.lower() != 'present':
                                    edu_entry["endDate"] = end_year
                            else:
                                edu_entry["endDate"] = ""
                        
                        print(f"      Found dates: {edu_entry['startDate']} - {edu_entry['endDate'] or 'Present'}")
                        break
                if edu_entry["startDate"]:
                    break
            
            education.append(edu_entry)
        
        print(f"  📊 Extracted {len(education)} education entries")
        return education if education else [{
            "degree": "",
            "institution": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "field": "",
            "keyCourses": []
        }]
    
    def _extract_education_with_fallback(self, text: str, sections: Dict[str, str] = None) -> List[Dict]:
        """
        Extract education with fallback: try section first, then full text
        Returns partial results instead of empty sections
        """
        # Try section-based extraction first
        if sections and "education" in sections:
            result = self._extract_education_block_based(text, sections)
            if result and any(edu.get('degree') or edu.get('institution') for edu in result):
                return result
        
        # Fallback: extract from full text using block-based patterns
        print(f"  ⚠️ No EDUCATION section found, extracting from full text")
        return self._extract_education_block_based(text, None)
    
    def _extract_skills_with_fallback(self, text: str, sections: Dict[str, str] = None) -> List[str]:
        """
        Extract skills with fallback: if Skills section exists, use it;
        otherwise extract from Experience + Projects sections
        """
        skills = []
        
        print("\n" + "-" * 80)
        print("🛠️ SKILLS EXTRACTION (With Fallback)")
        print("-" * 80)
        
        # Step 1: Try Skills section first
        if sections and "skills" in sections:
            skills_text = sections["skills"]
            print(f"  ✓ Skills section found: {len(skills_text)} chars")
            
            # Extract skills from section (comma-separated, bullet points, or line-separated)
            lines = skills_text.split('\n')
            for line in lines:
                line = line.strip()
                if not line or line.startswith(('•', '-', '*')):
                    continue
                
                # Split by comma, semicolon, or pipe
                skill_items = re.split(r'[,;|]', line)
                for item in skill_items:
                    skill = item.strip()
                    if skill and len(skill) > 1:
                        skills.append(skill)
            
            print(f"  📊 Extracted {len(skills)} skills from Skills section")
            return skills if skills else []
        
        # Step 2: Fallback - extract from Experience + Projects
        print(f"  ⚠️ No Skills section found, extracting from Experience + Projects")
        
        # Known skill vocabulary (common tech skills)
        skill_keywords = [
            'python', 'java', 'javascript', 'typescript', 'react', 'vue', 'angular',
            'node', 'express', 'django', 'flask', 'spring', 'sql', 'mongodb', 'postgresql',
            'aws', 'docker', 'kubernetes', 'git', 'linux', 'html', 'css', 'sass',
            'redux', 'graphql', 'rest', 'api', 'microservices', 'ci/cd', 'jenkins',
            'agile', 'scrum', 'tensorflow', 'pytorch', 'machine learning', 'ai',
            'c++', 'c#', '.net', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin'
        ]
        
        # Combine experience and projects text
        combined_text = ""
        if sections and "experience" in sections:
            combined_text += sections["experience"] + "\n"
        if sections and "projects" in sections:
            combined_text += sections["projects"] + "\n"
        
        if combined_text:
            # Extract skills mentioned in text
            text_lower = combined_text.lower()
            found_skills = set()
            
            for keyword in skill_keywords:
                # Look for keyword as whole word
                pattern = re.compile(r'\b' + re.escape(keyword) + r'\b', re.IGNORECASE)
                if pattern.search(combined_text):
                    found_skills.add(keyword.title())
            
            skills = list(found_skills)
            print(f"  📊 Extracted {len(skills)} skills from Experience + Projects")
        
        return skills if skills else []
    
    def _extract_education(self, text: str, sections: Dict[str, str] = None) -> List[Dict]:
        """Extract education information from text"""
        education = []
        
        print("\n" + "-" * 80)
        print("🎓 EDUCATION EXTRACTION")
        print("-" * 80)
        
        # ONLY extract from education section (no full-text fallback)
        education_text = ""
        if sections and "education" in sections:
            education_text = sections["education"]
            print(f"  Section found: {len(education_text)} chars")
        else:
            print(f"  ⚠️ No EDUCATION section found")
            education_text = ""
        
        # Regex-based extraction from education section only
        if education_text:
            print(f"  📄 Education section text (first 500 chars):")
            print(f"  {repr(education_text[:500])}")
            print()
            
            # Find degree patterns - search line by line for better matching
            degree_patterns = [
                r'(?:B\.?Sc\.?|Bachelor(?:\'?s)?)\s+(?:of\s+)?(?:Science|Engineering|Arts|Computer Science|Software Engineering)?',
                r'(?:M\.?Sc\.?|Master(?:\'?s)?)\s+(?:of\s+)?(?:Science|Engineering|Arts|Computer Science)?',
                r'(?:Ph\.?D\.?|Doctorate)\s+(?:of\s+)?(?:Philosophy|Science|Engineering)?',
            ]
            
            found_degrees = []
            for line in education_text.split('\n'):
                for pattern in degree_patterns:
                    matches = re.finditer(pattern, line, re.IGNORECASE)
                    for match in matches:
                        degree = match.group(0).strip()
                        if degree and degree not in found_degrees:
                            found_degrees.append(degree)
                            print(f"    Found degree: '{degree}' in line: {line[:60]}...")
            
            # Find institutions - improved patterns
            found_institutions = []
            institution_patterns = [
                r'([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,4})\s+(?:University|College|Institute|School)',
            ]
            
            # First, try standard patterns
            for line in education_text.split('\n'):
                for pattern in institution_patterns:
                    matches = re.finditer(pattern, line, re.IGNORECASE)
                    for match in matches:
                        full_match = match.group(0).strip()
                        if full_match and len(full_match) > 5 and full_match not in found_institutions:
                            found_institutions.append(full_match)
                            print(f"    Found institution: '{full_match}' in line: {line[:60]}...")
            
            # Also look for simple institution names like "RPTU Kaiserslautern" (2-4 capitalized words)
            if not found_institutions or len(found_institutions) < len(found_degrees):
                education_lines = education_text.split('\n')
                for i, line in enumerate(education_lines):
                    # Look for patterns like "RPTU Kaiserslautern" - 2-4 capitalized words
                    # Also match "Tehran Azad University" - pattern with University at end
                    simple_inst_patterns = [
                        r'\b([A-Z]{2,}(?:\s+[A-Z][a-z]+){1,3})\b',  # RPTU Kaiserslautern
                        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\s+University)\b',  # Tehran Azad University
                    ]
                    institution_found_in_line = False
                    for simple_inst_pattern in simple_inst_patterns:
                        matches = re.finditer(simple_inst_pattern, line)
                        for match in matches:
                            potential_inst = match.group(1).strip()
                            # Filter out false positives
                            false_positives = ['view', 'badge', 'credly', 'master', 'bachelor', 'present', 
                                             'october', 'march', 'august', 'january', 'february', 'december',
                                             'foundations', 'software', 'engineering', 'computer', 'science']
                            if (potential_inst and len(potential_inst) > 3 and 
                                potential_inst not in found_institutions and
                                not any(fp in potential_inst.lower() for fp in false_positives)):
                                # Check if it's near a degree (within 2 lines)
                                is_near_degree = False
                                for degree in found_degrees:
                                    for j in range(max(0, i-2), min(len(education_lines), i+3)):
                                        if degree.lower() in education_lines[j].lower():
                                            is_near_degree = True
                                            break
                                    if is_near_degree:
                                        break
                                
                                if is_near_degree or len(found_degrees) == 0:
                                    found_institutions.append(potential_inst)
                                    print(f"    Found institution: '{potential_inst}' in line: {line[:60]}...")
                                    institution_found_in_line = True
                                    break  # Break inner match loop when we find a match
                        if institution_found_in_line:
                            break  # Break pattern loop if we found an institution
                    if institution_found_in_line:
                        continue  # Move to next line if we found an institution
            
            # Extract dates - improved pattern
            found_edu_dates = []
            date_patterns = [
                r'([A-Z][a-z]{2,8})\s+(\d{4})\s*[-–]\s*([A-Z][a-z]{2,8})?\s*(\d{4}|Present|present)',
            ]
            
            for pattern in date_patterns:
                matches = re.finditer(pattern, education_text, re.IGNORECASE)
                for match in matches:
                    start_date = f"{match.group(2)}-{self._month_to_number(match.group(1))}"
                    end_date = match.group(4) if match.group(4) and match.group(4).lower() not in ['present', ''] else ""
                    found_edu_dates.append((start_date, end_date))
                    print(f"    Found date: {start_date} - {end_date or 'Present'}")
            
            # Combine data - match degrees with institutions and dates by proximity
            education_lines = education_text.split('\n')
            for i, degree in enumerate(found_degrees):
                edu_entry = {
                    "degree": degree,
                    "institution": "",
                    "location": "",
                    "startDate": "",
                    "endDate": "",
                    "field": "",
                    "keyCourses": []
                }
                
                # Find institution near this degree (within 3 lines)
                degree_line_idx = None
                for idx, line in enumerate(education_lines):
                    if degree.lower() in line.lower():
                        degree_line_idx = idx
                        break
                
                if degree_line_idx is not None:
                    # Look for institution in nearby lines
                    search_start = max(0, degree_line_idx)
                    search_end = min(len(education_lines), degree_line_idx + 3)
                    for line in education_lines[search_start:search_end]:
                        for inst in found_institutions:
                            if inst.lower() in line.lower() and inst not in [e.get('institution', '') for e in education]:
                                edu_entry["institution"] = inst
                                break
                        if edu_entry["institution"]:
                            break
                
                # If no institution matched, try to get one by index
                if not edu_entry["institution"] and i < len(found_institutions):
                    edu_entry["institution"] = found_institutions[i]
                
                # Match dates by index
                if i < len(found_edu_dates):
                    edu_entry["startDate"] = found_edu_dates[i][0]
                    edu_entry["endDate"] = found_edu_dates[i][1]
                
                education.append(edu_entry)
                print(f"  ✓ {edu_entry['degree']} at {edu_entry['institution'] or '(no institution)'}")
        
        print(f"  📊 Extracted {len(education)} education entries")
        return education if education else [{
            "degree": "",
            "institution": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "field": "",
            "keyCourses": []
        }]
    
    def _extract_skills(self, text: str = "", sections: Dict[str, str] = None) -> List[Dict]:
        """Extract skills from text"""
        skills = []
        seen_skills = set()  # Avoid duplicates
        
        print("\n" + "-" * 80)
        print("💡 SKILLS EXTRACTION")
        print("-" * 80)
        
        # ONLY extract from skills section (no full-text fallback)
        skills_text = ""
        if sections and "skills" in sections:
            skills_text = sections["skills"]
            print(f"  Section found: {len(skills_text)} chars")
        else:
            print(f"  ⚠️ No SKILLS section found")
            skills_text = ""
        
        # Regex-based extraction from text
        if skills_text:
            # Common programming languages and technologies
            common_skills = [
                'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', '.NET', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
                'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'Rails',
                'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Elasticsearch',
                'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'CI/CD',
                'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn',
                'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind',
                'REST', 'GraphQL', 'Microservices', 'Agile', 'Scrum'
            ]
            
            search_text = skills_text
            
            # Find mentions of common skills
            for skill in common_skills:
                # Case-insensitive search
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, search_text, re.IGNORECASE):
                    skill_lower = skill.lower()
                    if skill_lower not in seen_skills:
                        skills.append({"skill": skill})
                        seen_skills.add(skill_lower)
            
            # Also look for technology mentions in work experience/description sections
            tech_patterns = [
                r'\b(?:React|Vue|Angular|Node|Django|Flask|Spring|Laravel)\b',
                r'\b(?:JavaScript|TypeScript|Python|Java|C\+\+|C#|PHP|Ruby|Go)\b',
                r'\b(?:MongoDB|PostgreSQL|MySQL|Redis|AWS|Docker|Kubernetes)\b',
            ]
            
            for pattern in tech_patterns:
                matches = re.finditer(pattern, skills_text, re.IGNORECASE)
                for match in matches:
                    tech = match.group(0)
                    tech_lower = tech.lower()
                    if tech_lower not in seen_skills:
                        skills.append({"skill": tech})
                        seen_skills.add(tech_lower)
        
        # Print found skills
        if skills:
            skill_names = [s["skill"] for s in skills]
            print(f"  ✓ Found {len(skills)} skills: {', '.join(skill_names[:10])}{'...' if len(skills) > 10 else ''}")
        else:
            print(f"  ⚠️ No skills found")
        
        return skills
    
    def _extract_projects(self, text: str = "", sections: Dict[str, str] = None) -> List[Dict]:
        """Extract projects from text"""
        projects = []
        
        print("\n" + "-" * 80)
        print("📁 PROJECTS EXTRACTION")
        print("-" * 80)
        
        projects_text = ""
        if sections and "projects" in sections:
            projects_text = sections["projects"]
            print(f"  Section found: {len(projects_text)} chars")
        else:
            print(f"  ⚠️ No PROJECTS section found")
            return []
        
        # Simple extraction: look for project names (capitalized words, often followed by descriptions)
        if projects_text:
            # Look for lines that look like project titles (2-5 capitalized words)
            lines = projects_text.split('\n')
            current_project = None
            
            for line in lines:
                line = line.strip()
                if not line or len(line) < 5:
                    continue
                
                # Check if line looks like a project title (2-5 capitalized words, not too long)
                title_match = re.match(r'^([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){1,4})(?:\s|$)', line)
                if title_match and len(line) < 100:
                    # Save previous project if exists
                    if current_project:
                        projects.append(current_project)
                    # Start new project
                    current_project = {
                        "name": title_match.group(1).strip(),
                        "description": "",
                        "technologies": [],
                        "url": "",
                        "startDate": "",
                        "endDate": ""
                    }
                elif current_project:
                    # Add to description
                    if current_project["description"]:
                        current_project["description"] += " " + line
                    else:
                        current_project["description"] = line
            
            # Add last project
            if current_project:
                projects.append(current_project)
        
        print(f"  📊 Extracted {len(projects)} projects")
        return projects
    
    def _extract_certificates(self, text: str = "", sections: Dict[str, str] = None) -> List[Dict]:
        """Extract certificates from text"""
        certificates = []
        
        print("\n" + "-" * 80)
        print("🏆 CERTIFICATES EXTRACTION")
        print("-" * 80)
        
        cert_text = ""
        if sections and "certifications" in sections:
            cert_text = sections["certifications"]
            print(f"  Section found: {len(cert_text)} chars")
        else:
            print(f"  ⚠️ No CERTIFICATIONS section found")
            return []
        
        if cert_text:
            # Look for certificate names and dates
            lines = cert_text.split('\n')
            for line in lines:
                line = line.strip()
                if not line or len(line) < 5:
                    continue
                
                # Look for year pattern (4 digits, likely a certificate year)
                year_match = re.search(r'\b(19|20)\d{2}\b', line)
                if year_match:
                    # Extract certificate name (everything before the year)
                    cert_name = line[:year_match.start()].strip()
                    if cert_name and len(cert_name) > 3:
                        certificates.append({
                            "name": cert_name,
                            "issuer": "",
                            "date": year_match.group(0),
                            "url": ""
                        })
                elif len(line) > 10 and not any(word in line.lower() for word in ['view', 'badge', 'credly']):
                    # Might be a certificate name without year
                    certificates.append({
                        "name": line,
                        "issuer": "",
                        "date": "",
                        "url": ""
                    })
        
        print(f"  📊 Extracted {len(certificates)} certificates")
        return certificates
    
    def _extract_languages_with_fallback(self, text: str = "", sections: Dict[str, str] = None) -> List[Dict]:
        """
        Extract languages with fallback: try section first, then full text
        Returns partial results instead of empty sections
        """
        # Try section-based extraction first
        if sections and "languages" in sections:
            result = self._extract_languages(text, sections)
            if result:
                return result
        
        # Fallback: extract from full text using language + proficiency patterns
        print(f"  ⚠️ No LANGUAGES section found, extracting from full text")
        return self._extract_languages(text, None)
    
    def _extract_languages(self, text: str = "", sections: Dict[str, str] = None) -> List[Dict]:
        """Extract languages from text"""
        languages = []
        
        print("\n" + "-" * 80)
        print("🌐 LANGUAGES EXTRACTION")
        print("-" * 80)
        
        lang_text = ""
        if sections and "languages" in sections:
            lang_text = sections["languages"]
            print(f"  Section found: {len(lang_text)} chars")
        elif sections is None:
            # Fallback mode: use full text
            lang_text = text
            print(f"  Using full text for extraction: {len(lang_text)} chars")
        else:
            print(f"  ⚠️ No LANGUAGES section found")
            return []
        
        if lang_text:
            # Common language names
            common_languages = ['English', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 
                              'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian',
                              'Persian', 'Farsi', 'Turkish', 'Dutch', 'Polish', 'Czech']
            
            # Look for language names followed by proficiency levels
            lines = lang_text.split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Pattern: Language Name + Proficiency (A1, A2, B1, B2, C1, C2, Native, Fluent, etc.)
                lang_pattern = r'\b(' + '|'.join(common_languages) + r')\b\s*([A-Z]?\d|Native|Fluent|Basic|Intermediate|Advanced|Proficient)?'
                matches = re.finditer(lang_pattern, line, re.IGNORECASE)
                for match in matches:
                    lang_name = match.group(1)
                    proficiency = match.group(2) if match.group(2) else ""
                    languages.append({
                        "language": lang_name,
                        "proficiency": proficiency
                    })
        
        print(f"  📊 Extracted {len(languages)} languages")
        return languages
    
    def _get_empty_structure(self) -> Dict[str, Any]:
        """Return empty structure matching CVFormData format"""
        return {
            "personalInfo": {
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
            },
            "workExperience": [{
                "position": "",
                "company": "",
                "location": "",
                "startDate": "",
                "endDate": "",
                "description": "",
                "responsibilities": [],
                "technologies": [],
                "competencies": []
            }],
            "education": [{
                "degree": "",
                "institution": "",
                "location": "",
                "startDate": "",
                "endDate": "",
                "field": "",
                "keyCourses": []
            }],
            "skills": [],
            "projects": [],
            "certificates": [],
            "languages": [],
            "sectionOrder": ["summary", "workExperience", "education", "projects", "certificates", "skills", "languages", "interests"],
            "template": "modern",
        }


# Global instance
_parser_instance = None
_parser_lock = threading.Lock()

def get_resume_parser():
    """Get singleton parser instance"""
    global _parser_instance
    if _parser_instance is None:
        with _parser_lock:
            if _parser_instance is None:
                _parser_instance = ResumeParser()
    return _parser_instance