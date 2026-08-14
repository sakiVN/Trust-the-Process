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
                container.innerHTML = `<div class="col-span-full text-xs text-slate-400 text-center py-8">Chưa có tài liệu liên quan nào được lưu.</div>`;
                return;
            }
            container.innerHTML = sources.map(src => `
                <div class="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-4 flex flex-col justify-between space-y-2">
                    <div class="flex justify-between items-start">
                        <span class="font-bold text-slate-800 dark:text-slate-200 text-xs">${src.title}</span>
                        <div class="flex items-center space-x-1.5 shrink-0">
                            <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${src.source_type === 'file' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : (src.source_type === 'link' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300')}">
                                ${src.source_type === 'file' ? 'File PDF' : (src.source_type === 'link' ? 'Link' : 'Văn bản')}
                            </span>
                            <button onclick="deleteSource(${src.id})" class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition" title="Xóa tài liệu">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </div>
                    ${src.url ? `<a href="${src.url}" target="_blank" class="text-[10px] text-brand-500 hover:underline truncate block">${src.url}</a>` : ''}
                    ${src.file_path ? `<a href="${src.file_path}" target="_blank" class="text-[10px] text-brand-500 hover:underline truncate block flex items-center space-x-1"><span>📄 Tải xuống file PDF</span></a>` : ''}
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">${src.content}</p>
                </div>
            `).join('');
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

