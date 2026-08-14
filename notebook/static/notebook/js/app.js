const API_URL = '/api';
let notebooks = [];
let activeNotebookId = null;
let activeTab = 'sources';
let selectedGenType = 'quiz';
let activeView = 'dashboard';

let hoursChartObj = null;
let distChartObj = null;
let currentQuizPlaying = null;
let currentQuizAnswers = {};
let currentEditingQuizId = null;
let currentFlashcardEditingId = null;
let currentFlashcardEditorCards = [];
let currentQuizGenerationEditingId = null;
let currentQuizGenerationEditorQuestions = [];

// CSRF Token helper function
function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Wrapper function for fetch to automatically add CSRF token
async function fetchWithCsrf(url, options = {}) {
    const method = options.method || 'GET';
    const headers = options.headers || {};

    // Add CSRF token for POST, PUT, PATCH, DELETE requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        headers['X-CSRFToken'] = getCsrfToken();
    }

    return fetch(url, { ...options, headers });
}

// On Load
window.addEventListener('DOMContentLoaded', () => {
    loadNotebooks();
    initTheme();
});

// Toggle Sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('-translate-x-full');
}

// Switching Dashboard View Mode
// Switching Dashboard View Mode
function switchView(viewName) {
    activeView = viewName;

    if (viewName === 'dashboard') {
        fetchNotifications();
    }

    // Toggle view visibility
    [
        'dashboard',
        'notebooks',
        'documents',
        'study-materials',
        'notes',
        'progress',
        'settings'
    ].forEach(v => {

        // Toggle content view
        const el = document.getElementById(`view-${v}`);

        if (el) {
            el.classList.toggle('hidden', v !== viewName);
        }

        // Toggle active styles on navbar links
        const navBtn = document.getElementById(`nav-${v}`);

        if (navBtn) {

            if (v === viewName) {
                // Active state
                navBtn.classList.add(
                    'bg-brand-50',
                    'text-brand-600',
                    'dark:bg-brand-900/30',
                    'dark:text-brand-400',
                    'shadow-sm'
                );

                navBtn.classList.remove(
                    'text-slate-600',
                    'dark:text-slate-400'
                );

            } else {
                // Inactive state
                navBtn.classList.remove(
                    'bg-brand-50',
                    'text-brand-600',
                    'dark:bg-brand-900/30',
                    'dark:text-brand-400',
                    'shadow-sm'
                );

                navBtn.classList.add(
                    'text-slate-600',
                    'dark:text-slate-400'
                );
            }
        }
    });

    // Re-render specific view resources
    if (viewName === 'dashboard') {
        updateDashboardStats();
        renderRecentActivityTable();
        setTimeout(renderCharts, 100);

    } else if (viewName === 'documents') {
        renderAllDocumentsView();

    } else if (viewName === 'study-materials') {
        renderStudyMaterialsView();

    } else if (viewName === 'notes') {
        renderAllNotesView();

    } else if (viewName === 'progress') {
        updateProgressViewStats();
    }

    // Auto close mobile sidebar
    const sidebar = document.getElementById('sidebar');

    if (
        sidebar &&
        !sidebar.classList.contains('-translate-x-full')
    ) {
        sidebar.classList.add('-translate-x-full');
    }
}

// Theme / Dark Mode toggle
function initTheme() {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.getElementById('sun-icon').classList.remove('hidden');
        document.getElementById('moon-icon').classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('sun-icon').classList.add('hidden');
        document.getElementById('moon-icon').classList.remove('hidden');
    }
}

function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        document.getElementById('sun-icon').classList.add('hidden');
        document.getElementById('moon-icon').classList.remove('hidden');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('sun-icon').classList.remove('hidden');
        document.getElementById('moon-icon').classList.add('hidden');
    }
    // Re-render charts to match dark mode context
    if (activeView === 'dashboard') {
        setTimeout(renderCharts, 150);
    }
}

// Tab switches inside Notebook workspace
function switchTab(tab) {
    activeTab = tab;

    // Toggle classes on buttons
    ['sources', 'notes', 'ai-gen'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = "flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400";
            } else {
                btn.className = "flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white";
            }
        }
        const content = document.getElementById(`tab-content-${t}`);
        if (content) {
            content.classList.toggle('hidden', t !== tab);
        }
    });
}

// Toggle Source fields
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

// AI generator select type
function selectGenType(type) {
    selectedGenType = type;
    const labels = {
        'quiz': 'Trắc nghiệm ôn tập (Quiz)',
        'flashcards': 'Thẻ nhớ thông minh (Flashcards)',
        'mind_map': 'Sơ đồ tư duy (Mind Map)',
        'report': 'Báo cáo tóm tắt (Report)',
        'audio_overview': 'Kịch bản Podcast (Audio)',
        'presentation': 'Dàn ý Slide (Presentation)'
    };
    document.getElementById('selected-type-label').innerText = labels[type];

    ['quiz', 'flashcards', 'mind_map', 'report', 'audio_overview', 'presentation'].forEach(t => {
        const card = document.getElementById(`gen-card-${t}`);
        if (card) {
            if (t === type) {
                card.classList.add('border-brand-500', 'ring-2', 'ring-brand-100', 'dark:ring-slate-800');
                card.classList.remove('border-slate-200', 'dark:border-slate-800');
            } else {
                card.classList.remove('border-brand-500', 'ring-2', 'ring-brand-100', 'dark:ring-slate-800');
                card.classList.add('border-slate-200', 'dark:border-slate-800');
            }
        }
    });
}

// API Request: Load all notebooks
async function loadNotebooks() {
    // Render table skeletons while loading
    renderTableSkeleton();

    try {
        const res = await fetch(`${API_URL}/notebooks/`);
        notebooks = await res.json();

        // Update stats and lists
        updateDashboardStats();
        renderNotebooksList();
        populateNotebookSelectors();
        renderRecentActivityTable();

        // Auto render charts
        setTimeout(renderCharts, 100);
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu Sổ tay:", err);
    }
}

// Render loading skeletons
function renderTableSkeleton() {
    const tbody = document.getElementById('recent-activity-table-body');
    if (tbody) {
        tbody.innerHTML = Array(3).fill(0).map(() => `
                    <tr class="animate-pulse">
                        <td class="py-4 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48"></div></td>
                        <td class="py-4 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div></td>
                        <td class="py-4 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32"></div></td>
                        <td class="py-4 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></td>
                        <td class="py-4 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div></td>
                        <td class="py-4 px-4 text-right"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto"></div></td>
                    </tr>
                `).join('');
    }
}

// Render Sổ tay list on sidebars
function renderNotebooksList() {
    const container = document.getElementById('notebooks-list');
    if (!container) return;

    if (notebooks.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-400 py-6 text-center">Không có sổ tay nào. Hãy tạo mới.</div>`;
        return;
    }
    container.innerHTML = notebooks.map(nb => `
                <button onclick="selectNotebook(${nb.id})" class="w-full text-left px-4 py-3 rounded-xl transition text-sm flex flex-col space-y-1 ${nb.id === activeNotebookId ? 'bg-brand-600 text-white font-medium shadow-md shadow-brand-100 dark:shadow-none' : 'hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'}">
                    <span class="truncate block font-semibold">${nb.name}</span>
                    <span class="truncate text-[10px] ${nb.id === activeNotebookId ? 'text-brand-100' : 'text-slate-400'}">${nb.description || 'Không mô tả'}</span>
                </button>
            `).join('');
}

