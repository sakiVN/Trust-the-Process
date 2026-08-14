import os
import json
import urllib.request
import urllib.error
from django.conf import settings

# Load API Key from Django settings
GEMINI_API_KEY = getattr(settings, "GEMINI_API_KEY", "")

def call_gemini_api(prompt, system_instruction="") -> str:
    """
    Call Gemini API using urllib to avoid heavy library dependencies.
    """
    if not GEMINI_API_KEY:
        return ""
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            text = res_data['candidates'][0]['content']['parts'][0]['text']
            return text
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode('utf-8')
            err_json = json.loads(err_body)
            err_msg = err_json.get('error', {}).get('message', str(e))
            return f"Gemini API Error: {err_msg}"
        except Exception:
            return f"Gemini API Error: {str(e)}"
    except urllib.error.URLError as e:
        return f"Gemini API Connection Error: {str(e)}"
    except Exception as e:
        return f"Gemini API General Error: {str(e)}"

def generate_rebuttal(initial_content):
    """
    Generates a constructive AI rebuttal in both Vietnamese and Japanese offline.
    """
    # Forced Offline Mode: return mock directly
    return (
        "【AI của hệ thống / Phản biện của hệ thống】\n\n"
        "JP: あなたの意見は非常に興味深いですが、もう一方の視点も考慮する必要があります。 "
        "もしAIがすべての記述作業を代替してしまった場合、学生の「文章構成力」や「批判的思考力」は本当に育つのでしょうか？ "
        "AIツールを単に使うだけでなく、あえて「制限する」環境こそが思考力を刺激するのではないですか？\n\n"
        "VI: Ý kiến của bạn rất thú vị, nhưng hãy cân nhắc một góc nhìn khác. "
        "Nếu AI thay thế hoàn toàn việc viết lách, liệu năng lực cấu trúc văn bản và tư duy phản biện của học sinh có thực sự phát triển? "
        "Phải chăng chính môi trường 'hạn chế' việc sử dụng AI mới là thứ kích thích tư duy phát triển?"
    )

def generate_notebook_materials(sources_text, generation_type='quiz', source_title=''):
    """
    Generates study materials (quiz, flashcards, mind map, etc.) based on all sources offline.
    """
    system_prompt = f"""Bạn là công cụ tự động tạo sơ đồ tư duy dạng Mermaid.js. 
Khi nhận được chủ đề: '{source_title}'

Hãy trả về đoạn code Mermaid Mindmap phân tích đầy đủ kiến thức của chủ đề đó theo đúng cấu trúc:

mindmap
  root(({source_title}))
    Nhánh Cấp 1 A
      Chi tiết A1
      Chi tiết A2
    Nhánh Cấp 2 B
      Chi tiết B1
      Chi tiết B2

Quy tắc bắt buộc:
- Dùng 2 khoảng trắng (spaces) để thụt lề cấp con.
- Chỉ trả về duy nhất đoạn mã Mermaid, không thêm bất kỳ văn bản nào khác.
- Tuyệt đối không bao bọc code trong thẻ markdown ```."""

    # Route to the appropriate feature service
    try:
        if generation_type == 'flashcards':
            from .features.flashcard import service as flashcard_service
            return flashcard_service.generate(sources_text, source_title)
            
        elif generation_type == 'quiz':
            from .features.quiz import service as quiz_service
            return quiz_service.generate(sources_text, source_title)
            
        elif generation_type == 'report':
            from .features.report import service as report_service
            return report_service.generate(sources_text, source_title)
            
        elif generation_type == 'mind_map':
            from .features.mindmap import service as mindmap_service
            return mindmap_service.generate(sources_text, source_title)
            
        else:
            return "No template content available."
            
    except Exception as e:
        return f"Error generating materials: {str(e)}"


def process_context_action(text: str, action: str) -> dict:
    """
    Process contextual action on highlighted text (explain, translate, flashcard).
    Supports Gemini API if key is set, otherwise falls back to smart offline response.
    """
    clean_text = text.strip()
    if not clean_text:
        return {"result": "Không có nội dung được chọn.", "action": action}

    # If Gemini API key is configured, try calling it
    if GEMINI_API_KEY:
        if action == 'explain':
            prompt = f"Hãy giải thích ngắn gọn, súc tích và dễ hiểu khái niệm/đoạn văn sau bằng tiếng Việt:\n\n{clean_text}"
            res = call_gemini_api(prompt, "Bạn là trợ lý học tập thông minh.")
            if res and not res.startswith("Gemini API"):
                return {"result": res, "action": action}
        elif action == 'translate':
            prompt = f"Hãy dịch đoạn văn sau sang tiếng Việt (nếu là tiếng nước ngoài) hoặc tiếng Anh/Nhật (nếu là tiếng Việt). Giữ ngữ cảnh học thuật chuẩn xác:\n\n{clean_text}"
            res = call_gemini_api(prompt, "Bạn là chuyên gia dịch thuật đa ngôn ngữ.")
            if res and not res.startswith("Gemini API"):
                return {"result": res, "action": action}
        elif action == 'flashcard':
            prompt = f"Từ đoạn văn sau, hãy tạo 1 thẻ ghi nhớ (Flashcard) gồm Câu hỏi và Đáp án ngắn gọn dạng JSON:\n{{\"question\": \"...\", \"answer\": \"...\"}}\n\nĐoạn văn:\n{clean_text}"
            res = call_gemini_api(prompt, "Bạn là chuyên gia tạo học liệu Flashcard.")
            if res and not res.startswith("Gemini API"):
                try:
                    clean_res = res.replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(clean_res)
                    return {"result": f"Câu hỏi: {parsed.get('question')}\n\nĐáp án: {parsed.get('answer')}", "action": action, "flashcard": parsed}
                except Exception:
                    return {"result": res, "action": action}

    # Offline Fallback Mode
    if action == 'explain':
        return {
            "result": f"💡 Giải thích khái niệm: \"{clean_text}\"\n\n"
                      f"Đây là một nội dung quan trọng trong tài liệu học tập. Khái niệm này đề cập đến các đặc tính, nguyên lý hoặc thuật ngữ cần ghi nhớ để hiểu sâu hơn về chủ đề đang nghiên cứu.",
            "action": action
        }
    elif action == 'translate':
        return {
            "result": f"🌐 Bản dịch đối chiếu:\n\n"
                      f"VI: {clean_text}\n"
                      f"EN: (Bản dịch tự động) Term/concept related to: {clean_text}\n"
                      f"JP: (自動翻訳) 「{clean_text}」に関する学術用語・重要事項",
            "action": action
        }
    elif action == 'flashcard':
        q = f"{clean_text[:60]}... là gì?" if len(clean_text) > 60 else f"Ý nghĩa của \"{clean_text}\"?"
        a = clean_text
        return {
            "result": f"🔖 Đã trích xuất Flashcard:\n\n❓ Câu hỏi: {q}\n💡 Đáp án: {a}",
            "action": action,
            "flashcard": {"question": q, "answer": a}
        }

    return {"result": "Hành động không hợp lệ.", "action": action}

