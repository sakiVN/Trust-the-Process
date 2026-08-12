import os

html_path = 'notebook/templates/notebook/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The missing functions
functions_js = """
        function getColorClasses(color) {
            const maps = {
                'indigo': { bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20', title: 'text-indigo-800 dark:text-indigo-300', text: 'text-indigo-600 dark:text-indigo-400/80' },
                'rose': { bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20', title: 'text-rose-800 dark:text-rose-300', text: 'text-rose-600 dark:text-rose-400/80' },
                'emerald': { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', title: 'text-emerald-800 dark:text-emerald-300', text: 'text-emerald-600 dark:text-emerald-400/80' },
                'orange': { bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20', title: 'text-orange-800 dark:text-orange-300', text: 'text-orange-600 dark:text-orange-400/80' },
                'amber': { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', title: 'text-amber-800 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400/80' },
                'slate': { bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20', title: 'text-slate-800 dark:text-slate-300', text: 'text-slate-600 dark:text-slate-400/80' },
            };
            return maps[color] || maps['slate'];
        }

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
"""

if "async function fetchNotifications" not in content:
    # Inject it before the last </script>
    last_script = content.rfind("</script>")
    if last_script != -1:
        content = content[:last_script] + functions_js + "\n    " + content[last_script:]
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Injected missing functions successfully.")
    else:
        print("Could not find </script> tag.")
else:
    print("Functions already exist.")

