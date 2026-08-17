        async function loadNotebooks() {
            // Render table skeletons while loading
            renderTableSkeleton();
            
            try {
                const res = await fetch(`${API_URL}/notebooks/`);
                notebooks = await res.json();
                
                // Update stats and lists
                updateDashboardStats();
                if (typeof updateProgressViewStats === 'function') updateProgressViewStats();
                renderNotebooksList();
                populateNotebookSelectors();
                renderRecentActivityTable();
                
                // Auto render charts
                setTimeout(renderCharts, 100);
            } catch (err) {
                console.error("Lỗi khi tải dữ liệu Sổ tay:", err);
            }
        }

        async function selectNotebook(id, keepCurrentTab = false) {
            activeNotebookId = id;
            renderNotebooksList();
            
            const t = window.t || ((k, f) => f);

            try {
                const res = await fetch(`${API_URL}/notebooks/${id}/`);
                const notebook = await res.json();
                
                document.getElementById('active-notebook-name').innerText = notebook.name;
                document.getElementById('active-notebook-desc').innerText = notebook.description || t('key_29', 'Không có mục tiêu học tập.');
                
                document.getElementById('notebook-workspace').classList.remove('hidden');
                document.getElementById('notebook-actions').classList.remove('hidden');
                
                // Render tabs content
                renderSources(notebook.sources || []);
                renderNotes(notebook.notes || []);
                renderAIGenerations(notebook.generations || [], notebook.quizzes || []);
                renderQuizSets(notebook.quizzes || []);
                populateNotebookSelectors();
                
                // Render category sources
                const categories = ['quiz', 'flashcards', 'mind_map', 'report'];
                categories.forEach(cat => {
                    const catSources = (notebook.sources || []).filter(s => s.category === cat);
                    const catContainer = document.getElementById(`sources-list-${cat}`);
                    if (catContainer) {
                        if (catSources.length === 0) {
                            catContainer.innerHTML = `<div class="text-[10px] text-slate-400 italic py-1">${t('key_25', 'Chưa có tài liệu liên quan cho phần này.')}</div>`;
                        } else {
                            catContainer.innerHTML = catSources.map(src => {
                                let badge = '';
                                if (src.source_type === 'file') badge = `📁 ${t('key_tag_pdf', 'PDF')}`;
                                else if (src.source_type === 'link') badge = `🔗 ${t('key_tag_link', 'Link')}`;
                                else badge = `✏️ ${t('key_tag_text', 'Text')}`;
                                
                                return `
                                <div class="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 p-2.5 rounded-xl text-[10px] text-slate-700 dark:text-slate-350">
                                    <div class="flex items-center space-x-2 truncate">
                                        <span class="font-bold text-slate-400 uppercase shrink-0">${badge}</span>
                                        <span class="font-semibold truncate" title="${src.title}">${src.title}</span>
                                    </div>
                                    <button onclick="deleteSource(${src.id})" class="text-rose-500 hover:text-rose-700 font-bold shrink-0 ml-2" title="${t('key_btn_delete', 'Xóa tài liệu')}">${t('key_btn_delete', 'Xóa')}</button>
                                </div>
                                `;
                            }).join('');
                        }
                    }
                });

                if (keepCurrentTab) {
                    switchTab(activeTab);
                } else {
                    switchTab('sources');
                }
            } catch (err) {
                console.error("Lỗi khi tải chi tiết Sổ tay:", err);
            }
        }

        async function handleCreateNotebook() {
            const name = document.getElementById('new-notebook-name').value.trim();
            const desc = document.getElementById('new-notebook-desc').value.trim();
            if (!name) return alert("Vui lòng nhập tên Sổ tay.");
            
            try {
                const res = await fetchWithCsrf(`${API_URL}/notebooks/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description: desc })
                });
                
                if (!res.ok) {
                    const errorData = await res.json();
                    console.error("Lỗi từ server:", errorData);
                    alert(`Lỗi tạo Sổ tay: ${errorData.detail || 'Vui lòng thử lại'}`);
                    return;
                }
                
                const newNb = await res.json();
                closeNewNotebookModal();
                await loadNotebooks();
                
                // Go to notebooks view and select the newly created one
                switchView('notebooks');
                selectNotebook(newNb.id);
            } catch (err) {
                console.error("Lỗi tạo Sổ tay:", err);
                alert("Có lỗi xảy ra khi tạo sổ tay. Vui lòng thử lại.");
            }
        }

        async function deleteActiveNotebook() {
            if (!activeNotebookId) return;
            const t = window.t || ((k, f) => f);
            const confirmed = await showConfirmModal({
                title: t('key_confirm_delete_title', "Xác nhận xóa sổ tay"),
                message: t('key_confirm_delete_nb', "Bạn có chắc chắn muốn xóa SỔ TAY này? Toàn bộ tài liệu, ghi chú và các câu hỏi AI đi kèm sẽ bị xóa vĩnh viễn và không thể khôi phục."),
                confirmText: t('key_btn_delete', "Xóa vĩnh viễn"),
                cancelText: t('key_cancel', "Hủy"),
                isDanger: true
            });
            if (!confirmed) return;
            
            try {
                const res = await fetchWithCsrf(`${API_URL}/notebooks/${activeNotebookId}/`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    showToastNotification(t('key_alert_deleted_nb', "Đã xóa Sổ tay thành công!"), 'success');
                    activeNotebookId = null;
                    
                    // Hide workspace
                    document.getElementById('notebook-workspace').classList.add('hidden');
                    document.getElementById('notebook-actions').classList.add('hidden');
                    document.getElementById('active-notebook-name').innerText = t('key_28', "Chọn một sổ tay từ danh sách để bắt đầu học tập");
                    document.getElementById('active-notebook-desc').innerText = t('key_29', "Mẹo: Bạn có thể thêm các tài liệu tham khảo (PDF, trang web) rồi gửi phản biện để AI chấm điểm.");
                    
                    // Refresh
                    await loadNotebooks();
                    switchView('notebooks');
                } else {
                    showToastNotification("Không thể xóa Sổ tay. Vui lòng thử lại.", 'error');
                }
            } catch (err) {
                console.error("Lỗi khi xóa Sổ tay:", err);
                showToastNotification("Không thể xóa Sổ tay. Vui lòng thử lại.", 'error');
            }
        }

        function openNewNotebookModal() {
            const modal = document.getElementById('new-notebook-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeNewNotebookModal() {
            const modal = document.getElementById('new-notebook-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('new-notebook-name').value = '';
            document.getElementById('new-notebook-desc').value = '';
        }

        function renderNotebooksList() {
            const container = document.getElementById('notebooks-list');
            if (!container) return;
            
            const t = window.t || ((k, f) => f);

            if (notebooks.length === 0) {
                container.innerHTML = `<div class="text-xs text-slate-400 py-6 text-center">${t('key_26', 'Không có sổ tay nào. Hãy tạo mới.')}</div>`;
                return;
            }
            container.innerHTML = notebooks.map(nb => `
                <button onclick="selectNotebook(${nb.id})" class="w-full text-left px-4 py-3 rounded-xl transition text-sm ${nb.id === activeNotebookId ? 'bg-brand-600 text-white font-medium shadow-md shadow-brand-100 dark:shadow-none' : 'hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300' }">
                    <div class="flex items-center justify-between gap-3">
                        <span class="truncate block font-semibold">${nb.name}</span>
                        <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">${t('key_btn_view_notebook', 'Sổ tay')}</span>
                    </div>
                    <span class="truncate text-[10px] ${nb.id === activeNotebookId ? 'text-brand-100' : 'text-slate-400'}">${nb.description || t('key_113', 'Không mô tả')}</span>
                </button>
            `).join('');
        }

        function populateNotebookSelectors() {
            const selects = ['tool-notebook-select', 'quiz-builder-notebook', 'quick-upload-notebook'];
            const t = window.t || ((k, f) => f);
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (!select) return;
                const currentValue = select.value;
                const unlinkedText = t('key_103', 'Không liên kết');
                select.innerHTML = `<option value="">${unlinkedText}</option>` + notebooks.map(nb => `
                    <option value="${nb.id}" ${String(nb.id) === String(currentValue) ? 'selected' : ''}>${nb.name}</option>
                `).join('');
                if (activeNotebookId && selectId === 'quiz-builder-notebook') {
                    select.value = String(activeNotebookId);
                }
            });
        }
