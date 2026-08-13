// Hàm tải bản dịch dựa theo mã ngôn ngữ (vi, ja, en)
async function loadLanguage(lang) {
  try {
    const response = await fetch(`/static/notebook/js/modules/language/${lang}.json`);
    
    if (!response.ok) {
      throw new Error(`Không tìm thấy file bản dịch: ${lang}.json`);
    }

    const translations = await response.json();

    document.querySelectorAll('[translate]').forEach(element => {
      const key = element.getAttribute('translate');
      
      if (translations[key]) {
        // Nếu là ô nhập liệu (input) thì đổi placeholder, còn thẻ thường thì đổi chữ
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = translations[key];
        } else {
          element.innerText = translations[key];
        }
      }
    });

    // 3. Ghi nhớ ngôn ngữ vừa chọn vào bộ nhớ trình duyệt
    localStorage.setItem('user_language', lang);

  } catch (error) {
    console.error("Lỗi chuyển đổi ngôn ngữ:", error);
  }
}

// 4. Khi vừa F5 hoặc mở trang: Tự động load ngôn ngữ cũ đã lưu
document.addEventListener('DOMContentLoaded', () => {
  // Lấy ngôn ngữ đã lưu, nếu chưa có thì mặc định lấy 'vi'
  const savedLang = localStorage.getItem('user_language') || 'vi';
  
  // Cập nhật lại vị trí chọn trên ô <select> cho khớp
  const selectEl = document.getElementById('language-select');
  if (selectEl) {
    selectEl.value = savedLang;
  }

  // Chạy hàm kết nối bản dịch
  loadLanguage(savedLang);
});