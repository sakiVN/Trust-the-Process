import re
import json

def generate(sources_text, source_title='', language='vi'):
    """
    Parses a raw text containing Q/A blocks or generates structured quiz questions
    from arbitrary study text.
    
    Expected raw format if manual:
    Q: Question text
    A: Option 1
    B: Option 2 (*)
    C: Option 3
    D: Option 4
    EXP: Explanation text
    """
    questions = []
    
    # 1. Try parsing manual Q/A format if present
    if '\nQ:' in ('\n' + sources_text) or 'Q:' in sources_text:
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
                
            opt_A = a_match.group(1).strip()
            opt_B = b_match.group(1).strip()
            opt_C = c_match.group(1).strip()
            opt_D = d_match.group(1).strip()
            
            options = [opt_A, opt_B, opt_C, opt_D]
            correct_index = 0
            
            clean_options = []
            for i, opt in enumerate(options):
                if '(*)' in opt:
                    correct_index = i
                    opt = opt.replace('(*)', '').strip()
                letter = chr(65 + i)
                clean_opt = re.sub(r'^[A-D]\.\s*', '', opt).strip()
                clean_options.append(f"{letter}. {clean_opt}")
                
            exp_match = re.search(r'\nEXP:\s*(.*)', block, re.DOTALL)
            explanation = exp_match.group(1).strip() if exp_match else "Giải thích chi tiết cho câu hỏi."
            
            questions.append({
                "question": question_text,
                "question_text": question_text,
                "options": clean_options,
                "answer": chr(65 + correct_index),
                "correct_option": chr(65 + correct_index),
                "explanation": explanation
            })
    
    if questions:
        return json.dumps(questions, ensure_ascii=False, indent=2)
        
    # 2. Smart text extraction fallback for arbitrary text / document content
    title = source_title or "Tài liệu học tập"
    clean_text = sources_text.replace('\r\n', '\n').strip()
    paragraphs = [p.strip() for p in clean_text.split('\n') if len(p.strip()) > 30 and not p.startswith('---')]
    
    if language == 'jp':
        if paragraphs:
            p1 = paragraphs[0][:150]
            questions.append({
                "question": f"「{title}」において、以下の記述のうち最も適切なものはどれですか？",
                "options": [
                    f"A. {p1[:80]}（正しい要点）",
                    "B. 本資料の主題とは完全に無関係な仮説",
                    "C. 提示された論理と矛盾する結論",
                    "D. いかなる検証も経ていない憶測"
                ],
                "answer": "A",
                "correct_option": "A",
                "explanation": f"資料本文「{p1[:100]}...」に基づき、Aが最も論理的に整合しています。"
            })
            if len(paragraphs) > 1:
                p2 = paragraphs[1][:150]
                questions.append({
                    "question": f"「{title}」の論点展開において重要な要素は何ですか？",
                    "options": [
                        "A. 単なる主観的感想の羅列",
                        f"B. 「{p2[:70]}」に基づく系統的な考察",
                        "C. 定量的根拠の意図的な排除",
                        "D. 既存概念の盲目的な受容"
                    ],
                    "answer": "B",
                    "correct_option": "B",
                    "explanation": f"本文の第2段落にて言及されている重要論点「{p2[:80]}...」によります。"
                })
        else:
            questions.append({
                "question": f"「{title}」の主たる学習目標として正しいものはどれですか？",
                "options": [
                    "A. 概念の深い理解と批判的思考力の向上",
                    "B. 単純な丸暗記と検証の省略",
                    "C. 関連資料の参照を避けること",
                    "D. 根拠のない結論の導出"
                ],
                "answer": "A",
                "correct_option": "A",
                "explanation": "学習内容を深く定着させ、多角的な思考力を養うことが本教材の目標です。"
            })
    elif language == 'en':
        if paragraphs:
            p1 = paragraphs[0][:150]
            questions.append({
                "question": f"According to the materials on \"{title}\", which statement is most accurate?",
                "options": [
                    f"A. {p1[:80]} (Key Concept)",
                    "B. An irrelevant hypothesis not supported by the text",
                    "C. A statement contradicting the core findings",
                    "D. An unsupported assumption without evidence"
                ],
                "answer": "A",
                "correct_option": "A",
                "explanation": f"Based on the text: \"{p1[:100]}...\", option A represents the primary finding."
            })
            if len(paragraphs) > 1:
                p2 = paragraphs[1][:150]
                questions.append({
                    "question": f"What is a critical takeaway regarding \"{title}\"?",
                    "options": [
                        "A. Neglecting foundational principles",
                        f"B. Systematic understanding of \"{p2[:70]}\"",
                        "C. Avoiding peer review and critical critique",
                        "D. Relying exclusively on unverified sources"
                    ],
                    "answer": "B",
                    "correct_option": "B",
                    "explanation": f"Supported by the excerpt: \"{p2[:80]}...\"."
                })
        else:
            questions.append({
                "question": f"What is the primary objective of studying \"{title}\"?",
                "options": [
                    "A. Mastering core principles and fostering analytical critical thinking",
                    "B. Rote memorization without empirical verification",
                    "C. Ignoring foundational evidence",
                    "D. Bypassing logical reasoning"
                ],
                "answer": "A",
                "correct_option": "A",
                "explanation": "Active learning and deep conceptual mastery are the primary objectives."
            })
    else: # Default Vietnamese
        if paragraphs:
            p1 = paragraphs[0][:160]
            questions.append({
                "question": f"Dựa theo nội dung tài liệu về \"{title}\", khẳng định nào sau đây là chính xác nhất?",
                "options": [
                    f"A. {p1[:85]}",
                    "B. Luận điểm hoàn toàn trái ngược với nội dung tài liệu đã trình bày",
                    "C. Nội dung chỉ mang tính giả định chưa được kiểm chứng thực tế",
                    "D. Khái niệm không có mối liên hệ logic với chủ đề nghiên cứu"
                ],
                "answer": "A",
                "correct_option": "A",
                "explanation": f"Căn cứ vào nội dung tài liệu: \"{p1[:100]}...\", đáp án A phản ánh đúng luận điểm cốt lõi."
            })
            if len(paragraphs) > 1:
                p2 = paragraphs[1][:160]
                questions.append({
                    "question": f"Đặc điểm hoặc nguyên lý quan trọng được nhấn mạnh trong \"{title}\" là gì?",
                    "options": [
                        "A. Bỏ qua các bước phân tích và tổng hợp thông tin",
                        f"B. {p2[:85]}",
                        "C. Chỉ tập trung vào hình thức mà không chú trọng bản chất",
                        "D. Phủ nhận tính ứng dụng thực tiễn của kiến thức"
                    ],
                    "answer": "B",
                    "correct_option": "B",
                    "explanation": f"Được trích dẫn trực tiếp từ tài liệu: \"{p2[:100]}...\"."
                })
            if len(paragraphs) > 2:
                p3 = paragraphs[2][:160]
                questions.append({
                    "question": f"Mục tiêu ứng dụng hoặc giải pháp được đề cập trong tài liệu liên quan đến \"{title}\" là gì?",
                    "options": [
                        "A. Giảm thiểu tính chủ động của người học",
                        "B. Tách rời lý thuyết khỏi thực hành thực tế",
                        f"C. {p3[:85]}",
                        "D. Thay thế tư duy phản biện bằng sự ghi nhớ máy móc"
                    ],
                    "answer": "C",
                    "correct_option": "C",
                    "explanation": f"Nội dung được đề cập tại phần mở rộng của bài học: \"{p3[:100]}...\"."
                })
        else:
            questions.append({
                "question": f"Khái niệm cốt lõi nào quan trọng nhất khi nghiên cứu về \"{title}\"?",
                "options": [
                    "A. Nắm vững bản chất nguyên lý, phân tích đa chiều và rèn luyện phản biện",
                    "B. Học vẹt máy móc và không cần đối chiếu tài liệu thực tế",
                    "C. Chỉ đọc lướt qua tiêu đề mà không nắm nội dung chi tiết",
                    "D. Bỏ qua các bước thực hành và tự kiểm tra đánh giá"
                ],
                "answer": "A",
                "correct_option": "A",
                "explanation": f"Học tập chủ động và hiểu sâu bản chất là nền tảng cốt lõi khi nghiên cứu {title}."
            })
            questions.append({
                "question": f"Lợi ích của việc tự kiểm tra (Quiz) sau khi đọc tài liệu \"{title}\" là gì?",
                "options": [
                    "A. Tăng thời gian lãng phí vào các câu hỏi không liên quan",
                    "B. Kích hoạt hiệu ứng truy xuất trí nhớ (Retrieval Practice) và củng cố kiến thức",
                    "C. Làm giảm khả năng ghi nhớ dài hạn của não bộ",
                    "D. Không mang lại bất kỳ cải thiện nào cho quá trình học"
                ],
                "answer": "B",
                "correct_option": "B",
                "explanation": "Phương pháp Retrieval Practice giúp tăng cường các liên kết nơ-ron và ghi nhớ bền vững."
            })
            
    return json.dumps(questions, ensure_ascii=False, indent=2)

