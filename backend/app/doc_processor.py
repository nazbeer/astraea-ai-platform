import os
import json
from pypdf import PdfReader
from docx import Document
from io import BytesIO

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.json', '.txt', '.csv', '.png', '.jpg', '.jpeg'}
FORBIDDEN_EXTENSIONS = {'.js', '.ts', '.py', '.sh', '.exe', '.bat', '.bin', '.php', '.vbs'}

def check_file_safety(filename: str, content: bytes):
    """
    Perform security checks on the file.
    1. Extension check.
    2. Forbidden extension check.
    3. Basic heuristic check for script content in text-like files.
    """
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in FORBIDDEN_EXTENSIONS:
        return False, f"Files of type {ext} are strictly prohibited for safety."
    
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file type: {ext}"

    # Basic content-based safety (no <script> or specific keywords in text files)
    if ext in ['.txt', '.json', '.csv']:
        try:
            text = content.decode('utf-8').lower()
            unsafe_keywords = ['<script', 'eval(', 'exec(', 'document.location', 'system(', 'shell_exec(']
            for kw in unsafe_keywords:
                if kw in text:
                    return False, f"Safety check failed: suspicious code pattern detected in file."
        except:
            pass # Binary data might fail decoding
            
    return True, "Safe"

def extract_text(filename: str, content: bytes):
    """
    Extract text content from various file formats.
    """
    ext = os.path.splitext(filename)[1].lower()
    text = ""
    
    try:
        if ext == '.pdf':
            reader = PdfReader(BytesIO(content))
            for page in reader.pages:
                text += page.extract_text() + "\n"
                
        elif ext == '.docx':
            doc = Document(BytesIO(content))
            for para in doc.paragraphs:
                text += para.text + "\n"
                
        elif ext == '.json':
            data = json.loads(content.decode('utf-8'))
            text = json.dumps(data, indent=2)
            
        elif ext in ['.txt', '.csv']:
            text = content.decode('utf-8')
            
        elif ext in ['.png', '.jpg', '.jpeg']:
            # Simple metadata extraction for now (real OCR requires tesseract binary)
            text = f"Image file: {filename}. Content is visual data."
            
    except Exception as e:
        print(f"Extraction error for {filename}: {e}")
        text = f"Error extracting text from {filename}"
        
    return text.strip()
