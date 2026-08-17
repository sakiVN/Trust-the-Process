/**
 * EduBrain Progress & Analytics Module
 * Computes longest study streak and individual learning resource counts,
 * and tracks the 5 resource construction progress bars across notebooks.
 */

// Global exports
window.calculateLongestStreak = calculateLongestStreak;
window.updateProgressViewStats = updateProgressViewStats;

/**
 * Calculate Longest Study Streak (consecutive days where study target was met)
 * and persistently store all-time longest streak in localStorage ('edubrain_longest_streak')
 */
function calculateLongestStreak() {
    let history = {};
    if (typeof getStudyHistory === 'function') {
        history = getStudyHistory();
    } else {
        try {
            const raw = localStorage.getItem('edubrain_daily_focus_seconds');
            if (raw) history = JSON.parse(raw);
        } catch (e) {
            console.error("Error loading study history for streak:", e);
        }
    }

    const dailyGoalMinutes = typeof getDailyGoalMinutes === 'function' ? getDailyGoalMinutes() : 30;
    const targetSeconds = dailyGoalMinutes * 60;

    // Dates meeting the daily target (or > 0 if target is 0)
    const qualifyingDates = Object.keys(history).filter(dateStr => {
        const secs = history[dateStr] || 0;
        return targetSeconds > 0 ? (secs >= targetSeconds) : (secs > 0);
    });

    let currentCalculatedMax = 0;
    if (qualifyingDates.length > 0) {
        // Convert 'YYYY-MM-DD' to day integers
        const dayNumbers = qualifyingDates.map(dStr => {
            const parts = dStr.split('-').map(Number);
            if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
            }
            return null;
        }).filter(n => n !== null).sort((a, b) => a - b);

        const uniqueDays = Array.from(new Set(dayNumbers));

        let currentStreak = 0;
        let prevDay = null;

        for (const day of uniqueDays) {
            if (prevDay === null) {
                currentStreak = 1;
            } else if (day === prevDay + 1) {
                currentStreak += 1;
            } else {
                currentStreak = 1;
            }
            if (currentStreak > currentCalculatedMax) {
                currentCalculatedMax = currentStreak;
            }
            prevDay = day;
        }
    }

    // Preserve all-time longest streak record in localStorage
    let storedMax = 0;
    try {
        storedMax = parseInt(localStorage.getItem('edubrain_longest_streak') || '0', 10);
        if (isNaN(storedMax)) storedMax = 0;
    } catch (e) {}

    const finalStreak = Math.max(storedMax, currentCalculatedMax);
    if (finalStreak > storedMax) {
        try {
            localStorage.setItem('edubrain_longest_streak', String(finalStreak));
        } catch (e) {}
    }

    return finalStreak;
}

/**
 * Update Progress & Analytics View Statistics
 */
