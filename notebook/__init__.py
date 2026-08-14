// ============================================================================
// MAIN APPLICATION INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    console.log(':rocket: App Initializing...');
    
    // Step 1: Initialize theme (light/dark mode)
    if (typeof initTheme === 'function') {
        initTheme();
    }
    
    // Step 2: Load all notebooks from API and render UI
    // THIS IS THE KEY FIX: Without this, notebooks weren't loaded on page refresh!
    if (typeof loadNotebooks === 'function') {
        loadNotebooks();
    }
    
    console.log(':white_check_mark: App Initialized - Notebooks loaded successfully');
});