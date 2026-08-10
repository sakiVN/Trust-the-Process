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

def generate_notebook_materials(sources_text, generation_type):
    """
    Generates study materials (quiz, flashcards, mind map, etc.) based on all sources offline.
    """
    # Forced Offline Mode: return mock templates directly
    mock_data = {
        'audio_overview': (
            "【Audio Podcast Script - Kịch bản thảo luận âm thanh】\n\n"
            "MC A (JP): みなさんこんにちは！今日は登録されたソース資料をもとに音声ディスカッションをお届けします。\n"
            "MC A (VI): Xin chào các bạn! Hôm nay chúng ta sẽ thảo luận về tài liệu học tập đã được lưu trữ.\n\n"
            "MC B (JP): はい、資料によると、AI時代における自律的思考の重要性が語られていますね。\n"
            "MC B (VI): Vâng, theo tài liệu, vai trò của tư duy chủ động trong kỷ nguyên AI là vô cùng quan trọng."
        ),
        'presentation': (
            "【Presentation Slides - Dàn ý Bài trình bày】\n\n"
            "Slide 1: タイトル (Tiêu đề) - AI時代の自律적学習\n"
            "- JP: AIに頼りすぎない学習デザイン / VI: Thiết kế học tập giảm phụ thuộc AI\n"
            "- JP: 自分で考え、判断するプロセスの重要性 / VI: Tầm quan trọng của tự tư duy và nhận định\n"
            "- JP: Djangoによるシステム開発 / VI: Phát triển hệ thống bằng Django\n\n"
            "Slide 2: コア技術 (Công nghệ Cốt lõi) - Python & Django\n"
            "- JP: 迅速な開発が可能なフルスタック機能 / VI: Tính năng full-stack hỗ trợ lập trình nhanh\n"
            "- JP: PostgreSQL/SQLiteとの安全な連携 / VI: Kết nối an toàn với cơ sở dữ liệu\n"
            "- JP: API連携によるAI対話システム / VI: Tích hợp hội thoại AI qua API"
        ),
        'video_overview': (
            "【Video Script Outline - Dàn ý Video giới thiệu】\n\n"
            "0:00 - 1:00: Intro & Vấn đề (イントロダクション)\n"
            "- JP: AIコピー＆ペースト問題の指摘 / VI: Đặt vấn đề học sinh lạm dụng AI.\n"
            "1:00 - 3:00: Giải pháp của chúng tôi (解決策)\n"
            "- JP: 思考のロック解除機能のデモ / VI: Trình diễn tính năng khóa & mở khóa nội dung.\n"
            "3:00 - 5:00: Kết luận (まとめ)\n"
            "- JP: 自律的な成長のための学習効果 / VI: Ý nghĩa thực tiễn đối với sự phát triển tự chủ."
        ),
        'mind_map': (
            "```mermaid\n"
            "mindmap\n"
            "  root((EduBrain NotebookLM))\n"
            "    [Frontend Dashboard]\n"
            "      (Sidebar Navigation)\n"
            "        Quick Action Button\n"
            "        Responsive View Switches\n"
            "      (Header Actions)\n"
            "        Global Search Filters\n"
            "        Light Dark Theme Toggle\n"
            "        Notification Badges\n"
            "      (Dashboard Overview)\n"
            "        Study Progress Charts\n"
            "        Recent Activities Redirects\n"
            "      (Workspace Management)\n"
            "        PDF Plain Text Sources\n"
            "        Interactive Quiz Options\n"
            "        Lockable AI Notes\n"
            "    [Django Backend API]\n"
            "      (REST Endpoints)\n"
            "        Notebooks URLs\n"
            "        Sources URLs\n"
            "        Generations URLs\n"
            "        Notes URLs\n"
            "      (Custom Views Logic)\n"
            "        pypdf PDF Text Extraction\n"
            "        Note revision status check\n"
            "      (Serializers validation)\n"
            "        NoteReviseSerializer\n"
            "        Custom NoteValidationError\n"
            "    [Database Models]\n"
            "      (User auth_user)\n"
            "        id PK\n"
            "        username\n"
            "      (Notebook Workspace)\n"
            "        id PK\n"
            "        name\n"
            "      (Note AI Rebuttal)\n"
            "        id PK\n"
            "        title\n"
            "      (Source Files Link Text)\n"
            "        id PK\n"
            "        source_type\n"
            "      (AIGeneration Output)\n"
            "        id PK\n"
            "        generation_type\n"
            "    [Offline System Config]\n"
            "      (No API Key Required)\n"
            "      (Mermaid.js CDN Rendering)\n"
            "```"
        ),
        'report': (
            "【Summary Report - Báo cáo Tóm tắt Tài liệu】\n\n"
            "■ JP: 本報告書は、AIとの対話を通じて学生の判断力を養うWebアプリケーションの開発方針をまとめています。 "
            "PythonおよびDjangoの強みを活かし、5日間という極めて短期間でのMVP構築を実現します。 "
            "主体的思考を促すため、自己入力を必須とするロック機能が最大の特徴です。\n\n"
            "■ VI: Báo cáo này tổng hợp phương hướng phát triển ứng dụng Web giúp rèn luyện năng lực đánh giá của học sinh thông qua đối thoại AI. "
            "Bằng việc tối ưu ưu điểm của Python và Django, dự án sẽ hoàn thiện phiên bản MVP trong 5 ngày. "
            "Đặc trưng lớn nhất là chức năng khóa dữ liệu yêu cầu học sinh tự suy nghĩ trước khi nhận phản hồi từ AI."
        ),
        'flashcards': json.dumps([
            {
                "question": "JP: AI学習アプリの核心的な機能は何ですか？ / VI: Tính năng cốt lõi của ứng dụng AI này là gì?",
                "answer": "JP: 学生の自己入力を強制する「思考 of ロック」と「AIによる論理的反論」です。 / VI: Đó là 'Khóa tư duy' bắt buộc học sinh tự viết và 'Phản biện logic từ AI'."
            },
            {
                "question": "JP: なぜWebフレームワークにDjangoを選定しましたか？ / VI: Tại sao lại chọn Django làm Web Framework?",
                "answer": "JP: 認証や管理画面、ORMが最初から揃っており、5日間の短期間で安全に開発できるためです。 / VI: Vì nó tích hợp sẵn đăng nhập, trang admin, ORM giúp hoàn thành code an toàn chỉ trong 5 ngày."
            },
            {
                "question": "JP: AI APIとの連携には何の ngôn ngữ を使用しますか？ / VI: Sử dụng ngôn ngữ nào để kết nối với AI API?",
                "answer": "JP: Pythonです。SDK of 親和性が高く、素早いAPI実装が可能です。 / VI: Python. Nhờ tính tương thích SDK cao giúp tích hợp API nhanh chóng."
            }
        ], ensure_ascii=False, indent=2),
        'quiz': json.dumps([
            {
                "question": "JP: データベースをPythonで操作するDjangoの機能を何と呼びますか？ / VI: Tính năng của Django giúp thao tác cơ sở dữ liệu bằng Python gọi là gì?",
                "options": ["A. SQL Parser", "B. Django ORM", "C. DB Migrator", "D. Django Form"],
                "answer": "B",
                "explanation": "JP: Django ORMはPythonクラスをSQLに変換し、DBとのやり取りをオブジェクト操作で行えるようにします。 / VI: Django ORM tự động dịch class Python thành SQL và quản lý thao tác DB dưới dạng hướng đối tượng."
            },
            {
                "question": "JP: AIの反論を見るために必要な学生のアクションはどれですか？ / VI: Học sinh cần thực hiện hành động nào để mở khóa phản biện của AI?",
                "options": ["A. 料金を支払う (Thanh toán phí)", "B. Googleログインする (Đăng nhập Google)", "C. 自分の考えを入力して保存する (Tự viết ý kiến và lưu lại)", "D. 30秒間待つ (Chờ 30 giây)"],
                "answer": "C",
                "explanation": "JP: 主体的な思考を促すため、一定文字数以上の自己入力と保存が必要です。 / VI: Để kích thích tư duy chủ động, học sinh bắt buộc phải tự nhập ý kiến của mình trước."
            }
        ], ensure_ascii=False, indent=2),
        'infographics': (
            "【Infographics Structure - Dữ liệu Đồ họa thông tin】\n\n"
            "● Key Metric 1: 5 DAYS (5日間のMVP開発期間 / Thời gian hoàn thành MVP 5 ngày)\n"
            "● Key Metric 2: 200 CHARS (AIロック解除に必要な自己入力文字数 / Ký tự tối thiểu cần nhập để mở khóa AI)\n"
            "● Core Flow:\n"
            "   1. 自己入力 (Tự viết ý kiến) -> 2. ロック解除 (Mở khóa AI) -> 3. AI反論 (Nhận phản biện) -> 4. 意見の再考 (Chỉnh sửa nâng cao)"
        ),
        'data_table': (
            "【Markdown Data Table - Bảng so sánh dữ liệu】\n\n"
            "| 項目 (Hạng mục) | Localhost (開発機) | Production Server (本番機) |\n"
            "| :--- | :--- | :--- |\n"
            "| **DEBUG Mode** | `True` (詳細エラー表示) | `False` (セキュリティ保護) |\n"
            "| **Database** | SQLite (軽量・簡易) | PostgreSQL / MySQL (高信頼性) |\n"
            "| **Access Limit** | 自分のみ (Chỉ nhà phát triển) | インターネット全般 (Toàn thế giới) |"
        ),
    }
    
    return mock_data.get(generation_type, "No template content available.")