function populateNotebookSelectors() {
    const selects = ['tool-notebook-select', 'quiz-builder-notebook'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Không liên kết</option>' + notebooks.map(nb => `
                    <option value="${nb.id}" ${String(nb.id) === String(currentValue) ? 'selected' : ''}>${nb.name}</option>
                `).join('');
        if (activeNotebookId && selectId === 'quiz-builder-notebook') {
            select.value = String(activeNotebookId);
        }
    });
}

// Update main dashboard metrics
function updateDashboardStats() {
    const notebooksCount = notebooks.length;
    let sourcesCount = 0;
    let quizCount = 0;
    let quizCompletedCount = 0;
    notebooks.forEach(nb => {
        sourcesCount += (nb.sources || []).length;
        quizCount += (nb.quizzes || []).length;
        quizCompletedCount += (nb.quizzes || []).filter(q => q.attempts_count > 0).length;
    });

    const completionPct = quizCount ? Math.round((quizCompletedCount / quizCount) * 100) : 0;
    document.getElementById('stat-notebooks-count').innerText = notebooksCount;
    document.getElementById('stat-documents-count').innerText = sourcesCount;
    const completionCard = document.querySelector('#view-dashboard .bg-amber-50')?.parentElement?.querySelector('div > span.block.text-2xl');
    if (completionCard) {
        completionCard.innerText = `${completionPct}%`;
    }
    const completionBar = document.querySelector('#view-dashboard .bg-amber-500.h-full');
    if (completionBar) {
        completionBar.style.width = `${completionPct}%`;
    }
}

// Update stats on Progress View
function updateProgressViewStats() {
    let sourcesCount = 0;
    let notesCount = 0;
    let genCount = 0;
    let quizCount = 0;

    notebooks.forEach(nb => {
        sourcesCount += (nb.sources || []).length;
        notesCount += (nb.notes || []).length;
        genCount += (nb.generations || []).length;
        quizCount += (nb.quizzes || []).length;
    });

    document.getElementById('progress-notes-written').innerText = `${notesCount} bài viết`;
    document.getElementById('progress-sources-count').innerText = `${sourcesCount} tài liệu`;
    document.getElementById('progress-ai-gen-count').innerText = `${genCount + quizCount} tài liệu`;
}

// Select a notebook to show details and workspace
async function selectNotebook(id, keepCurrentTab = false) {
    activeNotebookId = id;
    renderNotebooksList();

    try {
        const res = await fetch(`${API_URL}/notebooks/${id}/`);
        const notebook = await res.json();

        document.getElementById('active-notebook-name').innerText = notebook.name;
        document.getElementById('active-notebook-desc').innerText = notebook.description || 'Không có mục tiêu học tập.';

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
                    catContainer.innerHTML = `<div class="text-[10px] text-slate-400 italic py-1">Chưa có tài liệu liên quan cho phần này.</div>`;
                } else {
                    catContainer.innerHTML = catSources.map(src => {
                        let badge = '';
                        if (src.source_type === 'file') badge = '📁 File';
                        else if (src.source_type === 'link') badge = '🔗 Link';
                        else badge = '✏️ Text';

                        return `
                                <div class="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 p-2.5 rounded-xl text-[10px] text-slate-700 dark:text-slate-350">
                                    <div class="flex items-center space-x-2 truncate">
                                        <span class="font-bold text-slate-400 uppercase shrink-0">${badge}</span>
                                        <span class="font-semibold truncate" title="${src.title}">${src.title}</span>
                                    </div>
                                    <button onclick="deleteSource(${src.id})" class="text-rose-500 hover:text-rose-700 font-bold shrink-0 ml-2" title="Xóa tài liệu">Xóa</button>
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

// Modal triggers
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

// POST Request: Create new Notebook
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

// POST Request: Add new Source
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

// Render sources in workspace tab
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

// Render saved quizzes list for active notebook
function renderQuizSets(quizzes) {
    const container = document.getElementById('quiz-sets-container');
    if (!container) return;

    if (!quizzes || quizzes.length === 0) {
        container.innerHTML = `
                    <div class="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl">
                        Chưa có bộ câu hỏi nào. Bạn có thể tạo bộ câu hỏi thủ công hoặc sinh Quiz mới.
                    </div>
                `;
        return;
    }

    container.innerHTML = quizzes.map(quiz => `
                <div class="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-300">
                    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-[10px] uppercase font-bold tracking-wide text-slate-400">Bài tập trắc nghiệm</span>
                                <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">${quiz.attempts_count || 0} lượt</span>
                            </div>
                            <h4 class="font-bold text-slate-900 dark:text-white text-sm">${quiz.name}</h4>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${quiz.description || 'Không có mô tả'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="openQuizPlayModal(${quiz.id})" class="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-xl text-[10px] font-semibold transition">Làm bài</button>
                            <button onclick="selectQuizSet(${quiz.id})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-[10px] font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">Xem chi tiết</button>
                        </div>
                    </div>
                </div>
            `).join('');
}

function selectQuizSet(quizId) {
    if (!quizId) return;
    openQuizPlayModal(quizId);
}

async function openQuizBuilderModal(quizId = null) {
    const modal = document.getElementById('quiz-builder-modal');
    const container = document.getElementById('quiz-questions-container');
    currentEditingQuizId = quizId;
    document.getElementById('quiz-builder-name').value = '';
    document.getElementById('quiz-builder-desc').value = '';
    container.innerHTML = '';
    currentQuizAnswers = {};
    populateNotebookSelectors();

    if (quizId) {
        try {
            const res = await fetch(`${API_URL}/quizzes/${quizId}/`);
            if (!res.ok) throw new Error('Không thể tải dữ liệu quiz');
            const quiz = await res.json();
            document.getElementById('quiz-builder-name').value = quiz.name || '';
            document.getElementById('quiz-builder-desc').value = quiz.description || '';
            document.getElementById('quiz-builder-notebook').value = quiz.notebook ? String(quiz.notebook) : '';

            const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
            questions.forEach((question, index) => {
                const row = document.createElement('div');
                row.className = 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3';
                row.setAttribute('data-question-row', index);
                row.innerHTML = `
                            <div class="flex items-start justify-between gap-3">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Câu hỏi ${index + 1}</span>
                                <button type="button" onclick="this.closest('div[data-question-row]').remove()" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">Xóa</button>
                            </div>
                            <div>
                                <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Nội dung câu hỏi</label>
                                <textarea data-question-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${question.question_text || ''}</textarea>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án A</label>
                                    <input data-option-input="A" type="text" value="${(question.options || [])[0] || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án B</label>
                                    <input data-option-input="B" type="text" value="${(question.options || [])[1] || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án C</label>
                                    <input data-option-input="C" type="text" value="${(question.options || [])[2] || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án D</label>
                                    <input data-option-input="D" type="text" value="${(question.options || [])[3] || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án đúng</label>
                                    <select data-correct-option class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                        ${['A', 'B', 'C', 'D'].map(letter => `<option value="${letter}" ${letter === (question.correct_option || 'A') ? 'selected' : ''}>${letter}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Giải thích</label>
                                    <textarea data-explanation-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${question.explanation || ''}</textarea>
                                </div>
                            </div>
                        `;
                container.appendChild(row);
            });

            if (!questions.length) {
                addQuizQuestionRow();
            }
        } catch (err) {
            console.error('Lỗi khi tải quiz để sửa:', err);
            addQuizQuestionRow();
        }
    } else {
        addQuizQuestionRow();
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeQuizBuilderModal() {
    const modal = document.getElementById('quiz-builder-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('quiz-questions-container').innerHTML = '';
    currentEditingQuizId = null;
}

function addQuizQuestionRow() {
    const container = document.getElementById('quiz-questions-container');
    if (!container) return;
    const index = container.children.length;
    const row = document.createElement('div');
    row.className = 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3';
    row.innerHTML = `
                <div class="flex items-start justify-between gap-3">
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Câu hỏi ${index + 1}</span>
                    <button type="button" onclick="this.closest('div[data-question-row]').remove()" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">Xóa</button>
                </div>
                <div>
                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Nội dung câu hỏi</label>
                    <textarea data-question-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án A</label>
                        <input data-option-input="A" type="text" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án B</label>
                        <input data-option-input="B" type="text" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án C</label>
                        <input data-option-input="C" type="text" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án D</label>
                        <input data-option-input="D" type="text" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án đúng</label>
                        <select data-correct-option class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Giải thích</label>
                        <textarea data-explanation-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
                    </div>
                </div>
            `;
    row.setAttribute('data-question-row', index);
    container.appendChild(row);
}

async function saveQuizBuilder() {
    const name = document.getElementById('quiz-builder-name').value.trim();
    const description = document.getElementById('quiz-builder-desc').value.trim();
    const notebookId = document.getElementById('quiz-builder-notebook').value || null;
    const questionRows = Array.from(document.querySelectorAll('#quiz-questions-container [data-question-row]'));

    if (!name) {
        return alert('Vui lòng nhập tên bộ câu hỏi.');
    }
    if (!questionRows.length) {
        return alert('Vui lòng thêm ít nhất một câu hỏi.');
    }

    const questions = [];
    for (const row of questionRows) {
        const questionText = row.querySelector('[data-question-input]').value.trim();
        const optionA = row.querySelector('[data-option-input="A"]').value.trim();
        const optionB = row.querySelector('[data-option-input="B"]').value.trim();
        const optionC = row.querySelector('[data-option-input="C"]').value.trim();
        const optionD = row.querySelector('[data-option-input="D"]').value.trim();
        const correct_option = row.querySelector('[data-correct-option]').value;
        const explanation = row.querySelector('[data-explanation-input]').value.trim();

        if (!questionText || !optionA || !optionB || !optionC || !optionD) {
            return alert('Vui lòng điền đầy đủ câu hỏi và 4 đáp án cho mỗi mục.');
        }

        questions.push({
            question_text: questionText,
            options: [optionA, optionB, optionC, optionD],
            correct_option,
            explanation
        });
    }

    try {
        const payload = {
            name,
            description,
            notebook: notebookId,
            tag: 'Bài tập trắc nghiệm',
            questions
        };
        const endpoint = currentEditingQuizId ? `${API_URL}/quizzes/${currentEditingQuizId}/` : `${API_URL}/quizzes/`;
        const method = currentEditingQuizId ? 'PATCH' : 'POST';

        const res = await fetchWithCsrf(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json();
            return alert('Lỗi khi lưu bộ câu hỏi: ' + JSON.stringify(err));
        }
        const quiz = await res.json();
        closeQuizBuilderModal();
        await loadNotebooks();
        if (notebookId) {
            selectNotebook(parseInt(notebookId, 10), true);
        }
        alert(currentEditingQuizId ? 'Đã cập nhật bộ câu hỏi trắc nghiệm thành công!' : 'Đã lưu bộ câu hỏi trắc nghiệm thành công!');
    } catch (err) {
        console.error('Lỗi lưu quiz:', err);
        alert('Đã xảy ra lỗi khi lưu bộ câu hỏi.');
    }
}

function openQuizPlayModal(quizId) {
    if (!quizId) return;
    currentQuizPlaying = quizId;
    currentQuizAnswers = {};
    const modal = document.getElementById('quiz-play-modal');
    const title = document.getElementById('quiz-play-title');
    title.innerText = 'Làm bài trắc nghiệm';
    const content = document.getElementById('quiz-play-content');
    content.innerHTML = `
                <div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Đang tải bài tập...</div>
            `;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    fetchWithCsrf(`${API_URL}/quizzes/${quizId}/shuffle/`, { method: 'POST' })
        .then(async res => {
            if (!res.ok) {
                throw new Error('Không thể tải bài tập.');
            }
            return res.json();
        })
        .then(questions => {
            if (!Array.isArray(questions) || questions.length === 0) {
                content.innerHTML = `<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Bài tập chưa có câu hỏi nào.</div>`;
                return;
            }
            currentQuizAnswers = {};
            renderQuizPlayContent(quizId, questions);
        })
        .catch(err => {
            console.error('Quiz play error:', err);
            content.innerHTML = `<div class="text-center py-12 text-rose-500 dark:text-rose-400 text-xs">Không thể tải bài tập. Vui lòng thử lại.</div>`;
        });
}

function closeQuizPlayModal() {
    const modal = document.getElementById('quiz-play-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentQuizPlaying = null;
    currentQuizAnswers = {};
    document.getElementById('quiz-play-content').innerHTML = '';
}

function closeQuizReviewModal() {
    const modal = document.getElementById('quiz-review-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('quiz-review-content').innerHTML = '';
}

async function openQuizGenerationEditorModal(materialId) {
    if (!materialId) return;
    currentQuizGenerationEditingId = materialId;
    try {
        const res = await fetch(`${API_URL}/generations/${materialId}/`);
        if (!res.ok) throw new Error('Không thể tải bộ câu hỏi để sửa');
        const material = await res.json();
        let parsed = [];
        try {
            parsed = JSON.parse(material.content);
            if (!Array.isArray(parsed)) parsed = [];
        } catch (err) {
            parsed = [];
        }
        currentQuizGenerationEditorQuestions = parsed.length ? parsed.map(item => ({
            question_text: item.question || item.question_text || '',
            options: Array.isArray(item.options) ? item.options.slice(0, 4) : ['', '', '', ''],
            answer: (item.answer || item.correct_option || item.correctOption || 'A').toString().toUpperCase(),
            explanation: item.explanation || ''
        })) : [{ question_text: '', options: ['', '', '', ''], answer: 'A', explanation: '' }];
        currentQuizGenerationEditorQuestions = currentQuizGenerationEditorQuestions.map(item => ({
            ...item,
            options: [...item.options, '', '', '', ''].slice(0, 4)
        }));
        renderQuizGenerationEditorForm(currentQuizGenerationEditorQuestions);
        document.getElementById('quiz-generation-editor-modal').classList.remove('hidden');
        document.getElementById('quiz-generation-editor-modal').classList.add('flex');
    } catch (err) {
        console.error('Open quiz generation editor error:', err);
        alert('Không thể mở trình chỉnh sửa bộ câu hỏi.');
    }
}

async function saveQuizGenerationEdit() {
    if (!currentQuizGenerationEditingId) return;
    const questions = collectQuizGenerationEditorQuestions();
    if (!questions.length) return alert('Vui lòng thêm ít nhất một câu hỏi.');
    try {
        const payload = JSON.stringify(questions, null, 2);
        const res = await fetchWithCsrf(`${API_URL}/generations/${currentQuizGenerationEditingId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: payload })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(JSON.stringify(err));
        }
        closeQuizGenerationEditorModal();
        await loadNotebooks();
        if (activeNotebookId) await selectNotebook(activeNotebookId, true);
        alert('Đã cập nhật bộ câu hỏi thành công!');
    } catch (err) {
        console.error('Save quiz generation edit error:', err);
        alert('Lỗi khi lưu bộ câu hỏi.');
    }
}

async function openQuizReviewModal(quizId) {
    if (!quizId) return;
    const modal = document.getElementById('quiz-review-modal');
    const content = document.getElementById('quiz-review-content');
    const title = document.getElementById('quiz-review-title');
    title.innerText = 'Xem lại bộ câu hỏi';
    content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Đang tải nội dung câu hỏi...</div>';
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        let quiz = null;
        let res = await fetch(`${API_URL}/quizzes/${quizId}/`);
        if (res.ok) {
            quiz = await res.json();
        } else {
            const generationRes = await fetch(`${API_URL}/generations/${quizId}/`);
            if (!generationRes.ok) throw new Error('Không thể tải bộ câu hỏi');
            const generation = await generationRes.json();
            const fallback = parseQuizGenerationContent(generation.content);
            if (!fallback || !Array.isArray(fallback.questions) || fallback.questions.length === 0) {
                content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Bộ câu hỏi này chưa có nội dung nào.</div>';
                return;
            }
            title.innerText = generation.generation_type === 'quiz' ? 'Xem lại bộ câu hỏi đã lưu' : 'Xem lại tài liệu';
            content.innerHTML = `
                        <div class="space-y-4">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                <div>
                                    <p class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Bộ câu hỏi</p>
                                    <h4 class="font-bold text-slate-900 dark:text-white text-base mt-1">${fallback.title}</h4>
                                    <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">${fallback.description}</p>
                                </div>
                                <button onclick="openQuizGenerationEditorModal(${quizId})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-[10px] font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">Sửa câu hỏi</button>
                            </div>
                            ${fallback.questions.map((question, idx) => {
                const options = Array.isArray(question.options) ? question.options : [];
                const correctOption = (question.correct_option || question.answer || 'A').toString().toUpperCase();
                return `
                                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                                        <div class="flex items-center justify-between gap-3">
                                            <span class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Câu ${idx + 1}</span>
                                            <span id="quiz-review-status-${generation.id}-${idx}" class="text-[10px] font-bold uppercase tracking-wide text-slate-400">&nbsp;</span>
                                        </div>
                                        <p class="text-sm font-semibold text-slate-900 dark:text-white">${question.question_text || question.question || 'Câu hỏi chưa có nội dung'}</p>
                                        <div id="quiz-review-${generation.id}-${idx}-options" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            ${options.map((opt, optIdx) => `
                                                <button type="button" onclick="selectQuizReviewOption('${generation.id}-${idx}', '${String.fromCharCode(65 + optIdx)}', '${correctOption}')" id="quiz-review-${generation.id}-${idx}-opt-${optIdx}" data-explanation="${escapeHtml(question.explanation || '')}" class="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition font-medium">
                                                    ${formatQuizOption(opt, optIdx)}
                                                </button>
                                            `).join('')}
                                        </div>
                                        <div id="quiz-review-${generation.id}-${idx}-result" class="hidden text-[11px] font-bold p-3 rounded-xl"></div>
                                        <div id="quiz-review-${generation.id}-${idx}-explanation" class="hidden text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800"></div>
                                    </div>
                                `;
            }).join('')}
                        </div>
                    `;
            return;
        }

        const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
        if (!questions.length) {
            content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Bộ câu hỏi này chưa có nội dung nào.</div>';
            return;
        }

        title.innerText = quiz.name || 'Xem lại bộ câu hỏi';
        content.innerHTML = `
                    <div class="space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                            <div>
                                <p class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Bộ câu hỏi</p>
                                <h4 class="font-bold text-slate-900 dark:text-white text-base mt-1">${quiz.name || 'Bộ câu hỏi'}</h4>
                                <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">${quiz.description || 'Không có mô tả'}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="openQuizPlayModal(${quiz.id})" class="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-xl text-[10px] font-semibold transition">Làm lại</button>
                                <button onclick="openQuizBuilderModal(${quiz.id})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-[10px] font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">Sửa câu hỏi</button>
                            </div>
                        </div>
                        ${questions.map((question, idx) => {
            const options = Array.isArray(question.options) ? question.options : [];
            const correctOption = (question.correct_option || 'A').toString().toUpperCase();
            return `
                                <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Câu ${idx + 1}</span>
                                        <span id="quiz-review-status-${quiz.id}-${idx}" class="text-[10px] font-bold uppercase tracking-wide text-slate-400">&nbsp;</span>
                                    </div>
                                    <p class="text-sm font-semibold text-slate-900 dark:text-white">${question.question_text || 'Câu hỏi chưa có nội dung'}</p>
                                    <div id="quiz-review-${quiz.id}-${idx}-options" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        ${options.map((opt, optIdx) => `
                                            <button type="button" onclick="selectQuizReviewOption('${quiz.id}-${idx}', '${String.fromCharCode(65 + optIdx)}', '${correctOption}')" id="quiz-review-${quiz.id}-${idx}-opt-${optIdx}" data-explanation="${escapeHtml(question.explanation || '')}" class="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition font-medium">
                                                ${formatQuizOption(opt, optIdx)}
                                            </button>
                                        `).join('')}
                                    </div>
                                    <div id="quiz-review-${quiz.id}-${idx}-result" class="hidden text-[11px] font-bold p-3 rounded-xl"></div>
                                    <div id="quiz-review-${quiz.id}-${idx}-explanation" class="hidden text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800"></div>
                                </div>
                            `;
        }).join('')}
                    </div>
                `;
    } catch (err) {
        console.error('Quiz review error:', err);
        content.innerHTML = '<div class="text-center py-12 text-rose-500 dark:text-rose-400 text-xs">Không thể tải nội dung bộ câu hỏi. Vui lòng thử lại.</div>';
    }
}

function closeFlashcardReviewModal() {
    const modal = document.getElementById('flashcard-review-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('flashcard-review-content').innerHTML = '';
}

function closeQuizGenerationEditorModal() {
    const modal = document.getElementById('quiz-generation-editor-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentQuizGenerationEditingId = null;
    currentQuizGenerationEditorQuestions = [];
}

function toggleFlashcardReviewCard(cardIndex) {
    const front = document.getElementById(`flash-review-front-${cardIndex}`);
    const back = document.getElementById(`flash-review-back-${cardIndex}`);
    if (!front || !back) return;
    front.classList.toggle('hidden');
    back.classList.toggle('hidden');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeQuizOption(option) {
    const value = String(option ?? '').trim();
    return value.replace(/^[A-D][\.\)\:\-\s]\s*/i, '').trim();
}

function formatQuizOption(option, optIdx) {
    const cleanText = normalizeQuizOption(option);
    const letter = String.fromCharCode(65 + optIdx);
    return `${letter}. ${cleanText}`;
}

function parseFlashcardJson(content) {
    if (!content) return [];
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed
                .filter(item => item && typeof item === 'object')
                .map(item => ({
                    question: String(item.question || item.front || ''),
                    answer: String(item.answer || item.back || '')
                }));
        }
    } catch (err) {
        // Ignore invalid JSON and fall back to text parsing below
    }

    const text = String(content).replace(/\r\n/g, '\n');
    const questionMatches = [...text.matchAll(/QUESTION\s*[:\-]?\s*([\s\S]*?)(?=(?:\s*ANSWER\s*[:\-]?\s*|\s*QUESTION\s*[:\-]?|\s*$))/gi)];
    if (questionMatches.length) {
        const cards = [];
        questionMatches.forEach((match) => {
            let question = (match[1] || '').trim();
            const answerMatch = text.match(new RegExp(`ANSWER\\s*[:\\-]?\\s*([\\s\\S]*?)(?=(?:\\s*QUESTION\\s*[:\\-]?|\\s*$))`, 'i'));
            let answer = answerMatch ? answerMatch[1].trim() : 'Chưa có đáp án';

            if (question.includes('ANSWER')) {
                const answerSplit = question.split(/\s*ANSWER\s*[:\-]?\s*/i);
                if (answerSplit.length > 1) {
                    question = answerSplit[0].trim();
                    answer = answerSplit.slice(1).join(' ANSWER ').trim();
                }
            }

            question = question.replace(/^[^A-Za-z0-9À-ỹ]+/, '').trim();
            if (!question) return;
            cards.push({ question, answer: answer && answer !== 'Chưa có đáp án' ? answer : 'Chưa có đáp án' });
        });
        if (cards.length) return cards;
    }

    return [];
}

function parseQuizGenerationContent(content) {
    if (!content) return null;

    let raw = String(content).trim();
    if (!raw) return null;

    // Try parse JSON content first, including fenced code blocks.
    try {
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
            const questions = parsed.map((item) => ({
                question_text: item.question_text || item.question || '',
                options: Array.isArray(item.options) ? item.options : [],
                correct_option: (item.correct_option || item.answer || (typeof item.correct_index === 'number' ? String.fromCharCode(65 + item.correct_index) : 'A')).toString().toUpperCase(),
                explanation: item.explanation || item.explanation || ''
            }));
            return {
                title: 'Bộ câu hỏi đã lưu',
                description: 'Đã lưu từ tài nguyên học tập.',
                questions
            };
        }
    } catch (err) {
        // Ignore JSON parse errors and fall back to plain text parsing.
    }

    const text = raw.replace(/\r\n/g, '\n');
    const cleaned = text.replace(/^\s*🏷️\s*Chủ đề:\s*.*?\n?/i, '').trim();
    if (!cleaned) return null;
    return {
        title: 'Bộ câu hỏi đã lưu',
        description: 'Đã lưu từ tài nguyên học tập.',
        questions: [{
            question_text: cleaned,
            options: ['A. Xem thêm nội dung', 'B. Xem thêm nội dung', 'C. Xem thêm nội dung', 'D. Xem thêm nội dung'],
            correct_option: 'A',
            explanation: cleaned
        }]
    };
}

function renderFlashcardEditorForm(cards) {
    const container = document.getElementById('flashcard-editor-form');
    if (!container) return;
    container.innerHTML = `
                <div class="space-y-3">
                    ${cards.length ? cards.map((card, idx) => `
                        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3" data-flashcard-row="${idx}">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Thẻ ${idx + 1}</span>
                                <button type="button" onclick="removeFlashcardEditorRow(${idx})" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">Xóa</button>
                            </div>
                            <div>
                                <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Câu hỏi</label>
                                <input data-flashcard-question type="text" value="${escapeHtml(card.question || '')}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                            </div>
                            <div>
                                <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án</label>
                                <textarea data-flashcard-answer rows="3" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(card.answer || '')}</textarea>
                            </div>
                        </div>
                    `).join('') : '<div class="text-center py-6 text-[11px] text-slate-400">Chưa có flashcard nào. Nhấn “+ Thêm flashcard” để bắt đầu.</div>'}
                </div>
            `;
}

