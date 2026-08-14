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
    const nbCountEl = document.getElementById('stat-notebooks-count');
    if (nbCountEl) nbCountEl.innerText = notebooksCount;
    const docCountEl = document.getElementById('stat-documents-count');
    if (docCountEl) docCountEl.innerText = sourcesCount;
    const completionCard = document.querySelector('#view-dashboard .bg-amber-50')?.parentElement?.querySelector('div > span.block.text-2xl');
    if (completionCard) {
        completionCard.innerText = `${completionPct}%`;
    }
    const completionBar = document.querySelector('#view-dashboard .bg-amber-500.h-full');
    if (completionBar) {
        completionBar.style.width = `${completionPct}%`;
    }
}

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

    const lang = localStorage.getItem('user_language') || 'vi';
    const notesUnit = lang === 'en' ? 'notes' : (lang === 'jp' ? '件' : 'bài viết');
    const docsUnit = lang === 'en' ? 'documents' : (lang === 'jp' ? '件' : 'tài liệu');
    const setsUnit = lang === 'en' ? 'sets' : (lang === 'jp' ? 'セット' : 'bộ');

    const pNotes = document.getElementById('progress-notes-written');
    if (pNotes) pNotes.innerText = `${notesCount} ${notesUnit}`;
    const pSources = document.getElementById('progress-sources-count');
    if (pSources) pSources.innerText = `${sourcesCount} ${docsUnit}`;
    const pAiGen = document.getElementById('progress-mindmap-report-count');
    if (pAiGen) pAiGen.innerText = `${genCount} ${docsUnit}`;
    const pQuizFlash = document.getElementById('progress-quiz-flashcard-count');
    if (pQuizFlash) pQuizFlash.innerText = `${quizCount} ${setsUnit}`;
}

function renderRecentActivityTable() {
    const tbody = document.getElementById('recent-activity-table-body');
    const emptyState = document.getElementById('table-empty-state');
    if (!tbody) return;

    const t = window.t || ((k, f) => f);

    let activities = [];
    notebooks.forEach(nb => {
        const sources = nb.sources || [];
        sources.forEach(src => {
            activities.push({
                id: src.id,
                name: src.title,
                type: t('key_17', 'Tài liệu liên quan'),
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(src.created_at || Date.now()),
                status: t('key_status_completed', 'Đã hoàn thành'),
                isSource: true
            });
        });

        const notes = nb.notes || [];
        notes.forEach(note => {
            activities.push({
                id: note.id,
                name: note.title,
                type: t('key_18', 'Ghi chú (Note)'),
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(note.created_at || Date.now()),
                status: note.is_locked ? t('key_status_drafting', 'Đang soạn thảo') : t('key_status_reviewed', 'Phản biện xong'),
                isSource: false
            });
        });

        const quizzes = nb.quizzes || [];
        quizzes.forEach(quiz => {
            activities.push({
                id: quiz.id,
                name: quiz.name,
                type: t('key_44', 'Bài tập (Quiz)'),
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(quiz.updated_at || quiz.created_at || Date.now()),
                status: quiz.attempts_count > 0 ? t('key_status_practiced', 'Đã luyện') : t('key_status_not_done', 'Chưa làm'),
                isSource: false
            });
        });
    });

    // Sort by date desc
    activities.sort((a, b) => b.date - a.date);

    if (activities.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }
    if (emptyState) emptyState.classList.add('hidden');

    const viewDetailText = t('key_btn_view_detail', 'Xem chi tiết');
    const lang = localStorage.getItem('user_language') || 'vi';
    const localeStr = lang === 'en' ? 'en-US' : (lang === 'jp' ? 'ja-JP' : 'vi-VN');

    tbody.innerHTML = activities.map(act => `
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition duration-150 text-xs">
            <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">${act.name}</td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${act.isSource ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'}">
                    ${act.type}
                </span>
            </td>
            <td class="py-3 px-4 text-slate-500 dark:text-slate-400">${act.notebookName}</td>
            <td class="py-3 px-4 text-slate-400">${act.date.toLocaleDateString(localeStr)}</td>
            <td class="py-3 px-4">
                <span class="inline-flex items-center">
                    <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${act.status.includes('soạn') || act.status.includes('Draft') || act.status.includes('作成中') ? 'bg-rose-500' : 'bg-emerald-500'}"></span>
                    <span class="text-slate-650 dark:text-slate-400 font-medium">${act.status}</span>
                </span>
            </td>
            <td class="py-3 px-4 text-right">
                <button onclick="switchView('notebooks'); selectNotebook(${act.notebookId}); switchTab('${act.isSource ? 'sources' : 'notes'}')" class="text-brand-600 dark:text-brand-400 font-bold hover:underline">
                    ${viewDetailText}
                </button>
            </td>
        </tr>
    `).join('');
}

function renderCharts() {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const lang = localStorage.getItem('user_language') || 'vi';

    // Gather distribution of source types
    let textCount = 0;
    let linkCount = 0;
    notebooks.forEach(nb => {
        (nb.sources || []).forEach(src => {
            if (src.source_type === 'link') linkCount++;
            else textCount++;
        });
    });

    const dayLabels = lang === 'en' 
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] 
        : (lang === 'jp' ? ['月', '火', '水', '木', '金', '土', '日'] : ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']);
    
    const studyMinsLabel = lang === 'en' ? 'Study Minutes' : (lang === 'jp' ? '学習時間(分)' : 'Số phút tự học');
    const textLabel = lang === 'en' ? 'Plain Text' : (lang === 'jp' ? 'テキスト' : 'Văn bản nguồn');
    const linkLabel = lang === 'en' ? 'Web Link' : (lang === 'jp' ? 'ウェブリンク' : 'Web Link');

    // 1. Weekly hours Chart
    const hoursCtx = document.getElementById('hoursChart');
    if (hoursCtx) {
        if (hoursChartObj) hoursChartObj.destroy();
        hoursChartObj = new Chart(hoursCtx, {
            type: 'bar',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: studyMinsLabel,
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

    // 2. Type distribution Chart
    const distCtx = document.getElementById('distributionChart');
    if (distCtx) {
        if (distChartObj) distChartObj.destroy();
        distChartObj = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: [textLabel, linkLabel],
                datasets: [{
                    data: [textCount || 1, linkCount],
                    backgroundColor: ['#6366f1', '#14b8a6'],
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
