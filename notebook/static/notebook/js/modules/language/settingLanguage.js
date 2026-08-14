/**
 * EduBrain Dynamic Language Translation Engine
 * Supports Vietnamese (vi), Japanese (jp), and English (en)
 */

window.currentTranslations = {};

/**
 * Translation helper function
 * @param {string} key - Translation key in JSON dictionary
 * @param {string} fallback - Fallback text if key not found
 * @returns {string} Translated string or fallback
 */
window.t = function(key, fallback = '') {
  if (window.currentTranslations && window.currentTranslations[key] !== undefined) {
    return window.currentTranslations[key];
  }
  return fallback;
};

/**
 * Change language handler that saves preference and reloads page to guarantee complete fresh rendering
 * @param {string} lang - Target language ('vi', 'en', 'jp')
 */
function changeLanguage(lang) {
  if (!lang) return;
  const currentLang = localStorage.getItem('user_language') || 'vi';
  localStorage.setItem('user_language', lang);
  
  if (currentLang !== lang) {
    window.location.reload();
  }
}

/**
 * Load and apply translations based on language code (vi, jp, en) without forcing reload
 */
async function loadLanguage(lang) {
  if (!lang) lang = localStorage.getItem('user_language') || 'vi';

  try {
    const response = await fetch(`/static/notebook/js/modules/language/${lang}.json?v=${Date.now()}`);
    
    if (!response.ok) {
      throw new Error(`Không tìm thấy file bản dịch: ${lang}.json`);
    }

    const translations = await response.json();
    window.currentTranslations = translations;

    // 1. Apply translations to all elements with [translate] attribute
    document.querySelectorAll('[translate]').forEach(element => {
      const key = element.getAttribute('translate');
      
      if (translations[key] !== undefined) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = translations[key];
        } else if (element.tagName === 'OPTION') {
          element.textContent = translations[key];
        } else {
          // If this is the welcome greeting, let setupUserSettings format it with user's name
          if (element.id === 'dashboard-welcome-heading') {
            return;
          }
          element.textContent = translations[key];
        }
      }
    });

    // 2. Apply [data-translate-placeholder] attributes
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
      const key = element.getAttribute('data-translate-placeholder');
      if (translations[key] !== undefined) {
        element.placeholder = translations[key];
      }
    });

    // 3. Apply [data-translate-title] attributes
    document.querySelectorAll('[data-translate-title]').forEach(element => {
      const key = element.getAttribute('data-translate-title');
      if (translations[key] !== undefined) {
        element.title = translations[key];
      }
    });

    // 4. Save selected language to localStorage
    localStorage.setItem('user_language', lang);

    // 5. Synchronize all language selects on page
    const headerSelect = document.getElementById('header-language-select');
    if (headerSelect && headerSelect.value !== lang) {
      headerSelect.value = lang;
    }
    const settingsSelect = document.getElementById('language-select');
    if (settingsSelect && settingsSelect.value !== lang) {
      settingsSelect.value = lang;
    }
    const landingSelect = document.getElementById('landing-language-select');
    if (landingSelect && landingSelect.value !== lang) {
      landingSelect.value = lang;
    }
    const gettingStartedSelect = document.getElementById('getting-started-language-select');
    if (gettingStartedSelect && gettingStartedSelect.value !== lang) {
      gettingStartedSelect.value = lang;
    }

    // 6. Re-apply personalized user settings
    if (typeof setupUserSettings === 'function') {
      setupUserSettings();
    }

    // 7. Refresh dynamic components if rendered
    if (typeof renderRecentActivityTable === 'function' && typeof activeView !== 'undefined' && activeView === 'dashboard') {
      renderRecentActivityTable();
    }
    if (typeof renderAllDocumentsView === 'function' && typeof activeView !== 'undefined' && activeView === 'documents') {
      renderAllDocumentsView();
    }
    if (typeof renderStudyMaterialsView === 'function' && typeof activeView !== 'undefined' && activeView === 'study-materials') {
      renderStudyMaterialsView();
    }
    if (typeof renderAllNotesView === 'function' && typeof activeView !== 'undefined' && activeView === 'notes') {
      renderAllNotesView();
    }
    if (typeof renderNotebooksList === 'function') {
      renderNotebooksList();
    }
    if (typeof fetchNotifications === 'function') {
      fetchNotifications();
    }

  } catch (error) {
    console.error("Lỗi chuyển đổi ngôn ngữ:", error);
  }
}

// Global hooks
window.loadLanguage = loadLanguage;
window.changeLanguage = changeLanguage;

// Automatically load saved language on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('user_language') || 'vi';
  
  const headerSelect = document.getElementById('header-language-select');
  if (headerSelect) headerSelect.value = savedLang;

  const selectEl = document.getElementById('language-select');
  if (selectEl) selectEl.value = savedLang;

  loadLanguage(savedLang);
});