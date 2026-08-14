function updateDashboardStats() {
    const t = window.t || ((k, f) => f);
    const lang = localStorage.getItem('user_language') || 'vi';
    const minutesUnit = lang === 'en' ? 'mins' : (lang === 'jp' ? '分' : 'phút');

    // 1. Stat Card 1: Today's Study Time (Minutes) and vs Yesterday Comparison
    const todaySeconds = typeof getTodayStudySeconds === 'function' ? getTodayStudySeconds() : 0;
    const todayMinutes = Math.floor(todaySeconds / 60);

    const studyTimeEl = document.getElementById('stat-today-study-time');
    if (studyTimeEl) {
        studyTimeEl.innerText = `${todayMinutes} ${minutesUnit}`;
    }

    const yesterdayMinutes = typeof getYesterdayStudyMinutes === 'function' ? getYesterdayStudyMinutes() : 0;
    const vsYesterdayEl = document.getElementById('stat-study-vs-yesterday');

    if (vsYesterdayEl) {
        const vsText = t('key_vs_yesterday', 'so với hôm qua');
        let pctDiff = 0;
        let isIncrease = true;
        let isSame = false;

        if (yesterdayMinutes === 0) {
            if (todayMinutes > 0) {
                pctDiff = 100;
                isIncrease = true;
            } else {
                pctDiff = 0;
                isSame = true;
            }
        } else {
            const diff = todayMinutes - yesterdayMinutes;
            pctDiff = Math.round((diff / yesterdayMinutes) * 100);
            if (pctDiff > 0) {
                isIncrease = true;
            } else if (pctDiff < 0) {
                isIncrease = false;
                pctDiff = Math.abs(pctDiff);
            } else {
                isSame = true;
            }
        }

        if (isSame) {
            vsYesterdayEl.className = "text-[11px] font-bold text-slate-400 flex items-center mt-0.5";
            vsYesterdayEl.innerHTML = `
                <span class="w-2 h-2 rounded-full bg-slate-400 mr-1.5 inline-block shrink-0"></span>
                <span id="stat-study-vs-yesterday-text">0% ${vsText}</span>
            `;
        } else if (isIncrease) {
            vsYesterdayEl.className = "text-[11px] font-bold text-emerald-500 flex items-center mt-0.5";
            vsYesterdayEl.innerHTML = `
                <svg class="w-3.5 h-3.5 mr-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span id="stat-study-vs-yesterday-text">+${pctDiff}% ${vsText}</span>
            `;
        } else {
            vsYesterdayEl.className = "text-[11px] font-bold text-rose-500 flex items-center mt-0.5";
            vsYesterdayEl.innerHTML = `
                <svg class="w-3.5 h-3.5 mr-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                <span id="stat-study-vs-yesterday-text">-${pctDiff}% ${vsText}</span>
            `;
        }
    }

    // 2. Stat Card 2: Weekly Goal Completion % with Color Tiers & Glowing MAX
    const dailyGoalMinutes = typeof getDailyGoalMinutes === 'function' ? getDailyGoalMinutes() : 30;
    const weeklyTargetMinutes = dailyGoalMinutes * 7;
    const rolling7Days = typeof getRolling7DaysStudyData === 'function' ? getRolling7DaysStudyData() : [];
    const total7DaysMinutes = rolling7Days.reduce((acc, curr) => acc + (curr.minutes || 0), 0);

    const weeklyGoalPct = weeklyTargetMinutes > 0 ? Math.round((total7DaysMinutes / weeklyTargetMinutes) * 100) : 0;

    const goalCardEl = document.getElementById('stat-weekly-goal-card');
    const goalIconWrapEl = document.getElementById('stat-weekly-goal-icon-wrap');
    const goalPctEl = document.getElementById('stat-weekly-goal-pct');
    const goalBarEl = document.getElementById('stat-weekly-goal-bar');
    const goalBadgeEl = document.getElementById('stat-weekly-goal-badge');

    if (goalCardEl && goalPctEl && goalBarEl && goalIconWrapEl) {
        // Reset custom classes
        goalCardEl.classList.remove('stat-max-purple-card');
        goalPctEl.classList.remove('stat-max-purple-text');
        goalBarEl.classList.remove('stat-max-purple-bar');
        if (goalBadgeEl) goalBadgeEl.classList.add('hidden');

        let barWidth = Math.min(100, weeklyGoalPct);

        if (weeklyGoalPct === 0) {
            // Tier 0: 0% -> Xám (Gray)
            goalPctEl.innerText = `0%`;
            goalPctEl.className = "block text-2xl font-extrabold text-slate-400 dark:text-slate-500 mt-0.5";
            goalBarEl.className = "bg-slate-400 dark:bg-slate-600 h-full transition-all duration-500";
            goalBarEl.style.width = `0%`;
            goalIconWrapEl.className = "p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shrink-0";
        } else if (weeklyGoalPct <= 100) {
            // Tier 1: 1 - 100% -> Vàng (Amber/Yellow)
            goalPctEl.innerText = `${weeklyGoalPct}%`;
            goalPctEl.className = "block text-2xl font-extrabold text-amber-500 dark:text-amber-400 mt-0.5";
            goalBarEl.className = "bg-amber-500 h-full transition-all duration-500";
            goalBarEl.style.width = `${barWidth}%`;
            goalIconWrapEl.className = "p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0";
        } else if (weeklyGoalPct <= 200) {
            // Tier 2: 101 - 200% -> Xanh lá (Emerald/Green)
            goalPctEl.innerText = `${weeklyGoalPct}%`;
            goalPctEl.className = "block text-2xl font-extrabold text-emerald-500 dark:text-emerald-400 mt-0.5";
            goalBarEl.className = "bg-emerald-500 h-full transition-all duration-500";
            goalBarEl.style.width = `100%`;
            goalIconWrapEl.className = "p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0";
        } else if (weeklyGoalPct <= 300) {
            // Tier 3: 201 - 300% -> Xanh dương (Blue/Indigo)
            goalPctEl.innerText = `${weeklyGoalPct}%`;
            goalPctEl.className = "block text-2xl font-extrabold text-blue-500 dark:text-blue-400 mt-0.5";
            goalBarEl.className = "bg-blue-500 h-full transition-all duration-500";
            goalBarEl.style.width = `100%`;
            goalIconWrapEl.className = "p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0";
        } else {
            // Tier 4: > 300% -> MAX & Tím phát sáng (Purple Neon Glow Aura)
            goalCardEl.classList.add('stat-max-purple-card');
            goalPctEl.classList.add('stat-max-purple-text');
            goalBarEl.classList.add('stat-max-purple-bar');
            goalPctEl.innerText = `MAX (${weeklyGoalPct}%)`;
            goalBarEl.style.width = `100%`;
            goalIconWrapEl.className = "p-3.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-500 dark:text-purple-300 shrink-0";
            if (goalBadgeEl) {
                goalBadgeEl.classList.remove('hidden');
                goalBadgeEl.innerText = 'MAX ⚡';
            }
        }
    }

    // 3. Stat Card 3: Notebooks Count
    const notebooksCount = notebooks.length;
    const nbCountEl = document.getElementById('stat-notebooks-count');
    if (nbCountEl) nbCountEl.innerText = notebooksCount;

    // 4. Stat Card 4: Documents Count
    let sourcesCount = 0;
    notebooks.forEach(nb => {
        sourcesCount += (nb.sources || []).length;
    });
    const docCountEl = document.getElementById('stat-documents-count');
    if (docCountEl) docCountEl.innerText = sourcesCount;
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
                <button onclick="switchView('notebooks'); selectNotebook(${act.notebookId}); switchTab('${act.isSource ? 'sources' : 'notes'}')" class="text-brand-600 dark:text-brand-400 font-bold hover:underline cursor-pointer">
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

    const studyMinsLabel = lang === 'en' ? 'Study Minutes' : (lang === 'jp' ? '学習時間(分)' : 'Số phút tự học');
    const textLabel = lang === 'en' ? 'Plain Text' : (lang === 'jp' ? 'テキスト' : 'Văn bản nguồn');
    const linkLabel = lang === 'en' ? 'Web Link' : (lang === 'jp' ? 'ウェブリンク' : 'Web Link');

    // 1. Weekly Rolling 7 Days Chart
    const rolling7Days = typeof getRolling7DaysStudyData === 'function' ? getRolling7DaysStudyData() : [];
    const dayLabels = rolling7Days.map(item => item.dayLabel);
    const dayMinutesData = rolling7Days.map(item => item.minutes);
    const backgroundColors = rolling7Days.map(item => item.isToday ? '#6366f1' : (isDark ? '#4338ca' : '#4f46e5'));

    const hoursCtx = document.getElementById('hoursChart');
    if (hoursCtx) {
        if (hoursChartObj) hoursChartObj.destroy();
        hoursChartObj = new Chart(hoursCtx, {
            type: 'bar',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: studyMinsLabel,
                    data: dayMinutesData,
                    backgroundColor: backgroundColors,
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.parsed.y} ${lang === 'en' ? 'mins' : (lang === 'jp' ? '分' : 'phút')}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: labelColor, font: { size: 11, weight: '600' } }
                    },
                    y: {
                        border: { dash: [4, 4] },
                        grid: { color: gridColor },
                        ticks: { color: labelColor, beginAtZero: true, font: { size: 11 } }
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
                        labels: { color: labelColor, boxWidth: 12, padding: 15, font: { size: 11, weight: '600' } }
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
