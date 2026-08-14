        function renderNotes(notes) {
            const container = document.getElementById('notes-list');
            if (!container) return;
            
            if (notes.length === 0) {
                container.innerHTML = `<div class="text-xs text-slate-400 text-center py-8">Chưa có chủ đề thảo luận nào. Hãy bắt đầu khởi tạo phía trên.</div>`;
                return;
            }
            
            container.innerHTML = notes.map(note => {
                if (note.is_locked) {
                    return `
                        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                            <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                                <h4 class="font-bold text-slate-800 dark:text-white text-sm">Chủ đề: ${note.title}</h4>
                                <span class="bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center">🔒 ĐANG KHÓA (Gửi ý kiến để mở khóa AI)</span>
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Viết suy nghĩ của bạn (Yêu cầu ít nhất 20 ký tự để AI đưa ra lập luận phản biện)</label>
                                <textarea id="initial-input-${note.id}" rows="4" placeholder="Nhập ý kiến cá nhân của bạn về chủ đề này..." class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"></textarea>
                            </div>
                            <div class="flex justify-end">
                                <button onclick="unlockNote(${note.id})" class="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition">
                                    Gửi ý kiến & Mở khóa Phân tích Logic
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
                            <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                                <h4 class="font-bold text-slate-800 dark:text-white text-sm">Chủ đề: ${note.title}</h4>
                                <span class="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full">🔓 ĐÃ MỞ KHÓA PHẢN BIỆN AI</span>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div class="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                    <h5 class="text-[10px] font-bold text-slate-400 uppercase mb-2">Ý kiến ban đầu của bạn</h5>
                                    <p class="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">${note.initial_content}</p>
                                </div>
                                <div class="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl p-4 border border-indigo-100/50 dark:border-indigo-900/30">
                                    <h5 class="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase mb-2">Luận điểm phản biện của AI</h5>
                                    <p class="text-xs text-slate-800 dark:text-slate-300 whitespace-pre-wrap font-medium">${note.ai_rebuttal}</p>
                                </div>
                            </div>
                            
                            <div class="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                                <h5 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cải tiến bài thảo luận (Ghi chú sửa đổi)</h5>
                                <p class="text-[10px] text-slate-400">Hãy tổng hợp lại kiến thức sau khi đọc phản biện AI và bổ sung ý kiến cuối cùng của bạn tại đây.</p>
                                <textarea id="revise-input-${note.id}" rows="3" placeholder="Đưa ra lập luận sửa đổi của bạn..." class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition">${note.revised_content || ''}</textarea>
                                <div class="flex justify-end">
                                    <button onclick="saveRevision(${note.id})" class="bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition">
                                        Lưu ý kiến cải tiến
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }).join('');
        }

        async function unlockNote(noteId) {
            const content = document.getElementById(`initial-input-${noteId}`).value.trim();
            if (content.length < 20) {
                return alert("Vui lòng ghi suy nghĩ dài ít nhất 20 ký tự để AI bắt đầu phản biện.");
            }
            const lang = localStorage.getItem('user_language') || 'vi';
            try {
                const res = await fetchWithCsrf(`${API_URL}/notes/${noteId}/unlock/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        initial_content: content,
                        language: lang
                    })
                });
                
                if (res.ok) {
                    await selectNotebook(activeNotebookId, true);
                    await loadNotebooks();
                } else {
                    const data = await res.json();
                    alert("Lỗi mở khóa: " + (data.error || JSON.stringify(data)));
                }
            } catch (err) {
                console.error("Lỗi khi mở khóa phản biện:", err);
            }
        }

        async function saveRevision(noteId) {
            const content = document.getElementById(`revise-input-${noteId}`).value.trim();
            if (!content) return alert("Vui lòng nhập nội dung trước khi lưu.");
            
            try {
                const res = await fetchWithCsrf(`${API_URL}/notes/${noteId}/revise/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ revised_content: content })
                });
                
                if (res.ok) {
                    alert("Đã lưu ý kiến cải tiến thành công!");
                    await selectNotebook(activeNotebookId, true);
                    await loadNotebooks();
                } else {
                    const data = await res.json();
                    alert("Lỗi khi lưu sửa đổi: " + JSON.stringify(data));
                }
            } catch (err) {
                console.error("Lỗi khi kết nối lưu ý kiến cải tiến:", err);
            }
        }

