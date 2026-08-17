/**
 * Setup and initialize user profile from localStorage
 */
function setupUserSettings() {
    try {
        let stored = localStorage.getItem('edubrain_user');
        let user;

        if (stored) {
            try {
                user = JSON.parse(stored);
            } catch(e) {
                user = null;
            }
        }

        // If no user profile exists, initialize with default values and store it
        if (!user || !user.name) {
            user = {
                name: 'Linh Nguyễn',
                role: 'Học sinh',
                email: 'linh.nguyen@edubrain.vn',
                purpose: 'Học tập & Nghiên cứu thường nhật',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100',
                updatedAt: Date.now()
            };
            localStorage.setItem('edubrain_user', JSON.stringify(user));
        }

        const name = user.name || 'Linh Nguyễn';
        const role = user.role || 'Học sinh';
        const email = user.email || '';
        const purpose = user.purpose || 'Học tập & Nghiên cứu thường nhật';
        const avatar = user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100';

        const roleMap = {
            'Học sinh': { vi: 'Học sinh', en: 'Student', jp: '学生' },
            'Sinh viên': { vi: 'Sinh viên', en: 'University Student', jp: '大学生' },
            'Giáo viên': { vi: 'Giáo viên', en: 'Teacher', jp: '教員' },
            'Nhà nghiên cứu': { vi: 'Nhà nghiên cứu', en: 'Researcher', jp: '研究者' },
            'Người tự học': { vi: 'Người tự học', en: 'Self-learner', jp: '独学者' },
        };

        const purposeMap = {
            'Học tập & Nghiên cứu thường nhật': {
                full: { vi: 'Học tập & Nghiên cứu thường nhật', en: 'Daily Study & Research', jp: '日常学習・研究' },
                badge: { vi: 'Học tập', en: 'Daily Study', jp: '日常学習' }
            },
            'Ôn thi cấp tốc & Luyện đề': {
                full: { vi: 'Ôn thi cấp tốc & Luyện đề trắc nghiệm', en: 'Exam Cramming & Quiz Prep', jp: '直前試験対策・問題演習' },
                badge: { vi: 'Ôn thi cấp tốc', en: 'Exam Prep', jp: '試験対策' }
            },
            'Tập trung sâu & Quản lý tri thức': {
                full: { vi: 'Tập trung sâu & Quản lý tri thức', en: 'Deep Focus & Knowledge Management', jp: '集中ナレッジ管理' },
                badge: { vi: 'Tập trung sâu', en: 'Deep Focus', jp: '集中ナレッジ' }
            },
            'Lưu trữ & Tổng hợp tài liệu': {
                full: { vi: 'Lưu trữ & Tổng hợp tài liệu PDF', en: 'PDF Document Archiving', jp: '資料・PDF保存' },
                badge: { vi: 'Lưu trữ tài liệu', en: 'Document Archiving', jp: '資料保存' }
            },
            'Nâng cao tư duy phản biện': {
                full: { vi: 'Nâng cao tư duy phản biện & Viết luận', en: 'Critical Thinking & Essay Logic', jp: '批判的論理思考・論文執筆' },
                badge: { vi: 'Tư duy phản biện', en: 'Critical Thinking', jp: '批判的思考' }
            },
            'Giảng dạy & Soạn giáo án': {
                full: { vi: 'Giảng dạy & Soạn giáo án / Bài tập', en: 'Teaching & Lesson Planning', jp: '授業・指導準備' },
                badge: { vi: 'Giảng dạy', en: 'Teaching', jp: '授業指導' }
            }
        };

        const currentLang = localStorage.getItem('user_language') || 'vi';
        const displayRole = (roleMap[role] && roleMap[role][currentLang]) ? roleMap[role][currentLang] : role;

        // Match purpose from purposeMap
        let purposeEntry = purposeMap[purpose];
        if (!purposeEntry) {
            const matchedKey = Object.keys(purposeMap).find(k => purpose.startsWith(k) || k.startsWith(purpose) || purpose.includes(k) || k.includes(purpose));
            if (matchedKey) {
                purposeEntry = purposeMap[matchedKey];
            }
        }

        const displayPurposeFull = (purposeEntry && purposeEntry.full[currentLang]) 
            ? purposeEntry.full[currentLang] 
            : (window.t ? window.t(purpose, purpose) : purpose);

        const displayPurposeBadge = (purposeEntry && purposeEntry.badge[currentLang]) 
            ? purposeEntry.badge[currentLang] 
            : (purpose.includes('&') ? purpose.split('&')[0].trim() : purpose);

        // 1. Header Elements
        const headerName = document.getElementById('header-user-name');
        const headerRole = document.getElementById('header-user-role');
        const headerAvatar = document.getElementById('header-user-avatar');
        const dropdownName = document.getElementById('dropdown-user-name');
        const dropdownPurpose = document.getElementById('dropdown-user-purpose');

        if (headerName) headerName.textContent = name;
        if (headerRole) headerRole.textContent = displayRole;
        if (headerAvatar && avatar) headerAvatar.src = avatar;
        if (dropdownName) dropdownName.textContent = name;
        if (dropdownPurpose) dropdownPurpose.textContent = displayPurposeFull;

        // 2. Dashboard Welcome Banner in current language
        const welcomeHeading = document.getElementById('dashboard-welcome-heading');
        if (welcomeHeading) {
            if (currentLang === 'en') {
                welcomeHeading.textContent = `Welcome back, ${name}!`;
            } else if (currentLang === 'jp') {
                welcomeHeading.textContent = `おかえりなさい、${name}さん！`;
            } else {
                welcomeHeading.textContent = `Chào mừng bạn quay lại, ${name}!`;
            }
        }

        const purposeBadge = document.getElementById('dashboard-user-purpose-badge');
        if (purposeBadge) {
            purposeBadge.textContent = displayPurposeBadge;
        }

        // 3. Settings Form Inputs
        const inputName = document.getElementById('input-display-name');
        const inputEmail = document.getElementById('input-user-email');
        const selectRole = document.getElementById('select-user-role');
        const selectPurpose = document.getElementById('select-user-purpose');
        const selectDailyGoal = document.getElementById('select-daily-goal');

        if (inputName) inputName.value = name;
        if (inputEmail) inputEmail.value = email;
        if (selectRole) selectRole.value = role;
        if (selectPurpose) selectPurpose.value = purpose;
        if (selectDailyGoal) {
            if (user.dailyGoal) {
                selectDailyGoal.value = user.dailyGoal;
            }
            // Bind change listener so changing goal immediately updates state and chart
            if (!selectDailyGoal.dataset.hasChangeListener) {
                selectDailyGoal.dataset.hasChangeListener = "true";
                selectDailyGoal.addEventListener('change', function() {
                    try {
                        let storedUser = localStorage.getItem('edubrain_user');
                        let userObj = storedUser ? JSON.parse(storedUser) : {};
                        userObj.dailyGoal = this.value;
                        userObj.updatedAt = Date.now();
                        localStorage.setItem('edubrain_user', JSON.stringify(userObj));

                        if (typeof updateFocusTimerDisplay === 'function') updateFocusTimerDisplay();
                        if (typeof updateDashboardStats === 'function') updateDashboardStats(true);
                        if (typeof renderCharts === 'function') renderCharts();
                        if (typeof updateProgressViewStats === 'function') updateProgressViewStats();
                    } catch (err) {
                        console.error("Lỗi khi cập nhật mục tiêu học hàng ngày:", err);
                    }
                });
            }
        }

    } catch (e) {
        console.error("Lỗi khi tải thông tin người dùng từ localStorage:", e);
    }
}

