/**
 * EduBrain Intelligent Search Engine & Filtering Module
 * Supports Global Search, Table Filtering, Multi-lingual Tags, and Vietnamese Accent-insensitive Matching
 */

function normalizeSearchText(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .trim();
}

function getTagBadgeClass(tagType) {
    switch (tagType) {
        case 'notebook':
            return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        case 'file':
        case 'pdf':
            return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        case 'link':
            return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
        case 'text':
            return 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
        case 'quiz':
            return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        case 'flashcards':
            return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
        case 'mind_map':
            return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'report':
            return 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
        case 'note':
            return 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
        default:
            return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    }
}

function filterTable() {
    const searchInput = document.getElementById('table-search');
    const filterSelect = document.getElementById('table-filter-type');
    if (!searchInput || !filterSelect) return;

    const rawQuery = searchInput.value.toLowerCase().trim();
    const normalizedQuery = normalizeSearchText(rawQuery);
    const typeFilter = filterSelect.value;
    const rows = document.querySelectorAll('#recent-activity-table-body tr');

    rows.forEach(row => {
        const cells = row.getElementsByTagName('td');
        if (cells.length < 5) return;

        const name = cells[0].innerText.toLowerCase();
        const type = cells[1].innerText.toLowerCase();
        const notebook = cells[2].innerText.toLowerCase();

        const nameNorm = normalizeSearchText(name);
        const typeNorm = normalizeSearchText(type);
        const notebookNorm = normalizeSearchText(notebook);

        const matchesSearch = !rawQuery 
            || name.includes(rawQuery) || nameNorm.includes(normalizedQuery)
            || type.includes(rawQuery) || typeNorm.includes(normalizedQuery)
            || notebook.includes(rawQuery) || notebookNorm.includes(normalizedQuery);

        let matchesType = true;
        if (typeFilter === 'source') {
            matchesType = typeNorm.includes('tai lieu') || type.includes('related') || type.includes('document') || type.includes('資料') || type.includes('pdf') || type.includes('link') || typeNorm.includes('van ban');
        } else if (typeFilter === 'note') {
            matchesType = typeNorm.includes('ghi chu') || type.includes('note') || type.includes('ノート');
        } else if (typeFilter === 'quiz') {
            matchesType = typeNorm.includes('trac nghiem') || typeNorm.includes('bai tap') || type.includes('quiz') || type.includes('クイズ');
        }

        row.style.display = (matchesSearch && matchesType) ? '' : 'none';
    });
}

function handleGlobalSearch() {
    const searchInput = document.getElementById('global-search');
    if (!searchInput) return;

    const rawQuery = searchInput.value.toLowerCase().trim();
    const normalizedQuery = normalizeSearchText(rawQuery);

    const resetViewFilters = () => {
        if (activeView === 'dashboard') {
            const tableSearch = document.getElementById('table-search');
            if (tableSearch) tableSearch.value = '';
            filterTable();
        } else if (activeView === 'documents') {
            document.querySelectorAll('#all-documents-list > div').forEach(doc => doc.style.display = '');
        } else if (activeView === 'study-materials') {
            document.querySelectorAll('#all-study-materials-list > div').forEach(item => item.style.display = '');
        } else if (activeView === 'notes') {
            document.querySelectorAll('#all-notes-list > div').forEach(note => note.style.display = '');
        } else if (activeView === 'notebooks') {
            document.querySelectorAll('#notebooks-list > button').forEach(btn => btn.style.display = '');
        }
    };

    if (!rawQuery) {
        resetViewFilters();
        renderGlobalSearchResults('');
        return;
    }

    if (activeView === 'dashboard') {
        const tableSearch = document.getElementById('table-search');
        if (tableSearch) tableSearch.value = rawQuery;
        filterTable();
    } else if (activeView === 'documents') {
        const docs = document.querySelectorAll('#all-documents-list > div');
        docs.forEach(doc => {
            const title = (doc.querySelector('h4')?.innerText || '').toLowerCase();
            const content = (doc.querySelector('p')?.innerText || '').toLowerCase();
            const tag = (doc.querySelector('span')?.innerText || '').toLowerCase();
            const notebook = (doc.querySelector('strong')?.innerText || '').toLowerCase();

            const titleNorm = normalizeSearchText(title);
            const contentNorm = normalizeSearchText(content);
            const tagNorm = normalizeSearchText(tag);
            const notebookNorm = normalizeSearchText(notebook);

            const match = title.includes(rawQuery) || titleNorm.includes(normalizedQuery)
                || content.includes(rawQuery) || contentNorm.includes(normalizedQuery)
                || tag.includes(rawQuery) || tagNorm.includes(normalizedQuery)
                || notebook.includes(rawQuery) || notebookNorm.includes(normalizedQuery);

            doc.style.display = match ? '' : 'none';
        });
    } else if (activeView === 'study-materials') {
        const materials = document.querySelectorAll('#all-study-materials-list > div');
        materials.forEach(item => {
            const title = (item.querySelector('h4')?.innerText || '').toLowerCase();
            const summary = (item.querySelector('p')?.innerText || '').toLowerCase();
            const tag = (item.querySelector('span')?.innerText || '').toLowerCase();
            const notebook = (item.querySelector('strong')?.innerText || '').toLowerCase();

            const titleNorm = normalizeSearchText(title);
            const summaryNorm = normalizeSearchText(summary);
            const tagNorm = normalizeSearchText(tag);
            const notebookNorm = normalizeSearchText(notebook);

            const match = title.includes(rawQuery) || titleNorm.includes(normalizedQuery)
                || summary.includes(rawQuery) || summaryNorm.includes(normalizedQuery)
                || tag.includes(rawQuery) || tagNorm.includes(normalizedQuery)
                || notebook.includes(rawQuery) || notebookNorm.includes(normalizedQuery);

            item.style.display = match ? '' : 'none';
        });
    } else if (activeView === 'notes') {
        const notes = document.querySelectorAll('#all-notes-list > div');
        notes.forEach(note => {
            const title = (note.querySelector('h4')?.innerText || '').toLowerCase();
            const text = note.innerText.toLowerCase();
            const notebook = (note.querySelector('strong')?.innerText || '').toLowerCase();

            const titleNorm = normalizeSearchText(title);
            const textNorm = normalizeSearchText(text);
            const notebookNorm = normalizeSearchText(notebook);

            const match = title.includes(rawQuery) || titleNorm.includes(normalizedQuery)
                || text.includes(rawQuery) || textNorm.includes(normalizedQuery)
                || notebook.includes(rawQuery) || notebookNorm.includes(normalizedQuery);

            note.style.display = match ? '' : 'none';
        });
    } else if (activeView === 'notebooks') {
        const buttons = document.querySelectorAll('#notebooks-list > button');
        buttons.forEach(btn => {
            const title = (btn.querySelector('span')?.innerText || '').toLowerCase();
            const desc = (btn.querySelectorAll('span')[1]?.innerText || '').toLowerCase();

            const titleNorm = normalizeSearchText(title);
            const descNorm = normalizeSearchText(desc);

            const match = title.includes(rawQuery) || titleNorm.includes(normalizedQuery)
                || desc.includes(rawQuery) || descNorm.includes(normalizedQuery);

            btn.style.display = match ? '' : 'none';
        });
    }

    renderGlobalSearchResults(rawQuery);
}

