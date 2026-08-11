# Sửa lỗi CSRF Token - Trust-the-Process

## Vấn đề
Người dùng không thể tạo Notebook mới sau khi điền thông tin và ấn nút "Xác nhận tạo". Nguyên nhân là frontend không gửi CSRF token trong các POST request, trong khi Django CSRF middleware yêu cầu token này.

## Giải pháp

### 1. Thêm hàm lấy CSRF Token
Thêm hàm `getCsrfToken()` vào file [notebook/templates/notebook/index.html](notebook/templates/notebook/index.html) để trích xuất CSRF token từ cookies.

```javascript
function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
```

### 2. Tạo wrapper function `fetchWithCsrf()`
Tạo wrapper function để tự động thêm CSRF token vào headers cho các POST/PUT/PATCH/DELETE request:

```javascript
async function fetchWithCsrf(url, options = {}) {
    const method = options.method || 'GET';
    const headers = options.headers || {};
    
    // Add CSRF token for POST, PUT, PATCH, DELETE requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        headers['X-CSRFToken'] = getCsrfToken();
    }
    
    return fetch(url, { ...options, headers });
}
```

### 3. Cập nhật tất cả POST Requests
Thay đổi tất cả các fetch call từ:
```javascript
const res = await fetch(url, { method: 'POST', ... })
```

Thành:
```javascript
const res = await fetchWithCsrf(url, { method: 'POST', ... })
```

**Các POST request được cập nhật:**
- `handleCreateNotebook()` - Tạo Notebook mới
- `handleAddSource()` - Thêm tài liệu nguồn (2 chỗ)
- `handleAddNote()` - Thêm Note mới
- `handleQuizBuilderSubmit()` - Tạo Quiz
- `submitQuizAttempt()` - Submit Quiz
- `submitNoteUnlock()` - Unlock Note
- `submitNoteRevise()` - Revise Note
- `triggerGeneration()` - Tạo AI content
- `deleteSource()` - Xóa Source
- `deleteGeneration()` - Xóa Generation
- `deleteNotebook()` - Xóa Notebook
- `shuffleQuiz()` - Shuffle Quiz questions
- `saveToolGeneration()` - Lưu Tool Generation

### 4. Cải thiện Error Handling
Thêm kiểm tra response status và hiển thị thông báo lỗi chi tiết cho người dùng trong hàm `handleCreateNotebook()`:

```javascript
if (!res.ok) {
    const errorData = await res.json();
    console.error("Lỗi từ server:", errorData);
    alert(`Lỗi tạo Sổ tay: ${errorData.detail || 'Vui lòng thử lại'}`);
    return;
}
```

## Các tệp thay đổi
- `notebook/templates/notebook/index.html` - Thêm CSRF token support và cập nhật tất cả POST requests

## Cách kiểm tra
1. Mở trình duyệt và truy cập `http://localhost:8000`
2. Click nút "Khởi tạo Sổ tay tự học mới"
3. Điền tên sổ tay và mô tả
4. Click nút "Xác nhận tạo"
5. Sổ tay mới sẽ được tạo thành công và hiển thị trong danh sách

## Ghi chú
- CSRF token được Django tự động gửi dưới dạng cookie khi page được load
- Hàm `getCsrfToken()` trích xuất token này từ cookies
- Hàm `fetchWithCsrf()` tự động thêm token vào header `X-CSRFToken` cho tất cả non-GET requests
- Điều này tuân thủ Django REST Framework CSRF protection policy

## Kiểm tra đã thực hiện
- [x] Thêm CSRF token helper functions
- [x] Cập nhật tất cả POST requests sử dụng fetchWithCsrf
- [x] Cải thiện error handling
- [x] Database migration được áp dụng
- [x] Sẵn sàng để test qua UI
