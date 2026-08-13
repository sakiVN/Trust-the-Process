        function filterTable() {
            const query = document.getElementById('table-search').value.toLowerCase();
            const typeFilter = document.getElementById('table-filter-type').value;
            const rows = document.querySelectorAll('#recent-activity-table-body tr');

            rows.forEach(row => {
                const cells = row.getElementsByTagName('td');
                if (cells.length < 5) return;
                
                const name = cells[0].innerText.toLowerCase();
                const type = cells[1].innerText;
                const notebook = cells[2].innerText.toLowerCase();
                
                const matchesSearch = name.includes(query) || notebook.includes(query);
                
                let matchesType = true;
                if (typeFilter === 'source') {
                    matchesType = type.includes('Tài liệu');
                } else if (typeFilter === 'note') {
                    matchesType = type.includes('Ghi chú');
                }

                row.style.display = (matchesSearch && matchesType) ? '' : 'none';
            });
        }

        function handleGlobalSearch() {
            const query = document.getElementById('global-search').value.toLowerCase().trim();

            const resetViewFilters = () => {
                if (activeView === 'dashboard') {
                    document.getElementById('table-search').value = '';
                    filterTable();
                } else if (activeView === 'documents') {
                    document.querySelectorAll('#all-documents-list > div').forEach(doc => doc.style.display = '');
                } else if (activeView === 'study-materials') {
                    document.querySelectorAll('#all-study-materials-list > div').forEach(item => item.style.display = '');
                } else if (activeView === 'notes') {
                    document.querySelectorAll('#all-notes-list > div').forEach(note => note.style.display = '');
                } else if (activeView === 'notebooks') {
                    document.querySelectorAll('#notebooks-list > button').forEach(btn => btn.style.display = '');
                }
            };

            if (!query) {
                resetViewFilters();
                return;
            }

            if (activeView === 'dashboard') {
                document.getElementById('table-search').value = query;
                filterTable();
            } else if (activeView === 'documents') {
                const docs = document.querySelectorAll('#all-documents-list > div');
                docs.forEach(doc => {
                    const title = (doc.querySelector('h4')?.innerText || '').toLowerCase();
                    const content = (doc.querySelector('p')?.innerText || '').toLowerCase();
                    const tag = (doc.querySelector('span')?.innerText || '').toLowerCase();
                    const notebook = (doc.querySelector('strong')?.innerText || '').toLowerCase();
                    doc.style.display = (title.includes(query) || content.includes(query) || tag.includes(query) || notebook.includes(query)) ? '' : 'none';
                });
            } else if (activeView === 'study-materials') {
                const materials = document.querySelectorAll('#all-study-materials-list > div');
                materials.forEach(item => {
                    const title = (item.querySelector('h4')?.innerText || '').toLowerCase();
                    const summary = (item.querySelector('p')?.innerText || '').toLowerCase();
                    const tag = (item.querySelector('span')?.innerText || '').toLowerCase();
                    const notebook = (item.querySelector('strong')?.innerText || '').toLowerCase();
                    item.style.display = (title.includes(query) || summary.includes(query) || tag.includes(query) || notebook.includes(query)) ? '' : 'none';
                });
            } else if (activeView === 'notes') {
                const notes = document.querySelectorAll('#all-notes-list > div');
                notes.forEach(note => {
                    const title = (note.querySelector('h4')?.innerText || '').toLowerCase();
                    const text = note.innerText.toLowerCase();
                    const notebook = (note.querySelector('strong')?.innerText || '').toLowerCase();
                    note.style.display = (title.includes(query) || text.includes(query) || notebook.includes(query)) ? '' : 'none';
                });
            } else if (activeView === 'notebooks') {
                const buttons = document.querySelectorAll('#notebooks-list > button');
                buttons.forEach(btn => {
                    const title = (btn.querySelector('span')?.innerText || '').toLowerCase();
                    const desc = (btn.querySelectorAll('span')[1]?.innerText || '').toLowerCase();
                    btn.style.display = (title.includes(query) || desc.includes(query)) ? '' : 'none';
                });
            }

            renderGlobalSearchResults(query);
        }