function updateProgressViewStats() {
    const t = window.t || ((k, f) => f);
    const lang = localStorage.getItem('user_language') || 'vi';

    // Unit translations
    const daysUnit = t('key_progress_days_unit', lang === 'en' ? 'days' : (lang === 'jp' ? '日' : 'ngày'));
    const docsUnit = t('key_progress_docs_unit', lang === 'en' ? 'documents' : (lang === 'jp' ? '件' : 'tài liệu'));
    const setsUnit = t('key_progress_sets_unit', lang === 'en' ? 'sets' : (lang === 'jp' ? 'セット' : 'bộ'));
    const mindmapsUnit = t('key_progress_mindmaps_unit', lang === 'en' ? 'mindmaps' : (lang === 'jp' ? '件' : 'sơ đồ'));
    const reportsUnit = t('key_progress_reports_unit', lang === 'en' ? 'reports' : (lang === 'jp' ? '件' : 'báo cáo'));

    // 1. Calculate Longest Streak
    const longestStreak = calculateLongestStreak();
    const streakEl = document.getElementById('progress-longest-streak');
    if (streakEl) {
        streakEl.innerHTML = `${longestStreak} ${daysUnit} <span class="text-amber-500">🔥</span>`;
    }

    // 2. Count Effort Metrics across all notebooks
    let totalSources = 0;
    let totalFlashcards = 0;
    let totalQuizzes = 0;
    let totalMindmaps = 0;
    let totalReports = 0;

    // Track notebooks meeting criteria (at least 1 of each type)
    let nbWithSources = 0;
    let nbWithFlashcards = 0;
    let nbWithQuizzes = 0;
    let nbWithMindmaps = 0;
    let nbWithReports = 0;

    const totalNotebooks = Array.isArray(notebooks) ? notebooks.length : 0;

    if (totalNotebooks > 0) {
        notebooks.forEach(nb => {
            const sources = nb.sources || [];
            const generations = nb.generations || [];
            const quizzes = nb.quizzes || [];

            // Counts for this notebook
            const srcCount = sources.length;
            const fcCount = generations.filter(g => g.generation_type === 'flashcards').length;
            const mmCount = generations.filter(g => g.generation_type === 'mind_map').length;
            const rpCount = generations.filter(g => g.generation_type === 'report').length;
            
            // Quizzes count: combine QuizSets and any standalone quiz generations without duplicating
            const quizGenCount = generations.filter(g => g.generation_type === 'quiz').length;
            const qzCount = Math.max(quizzes.length, quizGenCount);

            // Accumulate totals
            totalSources += srcCount;
            totalFlashcards += fcCount;
            totalQuizzes += qzCount;
            totalMindmaps += mmCount;
            totalReports += rpCount;

            // Check if notebook has at least 1 item of each category
            if (srcCount >= 1) nbWithSources++;
            if (fcCount >= 1) nbWithFlashcards++;
            if (qzCount >= 1) nbWithQuizzes++;
            if (mmCount >= 1) nbWithMindmaps++;
            if (rpCount >= 1) nbWithReports++;
        });
    }

    // Update Left Card DOM elements
    const pSources = document.getElementById('progress-sources-count');
    if (pSources) pSources.innerText = `${totalSources} ${docsUnit}`;

    const pFlashcards = document.getElementById('progress-flashcards-count');
    if (pFlashcards) pFlashcards.innerText = `${totalFlashcards} ${setsUnit}`;

    const pQuizzes = document.getElementById('progress-quizzes-count');
    if (pQuizzes) pQuizzes.innerText = `${totalQuizzes} ${setsUnit}`;

    const pMindmaps = document.getElementById('progress-mindmaps-count');
    if (pMindmaps) pMindmaps.innerText = `${totalMindmaps} ${mindmapsUnit}`;

    const pReports = document.getElementById('progress-reports-count');
    if (pReports) pReports.innerText = `${totalReports} ${reportsUnit}`;

    // 3. Update Right Card: 5 Progress Bars
    const updateBar = (pctElId, fractionElId, barElId, count, total) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        
        const pctEl = document.getElementById(pctElId);
        if (pctEl) {
            pctEl.innerHTML = `${pct}% <span id="${fractionElId}" class="text-[11px] text-slate-400 font-normal">(${count}/${total})</span>`;
        }

        const barEl = document.getElementById(barElId);
        if (barEl) {
            barEl.style.width = `${pct}%`;
        }
    };

    updateBar('progress-sources-pct', 'progress-sources-fraction', 'progress-bar-sources', nbWithSources, totalNotebooks);
    updateBar('progress-flashcards-pct', 'progress-flashcards-fraction', 'progress-bar-flashcards', nbWithFlashcards, totalNotebooks);
    updateBar('progress-quizzes-pct', 'progress-quizzes-fraction', 'progress-bar-quizzes', nbWithQuizzes, totalNotebooks);
    updateBar('progress-mindmaps-pct', 'progress-mindmaps-fraction', 'progress-bar-mindmaps', nbWithMindmaps, totalNotebooks);
    updateBar('progress-reports-pct', 'progress-reports-fraction', 'progress-bar-reports', nbWithReports, totalNotebooks);
}