function addFlashcardEditorRow() {
    currentFlashcardEditorCards.push({ question: '', answer: '' });
    renderFlashcardEditorForm(currentFlashcardEditorCards);
}

function removeFlashcardEditorRow(index) {
    currentFlashcardEditorCards = currentFlashcardEditorCards.filter((_, idx) => idx !== index);
    if (!currentFlashcardEditorCards.length) {
        currentFlashcardEditorCards.push({ question: '', answer: '' });
    }
    renderFlashcardEditorForm(currentFlashcardEditorCards);
}

function collectFlashcardEditorCards() {
    const container = document.getElementById('flashcard-editor-form');
    if (!container) return [];
    return Array.from(container.querySelectorAll('[data-flashcard-row]')).map((row) => ({
        question: row.querySelector('[data-flashcard-question]').value.trim(),
        answer: row.querySelector('[data-flashcard-answer]').value.trim()
    })).filter(card => card.question || card.answer);
}

function renderQuizGenerationEditorForm(questions) {
    const container = document.getElementById('quiz-generation-editor-form');
    if (!container) return;
    container.innerHTML = `
                <div class="space-y-3">
                    ${questions.length ? questions.map((question, idx) => `
                        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3" data-quiz-generation-row="${idx}">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Câu hỏi ${idx + 1}</span>
                                <button type="button" onclick="removeQuizGenerationEditorRow(${idx})" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">Xóa</button>
                            </div>
                            <div>
                                <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Nội dung câu hỏi</label>
                                <textarea data-quiz-question rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(question.question_text || question.question || '')}</textarea>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                ${['A', 'B', 'C', 'D'].map((letter, optIdx) => `
                                    <div>
                                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án ${letter}</label>
                                        <input data-quiz-option="${letter}" type="text" value="${escapeHtml(normalizeQuizOption((question.options || [])[optIdx] || ''))}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                    </div>
                                `).join('')}
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án đúng</label>
                                    <select data-quiz-correct-answer class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                        ${['A', 'B', 'C', 'D'].map((letter) => `<option value="${letter}" ${letter === (question.answer || question.correct_option || 'A') ? 'selected' : ''}>${letter}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Giải thích</label>
                                    <textarea data-quiz-explanation rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(question.explanation || '')}</textarea>
                                </div>
                            </div>
                        </div>
                    `).join('') : '<div class="text-center py-6 text-[11px] text-slate-400">Chưa có câu hỏi nào. Nhấn “+ Thêm câu hỏi” để bắt đầu.</div>'}
                </div>
            `;
}

function addQuizGenerationEditorRow() {
    currentQuizGenerationEditorQuestions.push({
        question_text: '',
        options: ['', '', '', ''],
        answer: 'A',
        explanation: ''
    });
    renderQuizGenerationEditorForm(currentQuizGenerationEditorQuestions);
}

function removeQuizGenerationEditorRow(index) {
    currentQuizGenerationEditorQuestions = currentQuizGenerationEditorQuestions.filter((_, idx) => idx !== index);
    if (!currentQuizGenerationEditorQuestions.length) {
        currentQuizGenerationEditorQuestions.push({
            question_text: '',
            options: ['', '', '', ''],
            answer: 'A',
            explanation: ''
        });
    }
    renderQuizGenerationEditorForm(currentQuizGenerationEditorQuestions);
}

function collectQuizGenerationEditorQuestions() {
    const container = document.getElementById('quiz-generation-editor-form');
    if (!container) return [];
    return Array.from(container.querySelectorAll('[data-quiz-generation-row]')).map((row) => {
        const options = ['A', 'B', 'C', 'D'].map(letter => row.querySelector(`[data-quiz-option="${letter}"]`).value.trim());
        return {
            question: row.querySelector('[data-quiz-question]').value.trim(),
            options: options.map(normalizeQuizOption),
            answer: row.querySelector('[data-quiz-correct-answer]').value.trim().toUpperCase(),
            explanation: row.querySelector('[data-quiz-explanation]').value.trim()
        };
    }).filter(item => item.question || item.options.some(Boolean) || item.explanation);
}

async function openFlashcardReviewModal(materialId) {
    if (!materialId) return;
    const modal = document.getElementById('flashcard-review-modal');
    const content = document.getElementById('flashcard-review-content');
    content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Đang tải flashcard...</div>';
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        const res = await fetch(`${API_URL}/generations/${materialId}/`);
        if (!res.ok) throw new Error('Không thể tải flashcard');
        const material = await res.json();
        const cards = parseFlashcardJson(material.content);
        if (!cards.length) {
            content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Flashcard này chưa có nội dung để xem lại.</div>';
            return;
        }

        content.innerHTML = `
                    <div class="space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                            <div>
                                <p class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Flashcard</p>
                                <h4 class="font-bold text-slate-900 dark:text-white text-base mt-1">Danh sách thẻ ghi nhớ</h4>
                            </div>
                            <button onclick="openFlashcardEditorModal(${material.id})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-[10px] font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">Sửa flashcard</button>
                        </div>
                        ${cards.map((card, idx) => `
                            <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                <div id="flash-review-front-${idx}" class="space-y-3">
                                    <div class="text-[10px] uppercase tracking-wider font-bold text-brand-500">Question</div>
                                    <p class="text-base font-bold text-slate-900 dark:text-white">${card.question || 'Câu hỏi chưa có nội dung'}</p>
                                </div>
                                <div id="flash-review-back-${idx}" class="hidden space-y-3">
                                    <div class="text-[10px] uppercase tracking-wider font-bold text-emerald-500">Answer</div>
                                    <p class="text-sm text-slate-700 dark:text-slate-300">${card.answer || 'Chưa có đáp án'}</p>
                                </div>
                                <button onclick="toggleFlashcardReviewCard(${idx})" class="mt-4 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-[10px] font-semibold transition">Lật thẻ</button>
                            </div>
                        `).join('')}
                    </div>
                `;
    } catch (err) {
        console.error('Flashcard review error:', err);
        content.innerHTML = '<div class="text-center py-12 text-rose-500 dark:text-rose-400 text-xs">Không thể tải flashcard. Vui lòng thử lại.</div>';
    }
}

async function openFlashcardEditorModal(materialId) {
    if (!materialId) return;
    currentFlashcardEditingId = materialId;
    try {
        const res = await fetch(`${API_URL}/generations/${materialId}/`);
        if (!res.ok) throw new Error('Không thể tải flashcard để sửa');
        const material = await res.json();
        currentFlashcardEditorCards = parseFlashcardJson(material.content);
        if (!currentFlashcardEditorCards.length) {
            currentFlashcardEditorCards.push({ question: '', answer: '' });
        }
        renderFlashcardEditorForm(currentFlashcardEditorCards);
        document.getElementById('flashcard-editor-modal').classList.remove('hidden');
        document.getElementById('flashcard-editor-modal').classList.add('flex');
    } catch (err) {
        console.error('Open flashcard editor error:', err);
        alert('Không thể mở trình chỉnh sửa flashcard.');
    }
}

function closeFlashcardEditorModal() {
    const modal = document.getElementById('flashcard-editor-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentFlashcardEditingId = null;
    currentFlashcardEditorCards = [];
}

async function saveFlashcardEdit() {
    if (!currentFlashcardEditingId) return;
    const cards = collectFlashcardEditorCards();
    if (!cards.length) return alert('Vui lòng thêm ít nhất một flashcard.');
    try {
        const payload = JSON.stringify(cards, null, 2);
        const res = await fetchWithCsrf(`${API_URL}/generations/${currentFlashcardEditingId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: payload })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(JSON.stringify(err));
        }
        closeFlashcardEditorModal();
        closeFlashcardReviewModal();
        await loadNotebooks();
        if (activeNotebookId) await selectNotebook(activeNotebookId, true);
        alert('Đã cập nhật flashcard thành công!');
    } catch (err) {
        console.error('Save flashcard edit error:', err);
        alert('Lỗi khi lưu flashcard.');
    }
}

