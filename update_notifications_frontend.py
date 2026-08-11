import os
import re

html_path = 'notebook/templates/notebook/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the Notification Bell
old_bell = """<!-- Notifications -->
                <div class="relative">
                    <button class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition relative">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                        <span class="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">3</span>
                    </button>
                </div>"""
                
new_bell = """<!-- Notifications -->
                <div class="relative">
                    <button class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition relative">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                        <span id="notification-badge" class="hidden absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full items-center justify-center">0</span>
                    </button>
                </div>"""

content = content.replace(old_bell, new_bell)

# 2. Add Notification UI to Dashboard View
# Find where the Stat Cards end. Stat card 4 ends with:
#                     </div>
#                 </div>
#                 
#                 <!-- Search Results ... 
# We'll inject before Search Results or right after stat cards.
insert_target = """                    </div>
                </div>

                <!-- Empty State (Optional) -->"""

notification_ui = """                    </div>
                </div>

                <!-- 🚀 NỘI DUNG MỚI: HỆ THỐNG THÔNG BÁO & GỢI Ý HỌC TẬP -->
                <div class="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div class="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-slate-800 dark:text-white">Nhiệm vụ & Gợi ý hôm nay</h3>
                                <p class="text-xs text-slate-500">Hệ thống phân tích lịch sử học tập để đưa ra lời khuyên tốt nhất.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div id="notifications-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="col-span-full p-8 text-center text-slate-500 text-sm">
                            <svg class="animate-spin w-6 h-6 mx-auto mb-3 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Đang phân tích dữ liệu học tập...
                        </div>
                    </div>
                </div>
                <!-- KẾT THÚC THÔNG BÁO -->

                <!-- Empty State (Optional) -->"""

if "Nhiệm vụ & Gợi ý hôm nay" not in content:
    content = content.replace(insert_target, notification_ui)


# 3. Add JS function fetchNotifications
js_function = """        // Fetch Dashboard Notifications
        async function fetchNotifications() {
            try {
                const res = await fetchWithCsrf(`${API_URL}/dashboard/notifications/`);
                if (res.ok) {
                    const data = await res.json();
                    const container = document.getElementById('notifications-container');
                    const badge = document.getElementById('notification-badge');
                    
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
                        html += `
                            <div class="bg-${item.color}-50 dark:bg-${item.color}-500/10 border border-${item.color}-200 dark:border-${item.color}-500/20 rounded-xl p-4 flex items-start space-x-4 transition hover:shadow-sm">
                                <div class="text-2xl">${item.icon}</div>
                                <div>
                                    <h4 class="text-sm font-bold text-${item.color}-800 dark:text-${item.color}-300 mb-1">${item.title}</h4>
                                    <p class="text-xs text-${item.color}-600 dark:text-${item.color}-400/80 leading-relaxed">${item.message}</p>
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

if "fetchNotifications" not in content:
    # Inject it before window.onload or DOMContentLoaded
    inject_pos = content.find("        // Initialize Dashboard Data")
    if inject_pos != -1:
        content = content[:inject_pos] + js_function + "\n" + content[inject_pos:]

# Call fetchNotifications inside switchView('dashboard') or on load
init_dashboard = """        // Initialize Dashboard Data
        async function initDashboard() {
            await loadNotebooks();
            fetchNotifications();
        }"""
        
content = content.replace("        // Initialize Dashboard Data\n        async function initDashboard() {\n            await loadNotebooks();\n        }", init_dashboard)

# Also ensure it is called inside switchView when dashboard is selected
switch_view_old = """        function switchView(viewName) {
            activeView = viewName;"""
switch_view_new = """        function switchView(viewName) {
            activeView = viewName;
            
            if (viewName === 'dashboard') {
                fetchNotifications();
            }"""
if "fetchNotifications();" not in content.split("function switchView(viewName)")[1].split("}")[0]:
    content = content.replace(switch_view_old, switch_view_new)


with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html successfully.")
