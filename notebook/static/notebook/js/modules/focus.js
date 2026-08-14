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
    try {
        const data = localStorage.getItem('edubrain_daily_focus_seconds');
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Error loading study history:", e);
    }
    
    // Seed initial realistic data for previous 6 days if completely empty
    const initialHistory = seedInitialStudyHistory();
    localStorage.setItem('edubrain_daily_focus_seconds', JSON.stringify(initialHistory));
    return initialHistory;
}

/**
 * Seed initial realistic past days data if user is new
 */
function seedInitialStudyHistory() {
    const history = {};
    const today = new Date();
    // Default past 6 days study minutes: e.g. [20, 15, 45, 10, 30, 25]
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
    try {
        localStorage.setItem('edubrain_daily_focus_seconds', JSON.stringify(history));
    } catch (e) {
        console.error("Error saving study history:", e);
    }
}

/**
 * Get today's total study seconds (resets to 0 for new date)
 */
function getTodayStudySeconds() {
    const history = getStudyHistory();
    const todayStr = getLocalDateString();
    return history[todayStr] || 0;
}

/**
 * Save today's study seconds
 */
function setTodayStudySeconds(seconds) {
    const history = getStudyHistory();
    const todayStr = getLocalDateString();
    history[todayStr] = Math.max(0, Math.floor(seconds));
    saveStudyHistory(history);
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

            // Increment today study time
            const currentSeconds = getTodayStudySeconds();
            const newSeconds = currentSeconds + elapsedSeconds;
            setTodayStudySeconds(newSeconds);

            // Update UI timer
            updateFocusTimerDisplay();

            // Periodically sync dashboard stats & charts
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats();
            }
            if (typeof renderCharts === 'function' && typeof hoursChartObj !== 'undefined' && hoursChartObj) {
                // Update chart bar for today
                const rolling = getRolling7DaysStudyData();
                const lastIdx = rolling.length - 1;
                if (hoursChartObj.data && hoursChartObj.data.datasets && hoursChartObj.data.datasets[0]) {
                    hoursChartObj.data.datasets[0].data[lastIdx] = rolling[lastIdx].minutes;
                    hoursChartObj.update('none'); // smooth update without full animation
                }
            }
        } else {
            focusLastTickTime = Date.now();
        }
    }, 1000);

    updateFocusTimerDisplay();
    if (typeof updateDashboardStats === 'function') updateDashboardStats();
}

/**
 * Toggle Pause / Resume timer in Focus Mode
 */
function togglePauseFocusTimer() {
    isFocusTimerPaused = !isFocusTimerPaused;
    focusLastTickTime = Date.now();
    updatePlayPauseButtonUI();
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

    // 3. Initial display render
    updateFocusTimerDisplay();
}

// Auto initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFocusMode);
    } else {
        initFocusMode();
    }
}
