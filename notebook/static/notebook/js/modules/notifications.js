async function fetchNotifications() {
    try {
        const lang = localStorage.getItem('user_language') || 'vi';
        const res = await fetchWithCsrf(`${API_URL}/dashboard/notifications/?lang=${lang}`);
        if (res.ok) {
            const data = await res.json();
            const container = document.getElementById('notifications-container');
            const badge = document.getElementById('notification-badge');
            if (!container) return;
            
            if (data.length > 0) {
                if (badge) {
                    badge.classList.remove('hidden');
                    badge.classList.add('flex');
                    badge.innerText = data.length;
                }
            } else {
                if (badge) {
                    badge.classList.add('hidden');
                    badge.classList.remove('flex');
                }
            }
            
            if (data.length === 0) {
                const emptyMsg = lang === 'en' 
                    ? 'You have no urgent tasks today. Feel free to create new study materials!'
                    : (lang === 'jp' ? '本日の緊急タスクはありません。新しい教材を自由に作成しましょう！' : 'Hôm nay bạn không có nhiệm vụ khẩn cấp nào. Hãy thoải mái tạo tài liệu mới nhé!');
                container.innerHTML = `<div class="col-span-full p-6 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">${emptyMsg}</div>`;
                return;
            }
            
            let html = '';
            data.forEach(item => {
                const classes = getColorClasses(item.color);
                html += `
                    <div class="${classes.bg} ${classes.border} rounded-xl p-3 flex items-start space-x-3 transition hover:shadow-sm">
                        <div class="text-xl shrink-0 mt-0.5">${item.icon}</div>
                        <div>
                            <h4 class="text-xs font-bold ${classes.title} mb-0.5">${item.title}</h4>
                            <p class="text-[11px] ${classes.text} leading-relaxed">${item.message}</p>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    } catch (err) {
        console.error("Lỗi khi tải thông báo:", err);
    }
}