function renderGlobalSearchResults(query) {
    const popup = document.getElementById('search-results-popup');
    if (!popup) return;

    if (!query) {
        popup.classList.add('hidden');
        popup.innerHTML = '';
        return;
    }

    const t = window.t || ((k, f) => f);
    const rawQuery = query.toLowerCase().trim();
    const normalizedQuery = normalizeSearchText(rawQuery);

    const items = getGlobalSearchItems().filter(item => {
        const title = (item.title || '').toLowerCase();
        const subtitle = (item.subtitle || '').toLowerCase();
        const tag = (item.tag || '').toLowerCase();
        const notebookName = (item.notebookName || '').toLowerCase();

        const titleNorm = normalizeSearchText(title);
        const subtitleNorm = normalizeSearchText(subtitle);
        const tagNorm = normalizeSearchText(tag);
        const notebookNameNorm = normalizeSearchText(notebookName);

        return title.includes(rawQuery) || titleNorm.includes(normalizedQuery)
            || subtitle.includes(rawQuery) || subtitleNorm.includes(normalizedQuery)
            || tag.includes(rawQuery) || tagNorm.includes(normalizedQuery)
            || notebookName.includes(rawQuery) || notebookNameNorm.includes(normalizedQuery);
    });

    if (items.length === 0) {
        const noResultsText = t('key_search_no_results', 'Không tìm thấy kết quả nào cho');
        popup.innerHTML = `<div class="p-4 text-xs text-slate-500 dark:text-slate-400 text-center">${noResultsText} "${escapeHtml(query)}"</div>`;
        popup.classList.remove('hidden');
        return;
    }

    const maxResults = 8;
    popup.innerHTML = items.slice(0, maxResults).map(item => {
        const badgeColor = getTagBadgeClass(item.tagType);
        return `
        <button type="button" onclick="navigateSearchResult('${item.type}', '${item.id}', '${item.notebookId || ''}')" class="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition border-b border-slate-100 dark:border-slate-800/50 last:border-0">
            <div class="flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">${escapeHtml(item.title)}</span>
                        <span class="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0 ${badgeColor}">${escapeHtml(item.tag)}</span>
                    </div>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">${escapeHtml(item.subtitle)}</p>
                </div>
                ${item.notebookName ? `<span class="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 max-w-[120px] truncate">${escapeHtml(item.notebookName)}</span>` : ''}
            </div>
        </button>
        `;
    }).join('');
    popup.classList.remove('hidden');
}

