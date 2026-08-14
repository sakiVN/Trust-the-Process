/**
 * EduBrain Focus Mode & Study Timer Module
 * Handles fullscreen focus mode, real-time stopwatch timer, daily study persistence,
 * midnight resets (after 23:59:59), and weekly goal calculation.
 */

// State
let focusInterval = null;
let isFocusModeActive = false;
let isFocusTimerPaused = false;
let focusLastTickTime = null;

// High-Precision In-Memory Cache to prevent integer truncation glitches
let inMemoryStudyHistory = null;
let inMemoryTodaySeconds = null;
let inMemoryCurrentDateStr = null;

/**
 * Format seconds to HH:MM:SS
 */
function formatHHMMSS(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Parse daily goal string/number to minutes (default 30)
 */
function parseDailyGoalToMinutes(goalVal) {
    if (!goalVal) return 30;
    if (typeof goalVal === 'number') return goalVal;
    
    // Extract first number from strings like '30 phút', '60 phút / ngày', '2+ giờ'
    const str = String(goalVal).toLowerCase();
    if (str.includes('giờ') || str.includes('hour') || str.includes('時間')) {
        const match = str.match(/(\d+(\.\d+)?)/);
        if (match) {
            return Math.round(parseFloat(match[1]) * 60);
        }
        return 120;
    }
    const match = str.match(/(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return 30;
}

/**
 * Get daily goal in minutes from user profile
 */
function getDailyGoalMinutes() {
    try {
        const stored = localStorage.getItem('edubrain_user');
        if (stored) {
            const user = JSON.parse(stored);
            if (user && user.dailyGoal) {
                return parseDailyGoalToMinutes(user.dailyGoal);
            }
        }
    } catch (e) {
        console.error("Error reading daily goal:", e);
    }
    return 30; // default 30 minutes
}

/**
 * Get formatted local date string YYYY-MM-DD
 */
function getLocalDateString(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Load all study records from localStorage: { "YYYY-MM-DD": seconds }
 */
function getStudyHistory() {
    const todayStr = getLocalDateString();
    if (!inMemoryStudyHistory || inMemoryCurrentDateStr !== todayStr) {
        inMemoryCurrentDateStr = todayStr;
        try {
            const data = localStorage.getItem('edubrain_daily_focus_seconds');
            if (data) {
                inMemoryStudyHistory = JSON.parse(data);
            }
        } catch (e) {
            console.error("Error loading study history:", e);
        }
        
        if (!inMemoryStudyHistory) {
            inMemoryStudyHistory = seedInitialStudyHistory();
            saveStudyHistory(inMemoryStudyHistory);
        }
        inMemoryTodaySeconds = inMemoryStudyHistory[todayStr] || 0;
    }
    return inMemoryStudyHistory;
}

/**
 * Seed initial realistic past days data if user is new
 */
function seedInitialStudyHistory() {
    const history = {};
    const today = new Date();
    const defaultMins = [25, 30, 10, 45, 15, 20];
    
    for (let i = 6; i >= 1; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const dateStr = getLocalDateString(d);
        const mins = defaultMins[6 - i] || 25;
        history[dateStr] = mins * 60; // in seconds
    }
    
    // Today initial seconds (e.g. 20 minutes = 1200s)
    const todayStr = getLocalDateString(today);
    history[todayStr] = 20 * 60;
    
    return history;
}

/**
 * Save study history to localStorage
 */
function saveStudyHistory(history) {
    inMemoryStudyHistory = history;
    try {
        localStorage.setItem('edubrain_daily_focus_seconds', JSON.stringify(history));
    } catch (e) {
        console.error("Error saving study history:", e);
    }
}

/**
 * Get today's total study seconds (exact in-memory accumulator)
 */
function getTodayStudySeconds() {
    getStudyHistory(); // ensures initialization
    return inMemoryTodaySeconds !== null ? inMemoryTodaySeconds : 0;
}

/**
 * Save today's study seconds
 */
function setTodayStudySeconds(seconds, persistImmediately = false) {
    getStudyHistory();
    const todayStr = getLocalDateString();
    inMemoryTodaySeconds = Math.max(0, seconds);
    inMemoryStudyHistory[todayStr] = Math.round(inMemoryTodaySeconds);
    if (persistImmediately) {
        saveStudyHistory(inMemoryStudyHistory);
    }
}

/**
 * Get yesterday's study minutes
 */
function getYesterdayStudyMinutes() {
    const history = getStudyHistory();
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = getLocalDateString(yesterday);
    const seconds = history[yesterdayStr] || 0;
    return Math.floor(seconds / 60);
}

/**
 * Get Rolling 7 Days Data (D-6 to D-0 Today)
 * Returns array of 7 objects with date, day name label, minutes, and isToday flag.
 */
function getRolling7DaysStudyData() {
    const history = getStudyHistory();
    const lang = localStorage.getItem('user_language') || 'vi';
    const dayNamesVi = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesJp = ['日', '月', '火', '水', '木', '金', '土'];
    
    const dayNames = lang === 'en' ? dayNamesEn : (lang === 'jp' ? dayNamesJp : dayNamesVi);
    const todayLabel = lang === 'en' ? 'Today' : (lang === 'jp' ? '今日' : 'Hôm nay');

    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const dateStr = getLocalDateString(d);
        const dayOfWeek = d.getDay(); // 0 is Sunday
        const dayName = dayNames[dayOfWeek];
        const isToday = (i === 0);
        
        let label = dayName;
        if (isToday) {
            label = `${dayName} (${todayLabel})`;
        }

        const totalSecs = history[dateStr] || 0;
        const minutes = Math.floor(totalSecs / 60);

        result.push({
            dateStr: dateStr,
            dayLabel: label,
            shortLabel: dayName,
            minutes: minutes,
            seconds: totalSecs,
            isToday: isToday
        });
    }

    return result;
}

/**
 * Update Focus Timer UI widgets
 */
function updateFocusTimerDisplay() {
    const todaySeconds = getTodayStudySeconds();
    const targetMinutes = getDailyGoalMinutes();
    const targetSeconds = targetMinutes * 60;

    const formattedToday = formatHHMMSS(todaySeconds);
    const formattedTarget = formatHHMMSS(targetSeconds);

    // 1. Text displays
    const todayTimeEls = document.querySelectorAll('.focus-today-time-val');
    todayTimeEls.forEach(el => el.textContent = formattedToday);

    const targetTimeEls = document.querySelectorAll('.focus-target-time-val');
    targetTimeEls.forEach(el => el.textContent = formattedTarget);

    const combinedTimerEls = document.querySelectorAll('.focus-combined-timer');
    combinedTimerEls.forEach(el => {
        el.textContent = `${formattedToday} / ${formattedTarget}`;
    });

    // 2. Target completion styling
    const isGoalReached = todaySeconds >= targetSeconds && targetSeconds > 0;
    
    // Highlight timer containers with emerald/gold aura when target is reached
    const timerContainers = document.querySelectorAll('.focus-timer-container');
    timerContainers.forEach(container => {
        if (isGoalReached) {
            container.classList.add('goal-reached');
            container.classList.remove('goal-in-progress');
        } else {
            container.classList.remove('goal-reached');
            container.classList.add('goal-in-progress');
        }
    });

    // Goal badge
    const badgeEl = document.getElementById('focus-goal-badge');
    if (badgeEl) {
        if (isGoalReached) {
            badgeEl.classList.remove('hidden');
            badgeEl.innerHTML = `🎉 <span translate="key_goal_reached">Đã đạt mục tiêu!</span>`;
        } else {
            badgeEl.classList.add('hidden');
        }
    }

    // Update Floating Action Button text badge
    const fabBadge = document.getElementById('focus-fab-badge');
    if (fabBadge) {
        const todayMins = Math.floor(todaySeconds / 60);
        fabBadge.textContent = `${todayMins}/${targetMinutes}m`;
        if (isGoalReached) {
            fabBadge.className = "text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-400/50";
        } else {
            fabBadge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white";
        }
    }
}

/**
 * Start Focus Mode
 */
function startFocusMode() {
    isFocusModeActive = true;
    isFocusTimerPaused = false;
    focusLastTickTime = Date.now();

    // 1. Enter Fullscreen
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(err => {
            console.warn("Fullscreen request warning:", err.message);
        });
    } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
    }

    // 2. Show Focus Bar UI & apply Focus Mode styles
    document.body.classList.add('focus-mode-active');
    const focusBar = document.getElementById('focus-mode-bar');
    if (focusBar) {
        focusBar.classList.remove('hidden');
        focusBar.classList.add('flex');
    }

    const fabBtn = document.getElementById('focus-mode-fab');
    if (fabBtn) {
        fabBtn.classList.add('focus-active-glow');
    }

    // Update Pause/Play button state
    updatePlayPauseButtonUI();

    // 3. Clear existing interval if any and start fresh ticker
    if (focusInterval) clearInterval(focusInterval);

    focusInterval = setInterval(() => {
        if (!isFocusTimerPaused) {
            const now = Date.now();
            const elapsedSeconds = (now - focusLastTickTime) / 1000;
            focusLastTickTime = now;

            const oldSeconds = getTodayStudySeconds();
            const newSeconds = oldSeconds + elapsedSeconds;

            // Update in-memory accumulator (no integer truncation)
            setTodayStudySeconds(newSeconds, false);

            // Update UI timer
            updateFocusTimerDisplay();

            // Smoothly sync dashboard stats if active (without restarting animation)
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats(false);
            }

            // Sync chart only when integer minute increments
            const oldMins = Math.floor(oldSeconds / 60);
            const newMins = Math.floor(newSeconds / 60);
            if (newMins !== oldMins) {
                // Save to localStorage immediately when minute ticks
                setTodayStudySeconds(newSeconds, true);

                if (typeof hoursChartObj !== 'undefined' && hoursChartObj && hoursChartObj.data && hoursChartObj.data.datasets && hoursChartObj.data.datasets[0]) {
                    const rolling = getRolling7DaysStudyData();
                    const lastIdx = rolling.length - 1;
                    hoursChartObj.data.datasets[0].data[lastIdx] = rolling[lastIdx].minutes;
                    hoursChartObj.update('none'); // smooth update without full animation
                }
            }
        } else {
            focusLastTickTime = Date.now();
        }
    }, 1000);

    updateFocusTimerDisplay();
    if (typeof updateDashboardStats === 'function') updateDashboardStats(false);
}

