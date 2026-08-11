import re
import json

def generate(sources_text, source_title=''):
    """
    Parses a raw text and extracts Flashcards.
    Expected format:
    Q: ...
    A: ...
    """
    flashcards = []
    
    # Try parsing Q: and A:
    blocks = re.split(r'\nQ:\s+', '\n' + sources_text)
    for block in blocks:
        if not block.strip():
            continue
        q_match = re.search(r'^(.*?)\nA:', block, re.DOTALL)
        if q_match:
            question = q_match.group(1).strip()
            ans_match = re.search(r'\nA:\s*(.*)', block, re.DOTALL)
            answer = ans_match.group(1).strip() if ans_match else ""
            
            # Remove any trailing "B:", "C:" if it was actually a quiz format
            answer = re.split(r'\nB:\s+', answer)[0].strip()
            
            if question and answer:
                flashcards.append({
                    "question": question,
                    "answer": answer
                })
            
    # Fallback: split by newlines and look for colon ':' or hyphen '-'
    if not flashcards:
        lines = [line.strip() for line in sources_text.split('\n') if line.strip()]
        for line in lines:
            if ':' in line:
                parts = line.split(':', 1)
                if parts[0].strip() and parts[1].strip():
                    flashcards.append({"question": parts[0].strip(), "answer": parts[1].strip()})
            elif '-' in line:
                parts = line.split('-', 1)
                if parts[0].strip() and parts[1].strip():
                    flashcards.append({"question": parts[0].strip(), "answer": parts[1].strip()})
                
    # Fallback: dummy flashcard
    if not flashcards:
        flashcards.append({
            "question": f"Khái niệm cốt lõi của {source_title or 'tài liệu này'} là gì?",
            "answer": "Vui lòng định dạng tài liệu với cấu trúc 'Q: Câu hỏi' và 'A: Đáp án' hoặc dùng dấu ':' để hệ thống nhận diện tự động tốt hơn."
        })
        
    return json.dumps(flashcards, ensure_ascii=False)