function navigateSearchResult(type, id, notebookId) {
    const popup = document.getElementById('search-results-popup');
    if (popup) popup.classList.add('hidden');
    const searchInput = document.getElementById('global-search');
    if (searchInput) searchInput.value = '';

    if (type === 'notebook') {
        switchView('notebooks');
        selectNotebook(Number(id));
    } else if (type === 'source') {
        if (typeof openDocumentModal === 'function') {
            openDocumentModal(Number(id));
        } else {
            switchView('documents');
        }
    } else if (type === 'quiz') {
        if (typeof openQuizPlayModal === 'function') {
            openQuizPlayModal(Number(id));
        } else {
            switchView('study-materials');
        }
    } else if (type === 'generation' || type === 'flashcards' || type === 'mind_map' || type === 'report') {
        const item = getGlobalSearchItems().find(i => String(i.id) === String(id));
        const genType = item?.generation_type || type;
        if (genType === 'flashcards' && typeof openFlashcardReviewModal === 'function') {
            openFlashcardReviewModal(Number(id));
        } else if (genType === 'mind_map' && typeof openMindmapReviewModal === 'function') {
            openMindmapReviewModal(Number(id));
        } else if (genType === 'report' && typeof openReportReviewModal === 'function') {
            openReportReviewModal(Number(id));
        } else if (genType === 'quiz' && typeof openQuizReviewModal === 'function') {
            openQuizReviewModal(Number(id));
        } else {
            switchView('study-materials');
        }
    } else if (type === 'note') {
        switchView('notes');
    }
}

function getGlobalSearchItems() {
    const t = window.t || ((k, f) => f);
    const items = [];
    
    if (typeof notebooks === 'undefined' || !Array.isArray(notebooks)) {
        return items;
    }

    notebooks.forEach(nb => {
        if (nb.name) {
            items.push({
                id: String(nb.id),
                type: 'notebook',
                title: nb.name,
                subtitle: nb.description || t('key_tag_notebook', 'Sổ tay học tập'),
                tag: t('key_tag_notebook', 'Sổ tay'),
                tagType: 'notebook',
                notebookName: nb.name,
                notebookId: nb.id
            });
        }

        (nb.sources || []).forEach(src => {
            let label = t('key_tag_text', 'Văn bản');
            let tagType = 'text';
            if (src.source_type === 'file') {
                label = t('key_tag_pdf', 'File PDF');
                tagType = 'file';
            } else if (src.source_type === 'link') {
                label = t('key_tag_link', 'Trang web');
                tagType = 'link';
            }

            items.push({
                id: String(src.id),
                type: 'source',
                title: src.title,
                subtitle: (src.content || '').slice(0, 120),
                tag: label,
                tagType: tagType,
                notebookName: nb.name,
                notebookId: nb.id
            });
        });

        (nb.quizzes || []).forEach(quiz => {
            items.push({
                id: String(quiz.id),
                type: 'quiz',
                title: quiz.name,
                subtitle: quiz.description || t('key_ph_quiz_desc', 'Bộ câu hỏi trắc nghiệm'),
                tag: t('key_tag_quiz', 'Trắc nghiệm'),
                tagType: 'quiz',
                notebookName: nb.name,
                notebookId: nb.id
            });
        });

        (nb.notes || []).forEach(note => {
            items.push({
                id: String(note.id),
                type: 'note',
                title: note.title,
                subtitle: note.initial_content || note.ai_rebuttal || t('key_tag_note', 'Ghi chú cá nhân'),
                tag: t('key_tag_note', 'Ghi chú'),
                tagType: 'note',
                notebookName: nb.name,
                notebookId: nb.id
            });
        });

        (nb.generations || []).forEach(gen => {
            const labels = {
                flashcards: t('key_tag_flashcards', 'Flashcards'),
                mind_map: t('key_tag_mindmap', 'Mind Map'),
                report: t('key_tag_report', 'Báo cáo'),
                audio_overview: t('key_tag_audio', 'Audio Overview'),
                presentation: t('key_tag_presentation', 'Presentation'),
                video_overview: t('key_tag_video', 'Video Overview'),
                infographics: t('key_tag_infographic', 'Infographics'),
                data_table: t('key_tag_data_table', 'Data Table')
            };
            const label = labels[gen.generation_type] || t('key_32', 'Tài liệu học tập');
            items.push({
                id: String(gen.id),
                type: 'generation',
                generation_type: gen.generation_type,
                title: label,
                subtitle: (gen.content || '').slice(0, 120),
                tag: label,
                tagType: gen.generation_type || 'generation',
                notebookName: nb.name,
                notebookId: nb.id
            });
        });
    });
    return items;
}

document.addEventListener('click', event => {
    const wrapper = document.querySelector('.search-dropdown-wrapper');
    const popup = document.getElementById('search-results-popup');
    if (!wrapper || !popup) return;
    if (!wrapper.contains(event.target)) {
        popup.classList.add('hidden');
    }
});