/**
 * Save updated user settings from the settings view
 */
function saveSettings(event) {
    if (event) event.preventDefault();

    const inputName = document.getElementById('input-display-name');
    const inputEmail = document.getElementById('input-user-email');
    const selectRole = document.getElementById('select-user-role');
    const selectPurpose = document.getElementById('select-user-purpose');
    const selectDailyGoal = document.getElementById('select-daily-goal');
    const inputAvatar = document.getElementById('input-avatar-url');

    const name = inputName && inputName.value.trim() ? inputName.value.trim() : 'Linh Nguyễn';
    const email = inputEmail ? inputEmail.value.trim() : '';
    const role = selectRole ? selectRole.value : 'Học sinh';
    const purpose = selectPurpose ? selectPurpose.value : 'Học tập & Nghiên cứu thường nhật';
    const dailyGoal = selectDailyGoal ? selectDailyGoal.value : '30 phút';
    const avatar = (inputAvatar && inputAvatar.value) ? inputAvatar.value : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100';

    const userData = {
        name: name,
        email: email,
        role: role,
        purpose: purpose,
        dailyGoal: dailyGoal,
        avatar: avatar,
        updatedAt: Date.now()
    };

    localStorage.setItem('edubrain_user', JSON.stringify(userData));

    // Update UI immediately
    setupUserSettings();

    // Trigger Focus Timer & Dashboard refresh
    if (typeof updateFocusTimerDisplay === 'function') {
        updateFocusTimerDisplay();
    }
    if (typeof updateDashboardStats === 'function') {
        updateDashboardStats(true);
    }
    if (typeof renderCharts === 'function') {
        renderCharts();
    }
    if (typeof updateProgressViewStats === 'function') {
        updateProgressViewStats();
    }

    const t = window.t || ((k, f) => f);
    alert(t('key_tool_save_success', 'Cài đặt thông tin và mục tiêu tự học đã được lưu thành công!'));
}

// Auto-run on script load to ensure state is initialized as early as possible
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupUserSettings);
    } else {
        setupUserSettings();
    }
}
