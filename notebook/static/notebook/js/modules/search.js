function filterTable() {
    const query = document.getElementById('table-search').value.toLowerCase();
    const typeFilter = document.getElementById('table-filter-type').value;
    const rows = document.querySelectorAll('#recent-activity-table-body tr');

    rows.forEach(row => {
        const cells = row.getElementsByTagName('td');
        if (cells.length < 5) return;

        const name = cells[0].innerText.toLowerCase();
        const type = cells[1].innerText.toLowerCase();
        const notebook = cells[2].innerText.toLowerCase();

        const matchesSearch = name.includes(query) || notebook.includes(query);

        let matchesType = true;
        if (typeFilter === 'source') {
            matchesType = type.includes('tài liệu') || type.includes('related') || type.includes('関連') || type.includes('pdf') || type.includes('link');
        } else if (typeFilter === 'note') {
            matchesType = type.includes('ghi chú') || type.includes('note') || type.includes('ノート');
        }

        row.style.display = (matchesSearch && matchesType) ? '' : 'none';
    });
}

function handleGlobalSearch() {
    const query = document.getElementById('global-search').value.toLowerCase().trim();

    const resetViewFilters = () => {
        if (activeView === 'dashboard') {
            document.getElementById('table-search').value = '';
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

    if (!query) {
        resetViewFilters();
        return;
    }

    if (activeView === 'dashboard') {
        document.getElementById('table-search').value = query;
        filterTable();
    } else if (activeView === 'documents') {
        const docs = document.querySelectorAll('#all-documents-list > div');
        docs.forEach(doc => {
            const title = (doc.querySelector('h4')?.innerText || '').toLowerCase();
            const content = (doc.querySelector('p')?.innerText || '').toLowerCase();
            const tag = (doc.querySelector('span')?.innerText || '').toLowerCase();
            const notebook = (doc.querySelector('strong')?.innerText || '').toLowerCase();
            doc.style.display = (title.includes(query) || content.includes(query) || tag.includes(query) || notebook.includes(query)) ? '' : 'none';
        });
    } else if (activeView === 'study-materials') {
        const materials = document.querySelectorAll('#all-study-materials-list > div');
        materials.forEach(item => {
            const title = (item.querySelector('h4')?.innerText || '').toLowerCase();
            const summary = (item.querySelector('p')?.innerText || '').toLowerCase();
            const tag = (item.querySelector('span')?.innerText || '').toLowerCase();
            const notebook = (item.querySelector('strong')?.innerText || '').toLowerCase();
            item.style.display = (title.includes(query) || summary.includes(query) || tag.includes(query) || notebook.includes(query)) ? '' : 'none';
        });
    } else if (activeView === 'notes') {
        const notes = document.querySelectorAll('#all-notes-list > div');
        notes.forEach(note => {
            const title = (note.querySelector('h4')?.innerText || '').toLowerCase();
            const text = note.innerText.toLowerCase();
            const notebook = (note.querySelector('strong')?.innerText || '').toLowerCase();
            note.style.display = (title.includes(query) || text.includes(query) || notebook.includes(query)) ? '' : 'none';
        });
    } else if (activeView === 'notebooks') {
        const buttons = document.querySelectorAll('#notebooks-list > button');
        buttons.forEach(btn => {
            const title = (btn.querySelector('span')?.innerText || '').toLowerCase();
            const desc = (btn.querySelectorAll('span')[1]?.innerText || '').toLowerCase();
            btn.style.display = (title.includes(query) || desc.includes(query)) ? '' : 'none';
        });
    }

    renderGlobalSearchResults(query);
}

function renderGlobalSearchResults(query) {
    const popup = document.getElementById('search-results-popup');
    if (!popup) return;

    if (!query) {
        popup.classList.add('hidden');
        popup.innerHTML = '';
        return;
    }

    const normalizedQuery = query.toLowerCase();
    const items = getGlobalSearchItems().filter(item => {
        return (item.title && item.title.toLowerCase().includes(normalizedQuery))
            || (item.subtitle && item.subtitle.toLowerCase().includes(normalizedQuery))
            || (item.tag && item.tag.toLowerCase().includes(normalizedQuery))
            || (item.notebookName && item.notebookName.toLowerCase().includes(normalizedQuery));
    });

    if (items.length === 0) {
        popup.innerHTML = `<div class="p-4 text-xs text-slate-500 dark:text-slate-400 text-center">Không tìm thấy kết quả nào cho "${escapeHtml(query)}"</div>`;
        popup.classList.remove('hidden');
        return;
    }

    const maxResults = 8;
    popup.innerHTML = items.slice(0, maxResults).map(item => `
        <button type="button" onclick="navigateSearchResult('${item.type}', '${item.id}', '${item.notebookId || ''}')" class="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition border-b border-slate-100 dark:border-slate-800/50 last:border-0">
            <div class="flex items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">${escapeHtml(item.title)}</span>
                        <span class="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-bold shrink-0">${escapeHtml(item.tag)}</span>
                    </div>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">${escapeHtml(item.subtitle)}</p>
                </div>
                ${item.notebookName ? `<span class="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 max-w-[120px] truncate">${escapeHtml(item.notebookName)}</span>` : ''}
            </div>
        </button>
    `).join('');
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
    const items = [];
    notebooks.forEach(nb => {
        if (nb.name) {
            items.push({
                id: String(nb.id),
                type: 'notebook',
                title: nb.name,
                subtitle: nb.description || 'Sổ tay học tập',
                tag: 'Sổ tay',
                notebookName: nb.name,
                notebookId: nb.id
            });
        }

        (nb.sources || []).forEach(src => {
            const label = src.source_type === 'file' ? 'File PDF' : src.source_type === 'link' ? 'Link' : 'Văn bản';
            items.push({
                id: String(src.id),
                type: 'source',
                title: src.title,
                subtitle: (src.content || '').slice(0, 120),
                tag: label,
                notebookName: nb.name,
                notebookId: nb.id
            });
        });

        (nb.quizzes || []).forEach(quiz => {
            items.push({
                id: String(quiz.id),
                type: 'quiz',
                title: quiz.name,
                subtitle: quiz.description || 'Bộ câu hỏi trắc nghiệm',
                tag: 'Bài tập trắc nghiệm',
                notebookName: nb.name,
                notebookId: nb.id
            });
        });

        (nb.notes || []).forEach(note => {
            items.push({
                id: String(note.id),
                type: 'note',
                title: note.title,
                subtitle: note.initial_content || note.ai_rebuttal || 'Ghi chú cá nhân',
                tag: 'Ghi chú',
                notebookName: nb.name,
                notebookId: nb.id
            });
        });

        (nb.generations || []).forEach(gen => {
            const labels = {
                flashcards: 'Flashcards',
                mind_map: 'Mind Map',
                report: 'Báo cáo',
                audio_overview: 'Audio Overview',
                presentation: 'Presentation',
                video_overview: 'Video Overview',
                infographics: 'Infographics',
                data_table: 'Data Table'
            };
            const label = labels[gen.generation_type] || 'Tài liệu học tập';
            items.push({
                id: String(gen.id),
                type: 'generation',
                generation_type: gen.generation_type,
                title: label,
                subtitle: (gen.content || '').slice(0, 120),
                tag: label,
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

