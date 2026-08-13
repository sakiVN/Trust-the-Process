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

function renderCharts() {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';

    // Gather distribution of source types
    let textCount = 0;
    let linkCount = 0;
    notebooks.forEach(nb => {
        (nb.sources || []).forEach(src => {
            if (src.source_type === 'link') linkCount++;
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

    // 2. Type distribution Chart
    const distCtx = document.getElementById('distributionChart');
    if (distCtx) {
        if (distChartObj) distChartObj.destroy();
        distChartObj = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: ['Văn bản nguồn', 'Web Link'],
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

