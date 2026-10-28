"""
PDF to Text conversion for resume parsing using pdfplumber
"""
import pdfplumber
import PyPDF2
from typing import Optional


def extract_text_from_pdf(pdf_file) -> Optional[str]:
    """
    Extract text from PDF file using pdfplumber (better formatting) with PyPDF2 fallback
    Uses layout=True to preserve line breaks and structure
    
    Args:
        pdf_file: Django UploadedFile or file-like object
        
    Returns:
        Extracted text as string, or None if extraction fails
    """
    try:
        # Try pdfplumber first (better for complex layouts and preserves structure)
        with pdfplumber.open(pdf_file) as pdf:
            text = ""
            for page in pdf.pages:
                # Use layout=True to preserve line breaks and structure
                # x_tolerance and y_tolerance help with spacing detection
                page_text = page.extract_text(layout=True, x_tolerance=3, y_tolerance=3)
                if page_text:
                    text += page_text + "\n"
            result = text.strip()
            line_count = result.count('\n') + 1 if result else 0
            print(f"  ✓ Extracted {len(result)} chars, {line_count} lines from {len(pdf.pages)} pages (pdfplumber)")
            if line_count < 10:
                print(f"  ⚠️ Warning: Only {line_count} lines detected - text may be flattened")
            # The text itself is never logged: it's the user's resume.
            return result
    except Exception as e:
        print(f"  ⚠️ pdfplumber failed: {e}, trying PyPDF2...")
        try:
            # Fallback to PyPDF2
            pdf_file.seek(0)  # Reset file pointer
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                text += page_text + "\n"
            result = text.strip()
            line_count = result.count('\n') + 1 if result else 0
            print(f"  ✓ Extracted {len(result)} chars, {line_count} lines from {len(pdf_reader.pages)} pages (PyPDF2)")
            if line_count < 10:
                print(f"  ⚠️ Warning: Only {line_count} lines detected - text may be flattened")
            return result
        except Exception as e2:
            print(f"  ❌ PyPDF2 also failed: {e2}")
            return None

