// ============================================================================
// CONTEXTUAL AI, DOCUMENT READER, REPORT VIEWER & MINDMAP VIEWER MODULE
// ============================================================================

// Global contextual state
window.currentContextualNotebookId = null;
window.currentViewingMindmapId = null;
window.currentViewingReportId = null;
let selectedTextForAI = '';

// ----------------------------------------------------------------------------
// 1. CONTEXTUAL AI TOOLBAR ON TEXT SELECTION
// ----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const toolbar = document.getElementById('contextual-ai-toolbar');

    document.addEventListener('mouseup', function(e) {
        if (!toolbar) return;
        // Prevent hiding if clicking on the toolbar itself
        if (toolbar.contains(e.target)) return;
        
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : '';
        
        if (text.length > 1) {
            selectedTextForAI = text;
            try {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                // Position toolbar above the selection
                const top = rect.top + window.scrollY - 48;
                const left = rect.left + window.scrollX + (rect.width / 2) - 120;
                
                toolbar.style.top = `${top > 0 ? top : 10}px`;
                toolbar.style.left = `${left > 0 ? left : 10}px`;
                toolbar.classList.remove('hidden');
            } catch (err) {
                toolbar.classList.add('hidden');
            }
        } else {
            toolbar.classList.add('hidden');
            selectedTextForAI = '';
        }
    });

    document.addEventListener('mousedown', function(e) {
        if (!toolbar) return;
        const resultModal = document.getElementById('contextual-result-modal');
        if (!toolbar.contains(e.target) && (!resultModal || !resultModal.contains(e.target))) {
            toolbar.classList.add('hidden');
        }
    });
});

