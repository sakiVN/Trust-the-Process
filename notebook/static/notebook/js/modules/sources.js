        async function handleAddSource(e) {
            e.preventDefault();
            const title = document.getElementById('source-title').value.trim();
            const type = document.getElementById('source-type').value;
            
            const formData = new FormData();
            formData.append('title', title);
            formData.append('source_type', type);
            
            if (type === 'file') {
                const fileInput = document.getElementById('source-file');
                if (fileInput.files.length > 0) {
                    formData.append('file_path', fileInput.files[0]);
                } else {
                    return alert("Vui lòng chọn file PDF.");
                }
            } else if (type === 'link') {
                const url = document.getElementById('source-url').value.trim();
                formData.append('url', url);
                const content = document.getElementById('source-content').value.trim();
                formData.append('content', content);
            } else {
                const content = document.getElementById('source-content').value.trim();
                formData.append('content', content);
            }
            
            try {
                const res = await fetchWithCsrf(`${API_URL}/notebooks/${activeNotebookId}/sources/`, {
                    method: 'POST',
                    body: formData // Browser automatically generates boundary headers
                });
                
                if (res.ok) {
                    document.getElementById('source-title').value = '';
                    document.getElementById('source-content').value = '';
                    document.getElementById('source-url').value = '';
                    const fileInput = document.getElementById('source-file');
                    if (fileInput) fileInput.value = '';
                    
                    // Reset form select value
                    document.getElementById('source-type').value = 'text';
                    toggleSourceInputs();
                    
                    // Reload workspace and refresh lists
                    await selectNotebook(activeNotebookId, true);
                    await loadNotebooks();
                } else {
                    const data = await res.json();
                    alert("Lỗi: " + JSON.stringify(data));
                }
            } catch (err) {
                console.error("Lỗi khi thêm tài liệu liên quan:", err);
            }
        }

        function renderSources(sources) {
            const container = document.getElementById('sources-list');
            if (!container) return;
            
            if (sources.length === 0) {
                container.innerHTML = `<div class="col-span-full text-xs text-slate-400 text-center py-8">Chưa có tài liệu liên quan nào được lưu trong sổ tay này.</div>`;
                return;
            }
            container.innerHTML = sources.map(src => `
                <div class="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition">
                    <div class="space-y-2.5">
                        <div class="flex justify-between items-start gap-2">
                            <h4 class="font-bold text-slate-900 dark:text-white text-xs leading-snug">${escapeHtml(src.title)}</h4>
                            <div class="flex items-center space-x-1.5 shrink-0">
                                <span class="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md ${src.source_type === 'file' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : (src.source_type === 'link' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}">
                                    ${src.source_type === 'file' ? 'PDF' : (src.source_type === 'link' ? 'Liên kết' : 'Văn bản')}
                                </span>
                                <button onclick="deleteSource(${src.id})" class="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition" title="Xóa tài liệu">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        </div>
                        ${src.url ? `<a href="${src.url}" target="_blank" class="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline truncate block flex items-center space-x-1"><svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg><span class="truncate">${escapeHtml(src.url)}</span></a>` : ''}
                        ${src.file_path ? `<a href="${src.file_path}" target="_blank" class="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline truncate block flex items-center space-x-1"><svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><span>Xem tệp PDF đã tải</span></a>` : ''}
                        <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">${escapeHtml(src.content || 'Không có nội dung văn bản trích xuất.')}</p>
                    </div>

                    <!-- Fast AI Generation & Action Buttons -->
                    <div class="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2.5">
                        <button id="btn-src-quiz-${src.id}" onclick="generateQuizFromSource(${src.id})" class="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 border border-indigo-100 dark:border-indigo-900/40">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span>Tạo Quiz</span>
                        </button>
                        <button id="btn-src-flash-${src.id}" onclick="generateFlashcardsFromSource(${src.id})" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 border border-slate-200 dark:border-slate-700">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                            <span>Tạo Flashcards</span>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        async function generateQuizFromSource(sourceId) {
            const btn = document.getElementById(`btn-src-quiz-${sourceId}`);
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="text-xs">Đang tạo Quiz...</span>`;
            }

            try {
                const res = await fetchWithCsrf(`${API_URL}/sources/${sourceId}/generate_quiz/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: 'vi' })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Lỗi khi sinh Quiz');
                }
                const data = await res.json();
                await loadNotebooks();
                if (activeNotebookId) await selectNotebook(activeNotebookId, true);

                if (data.quiz_set && data.quiz_set.id) {
                    openQuizPlayModal(data.quiz_set.id);
                } else if (data.generation && data.generation.id) {
                    openQuizReviewModal(data.generation.id);
                }
            } catch (err) {
                console.error("Lỗi sinh quiz từ tài liệu:", err);
                alert("Không thể sinh quiz từ tài liệu này: " + err.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            }
        }

        async function generateFlashcardsFromSource(sourceId) {
            const btn = document.getElementById(`btn-src-flash-${sourceId}`);
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="text-xs">Đang tạo Flashcards...</span>`;
            }

            try {
                const res = await fetchWithCsrf(`${API_URL}/sources/${sourceId}/generate_flashcards/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: 'vi' })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Lỗi khi sinh Flashcards');
                }
                const data = await res.json();
                await loadNotebooks();
                if (activeNotebookId) await selectNotebook(activeNotebookId, true);

                if (data.generation && data.generation.id) {
                    openFlashcardReviewModal(data.generation.id);
                }
            } catch (err) {
                console.error("Lỗi sinh flashcard từ tài liệu:", err);
                alert("Không thể sinh flashcards từ tài liệu này: " + err.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            }
        }

        async function deleteSource(id) {
            if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác.")) return;
            
            try {
                const res = await fetchWithCsrf(`${API_URL}/sources/${id}/`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    alert("Đã xóa tài liệu liên quan thành công!");
                    // Refresh data
                    await loadNotebooks();
                    if (activeNotebookId) {
                        await selectNotebook(activeNotebookId, true);
                    }
                    if (activeView === 'documents') {
                        renderAllDocumentsView();
                    }
                } else {
                    alert("Không thể xóa tài liệu. Vui lòng thử lại.");
                }
            } catch (err) {
                console.error("Lỗi khi xóa tài liệu:", err);
            }
        }

        async function handleInlineSourceSubmit(e, category) {
            e.preventDefault();
            if (!activeNotebookId) {
                alert("Vui lòng chọn một sổ tay trước!");
                return;
            }
            
            const type = document.getElementById(`inline-source-type-${category}`).value;
            const title = document.getElementById(`inline-source-title-${category}`).value.trim();
            
            const formData = new FormData();
            formData.append('title', title);
            formData.append('source_type', type);
            formData.append('category', category);
            
            if (type === 'file') {
                const fileInput = document.getElementById(`inline-file-path-${category}`);
                if (fileInput.files.length > 0) {
                    formData.append('file_path', fileInput.files[0]);
                } else {
                    alert("Vui lòng chọn file PDF!");
                    return;
                }
            } else if (type === 'text') {
                formData.append('content', document.getElementById(`inline-content-${category}`).value);
            } else if (type === 'link') {
                formData.append('url', document.getElementById(`inline-url-${category}`).value);
            }
            
            try {
                const res = await fetchWithCsrf(`${API_URL}/notebooks/${activeNotebookId}/sources/`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    document.getElementById(`inline-source-form-${category}`).reset();
                    toggleInlineFields(category);
                    await selectNotebook(activeNotebookId, true);
                    await loadNotebooks();
                } else {
                    const err = await res.json();
                    alert("Lỗi khi thêm tài liệu: " + JSON.stringify(err));
                }
            } catch (err) {
                console.error("Lỗi:", err);
            }
        }

        function toggleSourceInputs() {
            const type = document.getElementById('source-type').value;
            const urlContainer = document.getElementById('source-url-container');
            const fileContainer = document.getElementById('source-file-container');
            const contentContainer = document.getElementById('source-content-container');
            const contentTextarea = document.getElementById('source-content');
            
            urlContainer.classList.toggle('hidden', type !== 'link');
            fileContainer.classList.toggle('hidden', type !== 'file');
            contentContainer.classList.toggle('hidden', type === 'file');
            
            // Toggle required attributes dynamically
            if (type === 'file') {
                contentTextarea.removeAttribute('required');
                document.getElementById('source-file').setAttribute('required', 'required');
            } else {
                contentTextarea.setAttribute('required', 'required');
                document.getElementById('source-file').removeAttribute('required');
            }
        }

        function toggleInlineFields(cat) {
            const type = document.getElementById(`inline-source-type-${cat}`).value;
            const fileDiv = document.getElementById(`inline-field-file-${cat}`);
            const textDiv = document.getElementById(`inline-field-text-${cat}`);
            const linkDiv = document.getElementById(`inline-field-link-${cat}`);
            
            const fileInput = document.getElementById(`inline-file-path-${cat}`);
            const textInput = document.getElementById(`inline-content-${cat}`);
            const urlInput = document.getElementById(`inline-url-${cat}`);
            
            fileDiv.classList.add('hidden');
            textDiv.classList.add('hidden');
            linkDiv.classList.add('hidden');
            
            fileInput.required = false;
            textInput.required = false;
            urlInput.required = false;
            
            if (type === 'file') {
                fileDiv.classList.remove('hidden');
                fileInput.required = true;
            } else if (type === 'text') {
                textDiv.classList.remove('hidden');
                textInput.required = true;
            } else if (type === 'link') {
                linkDiv.classList.remove('hidden');
                urlInput.required = true;
            }
        }

        function switchTab(tab) {
            activeTab = tab;
            
            // Toggle classes on buttons
            ['sources', 'notes', 'ai-gen'].forEach(t => {
                const btn = document.getElementById(`tab-btn-${t}`);
                if (btn) {
                    if (t === tab) {
                        btn.className = "flex-1 py-2 text-center text-xs font-semibold rounded-lg transition bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 flex items-center justify-center space-x-2";
                    } else {
                        btn.className = "flex-1 py-2 text-center text-xs font-semibold rounded-lg transition text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white flex items-center justify-center space-x-2";
                    }
                }
                const content = document.getElementById(`tab-content-${t}`);
                if (content) {
                    content.classList.toggle('hidden', t !== tab);
                }
            });
        }

