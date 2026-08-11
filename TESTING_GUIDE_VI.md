# Hướng Dẫn Kiểm Tra CSRF Token Fix

## Tổng Quan
Lỗi "không thể tạo được Notebook mới" đã được sửa bằng cách thêm hỗ trợ CSRF Token trong frontend.

## Vấn Đề Gốc
- Django yêu cầu CSRF token cho các POST request từ phía client
- Frontend (index.html) không gửi CSRF token, dẫn đến lỗi 403 Forbidden
- Người dùng bấm nút "Xác nhận tạo" nhưng request được từ chối

## Giải Pháp Được Áp Dụng

### 1. **Thêm getCsrfToken() Helper Function**
   - Trích xuất CSRF token từ cookies của browser
   - Token được Django tự động đặt khi page được tải

### 2. **Tạo fetchWithCsrf() Wrapper**
   - Wrapper function bao quanh native fetch API
   - Tự động thêm CSRF token vào X-CSRFToken header
   - Chỉ áp dụng cho POST/PUT/PATCH/DELETE requests

### 3. **Cập Nhật Tất Cả POST Requests**
   - Thay thế `fetch()` bằng `fetchWithCsrf()` cho 12+ POST requests
   - Bao gồm: create, update, delete operations trên Notebooks, Sources, Notes, Quizzes, etc.

### 4. **Cải Thiện Error Handling**
   - Kiểm tra response status trước khi parse JSON
   - Hiển thị thông báo lỗi chi tiết cho người dùng

## Các Tệp Được Thay Đổi
- `notebook/templates/notebook/index.html` (Thêm CSRF token support - 500+ dòng)

## Hướng Dẫn Kiểm Tra

### Bước 1: Truy Cập Ứng Dụng
```
1. Mở trình duyệt web (Chrome, Firefox, Safari, Edge)
2. Truy cập: http://localhost:8000
3. Bạn sẽ thấy Dashboard của EduBrain
```

### Bước 2: Kiểm Tra Tạo Notebook Mới
```
1. Tìm nút "Khởi tạo Sổ tay tự học mới" (thường ở trên cùng hoặc bên trái sidebar)
2. Bấm nút này để mở dialog
3. Điền các thông tin:
   - Tên sổ tay: "Lịch sử Việt Nam" (hoặc tên tuỳ ý)
   - Mục tiêu học tập: "Ôn tập cho kì thi cuối kỳ" (hoặc mô tả tuỳ ý)
4. Bấm nút "Xác nhận tạo"
```

### Bước 3: Xác Nhận Thành Công
```
✅ Notebook sẽ được tạo thành công
✅ Dialog sẽ đóng tự động
✅ Trang sẽ chuyển sang view "Sổ tay" (Notebooks)
✅ Notebook mới sẽ hiển thị trong danh sách
✅ Notebook sẽ được tự động chọn (highlighted)
```

### Bước 4: Kiểm Tra Các Tính Năng Khác

#### Thêm Tài Liệu (Sources)
```
1. Chọn 1 notebook từ danh sách bên trái
2. Tab "Tài liệu" sẽ mở ra
3. Thêm tài liệu bằng:
   - Upload PDF file
   - Thêm link URL
   - Nhập nội dung text
```

#### Tạo Note
```
1. Vẫn trong tab "Tài liệu"
2. Nhập tiêu đề note
3. Nhập nội dung bản nháp
4. Bấm "Tạo Note" → Sẽ thành công nếu CSRF fix hoạt động
```

#### Tạo Quiz/Material
```
1. Chọn tab "AI Generation"
2. Chọn loại sinh nội dung (Quiz, Flashcards, Mind Map, etc.)
3. Bấm "Sinh nội dung" → Request POST sẽ được gửi với CSRF token
```

## Kiểm Tra Kỹ Thuật (F12 Console)

### Mở Developer Tools
```
1. Bấm F12 hoặc Ctrl+Shift+I (Windows) / Cmd+Option+I (Mac)
2. Chuyển sang tab "Console"
3. Chuyển sang tab "Network" để xem requests
```

### Xem CSRF Token Trong Cookies
```javascript
// Chạy trong Console:
document.cookie
// Sẽ hiển thị: csrftoken=xxxxxxxx...
```

### Xem POST Requests Với CSRF Token
```
1. Mở tab "Network"
2. Tạo notebook mới
3. Xem POST request đến /api/notebooks/
4. Kiểm tra Request Headers:
   - Content-Type: application/json
   - X-CSRFToken: [token_value]
5. Response Status sẽ là 201 Created (thành công)
```

## Ghi Chú Quan Trọng

### ✅ Điều Mong Đợi
- Tất cả POST requests sẽ có header `X-CSRFToken`
- Response status sẽ là 200/201 (thành công)
- Không có lỗi 403 Forbidden nữa
- Error messages sẽ hiển thị chi tiết nếu có lỗi

### ⚠️ Lưu Ý
- CSRF token chỉ hoạt động khi truy cập qua browser (có cookie)
- API requests từ Postman/curl cần gửi token một cách thủ công
- Token có thể thay đổi - browser sẽ tự động quản lý

## Troubleshooting

### Nếu Vẫn Không Thành Công

1. **Clear Browser Cache**
   - Ctrl+Shift+Delete (Windows/Linux)
   - Cmd+Shift+Delete (Mac)
   - Clear "All time" → Cookies and cached images
   - Reload page

2. **Kiểm Tra Browser Console (F12)**
   - Xem có error messages nào không
   - Xem Network tab - status code của response

3. **Kiểm Tra Server Logs**
   - Xem terminal nơi chạy `python manage.py runserver`
   - Error messages sẽ hiển thị ở đó

4. **Restart Server**
   - Bấm Ctrl+Break trong terminal chạy server
   - Chạy lại `python manage.py runserver`

## Kết Luận
Nếu theo dõi các bước trên và thực hiện kiểm tra thành công, điều này xác nhận rằng:
- ✅ CSRF token support đã được triển khai thành công
- ✅ Tất cả POST requests đều gửi CSRF token
- ✅ Lỗi "không thể tạo Notebook" đã được sửa

## Liên Hệ Hỗ Trợ
Nếu gặp vấn đề, hãy:
1. Check file `CSRF_FIX_SUMMARY.md` để hiểu chi tiết kỹ thuật
2. Xem server logs trong terminal
3. Kiểm tra Network tab trong DevTools (F12)
