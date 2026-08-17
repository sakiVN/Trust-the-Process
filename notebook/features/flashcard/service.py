import re
import json

def generate(sources_text, source_title='', language='vi'):
    """
    Parses a raw text and extracts Flashcards, or generates smart flashcards
    from document paragraphs/concepts.
    Expected format if manual:
    Q: ...
    A: ...
    """
    flashcards = []
    
    # 1. Try parsing Q: and A:
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
            
    # 2. Parse by newlines and look for colon ':' or hyphen '-'
    if not flashcards:
        lines = [line.strip() for line in sources_text.split('\n') if line.strip() and not line.startswith('---')]
        for line in lines:
            if ':' in line and not line.startswith('http'):
                parts = line.split(':', 1)
                q_candidate = parts[0].strip()
                a_candidate = parts[1].strip()
                if len(q_candidate) > 3 and len(a_candidate) > 10 and len(q_candidate) < 120:
                    flashcards.append({"question": q_candidate, "answer": a_candidate})
            elif ' - ' in line:
                parts = line.split(' - ', 1)
                q_candidate = parts[0].strip()
                a_candidate = parts[1].strip()
                if len(q_candidate) > 3 and len(a_candidate) > 10 and len(q_candidate) < 120:
                    flashcards.append({"question": q_candidate, "answer": a_candidate})
                
    # 3. Smart paragraph extraction fallback
    if not flashcards:
        title = source_title or "Tài liệu học tập"
        clean_text = sources_text.replace('\r\n', '\n').strip()
        paragraphs = [p.strip() for p in clean_text.split('\n') if len(p.strip()) > 30 and not p.startswith('---')]
        
        if language == 'jp':
            if paragraphs:
                flashcards.append({
                    "question": f"「{title}」の基本概念・主題は何ですか？",
                    "answer": paragraphs[0][:200]
                })
                if len(paragraphs) > 1:
                    flashcards.append({
                        "question": f"「{title}」で言及されている重要論点・詳細事項は？",
                        "answer": paragraphs[1][:200]
                    })
                if len(paragraphs) > 2:
                    flashcards.append({
                        "question": f"「{title}」の応用や留意点について説明してください。",
                        "answer": paragraphs[2][:200]
                    })
            else:
                flashcards.append({
                    "question": f"「{title}」のコア概念とは？",
                    "answer": "本テーマの基本原理および思考プロセスの定着を目的とした重要学習事項です。"
                })
                flashcards.append({
                    "question": f"フラッシュカード学習の目的は？",
                    "answer": "反復想起（Spaced Repetition）を通じて長期記憶を活性化し、知識の定着を図ることです。"
                })
        elif language == 'en':
            if paragraphs:
                flashcards.append({
                    "question": f"What is the primary concept and overview of \"{title}\"?",
                    "answer": paragraphs[0][:200]
                })
                if len(paragraphs) > 1:
                    flashcards.append({
                        "question": f"What are the key points and principles discussed in \"{title}\"?",
                        "answer": paragraphs[1][:200]
                    })
                if len(paragraphs) > 2:
                    flashcards.append({
                        "question": f"How is \"{title}\" applied or analyzed in this context?",
                        "answer": paragraphs[2][:200]
                    })
            else:
                flashcards.append({
                    "question": f"What is the foundational concept of \"{title}\"?",
                    "answer": f"Core principles, key terminologies, and critical insights relevant to {title}."
                })
                flashcards.append({
                    "question": "What is the primary goal of Flashcard retrieval?",
                    "answer": "To reinforce long-term memory through active recall and spaced repetition."
                })
        else: # Vietnamese
            if paragraphs:
                flashcards.append({
                    "question": f"Tổng quan và định nghĩa cốt lõi của \"{title}\" là gì?",
                    "answer": paragraphs[0][:220]
                })
                if len(paragraphs) > 1:
                    flashcards.append({
                        "question": f"Các luận điểm hoặc nguyên lý quan trọng trong bài học \"{title}\"?",
                        "answer": paragraphs[1][:220]
                    })
                if len(paragraphs) > 2:
                    flashcards.append({
                        "question": f"Ý nghĩa thực tiễn hoặc kết luận rút ra từ \"{title}\" là gì?",
                        "answer": paragraphs[2][:220]
                    })
            else:
                flashcards.append({
                    "question": f"Khái niệm cốt lõi của {title} là gì?",
                    "answer": f"Đây là nội dung trọng tâm trong tài liệu học tập, bao gồm các định nghĩa, nguyên lý và kiến thức cần nắm vững về {title}."
                })
                flashcards.append({
                    "question": "Mục tiêu của việc ôn tập bằng Flashcard (Thẻ ghi nhớ)?",
                    "answer": "Kích hoạt hiệu ứng truy xuất chủ động (Active Recall) để củng cố trí nhớ dài hạn và rèn luyện phản xạ ghi nhớ nhanh."
                })
                flashcards.append({
                    "question": "Phương pháp lật thẻ thông minh mang lại lợi ích gì?",
                    "answer": "Giúp người học tự đánh giá mức độ hiểu bài, tập trung ôn lại những câu chưa thuộc và tiết kiệm thời gian học tập."
                })
        
    return json.dumps(flashcards, ensure_ascii=False, indent=2)