/**
 * Toggle Pause / Resume timer in Focus Mode
 */
function togglePauseFocusTimer() {
    isFocusTimerPaused = !isFocusTimerPaused;
    focusLastTickTime = Date.now();
    updatePlayPauseButtonUI();
    if (inMemoryStudyHistory) {
        saveStudyHistory(inMemoryStudyHistory);
    }
}

/**
 * Update UI for play/pause toggle button
 */
function updatePlayPauseButtonUI() {
    const playPauseBtn = document.getElementById('focus-pause-btn');
    if (!playPauseBtn) return;

    const t = window.t || ((k, f) => f);
    if (isFocusTimerPaused) {
        playPauseBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="hidden sm:inline">${t('key_resume', 'Tiếp tục')}</span>
        `;
        playPauseBtn.className = "px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-amber-500/30 transition transform active:scale-95 cursor-pointer";
    } else {
        playPauseBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="hidden sm:inline">${t('key_pause', 'Tạm dừng')}</span>
        `;
        playPauseBtn.className = "px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center space-x-1.5 border border-white/20 transition transform active:scale-95 cursor-pointer";
    }
}

/**
 * Exit Focus Mode
 */
function exitFocusMode() {
    isFocusModeActive = false;
    isFocusTimerPaused = false;

    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }

    // Flush current in-memory time to localStorage
    if (inMemoryStudyHistory) {
        saveStudyHistory(inMemoryStudyHistory);
    }

    // Exit Fullscreen if currently fullscreen
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    // Remove UI styling
    document.body.classList.remove('focus-mode-active');
    const focusBar = document.getElementById('focus-mode-bar');
    if (focusBar) {
        focusBar.classList.add('hidden');
        focusBar.classList.remove('flex');
    }

    const fabBtn = document.getElementById('focus-mode-fab');
    if (fabBtn) {
        fabBtn.classList.remove('focus-active-glow');
    }

    // Update Dashboard stats & charts
    updateFocusTimerDisplay();
    if (typeof updateDashboardStats === 'function') updateDashboardStats();
    if (typeof renderCharts === 'function') renderCharts();
}

