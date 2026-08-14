import re
import json

def generate(sources_text, source_title=''):
    """
    Generates a Quiz JSON array using Gemini 3.5 Flash API based on sources_text.
    Falls back to offline Q/A text regex parser or structured default if Gemini is unavailable or parsing fails.
    """
    from notebook.ai_service import call_gemini_api

    # Detect language of the input to match Vietnamese, Japanese, or English
    is_japanese = any(ord(char) >= 0x3000 and ord(char) <= 0x9FFF for char in (sources_text + source_title))
    
    # Simple check for English (mostly ASCII letters, ignoring standard punctuation and spacing)
    # If it contains Vietnamese tonal marks or CJK characters, it's not English
    has_vietnamese_marks = any(ord(char) in range(0x00C0, 0x1EF9) for char in (sources_text + source_title))
    is_english = not is_japanese and not has_vietnamese_marks

    if is_japanese:
        lang_instruction = "BẮT BUỘC tạo câu hỏi và lời giải thích bằng Tiếng Nhật (Japanese)."
        lang_prompt = "Hãy tạo 3 đến 5 câu hỏi trắc nghiệm (Quiz) chất lượng cao bằng Tiếng Nhật để giúp người học ôn tập."
    elif is_english:
        lang_instruction = "BẮT BUỘC tạo câu hỏi và lời giải thích bằng Tiếng Anh (English)."
        lang_prompt = "Hãy tạo 3 đến 5 câu hỏi trắc nghiệm (Quiz) chất lượng cao bằng Tiếng Anh để giúp người học ôn tập."
    else:
        lang_instruction = "BẮT BUỘC tạo câu hỏi và lời giải thích bằng Tiếng Việt (Vietnamese)."
        lang_prompt = "Hãy tạo 3 đến 5 câu hỏi trắc nghiệm (Quiz) chất lượng cao bằng Tiếng Việt để giúp người học ôn tập."

    system_instruction = (
        "Bạn là một chuyên gia thiết kế câu hỏi trắc nghiệm ôn tập (Quiz) từ tài liệu học tập. "
        f"{lang_instruction} "
        "Hãy tạo các câu hỏi trắc nghiệm dưới dạng duy nhất một JSON array, không viết thêm bất kỳ lời chào hay giải thích nào."
    )

    prompt = f"""Dựa vào nội dung tài liệu học tập sau (Chủ đề: {source_title or 'Tổng hợp'}):

{sources_text}

{lang_prompt}
Yêu cầu cấu trúc từng câu hỏi:
- "question": Câu hỏi rõ ràng, chính xác.
- "options": Mảng 4 lựa chọn (A, B, C, D).
- "correct_index": Chỉ số đáp án đúng (0 cho A, 1 cho B, 2 cho C, 3 cho D).
- "answer": Chữ cái đáp án đúng ("A", "B", "C", hoặc "D").
- "explanation": Giải thích ngắn gọn lý do chọn đáp án này.

Định dạng JSON trả về BẮT BUỘC:
[
  {{
    "question": "Nội dung câu hỏi?",
    "options": ["A. Lựa chọn A", "B. Lựa chọn B", "C. Lựa chọn C", "D. Lựa chọn D"],
    "correct_index": 0,
    "answer": "A",
    "explanation": "Giải thích..."
  }}
]
Chỉ trả về duy nhất chuỗi JSON Array."""

    gemini_response = call_gemini_api(prompt, system_instruction)

    if gemini_response and not gemini_response.startswith("Gemini API Error") and not gemini_response.startswith("Gemini API Connection Error"):
        try:
            clean_text = gemini_response.strip()
            if clean_text.startswith("```"):
                clean_text = re.sub(r'^```(?:json)?\s*', '', clean_text)
                clean_text = re.sub(r'```$', '', clean_text).strip()
            
            parsed = json.loads(clean_text)
            if isinstance(parsed, list) and len(parsed) > 0:
                validated_questions = []
                for item in parsed:
                    if not isinstance(item, dict):
                        continue
                    q_text = item.get('question') or item.get('question_text') or ''
                    raw_opts = item.get('options') or []
                    if not q_text or not isinstance(raw_opts, list) or len(raw_opts) < 2:
                        continue
                    
                    # Ensure 4 options and remove any leading option labels like "A.", "B.", "A)", etc.
                    clean_options = []
                    for idx, opt in enumerate(raw_opts[:4]):
                        opt_str = str(opt).strip()
                        letter = chr(65 + idx)
                        # Clean any existing prefixes: e.g. "A. Option", "A) Option", "A: Option"
                        opt_str = re.sub(r'^[A-D][\.\)\:\-\s]\s*', '', opt_str)
                        # Consistently prefix with letter
                        clean_options.append(f"{letter}. {opt_str}")
                    
                    while len(clean_options) < 4:
                        letter = chr(65 + len(clean_options))
                        clean_options.append(f"{letter}. N/A")
                        
                    c_idx = item.get('correct_index')
                    if c_idx is None or not isinstance(c_idx, int) or c_idx < 0 or c_idx > 3:
                        ans_str = str(item.get('answer', 'A')).strip().upper()
                        if ans_str in ['A', 'B', 'C', 'D']:
                            c_idx = ord(ans_str) - 65
                        else:
                            c_idx = 0
                    
                    ans_letter = chr(65 + c_idx)
                    exp = item.get('explanation') or 'Không có giải thích.'
                    
                    validated_questions.append({
                        "question": q_text,
                        "options": clean_options,
                        "correct_index": c_idx,
                        "answer": ans_letter,
                        "explanation": exp
                    })
                
                if validated_questions:
                    return json.dumps(validated_questions, ensure_ascii=False)
        except Exception as e:
            print("Gemini Quiz parsing error:", e)

    # Fallback to offline regex parsing or default quiz
    return _parse_offline_quiz_text(sources_text, source_title, is_japanese, is_english)