function renderQuizPlayContent(quizId, questions) {
    const content = document.getElementById('quiz-play-content');
    if (!content) return;
    const quizBlocks = questions.map((question, idx) => {
        const qId = `quiz-play-${question.id}`;
        const optionsHtml = question.options.map((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            return `
                        <button type="button" onclick="selectQuizOption(${question.id}, '${letter}', '${question.correct_option.toUpperCase()}')" id="${qId}-opt-${optIdx}" class="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-[11px] text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition font-medium">
                            ${formatQuizOption(opt, optIdx)}
                        </button>
                    `;
        }).join('');
        return `
                    <div class="quiz-question-card bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 space-y-3">
                        <div class="flex items-center justify-between gap-4">
                            <div>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Câu ${idx + 1}</span>
                                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">${question.question_text}</p>
                            </div>
                            <span id="${qId}-status" class="text-[10px] font-bold uppercase tracking-wide text-slate-400"></span>
                        </div>
                        <div id="${qId}-options" class="grid grid-cols-1 gap-2">${optionsHtml}</div>
                        <div id="${qId}-result" class="hidden text-[11px] font-bold p-3 rounded-xl"></div>
                        <div id="${qId}-explanation" class="hidden text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800"></div>
                    </div>
                `;
    }).join('');

    content.innerHTML = `
                <div class="space-y-4">
                    ${quizBlocks}
                    <div id="quiz-play-footer" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 text-sm text-slate-700 dark:text-slate-300">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <p class="font-semibold text-slate-900 dark:text-white">Chưa hoàn thành</p>
                                <p class="text-[10px] text-slate-500 dark:text-slate-400">Hãy trả lời tất cả các câu hỏi để lưu lần làm bài.</p>
                            </div>
                            <button type="button" onclick="submitQuizAttempt()" class="inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition">Nộp bài và lưu kết quả</button>
                        </div>
                        <div id="quiz-play-summary" class="mt-4 text-[10px] text-slate-500 dark:text-slate-400"></div>
                    </div>
                </div>
            `;
}

function selectQuizReviewOption(reviewId, selectedLetter, correctOption) {
    const qId = `quiz-review-${reviewId}`;
    const optionsContainer = document.getElementById(`${qId}-options`);
    if (!optionsContainer) return;
    const buttons = optionsContainer.querySelectorAll('button');
    const correctClasses = ['bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400'];
    const wrongClasses = ['bg-rose-500/10', 'dark:bg-rose-500/20', 'border-rose-500', 'text-rose-700', 'dark:text-rose-400'];
    const normalClasses = ['bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800', 'text-slate-700', 'dark:text-slate-300'];
    buttons.forEach(btn => {
        btn.classList.remove(...correctClasses, ...wrongClasses);
        btn.classList.add(...normalClasses);
    });

    const selectedIdx = selectedLetter.charCodeAt(0) - 65;
    const selectedBtn = document.getElementById(`${qId}-opt-${selectedIdx}`);
    const isCorrect = selectedLetter.toUpperCase() === correctOption.toUpperCase();
    if (selectedBtn) {
        if (isCorrect) {
            selectedBtn.classList.remove(...normalClasses);
            selectedBtn.classList.add(...correctClasses);
        } else {
            selectedBtn.classList.remove(...normalClasses);
            selectedBtn.classList.add(...wrongClasses);
            buttons.forEach((btn, idx) => {
                const letter = String.fromCharCode(65 + idx);
                if (letter === correctOption.toUpperCase()) {
                    btn.classList.remove(...normalClasses);
                    btn.classList.add(...correctClasses);
                }
            });
        }
    }

    buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-not-allowed');
    });

    const resultDiv = document.getElementById(`${qId}-result`);
    const statusSpan = document.getElementById(`quiz-review-status-${reviewId}`);
    if (resultDiv) {
        resultDiv.classList.remove('hidden');
        if (isCorrect) {
            resultDiv.className = 'text-[11px] font-bold p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
            resultDiv.innerText = '✓ Chính xác!';
        } else {
            resultDiv.className = 'text-[11px] font-bold p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20';
            resultDiv.innerText = '✗ Chưa chính xác.';
        }
    }
    if (statusSpan) {
        statusSpan.innerText = isCorrect ? 'Đúng' : 'Sai';
        statusSpan.className = `text-[10px] font-bold uppercase tracking-wide ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`;
    }

    const explanationDiv = document.getElementById(`${qId}-explanation`);
    const explanation = selectedBtn?.dataset?.explanation || '';
    if (explanationDiv) {
        explanationDiv.classList.remove('hidden');
        explanationDiv.innerText = explanation ? `Giải thích: ${explanation}` : (isCorrect ? 'Bạn đã chọn đúng!' : 'Hãy đọc kỹ và thử lại lần sau.');
    }
}

function selectQuizOption(questionId, selectedLetter, correctOption) {
    const qId = `quiz-play-${questionId}`;
    const buttons = document.querySelectorAll(`#${qId}-options button`);
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-not-allowed');
    });

    const selectedIdx = selectedLetter.charCodeAt(0) - 65;
    const selectedBtn = document.getElementById(`${qId}-opt-${selectedIdx}`);
    const isCorrect = selectedLetter.toUpperCase() === correctOption.toUpperCase();
    if (isCorrect) {
        selectedBtn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
    } else {
        selectedBtn.classList.add('bg-rose-500/10', 'dark:bg-rose-500/20', 'border-rose-500', 'text-rose-700', 'dark:text-rose-400');
        buttons.forEach((btn, idx) => {
            const letter = String.fromCharCode(65 + idx);
            if (letter === correctOption.toUpperCase()) {
                btn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
            }
        });
    }

    const resultDiv = document.getElementById(`${qId}-result`);
    resultDiv.classList.remove('hidden');
    if (isCorrect) {
        resultDiv.className = 'text-[11px] font-bold p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
        resultDiv.innerText = '✓ Chính xác!';
    } else {
        resultDiv.className = 'text-[11px] font-bold p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20';
        resultDiv.innerText = `✗ Chưa chính xác. Đáp án đúng là ${correctOption}.`;
    }

    const explanationDiv = document.getElementById(`${qId}-explanation`);
    explanationDiv.classList.remove('hidden');
    explanationDiv.innerText = `Giải thích: ${isCorrect ? 'Bạn đã chọn đúng!' : 'Hãy đọc kỹ và thử lại ở bài tiếp theo.'}`;

    currentQuizAnswers[String(questionId)] = selectedLetter.toUpperCase();
    const answeredCount = Object.keys(currentQuizAnswers).length;
    const questionCount = document.querySelectorAll('#quiz-play-content .quiz-question-card').length;
    const summary = document.getElementById('quiz-play-summary');
    if (summary) {
        summary.innerText = `Đã trả lời ${answeredCount} trong tổng số ${questionCount} câu hỏi.`;
    }
}

async function submitQuizAttempt() {
    if (!currentQuizPlaying) return;
    const totalQuestions = document.querySelectorAll('#quiz-play-content .quiz-question-card').length;
    const answeredCount = Object.keys(currentQuizAnswers).length;
    if (answeredCount < totalQuestions) {
        return alert('Vui lòng trả lời tất cả câu hỏi trước khi nộp bài.');
    }

    try {
        const res = await fetchWithCsrf(`${API_URL}/attempts/submit/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quiz: currentQuizPlaying, answers: currentQuizAnswers })
        });
        if (!res.ok) {
            const err = await res.json();
            return alert('Lỗi khi lưu kết quả: ' + JSON.stringify(err));
        }
        const data = await res.json();
        const summary = document.getElementById('quiz-play-summary');
        if (summary) {
            summary.innerHTML = `
                        <div class="space-y-2">
                            <p class="text-sm font-semibold text-slate-900 dark:text-white">Kết quả: ${data.score}/${data.total}</p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">Tỷ lệ chính xác: ${data.percentage}%</p>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400">Lần làm bài đã được lưu.</p>
                        </div>
                    `;
        }
        await loadNotebooks();
        if (activeNotebookId) {
            await selectNotebook(activeNotebookId, true);
        }
    } catch (err) {
        console.error('Lỗi khi nộp quiz:', err);
        alert('Đã xảy ra lỗi khi gửi kết quả.');
    }
}

// Render notes list in workspace tab
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

// POST Request: Submit initial thought to unlock AI
async function unlockNote(noteId) {
    const content = document.getElementById(`initial-input-${noteId}`).value.trim();
    if (content.length < 20) {
        return alert("Vui lòng ghi suy nghĩ dài ít nhất 20 ký tự để AI bắt đầu phản biện.");
    }

    try {
        const res = await fetchWithCsrf(`${API_URL}/notes/${noteId}/unlock/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initial_content: content })
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

// POST Request: Submit revised thought
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

// POST Request: AI generate study materials for a specific category
async function triggerAIGeneration(type) {
    if (!activeNotebookId) return alert("Vui lòng chọn một sổ tay trước.");
    try {
        const res = await fetchWithCsrf(`${API_URL}/notebooks/${activeNotebookId}/generate/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generation_type: type })
        });

        if (res.ok) {
            await selectNotebook(activeNotebookId, true);
        } else {
            const data = await res.json();
            alert("Lỗi Hệ thống sinh nội dung: " + (data.error || JSON.stringify(data)));
        }
    } catch (err) {
        console.error("Lỗi kết nối AI Generation:", err);
    }
}

// Render AI generated documents / study materials in split workspace category containers
function renderAIGenerations(generations, quizzes = []) {
    const categories = ['quiz', 'flashcards', 'mind_map', 'report'];
    const allStudyMaterials = [...(generations || []), ...(quizzes || []).map(q => ({
        ...q,
        generation_type: 'quiz',
        isQuizSet: true,
        created_at: q.created_at || new Date().toISOString()
    }))];
    const genericContainer = document.getElementById('ai-generations-container');

    // Clear containers
    categories.forEach(cat => {
        const el = document.getElementById(`ai-generations-${cat}`);
        if (el) el.innerHTML = '';
    });
    if (genericContainer) genericContainer.innerHTML = '';

    if (allStudyMaterials.length === 0) {
        categories.forEach(cat => {
            const el = document.getElementById(`ai-generations-${cat}`);
            if (el) el.innerHTML = `<div class="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl">Chưa có Study Materials nào trong notebook này. Hãy tạo quiz hoặc tài liệu học tập mới.</div>`;
        });
        if (genericContainer) {
            genericContainer.innerHTML = `<div class="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl">Chưa có tài liệu học tập nào được tạo trong notebook này.</div>`;
        }
        return;
    }

    if (genericContainer) {
        const labelMap = {
            quiz: 'Bài tập trắc nghiệm',
            flashcards: 'Flashcards',
            mind_map: 'Mind Map',
            report: 'Báo cáo',
            audio_overview: 'Audio Overview',
            presentation: 'Presentation',
            video_overview: 'Video Overview',
            infographics: 'Infographics',
            data_table: 'Data Table'
        };

        genericContainer.innerHTML = allStudyMaterials.slice().reverse().map(gen => {
            const label = labelMap[gen.generation_type] || 'Tài liệu học tập';
            let preview = 'Tài liệu học tập đã lưu.';
            try {
                const raw = String(gen.content || '').trim();
                if (raw) {
                    const contentPreview = raw.replace(/```/g, '').replace(/<[^>]*>/g, '').trim();
                    preview = contentPreview.length > 120 ? `${contentPreview.slice(0, 120)}...` : contentPreview;
                }
            } catch (err) {
                preview = 'Tài liệu học tập đã lưu.';
            }

            return `
                        <div class="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                            <div class="flex justify-between items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span class="text-[9px] uppercase tracking-wider font-bold text-slate-500">${label}</span>
                                <button onclick="deleteGeneration(${gen.id})" class="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline" title="Xóa kết quả">Xóa</button>
                            </div>
                            <p class="text-xs text-slate-700 dark:text-slate-300 line-clamp-4">${preview}</p>
                            <div class="text-[10px] text-slate-400">${new Date(gen.created_at).toLocaleString('vi-VN')}</div>
                        </div>
                    `;
        }).join('');
    }

    categories.forEach(cat => {
        const catGens = allStudyMaterials.filter(g => g.generation_type === cat || (cat === 'quiz' && g.isQuizSet));
        const el = document.getElementById(`ai-generations-${cat}`);
        if (!el) return;

        if (catGens.length === 0) {
            el.innerHTML = `<div class="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl">Chưa có Study Materials nào trong notebook này. Hãy tạo quiz hoặc tài liệu học tập mới.</div>`;
            return;
        }

        el.innerHTML = catGens.map(gen => {
            let renderedContent = '';
            if (gen.generation_type === 'quiz' || gen.generation_type === 'flashcards') {
                try {
                    let cleanContent = gen.content.trim();
                    if (cleanContent.startsWith("```")) {
                        cleanContent = cleanContent.replace(/^```(?:json)?/, "");
                        cleanContent = cleanContent.replace(/```$/, "");
                        cleanContent = cleanContent.trim();
                    }
                    const items = JSON.parse(cleanContent);
                    if (gen.generation_type === 'quiz') {
                        renderedContent = items.map((q, idx) => {
                            const qId = `quiz-${gen.id}-${idx}`;
                            return `
                                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3 text-left">
                                        <div class="font-bold text-slate-850 dark:text-slate-200 text-xs">Câu ${idx + 1}: ${q.question}</div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" id="${qId}-options">
                                            ${q.options.map((opt, optIdx) => {
                                const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
                                return `
                                                <button onclick="checkQuizAnswer('${qId}', '${letter}', '${q.answer}', ${optIdx})" id="${qId}-opt-${optIdx}" class="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-[11px] text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition font-medium">
                                                    ${opt}
                                                </button>
                                                `;
                            }).join('')}
                                        </div>
                                        <div id="${qId}-result" class="hidden text-[11px] font-bold p-3 rounded-xl"></div>
                                        <div id="${qId}-explanation" class="hidden text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                            Giải thích: ${q.explanation}
                                        </div>
                                    </div>
                                    `;
                        }).join('');
                    } else {
                        renderedContent = items.map((f, idx) => `
                                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-6 text-center">
                                        <div id="front-${gen.id}-${idx}">
                                            <div class = "text-[10px] font-bold text-slate-400 uppercase mb-3">
                                                Question
                                            </div>
                                        
                                            <div class = "text-sm font-bold text-slate-800 dark:text-slate-200">
                                                ${f.question}
                                            </div>
                                        </div>

                                        <div id = "back-${gen.id}-${idx}" class ="hidden">
                                            <div class = "text-[10px] font-bold text-brand-500 uppercase mb-3">
                                                Answer
                                            </div>

                                            <div class = "text-sm text-slate-700 dark:text-slate-300">
                                                ${f.answer}
                                            </div>
                                        </div>

                                        <button
                                            onclick="flipCard('${gen.id}-${idx}')"
                                            class = "mt-4 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-bold"
                                        >
                                            flip
                                        </button>
                                    </div>
                                `).join('');
                    }
                } catch (e) {
                    renderedContent = `<pre class="text-[11px] bg-slate-900 text-brand-400 p-4 rounded-xl overflow-auto whitespace-pre-wrap text-left">${gen.content}</pre>`;
                }
            } else {
                if (gen.generation_type === 'mind_map' && gen.content.includes("mindmap")) {
                    let cleanCode = gen.content.trim();
                    if (cleanCode.startsWith("```")) {
                        cleanCode = cleanCode.replace(/^```(?:mermaid)?/, "");
                        cleanCode = cleanCode.replace(/```$/, "");
                        cleanCode = cleanCode.trim();
                    }
                    const wsUniqueId = `jsmind-ws-${gen.id}-${Date.now()}`;
                    const wsGenId = String(gen.id);
                    const wsCleanCode = cleanCode;
                    renderedContent = `
                                <div class="space-y-3 text-left w-full mt-2">
                                    <div class="flex flex-wrap items-center gap-2 bg-slate-100/60 dark:bg-slate-900/40 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                                        <button onclick="addJsMindChildNode('ws-${gen.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-3 rounded-lg text-[9px] transition shadow">➕ Nhánh con</button>
                                        <button onclick="editJsMindNodeName('ws-${gen.id}')" class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-3 rounded-lg text-[9px] transition shadow">✏️ Sửa tên</button>
                                        <button onclick="removeJsMindNode('ws-${gen.id}')" class="bg-rose-500 hover:bg-rose-600 text-white font-bold py-1 px-3 rounded-lg text-[9px] transition shadow">🗑️ Xóa</button>
                                        <button onclick="updateSavedMindmap(${gen.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded-lg text-[9px] transition shadow">💾 Lưu</button>
                                        <div class="flex items-center space-x-1 ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
                                            <span class="text-[8px] font-bold text-slate-400 uppercase">Màu:</span>
                                            <button onclick="changeJsMindNodeColor('ws-${gen.id}', '#6366f1')" class="w-4 h-4 rounded-full bg-[#6366f1] hover:scale-110 transition"></button>
                                            <button onclick="changeJsMindNodeColor('ws-${gen.id}', '#10b981')" class="w-4 h-4 rounded-full bg-[#10b981] hover:scale-110 transition"></button>
                                            <button onclick="changeJsMindNodeColor('ws-${gen.id}', '#f43f5e')" class="w-4 h-4 rounded-full bg-[#f43f5e] hover:scale-110 transition"></button>
                                            <button onclick="changeJsMindNodeColor('ws-${gen.id}', '#f59e0b')" class="w-4 h-4 rounded-full bg-[#f59e0b] hover:scale-110 transition"></button>
                                        </div>
                                    </div>
                                    <div class="relative w-full border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                                        <div class="absolute top-2 left-3 text-[8px] font-bold text-slate-400 z-10 select-none">Đúp chuột để sửa, kéo để di chuyển</div>
                                        <div id="${wsUniqueId}" style="width:100%;height:300px;"></div>
                                    </div>
                                </div>
                            `;

                    (function (captId, captKey, captCode) {
                        setTimeout(function () {
                            const parsedTree = parseMermaidToJsMind(captCode);
                            initJsMindInstance(captKey, captId, parsedTree);
                        }, 200);
                    })(wsUniqueId, 'ws-' + wsGenId, wsCleanCode);
                } else {
                    renderedContent = `<div class="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 font-mono leading-relaxed text-left">${gen.content}</div>`;
                }
            }

            return `
                        <div class="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                            <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span class="text-[9px] text-slate-400 font-semibold">${new Date(gen.created_at).toLocaleString('vi-VN')}</span>
                                <button onclick="deleteGeneration(${gen.id})" class="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline" title="Xóa kết quả">Xóa</button>
                            </div>
                            <div class="space-y-3">
                                ${renderedContent}
                            </div>
                        </div>
                    `;
        }).reverse().join('');
    });
}