/**
 * Listen for native fullscreen exit (e.g. user pressed ESC or F11)
 */
function handleFullscreenChange() {
    const isNowFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    
    // If user exited fullscreen natively while in Focus Mode, automatically deactivate Focus Mode
    if (!isNowFullscreen && isFocusModeActive) {
        exitFocusMode();
    }
}

/**
 * Check for midnight crossover to reset today study counter
 */
let lastCheckedDate = getLocalDateString();
function startMidnightResetChecker() {
    setInterval(() => {
        const currentDate = getLocalDateString();
        if (currentDate !== lastCheckedDate) {
            console.log(`[Focus Mode] New day detected (${lastCheckedDate} -> ${currentDate}). Daily timer reset.`);
            lastCheckedDate = currentDate;
            updateFocusTimerDisplay();
            if (typeof updateDashboardStats === 'function') updateDashboardStats();
            if (typeof renderCharts === 'function') renderCharts();
        }
    }, 10000); // Check every 10 seconds
}

/**
 * Initialize Focus Mode events and initial state
 */
function initFocusMode() {
    // 1. Register fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // 2. Start midnight checker
    startMidnightResetChecker();

    // 3. Register debug keyboard shortcut (Ctrl + Shift + D)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
            e.preventDefault();
            openDebugTimeModal();
        }
    });

    // 4. Initial display render
    updateFocusTimerDisplay();
}

