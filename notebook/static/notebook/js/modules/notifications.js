        async function fetchNotifications() {
            try {
                const res = await fetchWithCsrf(`${API_URL}/dashboard/notifications/`);
                if (res.ok) {
                    const data = await res.json();
                    const container = document.getElementById('notifications-container');
                    const badge = document.getElementById('notification-badge');
                    if (!container) return;
                    
                    if (data.length > 0) {
                        badge.classList.remove('hidden');
                        badge.classList.add('flex');
                        badge.innerText = data.length;
                    } else {
                        badge.classList.add('hidden');
                        badge.classList.remove('flex');
                    }
                    
                    if (data.length === 0) {
                        container.innerHTML = `<div class="col-span-full p-6 text-center text-slate-500 text-sm bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">Hôm nay bạn không có nhiệm vụ khẩn cấp nào. Hãy thoải mái tạo tài liệu mới nhé!</div>`;
                        return;
                    }
                    
                    let html = '';
                    data.forEach(item => {
                        const classes = getColorClasses(item.color);
                        html += `
                            <div class="${classes.bg} ${classes.border} rounded-xl p-4 flex items-start space-x-4 transition hover:shadow-sm">
                                <div class="text-2xl">${item.icon}</div>
                                <div>
                                    <h4 class="text-sm font-bold ${classes.title} mb-1">${item.title}</h4>
                                    <p class="text-xs ${classes.text} leading-relaxed">${item.message}</p>
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

