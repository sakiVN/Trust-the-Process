# Trust-the-Process: AI Project Context

*Tài liệu này được thiết kế dành riêng cho các trợ lý AI (như Claude, GPT, Gemini) để đọc hiểu nhanh chóng kiến trúc, luồng hoạt động và bối cảnh của dự án "Trust the Process".*

## 1. Tổng quan dự án (Project Overview)
**Trust-the-Process** là một ứng dụng web sổ tay thông minh (Smart Notebook App). Chức năng chính của ứng dụng là cho phép người dùng quản lý ghi chú, tải lên các nguồn tài liệu (Sources - Text/Link/File) và sử dụng AI để tự động tạo ra các tài nguyên học tập/làm việc như:
- Câu hỏi trắc nghiệm (Quiz)
- Thẻ ghi nhớ (Flashcards)
- Sơ đồ tư duy (Mindmap)
- Báo cáo tổng hợp (Report)

## 2. Tech Stack (Công nghệ sử dụng)
- **Backend Framework**: Python / Django 
- **API Layer**: Django REST Framework (DRF)
- **Database**: SQLite (`db.sqlite3` - dùng cho môi trường dev)
- **Frontend**: Django HTML Templates (`notebook/templates/`), Vanilla JavaScript, và Tailwind CSS. (Dự án không dùng frontend framework tách biệt như React/Vue mà render trực tiếp từ Django).
- **AI Integration**: Tích hợp gọi API mô hình ngôn ngữ (LLMs) thông qua `ai_service.py` và các module tính năng (Features).

## 3. Kiến trúc thư mục (Directory Structure)
Dự án tuân theo cấu trúc chuẩn của Django với một số tùy chỉnh cho việc phân tách module AI:

```text
Trust-the-Process/
├── config/                 # Cấu hình chính của Django (settings.py, urls.py, wsgi.py)
├── notebook/               # App chính (Core Application)
│   ├── models.py           # Định nghĩa DB Schema (Notebook, Note, Source, QuizSet, AIGeneration)
│   ├── views.py            # API Controllers (ViewSets) xử lý request từ client
│   ├── urls.py             # DRF router định tuyến các API endpoints
│   ├── serializers.py      # Chuyển đổi dữ liệu (Models <-> JSON)
│   ├── ai_service.py       # Tích hợp core AI, quản lý context và prompt LLMs
│   ├── features/           # ★ Thư mục chứa logic sinh nội dung AI chia theo tính năng
│   │   ├── flashcard/
│   │   ├── mindmap/
│   │   ├── quiz/
│   │   └── report/
│   ├── templates/notebook/ # Giao diện HTML tĩnh & Django Templates
│   └── static/             # File tĩnh (CSS, JS, Images)
├── db.sqlite3              # Cơ sở dữ liệu SQLite
├── manage.py               # Script quản lý Django
└── *.py (Root Scripts)     # Các script hỗ trợ refactor/fix bug (ví dụ: fix_tailwind.py, update_index_quiz.py)
```

## 4. Mô hình Dữ liệu Chính (Core Data Models) - `notebook/models.py`
- `Notebook`: Bảng trung tâm, lưu trữ thông tin không gian làm việc của người dùng.
- `Note`: Ghi chú văn bản bên trong sổ tay (có hỗ trợ AI tinh chỉnh nội dung).
- `Source`: Chứa các tài liệu thô được upload/nhập vào làm ngữ cảnh (context) cho AI xử lý. Có 3 loại: `file`, `link`, `text`.
- `AIGeneration`: Lưu trữ kết quả đầu ra do AI sinh ra (như json flashcard, markdown mindmap, v.v.).
- `QuizSet` & `QuizQuestion`: Lưu trữ cấu trúc bộ câu hỏi trắc nghiệm sinh ra.
- `QuizAttempt`: Lưu lịch sử làm bài trắc nghiệm của người dùng.

## 5. Luồng hoạt động (Data Flow)
1. **Input**: Người dùng tạo Sổ tay (`Notebook`) và thêm Tài liệu (`Source`).
2. **Trigger**: Người dùng yêu cầu tạo một tài nguyên (ví dụ: tạo Quiz) từ giao diện (`templates`).
3. **API Handling**: Request gửi tới endpoint `/quizzes/` hoặc các hàm custom trong `views.py`.
4. **AI Processing**: `views.py` gọi hàm tương ứng trong `features/quiz/service.py` hoặc `ai_service.py`. Hệ thống truy xuất nội dung từ `Source`, tạo prompt, gửi tới LLM.
5. **Output**: LLM trả về kết quả (thường ở định dạng JSON/Markdown). Dữ liệu này được lưu vào bảng `AIGeneration` hoặc `QuizSet`.
6. **Rendering**: Dữ liệu lưu trong DB được `serializers.py` trả về dạng JSON để Frontend hiển thị hoặc render trực tiếp qua Django Template.

## 6. Lưu ý cho các AI Model khi code/sửa lỗi (AI Developer Guide)
- **Tập trung vào tính module hóa**: Phần logic sinh của AI được tách ra ở `notebook/features/`. Khi sửa đổi logic sinh Flashcard, hãy vào `features/flashcard/` thay vì sửa file views khổng lồ.
- **Frontend vs Backend**: Giao diện được render bằng Django Templates kết hợp với JS thuần gọi API qua DRF. Tránh tạo logic SPA (Single Page Application) nếu không được yêu cầu. Chú ý truyền CSRF Token đầy đủ cho các AJAX requests.
- **Các file script gốc**: Ở thư mục gốc chứa nhiều file script (như `fix_missing_js.py`, `update_notifications_backend.py`). Đây là các file tiện ích do các phiên làm việc AI trước tạo ra để batch-update. Nếu cần tái cấu trúc lớn, có thể tham khảo/chạy các script này.
- **Tailwind**: CSS sử dụng Tailwind. Thay vì viết CSS custom, hãy dùng utility classes của Tailwind trong templates.

## 7. Trạng thái hiện tại
Dự án đang trong giai đoạn phát triển và tái cấu trúc (refactoring) phần UI/UX (như quản lý notification, tối ưu template giao diện) và cấu trúc lại các tính năng AI thành module độc lập (trong thư mục `features`).