// Render unified view: Documents (Sources)
function renderAllDocumentsView() {
    const container = document.getElementById('all-documents-list');
    if (!container) return;

    let allSources = [];
    notebooks.forEach(nb => {
        const sources = nb.sources || [];
        sources.forEach(src => {
            allSources.push({ ...src, notebookName: nb.name, notebookId: nb.id, type: 'source' });
        });
        const quizzes = nb.quizzes || [];
        quizzes.forEach(quiz => {
            allSources.push({ ...quiz, notebookName: nb.name, notebookId: nb.id, type: 'quiz' });
        });
    });

    if (allSources.length === 0) {
        container.innerHTML = `<div class="col-span-full text-xs text-slate-400 text-center py-12">Không có tài liệu nào.</div>`;
        return;
    }

    container.innerHTML = allSources.map(src => `
                <div onclick="${src.type === 'quiz' ? `openQuizPlayModal(${src.id})` : `openDocumentModal(${src.id})`}" class="cursor-pointer bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 hover:scale-[1.01] hover:shadow-md transition hover:border-brand-300 dark:hover:border-brand-700">
                    <div class="flex justify-between items-start gap-3">
                        <div class="min-w-0">
                            <span class="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${src.type === 'quiz' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : (src.source_type === 'link' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300')}">
                                ${src.type === 'quiz' ? 'Bài tập trắc nghiệm' : (src.source_type === 'file' ? 'File PDF' : (src.source_type === 'link' ? 'Link' : 'Văn bản'))}
                            </span>
                            <h4 class="font-bold text-slate-850 dark:text-white text-sm mt-2 truncate">${src.type === 'quiz' ? src.name : src.title}</h4>
                        </div>
                        <div class="flex items-center space-x-2 shrink-0">
                            ${src.type !== 'quiz' ? `<button onclick="event.stopPropagation(); openDocumentModal(${src.id});" class="text-xs bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-3 py-1.5 font-bold transition shadow-sm flex items-center space-x-1"><span>📖</span> <span>Đọc ngay</span></button>` : ''}
                            <button onclick="event.stopPropagation(); switchView('notebooks'); selectNotebook(${src.notebookId});" class="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 font-semibold transition opacity-70 hover:opacity-100">Sổ tay</button>
                            ${src.type === 'quiz' ? `<button onclick="event.stopPropagation(); openQuizPlayModal(${src.id})" class="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Làm bài</button>` : `<button onclick="event.stopPropagation(); deleteSource(${src.id})" class="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition opacity-70 hover:opacity-100" title="Xóa tài liệu">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>`}
                        </div>
                    </div>
                    ${src.type === 'quiz' ? `<p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">${src.description || 'Bộ câu hỏi trắc nghiệm đã lưu.'}</p>` : `${src.file_path ? `<a href="${src.file_path}" target="_blank" class="text-[10px] text-brand-500 hover:underline truncate block mt-1">📄 Tải xuống file PDF</a>` : ''}
                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">${src.content}</p>`}
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                        <span>Sổ tay: <strong>${src.notebookName}</strong></span>
                        <span>${new Date(src.created_at || Date.now()).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            `).join('');
}

function renderStudyMaterialsView() {
    const container = document.getElementById('all-study-materials-list');
    if (!container) return;

    let allMaterials = [];
    notebooks.forEach(nb => {
        (nb.quizzes || []).forEach(quiz => {
            allMaterials.push({ ...quiz, notebookName: nb.name, notebookId: nb.id, materialType: 'quiz' });
        });
        (nb.generations || []).forEach(gen => {
            allMaterials.push({ ...gen, notebookName: nb.name, notebookId: nb.id, materialType: 'generation' });
        });
    });

    if (allMaterials.length === 0) {
        container.innerHTML = `<div class="col-span-full text-xs text-slate-400 text-center py-12">Chưa có tài nguyên học tập nào. Hãy tạo quiz, flashcards hoặc nội dung tự động từ sổ tay của bạn.</div>`;
        return;
    }

    const generationLabel = {
        quiz: 'Bài tập trắc nghiệm',
        flashcards: 'Flashcards',
        mind_map: 'Mind Map',
        report: 'Báo cáo',
        audio_overview: 'Audio Overview',
        presentation: 'Presentation',
        video_overview: 'Video Overview',
        infographics: 'Infographics',
        data_table: 'Data Table'
    };

    container.innerHTML = allMaterials.map(item => {
        const isQuiz = item.materialType === 'quiz';
        const label = isQuiz ? 'Bài tập trắc nghiệm' : (generationLabel[item.generation_type] || 'Tài liệu học tập');
        const title = isQuiz ? item.name : `${item.generation_type ? (generationLabel[item.generation_type] || item.generation_type) : 'Tài liệu học tập'}`;
        let summary = 'Không có mô tả nội dung.';
        if (isQuiz) {
            summary = item.description || 'Bộ câu hỏi trắc nghiệm đã lưu.';
        } else if (item.content) {
            if (item.generation_type === 'quiz' || item.generation_type === 'flashcards') {
                try {
                    let cleanContent = item.content.trim();
                    if (cleanContent.startsWith("```")) {
                        cleanContent = cleanContent.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
                    }
                    const arr = JSON.parse(cleanContent);
                    summary = `Gồm ${arr.length} ${item.generation_type === 'quiz' ? 'câu hỏi trắc nghiệm' : 'thẻ nhớ'}.`;
                } catch (e) {
                    summary = 'Tài liệu học tập đã lưu.';
                }
            } else if (item.generation_type === 'mind_map') {
                summary = 'Sơ đồ tư duy trực quan (Mermaid).';
            } else {
                summary = String(item.content).replace(/<[^>]*>/g, '').slice(0, 180);
            }
        }

        return `
                    <div class="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:scale-[1.01] hover:shadow-md transition">
                        <div class="flex justify-between items-start gap-3">
                            <div class="min-w-0">
                                <span class="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${isQuiz ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}">
                                    ${label}
                                </span>
                                <h4 class="font-bold text-slate-850 dark:text-white text-sm mt-2 truncate">${title}</h4>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                ${isQuiz ? `
                                    <button onclick="openQuizPlayModal(${item.id})" class="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Làm bài</button>
                                    <button onclick="openQuizReviewModal(${item.id})" class="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 font-semibold">Xem lại</button>
                                ` : ``}
                                ${!isQuiz && item.generation_type === 'flashcards' ? `
                                    <button onclick="openFlashcardReviewModal(${item.id})" class="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Xem lại</button>
                                    <button onclick="openFlashcardEditorModal(${item.id})" class="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Sửa</button>
                                ` : ``}
                                ${!isQuiz && item.generation_type === 'quiz' ? `
                                    <button onclick="openQuizReviewModal(${item.id})" class="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Xem lại</button>
                                    <button onclick="openQuizGenerationEditorModal(${item.id})" class="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Sửa</button>
                                ` : ``}
                                ${item.notebookId ? `<button onclick="switchView('notebooks'); selectNotebook(${item.notebookId});" class="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 font-semibold">Xem Sổ tay</button>` : ''}
                            </div>
                        </div>

                        <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-3">
                            ${summary}
                        </p>

                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 gap-2">
                            <span>Sổ tay: <strong>${item.notebookName || 'Không liên kết'}</strong></span>
                            <span>${new Date(item.created_at || Date.now()).toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>
                `;
    }).join('');
}