def _parse_offline_quiz_text(sources_text, source_title='', is_japanese=False, is_english=False):
    questions = []
    blocks = re.split(r'\nQ:\s+', '\n' + sources_text)
    
    for block in blocks:
        if not block.strip():
            continue
            
        q_match = re.search(r'^(.*?)\nA:', block, re.DOTALL)
        if not q_match:
            continue
            
        question_text = q_match.group(1).strip()
        a_match = re.search(r'\nA:\s*(.*?)\nB:', block, re.DOTALL)
        b_match = re.search(r'\nB:\s*(.*?)\nC:', block, re.DOTALL)
        c_match = re.search(r'\nC:\s*(.*?)\nD:', block, re.DOTALL)
        d_match = re.search(r'\nD:\s*(.*?)(?:\nEXP:|$)', block, re.DOTALL)
        
        if not (a_match and b_match and c_match and d_match):
            continue
            
        options = [a_match.group(1).strip(), b_match.group(1).strip(), c_match.group(1).strip(), d_match.group(1).strip()]
        correct_index = 0
        clean_options = []
        for i, opt in enumerate(options):
            if '(*)' in opt:
                correct_index = i
                opt = opt.replace('(*)', '').strip()
            letter = chr(65 + i)
            # Strip potential leading letter label
            opt = re.sub(r'^[A-D][\.\)\:\-\s]\s*', '', opt)
            clean_options.append(f"{letter}. {opt}")
            
        exp_match = re.search(r'\nEXP:\s*(.*)', block, re.DOTALL)
        explanation = exp_match.group(1).strip() if exp_match else "Không có giải thích."
        
        questions.append({
            "question": question_text,
            "options": clean_options,
            "correct_index": correct_index,
            "answer": chr(65 + correct_index),
            "explanation": explanation
        })
    
    if not questions:
        title_str = source_title or "Tài liệu học tập"
        if is_japanese:
            questions = [{
                "question": f"Đâu là đặc trưng cơ bản nhất của chủ đề {title_str}?",
                "options": [
                    "A. Nội dung phong phú, đa dạng",
                    "B. Xử lý tự động bằng AI",
                    "C. Hỗ trợ ghi nhớ và ôn tập kiến thức",
                    "D. Tất cả các phương án trên"
                ],
                "correct_index": 3,
                "answer": "D",
                "explanation": "Hệ thống AI tự động phân tích tài liệu để tạo các câu hỏi trắc nghiệm ôn tập kiến thức hiệu quả."
            }]
        elif is_english:
            questions = [{
                "question": f"What is the most fundamental characteristic of {title_str}?",
                "options": [
                    "A. Rich and diverse content",
                    "B. Automated AI processing",
                    "C. Support for learning and review",
                    "D. All of the above"
                ],
                "correct_index": 3,
                "answer": "D",
                "explanation": "The AI system automatically analyzes the materials to create effective quiz questions for review."
            }]
        else:
            questions = [{
                "question": f"Đâu là đặc trưng cơ bản nhất của chủ đề {title_str}?",
                "options": [
                    "A. Nội dung phong phú, đa dạng",
                    "B. Xử lý tự động bằng AI",
                    "C. Hỗ trợ ghi nhớ và ôn tập kiến thức",
                    "D. Tất cả các phương án trên"
                ],
                "correct_index": 3,
                "answer": "D",
                "explanation": "Hệ thống AI tự động phân tích tài liệu để tạo các câu hỏi trắc nghiệm ôn tập kiến thức hiệu quả."
            }]
        
    return json.dumps(questions, ensure_ascii=False)
