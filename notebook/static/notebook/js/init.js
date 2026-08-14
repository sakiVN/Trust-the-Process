
// ============================================================================
// MAIN APPLICATION INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App Initializing...');
    
    // Step 1: Initialize theme (light/dark mode)
    if (typeof initTheme === 'function') {
        initTheme();
    }
    
    // Step 2: Load all notebooks from API and render UI
    // THIS IS THE KEY FIX: Without this, notebooks weren't loaded on page refresh!
    if (typeof loadNotebooks === 'function') {
        loadNotebooks();
    }
    
    console.log('✅ App Initialized - Notebooks loaded successfully');

    // Step 3: Set up account and user settings
    if (typeof setupUserSettings === 'function') {
        setupUserSettings();
    }

    // Change the current language
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', (event) => {
            const selectedLang = event.target.value;
            if (typeof loadLanguage === 'function') {
                loadLanguage(selectedLang);
            }
        });
    }
});