
    


        


        // Wrapper function for fetch to automatically add CSRF token

        // On Load
        window.addEventListener('DOMContentLoaded', () => {
            loadNotebooks();
            initTheme();
        });

        // Toggle Sidebar for mobile

        // Switching Dashboard View Mode

        // Theme / Dark Mode toggle


        // Tab switches inside Notebook workspace

        // Toggle Source fields

        // AI generator select type

        // API Request: Load all notebooks

        // Render loading skeletons

        // Render Sổ tay list on sidebars


        // Update main dashboard metrics

        // Update stats on Progress View

        // Select a notebook to show details and workspace

        // Modal triggers


        // POST Request: Create new Notebook

        // POST Request: Add new Source

        // Render sources in workspace tab

        // Render saved quizzes list for active notebook




































        // Render notes list in workspace tab

        // POST Request: Submit initial thought to unlock AI

        // POST Request: Submit revised thought

        // POST Request: AI generate study materials for a specific category

        // Render AI generated documents / study materials in split workspace category containers

        // Render unified view: Documents (Sources)


        // Render unified view: Notes (Thoughts)

        // Render Recent Activity Table on Dashboard

        // Table local filtering

        // Global search in header




        document.addEventListener('click', event => {
            const wrapper = document.querySelector('.search-dropdown-wrapper');
            const popup = document.getElementById('search-results-popup');
            if (!wrapper || !popup) return;
            if (!wrapper.contains(event.target)) {
                popup.classList.add('hidden');
            }

        // Render Chart.js

        // DELETE Request: Remove a Source

        // DELETE Request: Remove an AI Generation

        // DELETE Request: Remove the active Notebook

        // Interactive quiz correctness checker



        // Toggle input fields for inline category-specific upload forms

        // Handle inline document submissions for specific categories

        

        // jsMind instances storage
        let jmInstances = {};






        // Mermaid Indentation Text to jsMind Node Tree Parser

        // jsMind Node Tree back to Mermaid Indentation Text Serializer






        let activeToolType = 'flashcards';





        // POST Request: Save generated tool result to database (persists in backend)

        
    
    
        })