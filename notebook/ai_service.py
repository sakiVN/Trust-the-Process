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

def generate_rebuttal(initial_content, language='vi'):
    """
    Generates a constructive AI rebuttal in the requested language (Vietnamese, Japanese, or English).
    """
    # If Gemini API key is configured, prompt in target language
    if GEMINI_API_KEY:
        if language == 'jp':
            prompt = (
                f"ユーザーの意見に対して、建設的かつ批判的な論理反論と、思考を深める問いかけを日本語で作成してください。\n\n"
                f"ユーザーの意見:\n{initial_content}"
            )
            sys_inst = "あなたは批判的思考力を育成する教育AIアシスタントです。"
        elif language == 'en':
            prompt = (
                f"Generate a constructive logical counterargument and thoughtful probing questions in English based on the user's opinion:\n\n"
                f"User's opinion:\n{initial_content}"
            )
            sys_inst = "You are an educational AI assistant specializing in critical thinking and logical analysis."
        else:
            prompt = (
                f"Hãy đưa ra luận điểm phản biện logic và các câu hỏi đào sâu tư duy bằng tiếng Việt cho ý kiến sau:\n\n"
                f"Ý kiến của người học:\n{initial_content}"
            )
            sys_inst = "Bạn là trợ lý giáo dục chuyên về rèn luyện tư duy phản biện và lập luận logic."

        res = call_gemini_api(prompt, sys_inst)
        if res and not res.startswith("Gemini API"):
            return res

    # Offline Multilingual Response
    if language == 'jp':
        return (
            "【AI論理フィードバック / 反論】\n\n"
            "あなたの意見は非常に興味深いですが、多角的な視点から再考する必要があります。\n\n"
            "1. 前提条件の妥当性：提示された根拠はあらゆる状況に普遍的に当てはまるでしょうか？\n"
            "2. 副作用・反例の検討：もしすべてを自動化・簡略化した場合、本来培われるべき批判的思考力や基礎力は損なわれませんか？\n"
            "3. 発展的な提案：あえて制約を設けた環境こそが、深い思考と学習効果を刺激するのではないでしょうか？"
        )
    elif language == 'en':
        return (
            "【AI Logical Critique & Counterargument】\n\n"
            "Your argument is insightful; however, consider exploring alternative perspectives:\n\n"
            "1. Premise Validity: Does your initial rationale account for all edge cases or unintended trade-offs?\n"
            "2. Counter-examples: If AI and automation handle all intermediate steps, will foundational critical thinking skills still flourish?\n"
            "3. Constructive Synthesis: Could intentional friction or selective constraint promote deeper cognitive engagement?"
        )
    else:
        return (
            "【Phản biện Logic từ AI / AI Counterargument】\n\n"
            "Ý kiến của bạn rất thú vị, nhưng hãy cân nhắc các góc nhìn phản biện sau:\n\n"
            "1. Tính phổ quát của tiền đề: Luận điểm bạn đưa ra có áp dụng cho mọi trường hợp hay không?\n"
            "2. Phản đề & Hệ quả: Nếu công nghệ tự động hóa hoàn toàn các bước, liệu năng lực tư duy phản biện và ghi nhớ cốt lõi của người học có bị mai một?\n"
            "3. Đề xuất phát triển: Phải chăng chính việc đặt ra những giới hạn có chủ đích mới là yếu tố thúc đẩy tư duy phát triển bền vững?"
        )