/**
 * ============================================================================
 * DEBUG TIME MODAL CONTROLLERS (For developer & testing 7-day study minutes)
 * ============================================================================
 */

/**
 * Open Debug Time Modal & render input rows for the 7 rolling days
 */
function openDebugTimeModal() {
    const modal = document.getElementById('debug-time-modal');
    const listContainer = document.getElementById('debug-days-input-list');
    if (!modal || !listContainer) return;

    const rolling7Days = getRolling7DaysStudyData();
    
    listContainer.innerHTML = rolling7Days.map((item, idx) => `
        <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl border ${item.isToday ? 'border-brand-400 bg-brand-50/40 dark:bg-brand-950/40' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'}">
            <div class="min-w-0 flex-1">
                <div class="flex items-center space-x-2">
                    <span class="text-xs font-bold text-slate-800 dark:text-white truncate">${item.dayLabel}</span>
                    ${item.isToday ? '<span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-brand-500 text-white shrink-0">Hôm nay</span>' : ''}
                </div>
                <span class="text-[10px] text-slate-400 block">${item.dateStr}</span>
            </div>
            <div class="flex items-center space-x-1.5 shrink-0">
                <input 
                    type="number" 
                    min="0" 
                    max="1440"
                    step="1"
                    data-date="${item.dateStr}"
                    value="${item.minutes}"
                    oninput="calculateDebugPreview()"
                    class="debug-day-input w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-right"
                />
                <span class="text-xs text-slate-400 font-semibold">phút</span>
            </div>
        </div>
    `).join('');

    calculateDebugPreview();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Close Debug Time Modal
 */
function closeDebugTimeModal() {
    const modal = document.getElementById('debug-time-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/**
 * Calculate and preview total minutes & % in debug modal
 */
function calculateDebugPreview() {
    const inputs = document.querySelectorAll('.debug-day-input');
    const previewEl = document.getElementById('debug-preview-total');
    if (!previewEl) return;

    let totalMins = 0;
    inputs.forEach(input => {
        totalMins += Math.max(0, parseInt(input.value, 10) || 0);
    });

    const dailyGoal = getDailyGoalMinutes();
    const weeklyTarget = dailyGoal * 7;
    const pct = weeklyTarget > 0 ? Math.round((totalMins / weeklyTarget) * 100) : 0;

    let tierDesc = '';
    if (pct === 0) tierDesc = '(0% - Xám)';
    else if (pct <= 100) tierDesc = `(${pct}% - Vàng)`;
    else if (pct <= 200) tierDesc = `(${pct}% - Xanh lá đè Vàng)`;
    else if (pct <= 300) tierDesc = `(${pct}% - Xanh dương đè Xanh lá)`;
    else tierDesc = `(MAX ${pct}% - Tím phát sáng 100%)`;

    previewEl.textContent = `Tổng: ${totalMins} phút / ${weeklyTarget}m ${tierDesc}`;
}

/**
 * Apply quick debug presets
 */
function applyDebugPreset(presetKey) {
    const inputs = document.querySelectorAll('.debug-day-input');
    if (!inputs || inputs.length === 0) return;

    const dailyGoal = getDailyGoalMinutes();
    let values = [];

    if (presetKey === '0') {
        values = [0, 0, 0, 0, 0, 0, 0];
    } else if (presetKey === '75') {
        // ~75% => dailyGoal * 7 * 0.75
        const dayAvg = Math.round(dailyGoal * 0.75);
        values = [dayAvg - 5, dayAvg, dayAvg + 5, dayAvg - 2, dayAvg + 3, dayAvg, dayAvg];
    } else if (presetKey === '130') {
        // ~130% => dailyGoal * 7 * 1.3
        const dayAvg = Math.round(dailyGoal * 1.3);
        values = [dayAvg - 5, dayAvg, dayAvg + 5, dayAvg, dayAvg + 2, dayAvg - 2, dayAvg];
    } else if (presetKey === '230') {
        // ~230% => dailyGoal * 7 * 2.3
        const dayAvg = Math.round(dailyGoal * 2.3);
        values = [dayAvg - 10, dayAvg, dayAvg + 10, dayAvg, dayAvg + 5, dayAvg - 5, dayAvg];
    } else if (presetKey === '340') {
        // ~340% => dailyGoal * 7 * 3.4
        const dayAvg = Math.round(dailyGoal * 3.4);
        values = [dayAvg - 15, dayAvg, dayAvg + 15, dayAvg, dayAvg + 10, dayAvg - 10, dayAvg];
    } else if (presetKey === 'reset_default') {
        values = [25, 30, 10, 45, 15, 20, 20];
    }

    inputs.forEach((input, idx) => {
        if (values[idx] !== undefined) {
            input.value = Math.max(0, values[idx]);
        }
    });

    calculateDebugPreview();
}

/**
 * Save Debug Time Modal inputs to localStorage and refresh all views
 */
function saveDebugTimeModal(event) {
    if (event) event.preventDefault();

    const inputs = document.querySelectorAll('.debug-day-input');
    const history = getStudyHistory();

    inputs.forEach(input => {
        const dateStr = input.getAttribute('data-date');
        const mins = Math.max(0, parseInt(input.value, 10) || 0);
        if (dateStr) {
            history[dateStr] = mins * 60; // in seconds
        }
    });

    saveStudyHistory(history);
    const todayStr = getLocalDateString();
    inMemoryTodaySeconds = history[todayStr] || 0;

    // Refresh everything immediately
    updateFocusTimerDisplay();
    if (typeof updateDashboardStats === 'function') updateDashboardStats(true);
    if (typeof renderCharts === 'function') renderCharts();

    closeDebugTimeModal();
}

// Lifecycle listeners to flush in-memory data
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (inMemoryStudyHistory) saveStudyHistory(inMemoryStudyHistory);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && inMemoryStudyHistory) {
            saveStudyHistory(inMemoryStudyHistory);
        } else if (!document.hidden && isFocusModeActive) {
            focusLastTickTime = Date.now();
        }
    });
}

// Auto initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFocusMode);
    } else {
        initFocusMode();
    }
}