// Render unified view: Notes (Thoughts)
function renderAllNotesView() {
    const container = document.getElementById('all-notes-list');
    if (!container) return;

    let allNotes = [];
    notebooks.forEach(nb => {
        const notes = nb.notes || [];
        notes.forEach(note => {
            allNotes.push({ ...note, notebookName: nb.name, notebookId: nb.id });
        });
    });

    if (allNotes.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-400 text-center py-12">Không có ghi chú nào.</div>`;
        return;
    }

    container.innerHTML = allNotes.map(note => `
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:scale-[1.005] hover:shadow-md transition">
                    <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                            <h4 class="font-bold text-slate-850 dark:text-white text-sm">${note.title}</h4>
                            <span class="text-[10px] text-slate-400 mt-1 block">Trong sổ tay: <strong>${note.notebookName}</strong></span>
                        </div>
                        <button onclick="switchView('notebooks'); selectNotebook(${note.notebookId});" class="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700">Xem chi tiết</button>
                    </div>
                    ${note.is_locked ? `
                        <div class="bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-350 p-4 rounded-xl text-xs flex items-center space-x-2">
                            <span>🔒</span>
                            <span>Bài viết phản biện đang ở trạng thái Khóa. Hãy truy cập Sổ tay để mở khóa cùng AI.</span>
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150/40 dark:border-slate-800 text-xs">
                                <span class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Ý kiến của bạn</span>
                                <p class="text-slate-750 dark:text-slate-300 line-clamp-4">${note.initial_content}</p>
                            </div>
                            <div class="bg-indigo-50/30 dark:bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 text-xs">
                                <span class="text-[9px] text-indigo-500 uppercase font-bold block mb-1">Phân tích Logic</span>
                                <p class="text-slate-750 dark:text-slate-350 line-clamp-4">${note.ai_rebuttal}</p>
                            </div>
                        </div>
                    `}
                </div>
            `).join('');
}

// Render Recent Activity Table on Dashboard
function renderRecentActivityTable() {
    const tbody = document.getElementById('recent-activity-table-body');
    const emptyState = document.getElementById('table-empty-state');
    if (!tbody) return;

    let activities = [];
    notebooks.forEach(nb => {
        const sources = nb.sources || [];
        sources.forEach(src => {
            activities.push({
                id: src.id,
                name: src.title,
                type: 'Tài liệu liên quan',
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(src.created_at || Date.now()),
                status: 'Đã hoàn thành',
                isSource: true
            });
        });

        const notes = nb.notes || [];
        notes.forEach(note => {
            activities.push({
                id: note.id,
                name: note.title,
                type: 'Ghi chú (Note)',
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(note.created_at || Date.now()),
                status: note.is_locked ? 'Đang soạn thảo' : 'Phản biện xong',
                isSource: false
            });
        });

        const quizzes = nb.quizzes || [];
        quizzes.forEach(quiz => {
            activities.push({
                id: quiz.id,
                name: quiz.name,
                type: 'Bài tập (Quiz)',
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(quiz.updated_at || quiz.created_at || Date.now()),
                status: quiz.attempts_count > 0 ? 'Đã luyện' : 'Chưa làm',
                isSource: false
            });
        });
    });

    // Sort by date desc
    activities.sort((a, b) => b.date - a.date);

    if (activities.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    tbody.innerHTML = activities.map(act => `
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition duration-150 text-xs">
                    <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">${act.name}</td>
                    <td class="py-3 px-4">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${act.isSource ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'}">
                            ${act.type}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-slate-500 dark:text-slate-400">${act.notebookName}</td>
                    <td class="py-3 px-4 text-slate-400">${act.date.toLocaleDateString('vi-VN')}</td>
                    <td class="py-3 px-4">
                        <span class="inline-flex items-center">
                            <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${act.status === 'Đang soạn thảo' ? 'bg-rose-500' : 'bg-emerald-500'}"></span>
                            <span class="text-slate-650 dark:text-slate-400 font-medium">${act.status}</span>
                        </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                        <button onclick="switchView('notebooks'); selectNotebook(${act.notebookId}); switchTab('${act.isSource ? 'sources' : 'notes'}')" class="text-brand-600 dark:text-brand-400 font-bold hover:underline">
                            Xem chi tiết
                        </button>
                    </td>
                </tr>
            `).join('');
}

// Table local filtering
function filterTable() {
    const query = document.getElementById('table-search').value.toLowerCase();
    const typeFilter = document.getElementById('table-filter-type').value;
    const rows = document.querySelectorAll('#recent-activity-table-body tr');

    rows.forEach(row => {
        const cells = row.getElementsByTagName('td');
        if (cells.length < 5) return;

        const name = cells[0].innerText.toLowerCase();
        const type = cells[1].innerText;
        const notebook = cells[2].innerText.toLowerCase();

        const matchesSearch = name.includes(query) || notebook.includes(query);

        let matchesType = true;
        if (typeFilter === 'source') {
            matchesType = type.includes('Tài liệu');
        } else if (typeFilter === 'note') {
            matchesType = type.includes('Ghi chú');
        }

        row.style.display = (matchesSearch && matchesType) ? '' : 'none';
    });
}

// Global search in header
function handleGlobalSearch() {
    const query = document.getElementById('global-search').value.toLowerCase().trim();
    const popup = document.getElementById('search-results-popup');

    if (!query) {
        popup.classList.add('hidden');
        popup.innerHTML = '';
        // If dashboard is active, reset filters
        if (activeView === 'dashboard') {
            const ts = document.getElementById('table-search');
            if (ts) { ts.value = ''; filterTable(); }
        }
        return;
    }

    popup.classList.remove('hidden');
    let resultsHTML = '';
    let count = 0;

    notebooks.forEach(nb => {
        // Check Notebook name
        if (nb.name && nb.name.toLowerCase().includes(query)) {
            resultsHTML += `<div onclick="goToSearchResult(${nb.id}, 'sources')" class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 transition">
                        <div class="flex items-center space-x-3">
                            <span class="text-xl">📔</span>
                            <div>
                                <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200">${highlightText(nb.name, query)}</h4>
                                <p class="text-xs text-slate-500">Sổ tay</p>
                            </div>
                        </div>
                    </div>`;
            count++;
        }
        // Check Notes
        if (nb.notes) {
            nb.notes.forEach(note => {
                if ((note.title && note.title.toLowerCase().includes(query)) || (note.initial_content && note.initial_content.toLowerCase().includes(query))) {
                    resultsHTML += `<div onclick="goToSearchResult(${nb.id}, 'notes')" class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 transition">
                                <div class="flex items-center space-x-3">
                                    <span class="text-xl">📝</span>
                                    <div>
                                        <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200">${highlightText(note.title, query)}</h4>
                                        <p class="text-xs text-slate-500">Ghi chú trong ${nb.name}</p>
                                    </div>
                                </div>
                            </div>`;
                    count++;
                }
            });
        }
        // Check Sources
        if (nb.sources) {
            nb.sources.forEach(src => {
                if (src.title && src.title.toLowerCase().includes(query)) {
                    resultsHTML += `<div onclick="goToSearchResult(${nb.id}, 'sources')" class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 transition">
                                <div class="flex items-center space-x-3">
                                    <span class="text-xl">📄</span>
                                    <div>
                                        <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200">${highlightText(src.title, query)}</h4>
                                        <p class="text-xs text-slate-500">Tài liệu trong ${nb.name}</p>
                                    </div>
                                </div>
                            </div>`;
                    count++;
                }
            });
        }
        // Check Quizzes
        if (nb.quizzes) {
            nb.quizzes.forEach(q => {
                if (q.name && q.name.toLowerCase().includes(query)) {
                    resultsHTML += `<div onclick="goToSearchResult(${nb.id}, 'quiz', ${q.id})" class="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 transition">
                                <div class="flex items-center space-x-3">
                                    <span class="text-xl">❓</span>
                                    <div>
                                        <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200">${highlightText(q.name, query)}</h4>
                                        <p class="text-xs text-slate-500">Trắc nghiệm trong ${nb.name}</p>
                                    </div>
                                </div>
                            </div>`;
                    count++;
                }
            });
        }
    });

    if (count === 0) {
        popup.innerHTML = `<div class="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Không tìm thấy kết quả nào cho "<b>${query}</b>"</div>`;
    } else {
        popup.innerHTML = resultsHTML;
    }

    // Route search to table filter if Dashboard is active
    if (activeView === 'dashboard') {
        const ts = document.getElementById('table-search');
        if (ts) { ts.value = query; filterTable(); }
    }
}


async function goToSearchResult(notebookId, tabName, itemId = null) {
    document.getElementById('search-results-popup').classList.add('hidden');
    switchView('notebooks');
    activeTab = tabName;
    await selectNotebook(notebookId, true);
    if (itemId && tabName === 'quiz') {
        selectQuizSet(itemId);
    }
}

function highlightText(text, query) {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span translate="no" class="notranslate bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 font-bold px-1 rounded">$1</span>');
}

// Close search popup on outside click
document.addEventListener('click', (e) => {
    const popup = document.getElementById('search-results-popup');
    const searchInput = document.getElementById('global-search');
    if (popup && !popup.contains(e.target) && e.target !== searchInput) {
        popup.classList.add('hidden');
    }
});

// Render Chart.js
function renderCharts() {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';

    // Gather distribution of source types
    let textCount = 0;
    let linkCount = 0;
    let pdfCount = 0;
    notebooks.forEach(nb => {
        (nb.sources || []).forEach(src => {
            if (src.source_type === 'link') linkCount++;
            else if (src.source_type === 'file') pdfCount++;
            else textCount++;
        });
    });

    // 1. Weekly hours Chart
    const hoursCtx = document.getElementById('hoursChart');
    if (hoursCtx) {
        if (hoursChartObj) hoursChartObj.destroy();
        hoursChartObj = new Chart(hoursCtx, {
            type: 'bar',
            data: {
                labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'],
                datasets: [{
                    label: 'Số phút tự học',
                    data: [20, 15, 45, 10, 30, 25, 0],
                    backgroundColor: '#4f46e5',
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: labelColor }
                    },
                    y: {
                        border: { dash: [4, 4] },
                        grid: { color: gridColor },
                        ticks: { color: labelColor }
                    }
                }
            }
        });
    }

    // Handle empty state fallback
    const hasData = textCount > 0 || linkCount > 0 || pdfCount > 0;
    const chartData = hasData ? [textCount, linkCount, pdfCount] : [1, 0, 0];
    const chartLabels = hasData ? ['Văn bản nguồn', 'Web Link', 'Tài liệu PDF'] : ['Chưa có tài liệu', '', ''];
    const chartColors = hasData ? ['#6366f1', '#14b8a6', '#f43f5e'] : [isDark ? '#334155' : '#e2e8f0', 'transparent', 'transparent'];

    // 2. Type distribution Chart
    const distCtx = document.getElementById('distributionChart');
    if (distCtx) {
        if (distChartObj) distChartObj.destroy();
        distChartObj = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: isDark ? 3 : 1,
                    borderColor: isDark ? '#0f172a' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: labelColor, boxWidth: 12, padding: 15 }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// DELETE Request: Remove a Source
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

// DELETE Request: Remove an AI Generation
async function deleteGeneration(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa tài nguyên AI này?")) return;

    try {
        const res = await fetchWithCsrf(`${API_URL}/generations/${id}/`, {
            method: 'DELETE'
        });
        if (res.ok) {
            alert("Đã xóa tài nguyên AI thành công!");
            // Refresh data
            await loadNotebooks();
            if (activeNotebookId) {
                await selectNotebook(activeNotebookId, true);
            }
        } else {
            alert("Không thể xóa tài nguyên. Vui lòng thử lại.");
        }
    } catch (err) {
        console.error("Lỗi khi xóa tài nguyên AI:", err);
    }
}

// DELETE Request: Remove the active Notebook
async function deleteActiveNotebook() {
    if (!activeNotebookId) return;
    if (!confirm("Bạn có chắc chắn muốn xóa SỔ TAY này? Toàn bộ tài liệu, ghi chú và các câu hỏi AI đi kèm sẽ bị xóa vĩnh viễn và không thể khôi phục.")) return;

    try {
        const res = await fetchWithCsrf(`${API_URL}/notebooks/${activeNotebookId}/`, {
            method: 'DELETE'
        });
        if (res.ok) {
            alert("Đã xóa Sổ tay thành công!");
            activeNotebookId = null;

            // Hide workspace
            document.getElementById('notebook-workspace').classList.add('hidden');
            document.getElementById('notebook-actions').classList.add('hidden');
            document.getElementById('active-notebook-name').innerText = "Chọn một sổ tay từ danh sách để bắt đầu học tập";
            document.getElementById('active-notebook-desc').innerText = "Mẹo: Bạn có thể thêm các tài liệu tham khảo (PDF, trang web) rồi gửi phản biện để AI chấm điểm.";

            // Refresh
            await loadNotebooks();
            switchView('notebooks');
        } else {
            alert("Không thể xóa Sổ tay. Vui lòng thử lại.");
        }
    } catch (err) {
        console.error("Lỗi khi xóa Sổ tay:", err);
    }
}

// Interactive quiz correctness checker
function checkQuizAnswer(qId, selectedLetter, correctAnswer, selectedIdx) {
    const optionsContainer = document.getElementById(`${qId}-options`);
    const buttons = optionsContainer.getElementsByTagName('button');

    // Disable all buttons to prevent multiple clicks
    for (let btn of buttons) {
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-not-allowed');
    }

    const selectedBtn = document.getElementById(`${qId}-opt-${selectedIdx}`);
    const isCorrect = selectedLetter.toUpperCase() === correctAnswer.toUpperCase();

    // Highlight selected button
    if (isCorrect) {
        selectedBtn.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800');
        selectedBtn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
    } else {
        selectedBtn.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800');
        selectedBtn.classList.add('bg-rose-500/10', 'dark:bg-rose-500/20', 'border-rose-500', 'text-rose-700', 'dark:text-rose-400');

        // Find and highlight correct button in green
        for (let i = 0; i < buttons.length; i++) {
            const letter = String.fromCharCode(65 + i);
            if (letter.toUpperCase() === correctAnswer.toUpperCase()) {
                const correctBtn = document.getElementById(`${qId}-opt-${i}`);
                correctBtn.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800');
                correctBtn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
            }
        }
    }

    // Show result text and explanation
    const resultDiv = document.getElementById(`${qId}-result`);
    resultDiv.classList.remove('hidden');
    if (isCorrect) {
        resultDiv.innerText = "✓ Chính xác!";
        resultDiv.className = "text-[11px] font-bold p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
    } else {
        resultDiv.innerText = `✗ Chưa chính xác. Đáp án đúng là ${correctAnswer}.`;
        resultDiv.className = "text-[11px] font-bold p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20";
    }

    document.getElementById(`${qId}-explanation`).classList.remove('hidden');
}

function flipCard(id) {
    const front = document.getElementById(`front-${id}`);
    const back = document.getElementById(`back-${id}`);

    front.classList.toggle('hidden');
    back.classList.toggle('hidden');
}

function flipToolCard(id) {
    const front = document.getElementById(`tool-front-${id}`);
    const back = document.getElementById(`tool-back-${id}`);
    const btn = document.getElementById(`tool-btn-${id}`);

    const showingQuestion = !front.classList.contains('hidden');

    front.classList.toggle('hidden');
    back.classList.toggle('hidden');

    if (showingQuestion) {
        btn.textContent = 'Back to the question';
    } else {
        btn.textContent = 'Check the answer';
    }
}

// Toggle input fields for inline category-specific upload forms
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

// Handle inline document submissions for specific categories
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


function generateMockMermaidMindmap(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes("toán") || titleLower.includes("math") || titleLower.includes("đại số") || titleLower.includes("hình học") || titleLower.includes("giải tích") || titleLower.includes("lượng giác")) {
        return `mindmap
  root((${title}))
    [Đại số & Giải tích]
      (Hàm số và Đồ thị)
      (Phương trình & Hệ phương trình)
      (Đạo hàm & Tích phân)
    [Hình học không gian]
      (Hình chóp & Hình lăng trụ)
      (Véctơ & Hệ tọa độ Oxyz)
    [Lượng giác]
      (Công thức lượng giác)
      (Phương trình lượng giác)`;
    } else if (titleLower.includes("vật lý") || titleLower.includes("vật lí") || titleLower.includes("physics") || titleLower.includes("cơ học") || titleLower.includes("điện") || titleLower.includes("quang học")) {
        return `mindmap
  root((${title}))
    [Cơ học]
      (Động lực học chất điểm)
      (Định luật bảo toàn năng lượng)
    [Điện từ học]
      (Điện tích & Điện trường)
      (Dòng điện không đổi)
    [Quang học & Hạt nhân]
      (Khúc xạ & Phản xạ ánh sáng)
      (Phóng xạ & Phản ứng hạt nhân)`;
    } else if (titleLower.includes("tin học") || titleLower.includes("lập trình") || titleLower.includes("code") || titleLower.includes("python") || titleLower.includes("javascript") || titleLower.includes("máy tính")) {
        return `mindmap
  root((${title}))
    [Cấu trúc dữ liệu]
      (Mảng & Danh sách liên kết)
      (Cây & Đồ thị)
    [Lập trình hướng đối tượng]
      (Kế thừa & Đa hình)
      (Đóng gói & Trừu tượng)
    [Cơ sở dữ liệu]
      (SQL & Thiết kế bảng)
      (NoSQL & Tối ưu truy vấn)`;
    } else {
        return `mindmap
  root((${title}))
    [Khái niệm nền tảng]
      (Định nghĩa & Lịch sử phát triển)
      (Cơ sở lý thuyết cốt lõi)
    [Thành phần & Cấu trúc]
      (Nguyên lý hoạt động)
      (Quy trình vận hành hệ thống)
    [Ứng dụng & Hướng phát triển]
      (Giải quyết bài toán thực tế)
      (Hướng tối ưu & Tích hợp)`;
    }
}