def generate_notebook_materials(sources_text, generation_type='quiz', source_title='', language='vi'):
    """
    Generates study materials (quiz, flashcards, mind map, etc.) based on all sources.
    Uses Gemini API if key is available, or falls back to smart offline services.
    """
    # 1. Try Gemini API first if configured
    if GEMINI_API_KEY:
        try:
            if generation_type == 'quiz':
                lang_name = "tiếng Việt" if language == 'vi' else ("Japanese" if language == 'jp' else "English")
                prompt = (
                    f"Dựa vào nội dung tài liệu học tập sau đây (Tiêu đề: {source_title}):\n\n"
                    f"{sources_text[:4000]}\n\n"
                    f"Hãy tạo bộ 4 đến 6 câu hỏi trắc nghiệm ôn tập (Multiple Choice Quiz) bằng {lang_name}. "
                    f"Mỗi câu hỏi phải có đúng 4 lựa chọn (A, B, C, D), chỉ định rõ đáp án đúng và phần giải thích chi tiết.\n"
                    f"Yêu cầu trả về đúng định dạng JSON thuần túy (danh sách các object), KHÔNG bọc thêm văn bản giải thích thừa:\n"
                    f"[\n"
                    f"  {{\n"
                    f"    \"question\": \"Nội dung câu hỏi?\",\n"
                    f"    \"options\": [\"A. Lựa chọn 1\", \"B. Lựa chọn 2\", \"C. Lựa chọn 3\", \"D. Lựa chọn 4\"],\n"
                    f"    \"answer\": \"A\",\n"
                    f"    \"correct_option\": \"A\",\n"
                    f"    \"explanation\": \"Giải thích vì sao đáp án này đúng...\"\n"
                    f"  }}\n"
                    f"]"
                )
                res = call_gemini_api(prompt, "Bạn là chuyên gia giáo dục biên soạn đề kiểm tra trắc nghiệm tư duy.")
                if res and not res.startswith("Gemini API"):
                    clean_res = res.replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(clean_res)
                    if isinstance(parsed, list) and len(parsed) > 0:
                        return json.dumps(parsed, ensure_ascii=False, indent=2)

            elif generation_type == 'flashcards':
                lang_name = "tiếng Việt" if language == 'vi' else ("Japanese" if language == 'jp' else "English")
                prompt = (
                    f"Dựa vào nội dung tài liệu học tập sau đây (Tiêu đề: {source_title}):\n\n"
                    f"{sources_text[:4000]}\n\n"
                    f"Hãy trích xuất bộ 5 đến 8 thẻ ghi nhớ (Flashcards) các thuật ngữ, khái niệm và định nghĩa quan trọng nhất bằng {lang_name}.\n"
                    f"Yêu cầu trả về định dạng JSON thuần túy (danh sách các object):\n"
                    f"[\n"
                    f"  {{\n"
                    f"    \"question\": \"Khái niệm / Thuật ngữ / Câu hỏi?\",\n"
                    f"    \"answer\": \"Định nghĩa / Giải thích chi tiết\"\n"
                    f"  }}\n"
                    f"]"
                )
                res = call_gemini_api(prompt, "Bạn là trợ lý học tập thông minh chuyên trích xuất Flashcards ghi nhớ nhanh.")
                if res and not res.startswith("Gemini API"):
                    clean_res = res.replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(clean_res)
                    if isinstance(parsed, list) and len(parsed) > 0:
                        return json.dumps(parsed, ensure_ascii=False, indent=2)
                        
            elif generation_type == 'report':
                lang_name = "tiếng Việt" if language == 'vi' else ("Japanese" if language == 'jp' else "English")
                prompt = (
                    f"Hãy tạo một bản Báo cáo tóm tắt học thuật hoàn chỉnh bằng {lang_name} dựa trên tài liệu sau (Tiêu đề: {source_title}):\n\n"
                    f"{sources_text[:4000]}"
                )
                res = call_gemini_api(prompt, "Bạn là chuyên gia tổng hợp và viết báo cáo học thuật chuyên nghiệp.")
                if res and not res.startswith("Gemini API"):
                    return res

        except Exception as e:
            # Fallback to local services on any exception
            pass

    # 2. Local fallback feature services
    try:
        if generation_type == 'flashcards':
            from .features.flashcard import service as flashcard_service
            return flashcard_service.generate(sources_text, source_title, language=language)
            
        elif generation_type == 'quiz':
            from .features.quiz import service as quiz_service
            return quiz_service.generate(sources_text, source_title, language=language)
            
        elif generation_type == 'report':
            from .features.report import service as report_service
            return report_service.generate(sources_text, source_title, language=language)
            
        elif generation_type == 'mind_map':
            from .features.mindmap import service as mindmap_service
            return mindmap_service.generate(sources_text, source_title, language=language)
            
        else:
            return "No template content available."
            
    except Exception as e:
        return f"Error generating materials: {str(e)}"


