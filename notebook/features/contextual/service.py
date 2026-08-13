import json
from notebook.ai_service import call_gemini_api
from notebook.models import Notebook, AIGeneration

def process_context_action(text: str, action_type: str, notebook_id=None) -> str:
    """
    Process short contextual actions like explain, summarize, translate, question, flashcard.
    """
    if not text.strip():
        return "Vui lòng chọn một đoạn văn bản."
        
    system_instruction = ""
    prompt = ""
    
    if action_type == 'explain':
        system_instruction = "Bạn là một gia sư thông minh. Hãy giải thích ngắn gọn, dễ hiểu khái niệm sau trong 2-3 câu."
        prompt = f"Giải thích đoạn văn bản sau:\n{text}"
    elif action_type == 'summarize':
        system_instruction = "Hãy tóm tắt đoạn văn bản sau thành 1-2 câu súc tích nhất."
        prompt = f"Tóm tắt đoạn văn bản sau:\n{text}"
    elif action_type == 'translate':
        system_instruction = "Bạn là một biên dịch viên. Hãy dịch đoạn văn bản sau sang Tiếng Việt nếu nó là tiếng nước ngoài, hoặc dịch sang Tiếng Anh nếu nó là Tiếng Việt."
        prompt = f"Dịch đoạn văn bản sau:\n{text}"
    elif action_type == 'question':
        system_instruction = "Bạn là một giáo viên. Hãy tạo 1 câu hỏi trắc nghiệm (có 4 đáp án A, B, C, D) từ đoạn văn bản sau để kiểm tra kiến thức."
        prompt = f"Tạo 1 câu hỏi trắc nghiệm từ đoạn văn bản sau:\n{text}"
    elif action_type == 'flashcard':
        if not notebook_id:
            return "Không tìm thấy Sổ tay hiện tại để lưu Flashcard."
            
        system_instruction = "Bạn là một hệ thống tạo Flashcard học thuật. Hãy phân tích từ/cụm từ/câu được người dùng cung cấp và tạo MỘT thẻ flashcard duy nhất chứa thông tin quan trọng nhất. Trả về kết quả DƯỚI DẠNG ĐÚNG MỘT OBJECT JSON duy nhất với 2 trường: 'front' (từ vựng gốc, cách phát âm nếu có) và 'back' (nghĩa, giải thích ngắn gọn hoặc ví dụ). KHÔNG sử dụng markdown backticks (```), chỉ trả về JSON thô."
        prompt = f"Tạo 1 thẻ flashcard dưới dạng JSON từ nội dung sau:\n{text}"
    else:
        return "Hành động không hợp lệ."

    response = call_gemini_api(prompt, system_instruction)
    
    # Fallback if API fails or not configured
    if not response or "Error" in response:
        print("GEMINI ERROR:", response)
        return f"[Chế độ Offline/Lỗi API] Kết quả giả lập cho hành động '{action_type}':\n\nNội dung bạn đã bôi đen là: '{text[:50]}...'"
        
    if action_type == 'flashcard':
        try:
            import re
            
            # Extract JSON block using regex
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if not match:
                raise ValueError("Không tìm thấy định dạng JSON hợp lệ từ phản hồi AI.")
                
            flashcard_data = json.loads(match.group(0).strip())
            
            # Fetch notebook and save AIGeneration
            notebook = Notebook.objects.get(id=notebook_id)
            
            # Find existing flashcards generation or create new
            gen_obj = AIGeneration.objects.filter(notebook=notebook, generation_type='flashcards').first()
            
            if gen_obj:
                try:
                    existing_flashcards = json.loads(gen_obj.content)
                    if not isinstance(existing_flashcards, list):
                        existing_flashcards = []
                except:
                    existing_flashcards = []
                
                existing_flashcards.append(flashcard_data)
                gen_obj.content = json.dumps(existing_flashcards, ensure_ascii=False)
                gen_obj.save()
            else:
                gen_obj = AIGeneration.objects.create(
                    notebook=notebook,
                    generation_type='flashcards',
                    content=json.dumps([flashcard_data], ensure_ascii=False)
                )
            return "🔖 Đã lưu Flashcard vào Sổ tay thành công!\n\n**Mặt trước:** " + flashcard_data.get('front', '') + "\n**Mặt sau:** " + flashcard_data.get('back', '')
        except Exception as e:
            import traceback
            err_msg = traceback.format_exc()
            print("Error saving flashcard:", e)
            return f"Lỗi khi lưu Flashcard. Hãy thử lại.\n\nChi tiết lỗi: {err_msg}\n\nResponse từ Gemini: {response}"

    return response