async function triggerContextAction(action) {
    const toolbar = document.getElementById('contextual-ai-toolbar');
    if (toolbar) toolbar.classList.add('hidden');
    if (!selectedTextForAI) return;
    
    const modal = document.getElementById('contextual-result-modal');
    const titleEl = document.getElementById('contextual-result-title');
    const iconEl = document.getElementById('contextual-result-icon');
    const contentEl = document.getElementById('contextual-result-content');
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    
    const t = window.t || ((k, f) => f);
    const lang = localStorage.getItem('user_language') || 'vi';

    const actionTitles = {
        'explain': { title: t('key_ai_explain_title', 'Giải thích thuật ngữ / khái niệm'), icon: '💡' },
        'translate': { title: t('key_ai_translate_title', 'Bản dịch đa ngữ'), icon: '🌐' },
        'flashcard': { title: t('key_ai_flashcard_title', 'Trích xuất & Lưu Flashcard'), icon: '🔖' }
    };
    
    if (titleEl) titleEl.innerText = (actionTitles[action] || {}).title || t('key_ai_result_title', 'Kết quả AI');
    if (iconEl) iconEl.innerText = (actionTitles[action] || {}).icon || '✨';
    if (contentEl) {
        contentEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-6 space-y-3">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                <p class="text-xs text-slate-500">${t('key_ai_analyzing', 'Hệ thống AI đang phân tích dữ liệu...')}</p>
            </div>
        `;
    }
    
    try {
        const response = await fetchWithCsrf('/api/ai/context_action/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: selectedTextForAI,
                action: action,
                notebook_id: window.currentContextualNotebookId || activeNotebookId || null,
                language: lang
            })
        });
        
        const data = await response.json();
        if (contentEl) {
            if (data.result) {
                let extraNotice = '';
                if (data.saved_to_notebook) {
                    extraNotice = lang === 'en' ? '\n\n✅ Automatically saved to Notebook Flashcards!' : (lang === 'jp' ? '\n\n✅ ノートブックの単語カードに自動保存しました！' : '\n\n✅ Đã tự động lưu thẻ này vào Flashcards của Sổ tay!');
                    if (typeof loadNotebooks === 'function') loadNotebooks();
                }
                contentEl.innerText = data.result + extraNotice;
            } else {
                contentEl.innerText = data.error || 'Error: No result received from system.';
            }
        }
    } catch (e) {
        console.error("Contextual AI Error:", e);
        if (contentEl) contentEl.innerText = 'Đã có lỗi xảy ra khi kết nối tới dịch vụ AI.';
    }
}

function closeContextualModal() {
    const modal = document.getElementById('contextual-result-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    try {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    } catch (e) {}
    selectedTextForAI = '';
}

// ----------------------------------------------------------------------------
// 2. DOCUMENT READER MODAL
// ----------------------------------------------------------------------------

function openDocumentModal(sourceId) {
    let targetSource = null;
    let targetNotebookName = "Không xác định";
    let targetNotebookId = null;

    for (const nb of notebooks) {
        const src = (nb.sources || []).find(s => s.id === sourceId);
        if (src) {
            targetSource = src;
            targetNotebookName = nb.name;
            targetNotebookId = nb.id;
            break;
        }
    }
    if (!targetSource) {
        alert("Không tìm thấy thông tin tài liệu!");
        return;
    }
    
    window.currentContextualNotebookId = targetNotebookId;
    
    const modal = document.getElementById('document-read-modal');
    const titleEl = document.getElementById('document-read-title');
    const notebookEl = document.getElementById('document-read-notebook');
    const contentEl = document.getElementById('document-read-content');
    
    if (titleEl) titleEl.innerText = targetSource.title || "Tài liệu học tập";
    if (notebookEl) notebookEl.innerText = "Thuộc Sổ tay: " + targetNotebookName;
    
    if (contentEl) {
        if (targetSource.source_type === 'file') {
            contentEl.innerHTML = `
                <div class="flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div class="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl">
                        <svg class="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-slate-200 text-base">Tài liệu định dạng PDF</h4>
                        <p class="text-xs text-slate-500 mt-1 mb-5">Tài liệu đã được tải lên máy chủ. Bạn có thể mở trực tiếp hoặc tải về máy.</p>
                        <div class="flex flex-wrap items-center justify-center gap-3">
                            <a href="${targetSource.file_path}" target="_blank" class="inline-flex items-center space-x-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-md shadow-brand-100 dark:shadow-none">
                                <span>📄</span>
                                <span>Mở / Tải xuống tệp PDF</span>
                            </a>
                        </div>
                    </div>
                    ${targetSource.content ? `
                    <div class="w-full mt-6 text-left border-t border-slate-100 dark:border-slate-800 pt-6">
                        <h5 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nội dung văn bản trích xuất từ PDF (Hỗ trợ bôi đen tra cứu AI):</h5>
                        <div class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 select-text whitespace-pre-wrap max-h-72 overflow-y-auto">${escapeHtml(targetSource.content)}</div>
                    </div>` : ''}
                </div>`;
        } else if (targetSource.source_type === 'link') {
            const url = targetSource.url || targetSource.content;
            contentEl.innerHTML = `
                <div class="flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div class="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-2xl">
                        <svg class="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 dark:text-slate-200 text-base">Liên kết Trang Web</h4>
                        <p class="text-xs text-slate-500 mt-1 mb-5">Tài liệu tham khảo được lưu từ một địa chỉ web trực tuyến.</p>
                        <a href="${url}" target="_blank" class="inline-flex items-center space-x-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-md shadow-brand-100 dark:shadow-none">
                            <span>🔗</span>
                            <span>Truy cập trang web gốc</span>
                        </a>
                    </div>
                    ${targetSource.content && targetSource.content !== url ? `
                    <div class="w-full mt-6 text-left border-t border-slate-100 dark:border-slate-800 pt-6">
                        <h5 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nội dung ghi chú kèm theo (Hỗ trợ bôi đen tra cứu AI):</h5>
                        <div class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 select-text whitespace-pre-wrap max-h-72 overflow-y-auto">${escapeHtml(targetSource.content)}</div>
                    </div>` : ''}
                </div>`;
        } else {
            contentEl.innerHTML = `
                <div class="space-y-3 p-2">
                    <div class="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span>💡 <em>Mẹo: Bạn có thể bôi đen bất kỳ đoạn văn bản nào bên dưới để mở thanh công cụ AI (Giải thích, Dịch, Lưu Flashcard).</em></span>
                    </div>
                    <div class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed p-2 font-sans select-text whitespace-pre-wrap">
                        ${escapeHtml(targetSource.content || 'Tài liệu không có nội dung văn bản.')}
                    </div>
                </div>`;
        }
    }
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeDocumentModal() {
    window.currentContextualNotebookId = null;
    const modal = document.getElementById('document-read-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// ----------------------------------------------------------------------------
// 3. QUICK UPLOAD MODAL (FROM ALL DOCUMENTS VIEW)
// ----------------------------------------------------------------------------

function openQuickUploadModal() {
    const modal = document.getElementById('quick-upload-source-modal');
    const select = document.getElementById('quick-upload-notebook');
    
    if (select) {
        if (!notebooks || notebooks.length === 0) {
            select.innerHTML = '<option value="">Chưa có sổ tay nào - Hệ thống sẽ tạo sổ tay mặc định</option>';
        } else {
            select.innerHTML = notebooks.map(nb => `
                <option value="${nb.id}" ${nb.id === activeNotebookId ? 'selected' : ''}>${escapeHtml(nb.name)}</option>
            `).join('');
        }
    }
    
    const form = document.getElementById('quick-upload-form');
    if (form) form.reset();
    toggleQuickUploadInputs();
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeQuickUploadModal() {
    const modal = document.getElementById('quick-upload-source-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function toggleQuickUploadInputs() {
    const typeSelect = document.getElementById('quick-upload-type');
    if (!typeSelect) return;
    const type = typeSelect.value;
    
    const urlContainer = document.getElementById('quick-upload-url-container');
    const fileContainer = document.getElementById('quick-upload-file-container');
    const contentContainer = document.getElementById('quick-upload-content-container');
    const contentTextarea = document.getElementById('quick-upload-content');
    const fileInput = document.getElementById('quick-upload-file');
    
    if (urlContainer) urlContainer.classList.toggle('hidden', type !== 'link');
    if (fileContainer) fileContainer.classList.toggle('hidden', type !== 'file');
    if (contentContainer) contentContainer.classList.toggle('hidden', type === 'file');
    
    if (type === 'file') {
        if (contentTextarea) contentTextarea.removeAttribute('required');
        if (fileInput) fileInput.setAttribute('required', 'required');
    } else {
        if (contentTextarea) contentTextarea.setAttribute('required', 'required');
        if (fileInput) fileInput.removeAttribute('required');
    }
}

async function handleQuickUploadSource(e) {
    e.preventDefault();
    let targetNotebookId = document.getElementById('quick-upload-notebook').value;
    const title = document.getElementById('quick-upload-title').value.trim();
    const type = document.getElementById('quick-upload-type').value;
    
    if (!title) return alert("Vui lòng nhập tên tài liệu.");

    // If no notebook, create one
    if (!targetNotebookId) {
        try {
            const nbRes = await fetchWithCsrf(`${API_URL}/notebooks/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: "Sổ tay học tập", description: "Tự động tạo để lưu tài liệu" })
            });
            const newNb = await nbRes.json();
            targetNotebookId = newNb.id;
        } catch (err) {
            return alert("Lỗi khi khởi tạo Sổ tay!");
        }
    }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('source_type', type);
    
    if (type === 'file') {
        const fileInput = document.getElementById('quick-upload-file');
        if (fileInput && fileInput.files.length > 0) {
            formData.append('file_path', fileInput.files[0]);
        } else {
            return alert("Vui lòng chọn tệp PDF.");
        }
    } else if (type === 'link') {
        const url = document.getElementById('quick-upload-url').value.trim();
        formData.append('url', url);
        const content = document.getElementById('quick-upload-content').value.trim();
        formData.append('content', content || url);
    } else {
        const content = document.getElementById('quick-upload-content').value.trim();
        formData.append('content', content);
    }
    
    try {
        const res = await fetchWithCsrf(`${API_URL}/notebooks/${targetNotebookId}/sources/`, {
            method: 'POST',
            body: formData
        });
        
        if (res.ok) {
            closeQuickUploadModal();
            showToastNotification("Tải lên tài liệu thành công!");
            await loadNotebooks();
            if (activeView === 'documents' && typeof renderAllDocumentsView === 'function') {
                renderAllDocumentsView();
            }
        } else {
            const err = await res.json();
            alert("Lỗi tải lên: " + JSON.stringify(err));
        }
    } catch (err) {
        console.error("Quick upload error:", err);
        alert("Có lỗi xảy ra khi lưu tài liệu.");
    }
}