def process_context_action(text: str, action: str, language: str = 'vi') -> dict:
    """
    Process contextual action on highlighted text (explain, translate, flashcard).
    Supports Gemini API if key is set, otherwise falls back to smart offline multilingual response.
    """
    clean_text = text.strip()
    if not clean_text:
        return {"result": "Không có nội dung được chọn.", "action": action}

    # If Gemini API key is configured, try calling it with target language
    if GEMINI_API_KEY:
        if action == 'explain':
            if language == 'jp':
                prompt = f"次の概念または文章を日本語で簡潔かつ分かりやすく解説してください:\n\n{clean_text}"
                sys_prompt = "あなたは優秀な学習支援AIアシスタントです。"
            elif language == 'en':
                prompt = f"Explain the following concept or text concisely and clearly in English:\n\n{clean_text}"
                sys_prompt = "You are a smart educational AI tutor."
            else:
                prompt = f"Hãy giải thích ngắn gọn, súc tích và dễ hiểu khái niệm/đoạn văn sau bằng tiếng Việt:\n\n{clean_text}"
                sys_prompt = "Bạn là trợ lý học tập thông minh."
            res = call_gemini_api(prompt, sys_prompt)
            if res and not res.startswith("Gemini API"):
                return {"result": res, "action": action}

        elif action == 'translate':
            if language == 'jp':
                prompt = f"次の文章を学術的で正確な日本語に翻訳してください（必要に応じて原文対訳も提示）:\n\n{clean_text}"
            elif language == 'en':
                prompt = f"Translate the following text into precise academic English (and provide bilingual reference if helpful):\n\n{clean_text}"
            else:
                prompt = f"Hãy dịch đoạn văn sau sang tiếng Việt chuẩn xác (hoặc đối chiếu đa ngữ nếu cần):\n\n{clean_text}"
            res = call_gemini_api(prompt, "Bạn là chuyên gia dịch thuật ngôn ngữ học thuật.")
            if res and not res.startswith("Gemini API"):
                return {"result": res, "action": action}

        elif action == 'flashcard':
            if language == 'jp':
                prompt = f"次の文章から、日本語で簡潔な単語カード（質問と回答）をJSON形式で作成してください:\n{{\"question\": \"...\", \"answer\": \"...\"}}\n\n文章:\n{clean_text}"
            elif language == 'en':
                prompt = f"From the following text, create a concise study flashcard in English in JSON format:\n{{\"question\": \"...\", \"answer\": \"...\"}}\n\nText:\n{clean_text}"
            else:
                prompt = f"Từ đoạn văn sau, hãy tạo 1 thẻ ghi nhớ (Flashcard) gồm Câu hỏi và Đáp án ngắn gọn dạng JSON:\n{{\"question\": \"...\", \"answer\": \"...\"}}\n\nĐoạn văn:\n{clean_text}"
            res = call_gemini_api(prompt, "Bạn là chuyên gia tạo học liệu Flashcard.")
            if res and not res.startswith("Gemini API"):
                try:
                    clean_res = res.replace("```json", "").replace("```", "").strip()
                    parsed = json.loads(clean_res)
                    q_label = "質問" if language == 'jp' else ("Question" if language == 'en' else "Câu hỏi")
                    a_label = "解答" if language == 'jp' else ("Answer" if language == 'en' else "Đáp án")
                    return {"result": f"{q_label}: {parsed.get('question')}\n\n{a_label}: {parsed.get('answer')}", "action": action, "flashcard": parsed}
                except Exception:
                    return {"result": res, "action": action}

    # Offline Multilingual Fallback Mode
    if language == 'jp':
        if action == 'explain':
            return {
                "result": f"💡 用語・概念の解説: 「{clean_text}」\n\n"
                          f"これは学習資料における重要な要点です。対象テーマの論理構造や基本原理を深く理解するために把握しておくべき重要事項です。",
                "action": action
            }
        elif action == 'translate':
            return {
                "result": f"🌐 多言語対訳:\n\n"
                          f"JP: {clean_text}\n"
                          f"EN: (Translation) Reference: {clean_text}\n"
                          f"VI: (Bản dịch) Tài liệu học tập: {clean_text}",
                "action": action
            }
        elif action == 'flashcard':
            q = f"「{clean_text[:50]}...」とは何ですか？" if len(clean_text) > 50 else f"「{clean_text}」の意義・定義は？"
            a = clean_text
            return {
                "result": f"🔖 単語カード抽出:\n\n❓ 質問: {q}\n💡 解答: {a}",
                "action": action,
                "flashcard": {"question": q, "answer": a}
            }
    elif language == 'en':
        if action == 'explain':
            return {
                "result": f"💡 Concept Explanation: \"{clean_text}\"\n\n"
                          f"This is an essential learning point from your reference materials. It outlines key principles and core vocabulary necessary for mastering the subject.",
                "action": action
            }
        elif action == 'translate':
            return {
                "result": f"🌐 Multilingual Reference Translation:\n\n"
                          f"EN: {clean_text}\n"
                          f"VI: (Bản dịch) Khái niệm/thuật ngữ: {clean_text}\n"
                          f"JP: (対訳) 「{clean_text}」に関する学術事項",
                "action": action
            }
        elif action == 'flashcard':
            q = f"What is {clean_text[:60]}...?" if len(clean_text) > 60 else f"What is the definition of \"{clean_text}\"?"
            a = clean_text
            return {
                "result": f"🔖 Extracted Flashcard:\n\n❓ Question: {q}\n💡 Answer: {a}",
                "action": action,
                "flashcard": {"question": q, "answer": a}
            }
    else: # Default Vietnamese
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
                          f"EN: (Reference translation) Term: {clean_text}\n"
                          f"JP: (対訳) 「{clean_text}」",
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