// jsMind instances storage
let jmInstances = {};

function initJsMindInstance(key, containerId, treeData) {
    const tryInit = (retries) => {
        const containerEl = document.getElementById(containerId);
        if (!containerEl) {
            if (retries > 0) {
                setTimeout(() => tryInit(retries - 1), 100);
            } else {
                console.error("jsMind container not found after retries:", containerId);
            }
            return;
        }
        // Clean up any previous jsMind instance in this container
        if (jmInstances[key]) {
            try { jmInstances[key] = null; } catch (e) { }
        }
        containerEl.innerHTML = '';
        const options = {
            container: containerId,
            editable: true,
            theme: 'primary',
            support_html: true
        };
        try {
            const jm = new jsMind(options);
            jm.show(treeData);
            jmInstances[key] = jm;
        } catch (e) {
            console.error("Error initializing jsMind:", e);
        }
    };
    setTimeout(() => tryInit(5), 100);
}

function addJsMindChildNode(key) {
    const jm = jmInstances[key];
    if (!jm) return;
    const selected = jm.get_selected_node();
    if (!selected) {
        alert("Vui lòng chọn một nút trước khi thêm nhánh con!");
        return;
    }
    const nodeId = 'node_' + Date.now();
    jm.add_node(selected, nodeId, "Nhánh mới");
}

function editJsMindNodeName(key) {
    const jm = jmInstances[key];
    if (!jm) return;
    const selected = jm.get_selected_node();
    if (!selected) {
        alert("Vui lòng chọn nhánh cần sửa!");
        return;
    }
    const newTopic = prompt("Nhập nội dung mới:", selected.topic);
    if (newTopic && newTopic.trim() !== "") {
        jm.update_node(selected.id, newTopic.trim());
    }
}

function removeJsMindNode(key) {
    const jm = jmInstances[key];
    if (!jm) return;
    const selected = jm.get_selected_node();
    if (!selected) {
        alert("Vui lòng chọn nút cần xóa!");
        return;
    }
    if (selected.id === 'root') {
        alert("Không thể xóa nút gốc!");
        return;
    }
    jm.remove_node(selected);
}

function changeJsMindNodeColor(key, color) {
    const jm = jmInstances[key];
    if (!jm) return;
    const selected = jm.get_selected_node();
    if (!selected) {
        alert("Vui lòng chọn một nút để đổi màu!");
        return;
    }
    // jsMind 0.6.4 stores node data - update via set_node_data and re-render
    // Use direct DOM manipulation as fallback
    try {
        if (!selected.data) selected.data = {};
        selected.data['background-color'] = color;
        // Try official API first (may work in some versions)
        if (typeof jm.set_node_color === 'function') {
            jm.set_node_color(selected.id, color, '#ffffff');
        }
        else {
            jm.update_node(selected.id, selected.topic);
        }
        // Direct DOM approach
        const nodeEl = document.querySelector(`jmnode[nodeid="${selected.id}"]`);
        if (nodeEl) {
            nodeEl.style.setProperty('background-color', color, 'important');
            nodeEl.style.setProperty('color', '#ffffff', 'important');
        }
    } catch (e) {
        console.warn('Color change error:', e);
    }
}

// Mermaid Indentation Text to jsMind Node Tree Parser
function parseMermaidToJsMind(text) {
    const lines = text.trim().split("\n");
    let root = null;
    let nodeStack = [];
    let idCounter = 0;

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "mindmap") continue;

        const indent = line.length - line.trimStart().length;
        const level = Math.floor(indent / 2);

        let label = trimmed;
        if (label.startsWith("root((") && label.endsWith("))")) {
            label = label.slice(6, -2);
        } else if (label.startsWith("root") && label.includes("((")) {
            const start = label.indexOf("((");
            const end = label.lastIndexOf("))");
            if (start !== -1 && end !== -1) {
                label = label.slice(start + 2, end);
            }
        } else if (label.startsWith("((") && label.endsWith("))")) {
            label = label.slice(2, -2);
        } else if (label.startsWith("{{") && label.endsWith("}}")) {
            label = label.slice(2, -2);
        } else if (label.startsWith("[") && label.endsWith("]")) {
            label = label.slice(1, -1);
        } else if (label.startsWith("(") && label.endsWith(")")) {
            label = label.slice(1, -1);
        } else if (label.startsWith(")") && label.endsWith("(")) {
            label = label.slice(1, -1);
        }

        const node = {
            id: 'node_' + (++idCounter),
            topic: label,
            children: []
        };

        if (level === 1 || !root) {
            node.id = 'root';
            root = node;
            nodeStack = [{ level: 1, node: node }];
        } else {
            while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= level) {
                nodeStack.pop();
            }
            if (nodeStack.length > 0) {
                const parent = nodeStack[nodeStack.length - 1].node;
                parent.children.push(node);
            }
            nodeStack.push({ level: level, node: node });
        }
    }

    return {
        meta: { name: "jsmind", author: "edubrain", version: "0.2" },
        format: "node_tree",
        data: root || { id: "root", topic: "Sơ đồ trống", children: [] }
    };
}

// jsMind Node Tree back to Mermaid Indentation Text Serializer
function convertJsMindToMermaid(treeNode, indent = '  ') {
    let result = '';
    let topic = treeNode.topic || '';
    if (treeNode.id === 'root') {
        result += `${indent}root((${topic}))\n`;
    } else {
        result += `${indent}(${topic})\n`;
    }

    if (treeNode.children && treeNode.children.length > 0) {
        for (let child of treeNode.children) {
            result += convertJsMindToMermaid(child, indent + '  ');
        }
    }
    return result;
}

function getMermaidFromJsMind(jmInstance) {
    const treeData = jmInstance.get_data('node_tree');
    let result = 'mindmap\n';
    result += convertJsMindToMermaid(treeData.data, '  ');
    return result;
}

