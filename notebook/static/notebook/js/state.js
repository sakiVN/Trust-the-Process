        // Initialize Mermaid
        document.addEventListener('DOMContentLoaded', () => {
            mermaid.initialize({
                startOnLoad: false,
                theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
                securityLevel: 'loose',
                themeVariables: {
                    background: 'transparent'
                }
            });
        });
        const API_URL = '/api';
        let notebooks = [];
        let activeNotebookId = null;
        let activeTab = 'sources';
        let selectedGenType = 'quiz';
        let activeView = 'dashboard';
        let hoursChartObj = null;
        let distChartObj = null;
        let currentQuizPlaying = null;
        let currentQuizAnswers = {};
        let currentEditingQuizId = null;
        let currentFlashcardEditingId = null;
        let currentFlashcardEditorCards = [];
        let currentQuizGenerationEditingId = null;
        let currentQuizGenerationEditorQuestions = [];
        let jmInstances = {};
        let activeToolType = 'flashcards';
        // CSRF Token helper function