// ----------------------------------------------------------------------------
// 4. REPORT REVIEW MODAL
// ----------------------------------------------------------------------------

async function openReportReviewModal(reportId) {
    if (!reportId) return;
    window.currentViewingReportId = reportId;
    
    const modal = document.getElementById('report-review-modal');
    const contentEl = document.getElementById('report-review-content');
    const titleEl = document.getElementById('report-review-title');
    
    if (contentEl) contentEl.innerHTML = '<div class="text-center py-10 text-xs text-slate-500">Đang tải báo cáo...</div>';
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    
    try {
        let reportObj = null;
        for (const nb of notebooks) {
            const gen = (nb.generations || []).find(g => g.id === reportId && g.generation_type === 'report');
            if (gen) {
                reportObj = { ...gen, notebookName: nb.name };
                break;
            }
        }
        
        if (!reportObj) {
            const res = await fetch(`${API_URL}/generations/${reportId}/`);
            if (res.ok) reportObj = await res.json();
        }
        
        if (!reportObj) throw new Error("Không tìm thấy báo cáo");
        
        if (titleEl) titleEl.innerText = "Báo cáo tóm tắt học thuật";
        
        // Render content (it might be pre-rendered HTML or plain text)
        let rawContent = reportObj.content || '';
        let renderedHtml = '';
        
        if (rawContent.includes('<div') || rawContent.includes('<p>') || rawContent.includes('class=')) {
            // Unescape if needed
            renderedHtml = rawContent;
        } else {
            renderedHtml = `
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                    <h4 class="text-sm font-bold text-brand-600 dark:text-brand-400 border-b border-slate-100 dark:border-slate-800 pb-3">
                        ${escapeHtml(reportObj.title || 'BÁO CÁO TỔNG HỢP KIẾN THỨC')}
                    </h4>
                    <div class="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        ${escapeHtml(rawContent)}
                    </div>
                </div>
            `;
        }
        
        if (contentEl) contentEl.innerHTML = renderedHtml;
    } catch (err) {
        console.error("Open report review error:", err);
        if (contentEl) contentEl.innerHTML = '<div class="text-center py-10 text-xs text-rose-500">Không thể tải nội dung báo cáo. Vui lòng thử lại.</div>';
    }
}