async function updateSavedMindmap(genId) {
    // Try workspace key first (ws-<id>), then fallback to direct key
    const jm = jmInstances['ws-' + genId] || jmInstances[genId];
    if (!jm) {
        alert("Không tìm thấy sơ đồ tư duy để lưu. Vui lòng thử lại.");
        return;
    }
    const mindData = jm.get_data();

    try {
        const res = await fetchWithCsrf(`${API_URL}/generations/${genId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: mindData })
        });

        if (res.ok) {
            alert("Đã cập nhật và lưu thay đổi sơ đồ tư duy thành công!");
        } else {
            const err = await res.json();
            alert("Lỗi lưu thay đổi: " + JSON.stringify(err));
        }
    } catch (err) {
        console.error("Lỗi cập nhật sơ đồ tư duy:", err);
    }
}

async function loadSavedMindmap(genId) {
    try {
        const res = await fetch(`${API_URL}/generations/${genId}/`);
        if (!res.ok) {
            alert("Không thể tải sơ đồ tư duy!");
            return;
        }

        const data = await res.json();
        // data.content chính là JSON bạn đã lưu từ jm.get_data()
        const mindData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;

        const jm = jmInstances['ws-' + genId] || jmInstances[genId];
        if (!jm) {
            alert("Không tìm thấy workspace để hiển thị sơ đồ!");
            return;
        }

        jm.show(mindData); // hiển thị lại sơ đồ với màu đã lưu
    } catch (err) {
        console.error("Lỗi tải sơ đồ tư duy:", err);
    }
}


async function generateWorkspaceMaterial(category) {
    const input = document.getElementById('tool-title-input-' + category);
    if (!input) return;
    const title = input.value.trim();
    if (!title) return alert("Vui lòng nhập chủ đề ôn tập!");

    const btn = document.getElementById('tool-btn-' + category);
    const output = document.getElementById('ai-generations-' + category);

    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // Show loading animation locally inside the results section
    if (output) {
        output.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-6 space-y-2 animate-pulse">
                        <div class="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                        <p class="text-[10px] text-slate-400">Đang sinh học liệu mẫu cho chủ đề: ${title}...</p>
                    </div>
                `;
    }

    setTimeout(async () => {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        let generatedContent = '';
        if (category === 'quiz') {
            generatedContent = JSON.stringify([
                {
                    "question": `Khái niệm cốt lõi nào quan trọng nhất khi thảo luận về ${title}?`,
                    "options": [
                        "A. Phân tích ngữ nghĩa thời gian thực",
                        "B. Xử lý offline độc lập và bảo mật cục bộ (Đáp án đúng)",
                        "C. Sử dụng tài nguyên điện toán đám mây lớn",
                        "D. Đòi hỏi cấu hình phần cứng đắt tiền"
                    ],
                    "answer": "B",
                    "explanation": `Đặc trưng nổi bật của ${title} khi triển khai là tính hoạt động offline hoàn chỉnh.`
                },
                {
                    "question": `Ưu điểm lớn nhất của mô hình lưu trữ cục bộ là gì?`,
                    "options": [
                        "A. Tăng băng thông mạng",
                        "B. Tối ưu chi phí hạ tầng và bảo mật thông tin tối đa (Đáp án đúng)",
                        "C. Đồng bộ hóa chậm",
                        "D. Kết nối nhiều API trực tuyến"
                    ],
                    "answer": "B",
                    "explanation": "Lưu trữ offline cục bộ giúp giảm thiểu rò rỉ dữ liệu học tập ra Internet."
                }
            ]);
        } else if (category === 'flashcards') {
            generatedContent = JSON.stringify([
                {
                    "question": `Khái niệm cơ bản của ${title} là gì?`,
                    "answer": `Giải pháp học tập thông minh chạy offline hoàn chỉnh cho phép sinh câu hỏi và sơ đồ.`
                },
                {
                    "question": `Mục tiêu phát triển chính của hệ thống?`,
                    "answer": "Tối ưu hóa khả năng phản biện tư duy của học sinh mà không phụ thuộc API key ngoài."
                }
            ]);
        } else if (category === 'report') {
            generatedContent = `BÁO CÁO TÓM TẮT HỌC THUẬT: ${title.toUpperCase()}\n\n1. Tổng quan: Đây là báo cáo mô phỏng về chủ đề ${title}.\n2. Nội dung cốt lõi: Thiết kế hệ thống tự học, sinh học liệu và sơ đồ tư duy Mermaid.js.\n3. Khuyến nghị: Cần tăng cường áp dụng các cấu trúc offline để đẩy nhanh tốc độ phản hồi học tập.`;
        } else if (category === 'mind_map') {
            generatedContent = generateMockMermaidMindmap(title);
        }

        try {
            // Send request to create the generation in Database
            const res = await fetchWithCsrf(`${API_URL}/generations/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notebook: activeNotebookId,
                    generation_type: category,
                    content: generatedContent
                })
            });

            if (res.ok) {
                // Reload notebook generations list
                if (activeNotebookId) {
                    selectNotebook(activeNotebookId, true);
                }
            } else {
                const err = await res.json();
                alert("Lỗi khi sinh tài liệu học tập: " + JSON.stringify(err));
            }
        } catch (err) {
            console.error("Lỗi sinh dữ liệu học tập:", err);
        }
    }, 1500);
}

let activeToolType = 'flashcards';

function openCreateModal(type) {
    activeToolType = type;
    const modal = document.getElementById('tool-modal');
    const icon = document.getElementById('modal-icon');
    const title = document.getElementById('modal-title');
    const subtitle = document.getElementById('modal-subtitle');

    const labelTitle = document.getElementById('tool-label-title');
    const labelText = document.getElementById('tool-label-text');
    const labelNotebook = document.getElementById('tool-label-notebook');

    // Reset default labels
    if (labelTitle) labelTitle.innerText = "Chủ đề học tập";
    if (labelText) labelText.innerText = "Nội dung chi tiết";
    if (labelNotebook) labelNotebook.innerText = "Lưu vào Sổ tay (tùy chọn)";

    // Reset modal state
    document.getElementById('tool-form').reset();
    document.getElementById('tool-form').classList.remove('hidden');
    document.getElementById('tool-loading').classList.add('hidden');
    document.getElementById('tool-output-section').classList.add('hidden');

    // Configure modal details based on selected tool
    const titleInput = document.getElementById('tool-input-title');
    const textInput = document.getElementById('tool-input-text');
    
    // Clear placeholders
    titleInput.placeholder = "";
    textInput.placeholder = "";

    if (type === 'quiz') {
        titleInput.classList.remove('hidden');
        textInput.classList.remove('hidden');
        
        if (labelTitle) {
            labelTitle.innerHTML = `
                1. Chủ đề / テーマ / Topic <span class="text-slate-400 font-normal">(Nhập chủ đề bạn muốn kiểm tra - VD: Lập trình Python / テストしたいテーマを入力 - 例: Python基礎)</span>
            `;
        }
        if (labelText) {
            labelText.innerHTML = `
                2. Tài liệu hoặc yêu cầu / 詳細・参考テキスト / Reference Text <span class="text-slate-400 font-normal">(Dán nội dung tài liệu học tập hoặc các yêu cầu cụ thể - Tùy chọn / クイズ作成の基となる参考テキストや指示を自由に入力 - 任意)</span>
            `;
        }
        
        titleInput.value = '';
        textInput.value = '';
        titleInput.required = false;
        textInput.required = false;
    } else if (type === 'report') {
        titleInput.classList.add('hidden');
        textInput.classList.remove('hidden');
        textInput.value = '';
        titleInput.required = false;
        textInput.required = true;
    } else {
        titleInput.classList.remove('hidden');
        textInput.classList.add('hidden');
        titleInput.value = ''; // Reset
        titleInput.required = true;
        textInput.required = false;
    }

    if (type === 'flashcards') {
        icon.innerText = '🎴';
        title.innerText = 'Tạo Flashcards';
        subtitle.innerText = 'Nhập chủ đề học tập để hệ thống sinh thẻ nhớ thông minh';
    } else if (type === 'quiz') {
        icon.innerText = '❓';
        title.innerText = 'Tạo Câu hỏi trắc nghiệm';
        subtitle.innerText = 'Nhập chủ đề hoặc tài liệu để AI sinh bộ câu hỏi trắc nghiệm kèm giải thích';
    } else if (type === 'report') {
        icon.innerText = '📝';
        title.innerText = 'Tạo Báo cáo tóm tắt';
        subtitle.innerText = 'Nhập chủ đề học tập để sinh báo cáo tóm lược học thuật';
    } else if (type === 'mindmap') {
        icon.innerText = '🌿';
        title.innerText = 'Tạo Sơ đồ tư duy';
        subtitle.innerText = 'Nhập chủ đề học tập để sinh sơ đồ tư duy dạng cây Mermaid.js';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeToolModal() {
    const modal = document.getElementById('tool-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function handleToolSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('tool-input-title').value.trim();
    const rawText = document.getElementById('tool-input-text').value.trim();
    const submitBtn = document.getElementById('tool-submit-btn');

    // Show loading state and hide previous output
    document.getElementById('tool-output-section').classList.add('hidden');
    document.getElementById('tool-loading').classList.remove('hidden');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    try {
        if (activeToolType === 'quiz') {
            let selectElem = document.getElementById('tool-notebook-select');
            let targetNotebookId = (selectElem && selectElem.value) ? selectElem.value : activeNotebookId;

            if (!targetNotebookId) {
                if (notebooks && notebooks.length > 0) {
                    targetNotebookId = notebooks[0].id;
                } else {
                    const createNbRes = await fetchWithCsrf(`${API_URL}/notebooks/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: 'Sổ tay tự học', description: 'Sổ tay chung cho các tài liệu sinh tự động' })
                    });
                    if (createNbRes.ok) {
                        const newNb = await createNbRes.json();
                        targetNotebookId = newNb.id;
                        await loadNotebooks();
                    }
                }
            }

            if (!targetNotebookId) {
                alert("Vui lòng chọn hoặc tạo một Sổ tay trước khi sinh Quiz.");
                return;
            }

            const res = await fetchWithCsrf(`${API_URL}/notebooks/${targetNotebookId}/generate/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    generation_type: 'quiz',
                    custom_title: title || 'Quiz ôn tập',
                    custom_text: rawText
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                alert("Lỗi khi sinh Quiz: " + (errData.error || JSON.stringify(errData)));
                return;
            }

            const genData = await res.json();
            const outputContent = document.getElementById('tool-output-content');
            outputContent.innerHTML = renderQuizJSONToHTML(genData.content, title || 'Bài tập trắc nghiệm');
            document.getElementById('tool-output-section').classList.remove('hidden');

            if (activeNotebookId && String(activeNotebookId) === String(targetNotebookId)) {
                await selectNotebook(activeNotebookId, true);
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const outputContent = document.getElementById('tool-output-content');
            let mockResult = '';

            if (activeToolType === 'flashcards') {
                mockResult = getFlashcardMockHTML(title);
            } else if (activeToolType === 'report') {
                mockResult = generateReportHTML(rawText, title);
            } else if (activeToolType === 'mindmap') {
                const mindmapData = getMindmapMockHTML(title);
                mockResult = mindmapData.html;
                setTimeout(() => {
                    const parsedTree = parseMermaidToJsMind(mindmapData.mermaid);
                    initJsMindInstance('modal', mindmapData.id, parsedTree);
                }, 100);
            }
            outputContent.innerHTML = mockResult;
            document.getElementById('tool-output-section').classList.remove('hidden');
        }
    } catch (err) {
        console.error("Tool submit error:", err);
        alert("Có lỗi xảy ra khi tạo nội dung: " + err.message);
    } finally {
        document.getElementById('tool-loading').classList.add('hidden');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

function renderQuizJSONToHTML(contentStr, title) {
    if (!contentStr) return '<div class="text-xs text-slate-400 py-4 text-center">Không có dữ liệu quiz.</div>';

    let clean = contentStr.trim();
    if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim();
    }

    let questions = [];
    try {
        questions = JSON.parse(clean);
    } catch (err) {
        if (typeof parseQuizText === 'function') {
            return parseQuizText(contentStr);
        }
        return `<div class="text-xs text-slate-400 py-4">${escapeHtml(contentStr)}</div>`;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
        if (typeof parseQuizText === 'function') {
            return parseQuizText(contentStr);
        }
        return '<div class="text-xs text-slate-400 py-4 text-center">Chưa có câu hỏi nào được sinh ra.</div>';
    }

    let html = `<div class="text-left font-sans space-y-4 w-full max-w-2xl mx-auto">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span class="text-xs font-bold text-brand-600 dark:text-brand-400">✨ Bộ câu hỏi Quiz</span>
            <span class="text-[10px] text-slate-400">Chủ đề: ${escapeHtml(title)}</span>
        </div>`;

    questions.forEach((q, index) => {
        const qId = `tool-quiz-q-${index}-${Date.now()}`;
        const options = Array.isArray(q.options) ? q.options : [];
        const correctAns = (q.answer || (typeof q.correct_index === 'number' ? String.fromCharCode(65 + q.correct_index) : 'A')).toString().toUpperCase();

        let optionsHtml = '';
        options.forEach((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            optionsHtml += `
                <button id="${qId}-opt-${optIdx}" onclick="checkQuizAnswer('${qId}', '${letter}', '${correctAns}', ${optIdx})" 
                class="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition shadow-sm w-full font-medium text-slate-700 dark:text-slate-300">
                    ${formatQuizOption(opt, optIdx)}
                </button>
            `;
        });

        html += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm hover:border-brand-300 transition-colors group">
                <span class="text-xs font-bold text-slate-850 dark:text-slate-100">Câu ${index + 1}: ${escapeHtml(q.question || q.question_text || '')}</span>
                <div class="grid grid-cols-1 gap-2 mt-2" id="${qId}-options">
                    ${optionsHtml}
                </div>
                <div id="${qId}-result" class="hidden text-[11px] font-bold p-3 rounded-xl"></div>
                <div id="${qId}-explanation" class="hidden text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    Giải thích: ${escapeHtml(q.explanation || 'Không có giải thích.')}
                </div>
            </div>
        `;
    });

    html += '</div>';

    let jsonEscaped = escapeHtml(JSON.stringify(questions));
    html += `<textarea id="quiz-hidden-data" class="hidden">${jsonEscaped}</textarea>`;

    return html;
}

function copyToolResult() {
    const content = document.getElementById('tool-output-content');
    if (!content) return;

    navigator.clipboard.writeText(content.innerText).then(() => {
        alert("Đã sao chép kết quả vào bộ nhớ tạm!");
    }).catch(err => {
        console.error("Không thể sao chép:", err);
    });
}

// POST Request: Save generated tool result to database (persists in backend)
async function saveToolResult() {
    const saveBtn = document.querySelector('button[onclick="saveToolResult()"]');
    let originalBtnHTML = '';
    if (saveBtn) {
        originalBtnHTML = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"></span> Đang lưu...';
    }

    let content = '';
    if (activeToolType === 'mindmap') {
        const jm = jmInstances['modal'];
        content = jm ? getMermaidFromJsMind(jm) : '';
    } else if (activeToolType === 'quiz') {
        const hiddenData = document.getElementById('quiz-hidden-data');
        content = hiddenData ? hiddenData.value : '';
    } else if (activeToolType === 'report') {
        const hiddenData = document.getElementById('report-hidden-data');
        content = hiddenData ? hiddenData.value : '';
    } else {
        const container = document.getElementById('tool-output-content');
        content = container ? container.innerText.trim() : '';
    }

    if (!content) {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHTML;
        }
        return alert("Không có nội dung để lưu!");
    }

    try {
        if (!activeNotebookId) {
            const nbRes = await fetch(`/api/notebooks/`);
            const nbs = await nbRes.json();
            if (nbs.length > 0) {
                activeNotebookId = nbs[0].id;
            } else {
                // Create a default notebook
                const createRes = await fetchWithCsrf(`${API_URL}/notebooks/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: "Sổ tay học tập", description: "Không gian học tập và lưu trữ sơ đồ tư duy" })
                });
                const newNb = await createRes.json();
                activeNotebookId = newNb.id;
            }
        }

        // POST to AIGeneration endpoint
        const saveRes = await fetchWithCsrf(`${API_URL}/generations/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notebook: activeNotebookId,
                generation_type: activeToolType === 'mindmap' ? 'mind_map' : activeToolType,
                content: content
            })
        });

        if (saveRes.ok) {
            showToastNotification("Đã lưu vào Sổ tay thành công!");
            await loadNotebooks(); // Refresh the global notebooks array
            if (activeNotebookId) {
                selectNotebook(activeNotebookId, true); // Refresh the workspace view
            }
            closeToolModal();
        } else {
            const err = await saveRes.json();
            alert("Lỗi lưu trữ: " + JSON.stringify(err));
        }
    } catch (err) {
        console.error("Lỗi khi lưu trữ:", err);
        alert("Đã xảy ra lỗi khi kết nối lưu trữ.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHTML;
        }
    }
}

function showToastNotification(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold z-[9999] transition-opacity duration-500';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}


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

