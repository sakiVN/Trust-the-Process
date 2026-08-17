let lastRenderedGoalPct = -1;

function updateDashboardStats(forceReanimate = false) {
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

    // 2. Stat Card 2: Weekly Goal Completion % with Multi-layered Sequential Stacking Animation
    const dailyGoalMinutes = typeof getDailyGoalMinutes === 'function' ? getDailyGoalMinutes() : 30;
    const weeklyTargetMinutes = dailyGoalMinutes * 7;
    const rolling7Days = typeof getRolling7DaysStudyData === 'function' ? getRolling7DaysStudyData() : [];
    const total7DaysMinutes = rolling7Days.reduce((acc, curr) => acc + (curr.minutes || 0), 0);

    const weeklyGoalPct = weeklyTargetMinutes > 0 ? Math.round((total7DaysMinutes / weeklyTargetMinutes) * 100) : 0;

    if (forceReanimate || lastRenderedGoalPct === -1) {
        animateWeeklyGoalSequence(weeklyGoalPct);
        lastRenderedGoalPct = weeklyGoalPct;
    } else if (lastRenderedGoalPct !== weeklyGoalPct) {
        setWeeklyGoalDirect(weeklyGoalPct);
        lastRenderedGoalPct = weeklyGoalPct;
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

// Dashboard table state
let currentDashboardTablePage = 1;
let dashboardTableSortBy = 'date_desc';
let dashboardTableFilterType = 'all';
const DASHBOARD_TABLE_PER_PAGE = 20;

function setDashboardTableSort(sortBy) {
    dashboardTableSortBy = sortBy;
    currentDashboardTablePage = 1;
    renderRecentActivityTable();
}

function setDashboardTableFilter(filterType) {
    dashboardTableFilterType = filterType;
    currentDashboardTablePage = 1;
    renderRecentActivityTable();
}

function setDashboardTablePage(page) {
    currentDashboardTablePage = page;
    renderRecentActivityTable();
    const tableEl = document.getElementById('recent-activity-table-body');
    if (tableEl) tableEl.closest('.overflow-x-auto')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.setDashboardTableSort = setDashboardTableSort;
window.setDashboardTableFilter = setDashboardTableFilter;
window.setDashboardTablePage = setDashboardTablePage;

function renderRecentActivityTable() {
    const tbody = document.getElementById('recent-activity-table-body');
    const emptyState = document.getElementById('table-empty-state');
    if (!tbody) return;

    const t = window.t || ((k, f) => f);
    const lang = localStorage.getItem('user_language') || 'vi';
    const localeStr = lang === 'en' ? 'en-US' : (lang === 'jp' ? 'ja-JP' : 'vi-VN');

    // Generation type label map
    const generationLabel = {
        quiz: t('key_tag_quiz', 'Trắc nghiệm'),
        flashcards: t('key_tag_flashcards', 'Flashcards'),
        mind_map: t('key_tag_mindmap', 'Mind Map'),
        report: t('key_tag_report', 'Báo cáo'),
        audio_overview: t('key_tag_audio', 'Audio Overview'),
        presentation: t('key_tag_presentation', 'Presentation'),
        video_overview: t('key_tag_video', 'Video Overview'),
        infographics: t('key_tag_infographic', 'Infographics'),
        data_table: t('key_tag_data_table', 'Data Table')
    };

    let activities = [];
    // Track quiz generation IDs to avoid duplicates with QuizSets
    let quizGenerationIds = new Set();

    notebooks.forEach(nb => {
        // 1. Sources (Related Documents)
        const sources = nb.sources || [];
        sources.forEach(src => {
            activities.push({
                id: src.id,
                name: src.title,
                type: t('key_tag_source', 'Tài liệu liên quan'),
                filterType: 'source',
                badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(src.created_at || Date.now()),
                status: t('key_status_completed', 'Đã hoàn thành'),
                tab: 'sources'
            });
        });

        // 2. Notes
        const notes = nb.notes || [];
        notes.forEach(note => {
            activities.push({
                id: note.id,
                name: note.title,
                type: t('key_tag_note', 'Ghi chú'),
                filterType: 'note',
                badgeColor: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(note.created_at || Date.now()),
                status: note.is_locked ? t('key_status_drafting', 'Đang soạn thảo') : t('key_status_reviewed', 'Phản biện xong'),
                tab: 'notes'
            });
        });

        // 3. Quizzes (QuizSet)
        const quizzes = nb.quizzes || [];
        quizzes.forEach(quiz => {
            activities.push({
                id: quiz.id,
                name: quiz.name,
                type: t('key_tag_quiz', 'Trắc nghiệm'),
                filterType: 'quiz',
                badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(quiz.updated_at || quiz.created_at || Date.now()),
                status: quiz.attempts_count > 0 ? t('key_status_practiced', 'Đã luyện') : t('key_status_not_done', 'Chưa làm'),
                tab: 'ai-gen'
            });
        });

        // 4. AI Generations (flashcards, mind_map, report, etc.)
        const generations = nb.generations || [];
        generations.forEach(gen => {
            // Skip quiz-type generations to avoid duplication with QuizSets
            if (gen.generation_type === 'quiz') {
                quizGenerationIds.add(gen.id);
                return;
            }
            const label = generationLabel[gen.generation_type] || t('key_tag_generation', 'Tài nguyên học tập');
            let badgeColor = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
            if (gen.generation_type === 'flashcards') badgeColor = 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
            else if (gen.generation_type === 'mind_map') badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
            else if (gen.generation_type === 'report') badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';

            activities.push({
                id: gen.id,
                name: label,
                type: label,
                filterType: gen.generation_type, // 'flashcards', 'mind_map', 'report', etc.
                badgeColor: badgeColor,
                notebookName: nb.name,
                notebookId: nb.id,
                date: new Date(gen.created_at || Date.now()),
                status: t('key_status_generated', 'Đã tạo'),
                tab: 'ai-gen'
            });
        });
    });

    // Sync filter dropdown
    const filterSelect = document.getElementById('table-filter-type');
    if (filterSelect && filterSelect.value !== dashboardTableFilterType) {
        filterSelect.value = dashboardTableFilterType;
    }

    // Sync sort dropdown
    const sortSelect = document.getElementById('table-sort-select');
    if (sortSelect && sortSelect.value !== dashboardTableSortBy) {
        sortSelect.value = dashboardTableSortBy;
    }

    // Filter activities by selected category before sorting and pagination
    if (dashboardTableFilterType !== 'all') {
        activities = activities.filter(act => act.filterType === dashboardTableFilterType);
    }

    // Sort
    activities.sort((a, b) => {
        if (dashboardTableSortBy === 'name_asc') {
            return (a.name || '').localeCompare(b.name || '', lang);
        } else if (dashboardTableSortBy === 'name_desc') {
            return (b.name || '').localeCompare(a.name || '', lang);
        } else if (dashboardTableSortBy === 'date_asc') {
            return a.date - b.date;
        } else { // date_desc (default)
            return b.date - a.date;
        }
    });

    // Pagination
    const totalItems = activities.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / DASHBOARD_TABLE_PER_PAGE));
    if (currentDashboardTablePage > totalPages) currentDashboardTablePage = totalPages;
    if (currentDashboardTablePage < 1) currentDashboardTablePage = 1;
    const startIdx = (currentDashboardTablePage - 1) * DASHBOARD_TABLE_PER_PAGE;
    const endIdx = startIdx + DASHBOARD_TABLE_PER_PAGE;
    const pageItems = activities.slice(startIdx, endIdx);

    if (totalItems === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
    } else {
        if (emptyState) emptyState.classList.add('hidden');

        const viewDetailText = t('key_btn_view_detail', 'Xem chi tiết');

        tbody.innerHTML = pageItems.map(act => `
            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition duration-150 text-xs" data-filter-type="${act.filterType}">
                <td class="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">${act.name}</td>
                <td class="py-3 px-4">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${act.badgeColor}">
                        ${act.type}
                    </span>
                </td>
                <td class="py-3 px-4 text-slate-500 dark:text-slate-400">${act.notebookName}</td>
                <td class="py-3 px-4 text-slate-400">${act.date.toLocaleDateString(localeStr)}</td>
                <td class="py-3 px-4">
                    <span class="inline-flex items-center">
                        <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${act.status.includes('soạn') || act.status.includes('Draft') || act.status.includes('作成中') || act.status.includes('Chưa') ? 'bg-rose-500' : 'bg-emerald-500'}"></span>
                        <span class="text-slate-650 dark:text-slate-400 font-medium">${act.status}</span>
                    </span>
                </td>
                <td class="py-3 px-4 text-right">
                    <button onclick="switchView('notebooks'); selectNotebook(${act.notebookId}); switchTab('${act.tab || 'sources'}')" class="text-brand-600 dark:text-brand-400 font-bold hover:underline cursor-pointer">
                        ${viewDetailText}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Render pagination (always visible)
    const paginationContainer = document.getElementById('dashboard-table-pagination');
    if (paginationContainer) {
        const showingStart = totalItems === 0 ? 0 : startIdx + 1;
        const showingEnd = Math.min(endIdx, totalItems);

        let pageButtons = '';
        let rangeStart = Math.max(1, currentDashboardTablePage - 2);
        let rangeEnd = Math.min(totalPages, rangeStart + 4);
        if (rangeEnd - rangeStart < 4) rangeStart = Math.max(1, rangeEnd - 4);

        for (let p = rangeStart; p <= rangeEnd; p++) {
            if (p === currentDashboardTablePage) {
                pageButtons += `<button class="w-8 h-8 rounded-lg text-xs font-bold bg-brand-600 text-white shadow-sm">${p}</button>`;
            } else {
                pageButtons += `<button onclick="setDashboardTablePage(${p})" class="w-8 h-8 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">${p}</button>`;
            }
        }

        paginationContainer.innerHTML = `
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <span class="text-[11px] text-slate-400">
                    ${t('key_pagination_display', 'Hiển thị')} <strong>${showingStart}-${showingEnd}</strong> ${t('key_of', '/')} <strong>${totalItems}</strong> ${t('key_total_docs_count', 'tài liệu')}
                </span>
                <div class="flex items-center gap-1.5">
                    <button onclick="setDashboardTablePage(${currentDashboardTablePage - 1})" ${currentDashboardTablePage <= 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${currentDashboardTablePage <= 1 ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                        ${t('key_prev_page', 'Trước')}
                    </button>
                    ${pageButtons}
                    <button onclick="setDashboardTablePage(${currentDashboardTablePage + 1})" ${currentDashboardTablePage >= totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${currentDashboardTablePage >= totalPages ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                        ${t('key_next_page', 'Sau')}
                    </button>
                </div>
            </div>
        `;
    }
}

function renderCharts() {
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    const lang = localStorage.getItem('user_language') || 'vi';

    // Gather distribution of source types (Plain Text, Web Link, PDF Document)
    let textCount = 0;
    let linkCount = 0;
    let pdfCount = 0;
    notebooks.forEach(nb => {
        (nb.sources || []).forEach(src => {
            if (src.source_type === 'link') {
                linkCount++;
            } else if (src.source_type === 'file' || src.source_type === 'pdf') {
                pdfCount++;
            } else {
                textCount++;
            }
        });
    });

    const t = window.t || ((k, f) => f);
    const studyMinsLabel = lang === 'en' ? 'Study Minutes' : (lang === 'jp' ? '学習時間(分)' : 'Số phút tự học');
    const textLabel = t('key_tag_text', lang === 'en' ? 'Plain Text' : (lang === 'jp' ? 'テキスト' : 'Văn bản nguồn'));
    const linkLabel = t('key_tag_link', lang === 'en' ? 'Web Link' : (lang === 'jp' ? 'ウェブリンク' : 'Web Link'));
    const pdfLabel = t('key_tag_pdf', lang === 'en' ? 'PDF Document' : (lang === 'jp' ? 'PDFファイル' : 'Tài liệu PDF'));

    // 1. Weekly Rolling 7 Days Chart
    const rolling7Days = typeof getRolling7DaysStudyData === 'function' ? getRolling7DaysStudyData() : [];
    const dayLabels = rolling7Days.map(item => item.dayLabel);
    const dayMinutesData = rolling7Days.map(item => item.minutes);
    const backgroundColors = rolling7Days.map(item => item.isToday ? '#6366f1' : (isDark ? '#4338ca' : '#4f46e5'));

    // Daily Goal from Settings
    const dailyGoalMinutes = typeof getDailyGoalMinutes === 'function' ? getDailyGoalMinutes() : 30;
    const maxDayMinutes = Math.max(0, ...dayMinutesData);
    const suggestedYMax = Math.max(dailyGoalMinutes + 10, maxDayMinutes + 10, 40);

    // Modern Coral Sunset Orange (much cleaner, vibrant and aesthetic than dull yellow)
    const goalLineColor = isDark ? '#fb923c' : '#f97316';

    // Chart.js Plugin to draw Daily Goal horizontal line behind the bars
    const dailyGoalLinePlugin = {
        id: 'dailyGoalLine',
        beforeDatasetsDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea || !scales || !scales.y) return;
            const currentGoal = typeof getDailyGoalMinutes === 'function' ? getDailyGoalMinutes() : dailyGoalMinutes;
            if (typeof currentGoal !== 'number' || isNaN(currentGoal) || currentGoal <= 0) return;

            const yPos = scales.y.getPixelForValue(currentGoal);
            if (yPos < chartArea.top || yPos > chartArea.bottom) return;

            const isDarkCurrent = document.documentElement.classList.contains('dark');
            const currentColor = isDarkCurrent ? '#fb923c' : '#f97316';

            ctx.save();
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(chartArea.left, yPos);
            ctx.lineTo(chartArea.right, yPos);
            ctx.stroke();
            ctx.restore();
        }
    };

    const hoursCtx = document.getElementById('hoursChart');
    if (hoursCtx) {
        if (hoursChartObj) {
            hoursChartObj.destroy();
            hoursChartObj = null;
        }
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
            plugins: [dailyGoalLinePlugin],
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
                        suggestedMax: suggestedYMax,
                        afterBuildTicks: function(scale) {
                            if (!scale || !Array.isArray(scale.ticks)) return;
                            const currentGoal = typeof getDailyGoalMinutes === 'function' ? getDailyGoalMinutes() : dailyGoalMinutes;
                            if (typeof currentGoal === 'number' && currentGoal > 0) {
                                if (!scale.ticks.some(t => t.value === currentGoal)) {
                                    scale.ticks.push({ value: currentGoal });
                                    scale.ticks.sort((a, b) => a.value - b.value);
                                }
                            }
                        },
                        ticks: {
                            color: function(context) {
                                const currentGoal = typeof getDailyGoalMinutes === 'function' ? getDailyGoalMinutes() : dailyGoalMinutes;
                                if (context && context.tick && context.tick.value === currentGoal) {
                                    return isDark ? '#fb923c' : '#f97316';
                                }
                                return labelColor;
                            },
                            font: function(context) {
                                const currentGoal = typeof getDailyGoalMinutes === 'function' ? getDailyGoalMinutes() : dailyGoalMinutes;
                                if (context && context.tick && context.tick.value === currentGoal) {
                                    return { size: 11, weight: '800' };
                                }
                                return { size: 11, weight: '500' };
                            },
                            beginAtZero: true
                        }
                    }
                }
            }
        });
    }

    // 2. Type distribution Chart
    const distCtx = document.getElementById('distributionChart');
    if (distCtx) {
        if (distChartObj) {
            distChartObj.destroy();
            distChartObj = null;
        }
        const totalSources = textCount + linkCount + pdfCount;
        distChartObj = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: [textLabel, linkLabel, pdfLabel],
                datasets: [{
                    data: totalSources > 0 ? [textCount, linkCount, pdfCount] : [0, 0, 0],
                    backgroundColor: ['#6366f1', '#14b8a6', '#f59e0b'],
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
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed !== undefined ? context.parsed : 0;
                                return ` ${label}: ${value}`;
                            }
                        }
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

/**
 * ============================================================================
 * SEQUENTIAL STACKED FILLING ANIMATION ENGINE (Weekly Goal Progress)
 * Fills tier-by-tier: 0->100% (Vàng) -> 100->200% (Xanh lá đè Vàng) ->
 * 200->300% (Xanh dương đè Xanh lá) -> >300% (Tím gradient phát sáng & MAX)
 * ============================================================================
 */
let currentWeeklyAnimRunId = 0;

async function animateWeeklyGoalSequence(targetPct) {
    const runId = ++currentWeeklyAnimRunId;

    const goalCardEl = document.getElementById('stat-weekly-goal-card');
    const goalIconWrapEl = document.getElementById('stat-weekly-goal-icon-wrap');
    const goalPctEl = document.getElementById('stat-weekly-goal-pct');
    const l1 = document.getElementById('stat-goal-layer-1');
    const l2 = document.getElementById('stat-goal-layer-2');
    const l3 = document.getElementById('stat-goal-layer-3');
    const l4 = document.getElementById('stat-goal-layer-4');
    const goalBarTextEl = document.getElementById('stat-weekly-goal-bar-text');

    if (!goalCardEl || !goalPctEl || !l1 || !l2 || !l3 || !l4 || !goalIconWrapEl) return;

    // Reset initial styles
    goalCardEl.classList.remove('stat-max-purple-card', 'stat-tier-green-card', 'stat-tier-blue-card');
    goalPctEl.classList.remove('stat-max-purple-text', 'stat-tier-green-text', 'stat-tier-blue-text');
    if (goalBarTextEl) goalBarTextEl.classList.add('hidden');

    l1.style.transition = "none";
    l2.style.transition = "none";
    l3.style.transition = "none";
    l4.style.transition = "none";
    l1.style.width = "0%";
    l2.style.width = "0%";
    l3.style.width = "0%";
    l4.style.width = "0%";

    if (targetPct <= 0) {
        goalPctEl.innerText = "0%";
        goalPctEl.className = "block text-2xl font-extrabold text-slate-400 dark:text-slate-500 mt-0.5";
        goalIconWrapEl.className = "p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shrink-0";
        return;
    }

    const wait = (ms) => new Promise(res => setTimeout(res, ms));

    const countNumber = (from, to, durationMs) => {
        return new Promise(resolve => {
            const start = performance.now();
            const tick = (now) => {
                if (runId !== currentWeeklyAnimRunId) return resolve();
                const progress = Math.min(1, (now - start) / durationMs);
                const currentVal = Math.round(from + (to - from) * progress);
                goalPctEl.innerText = `${currentVal}%`;
                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    goalPctEl.innerText = `${to}%`;
                    resolve();
                }
            };
            requestAnimationFrame(tick);
        });
    };

    // ------------------------------------------------------------------------
    // STAGE 1: 0% -> min(targetPct, 100%) [VÀNG - Amber]
    // ------------------------------------------------------------------------
    const stage1Target = Math.min(targetPct, 100);
    goalCardEl.classList.remove('stat-max-purple-card', 'stat-tier-green-card', 'stat-tier-blue-card');
    goalPctEl.className = "block text-2xl font-extrabold text-amber-500 dark:text-amber-400 mt-0.5";
    goalIconWrapEl.className = "p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0";

    await wait(20);
    if (runId !== currentWeeklyAnimRunId) return;

    l1.style.transition = "width 350ms cubic-bezier(0.25, 1, 0.5, 1)";
    l1.style.width = `${stage1Target}%`;
    await Promise.all([countNumber(0, stage1Target, 350), wait(350)]);
    if (runId !== currentWeeklyAnimRunId) return;

    if (targetPct <= 100) return;

    // ------------------------------------------------------------------------
    // STAGE 2: 100% -> min(targetPct, 200%) [XANH LÁ - Emerald Glow & Gradient]
    // ------------------------------------------------------------------------
    const stage2Target = Math.min(targetPct, 200);
    const stage2Fill = stage2Target - 100;

    goalCardEl.classList.remove('stat-max-purple-card', 'stat-tier-blue-card');
    goalCardEl.classList.add('stat-tier-green-card');
    goalPctEl.className = "block text-2xl font-extrabold stat-tier-green-text mt-0.5";
    goalIconWrapEl.className = "p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm shadow-emerald-500/20";

    await wait(20);
    if (runId !== currentWeeklyAnimRunId) return;

    l2.style.transition = "width 350ms cubic-bezier(0.25, 1, 0.5, 1)";
    l2.style.width = `${stage2Fill}%`;
    await Promise.all([countNumber(100, stage2Target, 350), wait(350)]);
    if (runId !== currentWeeklyAnimRunId) return;

    if (targetPct <= 200) return;

    // ------------------------------------------------------------------------
    // STAGE 3: 200% -> min(targetPct, 300%) [XANH DƯƠNG - Blue Glow & Gradient]
    // ------------------------------------------------------------------------
    const stage3Target = Math.min(targetPct, 300);
    const stage3Fill = stage3Target - 200;

    goalCardEl.classList.remove('stat-max-purple-card', 'stat-tier-green-card');
    goalCardEl.classList.add('stat-tier-blue-card');
    goalPctEl.className = "block text-2xl font-extrabold stat-tier-blue-text mt-0.5";
    goalIconWrapEl.className = "p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 shadow-sm shadow-blue-500/20";

    await wait(20);
    if (runId !== currentWeeklyAnimRunId) return;

    l3.style.transition = "width 350ms cubic-bezier(0.25, 1, 0.5, 1)";
    l3.style.width = `${stage3Fill}%`;
    await Promise.all([countNumber(200, stage3Target, 350), wait(350)]);
    if (runId !== currentWeeklyAnimRunId) return;

    if (targetPct <= 300) return;

    // ------------------------------------------------------------------------
    // STAGE 4: > 300% -> targetPct [TÍM - MAX Ultra Neon Glow & Gradient]
    // ------------------------------------------------------------------------
    goalCardEl.classList.remove('stat-tier-green-card', 'stat-tier-blue-card');
    goalCardEl.classList.add('stat-max-purple-card');
    goalPctEl.className = "block text-2xl font-extrabold stat-max-purple-text mt-0.5";
    goalIconWrapEl.className = "p-3.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-400 dark:text-purple-300 shrink-0 shadow-sm shadow-purple-500/30";

    await wait(20);
    if (runId !== currentWeeklyAnimRunId) return;

    l4.style.transition = "width 400ms cubic-bezier(0.25, 1, 0.5, 1)";
    l4.style.width = "100%";
    await Promise.all([countNumber(300, targetPct, 400), wait(400)]);
    if (runId !== currentWeeklyAnimRunId) return;

    if (goalBarTextEl) {
        goalBarTextEl.classList.remove('hidden');
    }
}

/**
 * Direct smooth update for live ticks without restarting animation
 */
function setWeeklyGoalDirect(targetPct) {
    const goalCardEl = document.getElementById('stat-weekly-goal-card');
    const goalIconWrapEl = document.getElementById('stat-weekly-goal-icon-wrap');
    const goalPctEl = document.getElementById('stat-weekly-goal-pct');
    const l1 = document.getElementById('stat-goal-layer-1');
    const l2 = document.getElementById('stat-goal-layer-2');
    const l3 = document.getElementById('stat-goal-layer-3');
    const l4 = document.getElementById('stat-goal-layer-4');
    const goalBarTextEl = document.getElementById('stat-weekly-goal-bar-text');

    if (!goalCardEl || !goalPctEl || !l1 || !l2 || !l3 || !l4 || !goalIconWrapEl) return;

    goalCardEl.classList.remove('stat-max-purple-card', 'stat-tier-green-card', 'stat-tier-blue-card');
    goalPctEl.classList.remove('stat-max-purple-text', 'stat-tier-green-text', 'stat-tier-blue-text');
    if (goalBarTextEl) goalBarTextEl.classList.add('hidden');

    l1.style.transition = "width 300ms ease-out";
    l2.style.transition = "width 300ms ease-out";
    l3.style.transition = "width 300ms ease-out";
    l4.style.transition = "width 300ms ease-out";

    if (targetPct <= 0) {
        goalPctEl.innerText = "0%";
        goalPctEl.className = "block text-2xl font-extrabold text-slate-400 dark:text-slate-500 mt-0.5";
        goalIconWrapEl.className = "p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shrink-0";
        l1.style.width = "0%";
        l2.style.width = "0%";
        l3.style.width = "0%";
        l4.style.width = "0%";
    } else if (targetPct <= 100) {
        goalPctEl.innerText = `${targetPct}%`;
        goalPctEl.className = "block text-2xl font-extrabold text-amber-500 dark:text-amber-400 mt-0.5";
        goalIconWrapEl.className = "p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0";
        l1.style.width = `${targetPct}%`;
        l2.style.width = "0%";
        l3.style.width = "0%";
        l4.style.width = "0%";
    } else if (targetPct <= 200) {
        goalCardEl.classList.add('stat-tier-green-card');
        goalPctEl.className = "block text-2xl font-extrabold stat-tier-green-text mt-0.5";
        goalPctEl.innerText = `${targetPct}%`;
        goalIconWrapEl.className = "p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm shadow-emerald-500/20";
        l1.style.width = "100%";
        l2.style.width = `${targetPct - 100}%`;
        l3.style.width = "0%";
        l4.style.width = "0%";
    } else if (targetPct <= 300) {
        goalCardEl.classList.add('stat-tier-blue-card');
        goalPctEl.className = "block text-2xl font-extrabold stat-tier-blue-text mt-0.5";
        goalPctEl.innerText = `${targetPct}%`;
        goalIconWrapEl.className = "p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 shadow-sm shadow-blue-500/20";
        l1.style.width = "100%";
        l2.style.width = "100%";
        l3.style.width = `${targetPct - 200}%`;
        l4.style.width = "0%";
    } else {
        goalCardEl.classList.add('stat-max-purple-card');
        goalPctEl.className = "block text-2xl font-extrabold stat-max-purple-text mt-0.5";
        goalPctEl.innerText = `${targetPct}%`;
        goalIconWrapEl.className = "p-3.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-400 dark:text-purple-300 shrink-0 shadow-sm shadow-purple-500/30";
        l1.style.width = "100%";
        l2.style.width = "100%";
        l3.style.width = "100%";
        l4.style.width = "100%";
        if (goalBarTextEl) goalBarTextEl.classList.remove('hidden');
    }
}

