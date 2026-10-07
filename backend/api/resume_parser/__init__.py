"""
Resume Parser using regex-based extraction
Section-based parsing for accurate extraction
"""
import threading
from typing import Dict, Any

from .text_utils import normalize_text, detect_two_column_hint, create_flat_text
from .section_detector import split_into_sections
from .personal_info import extract_personal_info
from .work_experience import extract_work_experience_with_fallback
from .education import extract_education_with_fallback
from .skills import extract_skills_with_fallback
from .projects import extract_projects
from .certificates import extract_certificates
from .languages import extract_languages_with_fallback
from .utils import get_empty_structure


class ResumeParser:
    """Singleton Resume Parser with lazy loading"""
    _instance = None
    _lock = threading.Lock()
    
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
        flat_text = create_flat_text(text)
        
        try:
            # Step 1: Text normalization (trim whitespace, collapse spacing, preserve line breaks)
            normalized_text = normalize_text(raw_text)
            
            # Step 2: Detect two-column hints (conservative, just a hint)
            column_hints = detect_two_column_hint(normalized_text)
            personal_info_hints = column_hints.get('personal_info_hints', [])
            personal_info_text = '\n'.join(personal_info_hints) if personal_info_hints else ""
            
            if column_hints.get('has_hint'):
                print(f"  📐 Two-column hint detected ({column_hints['hint_count']} lines) - using as hint only")
            
            # Step 3: Split text into sections using normalized text (ALWAYS on original)
            sections = split_into_sections(normalized_text)
            
            # Step 4: Extract data with fallback to full text if section missing
            combined_personal_text = personal_info_text + '\n' + raw_text[:500] if personal_info_text else raw_text
            
            parsed_data = {
                "personalInfo": extract_personal_info(combined_personal_text, flat_text, sections),
                "workExperience": extract_work_experience_with_fallback(normalized_text, sections),
                "education": extract_education_with_fallback(normalized_text, sections),
                "skills": extract_skills_with_fallback(normalized_text, sections),
                "projects": extract_projects(raw_text, sections),
                "certificates": extract_certificates(raw_text, sections),
                "publications": [],
                "languages": extract_languages_with_fallback(raw_text, sections),
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
            return get_empty_structure()


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