function closeReportReviewModal() {
    window.currentViewingReportId = null;
    const modal = document.getElementById('report-review-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function copyReportReviewContent() {
    const contentEl = document.getElementById('report-review-content');
    if (!contentEl) return;
    navigator.clipboard.writeText(contentEl.innerText).then(() => {
        showToastNotification("Đã sao chép nội dung báo cáo!");
    }).catch(err => {
        alert("Không thể sao chép văn bản.");
    });
}

// ----------------------------------------------------------------------------
// 5. MINDMAP REVIEW MODAL
// ----------------------------------------------------------------------------

async function openMindmapReviewModal(mindmapId) {
    if (!mindmapId) return;
    window.currentViewingMindmapId = mindmapId;
    
    const modal = document.getElementById('mindmap-review-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    
    try {
        let mindmapObj = null;
        for (const nb of notebooks) {
            const gen = (nb.generations || []).find(g => g.id === mindmapId && g.generation_type === 'mind_map');
            if (gen) {
                mindmapObj = { ...gen, notebookName: nb.name };
                break;
            }
        }
        
        if (!mindmapObj) {
            const res = await fetch(`${API_URL}/generations/${mindmapId}/`);
            if (res.ok) mindmapObj = await res.json();
        }
        
        if (!mindmapObj) throw new Error("Không tìm thấy sơ đồ tư duy");
        
        let rawCode = (mindmapObj.content || '').trim();
        if (rawCode.startsWith("```")) {
            rawCode = rawCode.replace(/^```(?:mermaid)?/, "").replace(/```$/, "").trim();
        }
        
        let treeData = null;
        try {
            // Check if stored as json object
            const parsed = JSON.parse(rawCode);
            if (parsed && (parsed.format || parsed.data)) {
                treeData = parsed;
            }
        } catch (e) {
            // Not json, parse from mermaid text
        }
        
        if (!treeData) {
            if (typeof parseMermaidToJsMind === 'function') {
                treeData = parseMermaidToJsMind(rawCode);
            } else {
                treeData = {
                    meta: { name: "jsmind", author: "edubrain", version: "0.2" },
                    format: "node_tree",
                    data: { id: "root", topic: "Sơ đồ tư duy", children: [] }
                };
            }
        }
        
        setTimeout(() => {
            if (typeof initJsMindInstance === 'function') {
                initJsMindInstance('review-modal', 'mindmap-review-canvas', treeData);
            }
        }, 150);
        
    } catch (err) {
        console.error("Open mindmap review error:", err);
        alert("Không thể mở sơ đồ tư duy.");
    }
}

function closeMindmapReviewModal() {
    window.currentViewingMindmapId = null;
    const modal = document.getElementById('mindmap-review-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function saveMindmapReviewEdit() {
    if (!window.currentViewingMindmapId) return;
    const jm = jmInstances['review-modal'];
    if (!jm) return alert("Không tìm thấy sơ đồ để lưu!");
    
    const mindData = jm.get_data();
    try {
        const res = await fetchWithCsrf(`${API_URL}/generations/${window.currentViewingMindmapId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: mindData })
        });
        if (res.ok) {
            showToastNotification("Đã lưu thay đổi sơ đồ tư duy thành công!");
            await loadNotebooks();
            if (activeNotebookId) await selectNotebook(activeNotebookId, true);
        } else {
            const err = await res.json();
            alert("Lỗi lưu sơ đồ: " + JSON.stringify(err));
        }
    } catch (err) {
        console.error("Save mindmap review error:", err);
        alert("Đã xảy ra lỗi khi lưu sơ đồ.");
    }
}
