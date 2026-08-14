        function renderAllDocumentsView() {
            const container = document.getElementById('all-documents-list');
            if (!container) return;
            
            let allSources = [];
            notebooks.forEach(nb => {
                const sources = nb.sources || [];
                sources.forEach(src => {
                    allSources.push({ ...src, notebookName: nb.name, notebookId: nb.id, type: 'source' });
                });
                const quizzes = nb.quizzes || [];
                quizzes.forEach(quiz => {
                    allSources.push({ ...quiz, notebookName: nb.name, notebookId: nb.id, type: 'quiz' });
                });
            });

            if (allSources.length === 0) {
                container.innerHTML = `<div class="col-span-full text-xs text-slate-400 text-center py-12">Không có tài liệu nào.</div>`;
                return;
            }

            container.innerHTML = allSources.map(src => {
                const docIcon = src.type === 'quiz' ? '/static/notebook/icon-set/quiz.png' : '/static/notebook/icon-set/upload.png';
                const labelText = src.type === 'quiz' ? 'Bài tập trắc nghiệm' : (src.source_type === 'file' ? 'File PDF' : (src.source_type === 'link' ? 'Link' : 'Văn bản'));
                return `
                <div class="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 hover:scale-[1.01] hover:shadow-md transition">
                    <div class="flex justify-between items-start gap-3">
                        <div class="min-w-0">
                            <span class="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${src.type === 'quiz' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : (src.source_type === 'link' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300')}">
                                <img src="${docIcon}" class="w-3.5 h-3.5 object-contain shrink-0" alt="Icon" />
                                <span>${labelText}</span>
                            </span>
                            <h4 class="font-bold text-slate-850 dark:text-white text-sm mt-2 truncate">${src.type === 'quiz' ? src.name : src.title}</h4>
                        </div>
                        <div class="flex items-center space-x-2 shrink-0">
                            <button onclick="switchView('notebooks'); selectNotebook(${src.notebookId});" class="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 font-semibold">Xem Sổ tay</button>
                            ${src.type === 'quiz' ? `<button onclick="openQuizPlayModal(${src.id})" class="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Làm bài</button>` : `<button onclick="deleteSource(${src.id})" class="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition" title="Xóa tài liệu">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>`}
                        </div>
                    </div>
                    ${src.type === 'quiz' ? `<p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">${src.description || 'Bộ câu hỏi trắc nghiệm đã lưu.'}</p>` : `${src.file_path ? `<a href="${src.file_path}" target="_blank" class="text-[10px] text-brand-500 hover:underline truncate block mt-1 flex items-center space-x-1"><img src="/static/notebook/icon-set/upload.png" class="w-3.5 h-3.5 object-contain" /><span>Tải xuống file PDF</span></a>` : ''}
                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">${src.content}</p>`}
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                        <span>Sổ tay: <strong>${src.notebookName}</strong></span>
                        <span>${new Date(src.created_at || Date.now()).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
                `;
            }).join('');
        }

        function renderStudyMaterialsView() {
            const container = document.getElementById('all-study-materials-list');
            if (!container) return;

            let allMaterials = [];
            notebooks.forEach(nb => {
                (nb.quizzes || []).forEach(quiz => {
                    allMaterials.push({ ...quiz, notebookName: nb.name, notebookId: nb.id, materialType: 'quiz' });
                });
                (nb.generations || []).forEach(gen => {
                    allMaterials.push({ ...gen, notebookName: nb.name, notebookId: nb.id, materialType: 'generation' });
                });
            });

            if (allMaterials.length === 0) {
                container.innerHTML = `<div class="col-span-full text-xs text-slate-400 text-center py-12">Chưa có tài nguyên học tập nào. Hãy tạo quiz, flashcards hoặc nội dung tự động từ sổ tay của bạn.</div>`;
                return;
            }

            const generationLabel = {
                quiz: 'Bài tập trắc nghiệm',
                flashcards: 'Flashcards',
                mind_map: 'Mind Map',
                report: 'Báo cáo',
                audio_overview: 'Audio Overview',
                presentation: 'Presentation',
                video_overview: 'Video Overview',
                infographics: 'Infographics',
                data_table: 'Data Table'
            };

            const typeIconMap = {
                quiz: '/static/notebook/icon-set/quiz.png',
                flashcards: '/static/notebook/icon-set/flashcard.png',
                mind_map: '/static/notebook/icon-set/mindmap.png',
                report: '/static/notebook/icon-set/report.png'
            };

            container.innerHTML = allMaterials.map(item => {
                const isQuiz = item.materialType === 'quiz';
                const label = isQuiz ? 'Bài tập trắc nghiệm' : (generationLabel[item.generation_type] || 'Tài liệu học tập');
                const title = isQuiz ? item.name : `${item.generation_type ? (generationLabel[item.generation_type] || item.generation_type) : 'Tài liệu học tập'}`;
                const iconSrc = isQuiz ? typeIconMap.quiz : (typeIconMap[item.generation_type] || '/static/notebook/icon-set/material.png');
                let summary = 'Không có mô tả nội dung.';
                if (isQuiz) {
                    summary = item.description || 'Bộ câu hỏi trắc nghiệm đã lưu.';
                } else if (item.content) {
                    if (item.generation_type === 'quiz' || item.generation_type === 'flashcards') {
                        try {
                            let cleanContent = item.content.trim();
                            if (cleanContent.startsWith("```")) {
                                cleanContent = cleanContent.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
                            }
                            const arr = JSON.parse(cleanContent);
                            summary = `Gồm ${arr.length} ${item.generation_type === 'quiz' ? 'câu hỏi trắc nghiệm' : 'thẻ nhớ'}.`;
                        } catch (e) {
                            summary = 'Tài liệu học tập đã lưu.';
                        }
                    } else if (item.generation_type === 'mind_map') {
                        summary = 'Sơ đồ tư duy trực quan (Mermaid).';
                    } else {
                        summary = String(item.content).replace(/<[^>]*>/g, '').slice(0, 180);
                    }
                }

                return `
                    <div class="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:scale-[1.01] hover:shadow-md transition">
                        <div class="flex justify-between items-start gap-3">
                            <div class="min-w-0">
                                <span class="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${isQuiz ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}">
                                    <img src="${iconSrc}" class="w-3.5 h-3.5 object-contain shrink-0" alt="Icon" />
                                    <span>${label}</span>
                                </span>
                                <h4 class="font-bold text-slate-850 dark:text-white text-sm mt-2 truncate">${title}</h4>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                ${isQuiz ? `
                                    <button onclick="openQuizPlayModal(${item.id})" class="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Làm bài</button>
                                    <button onclick="openQuizReviewModal(${item.id})" class="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 font-semibold">Xem lại</button>
                                ` : ``}
                                ${!isQuiz && item.generation_type === 'flashcards' ? `
                                    <button onclick="openFlashcardReviewModal(${item.id})" class="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Xem lại</button>
                                    <button onclick="openFlashcardEditorModal(${item.id})" class="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Sửa</button>
                                ` : ``}
                                ${!isQuiz && item.generation_type === 'quiz' ? `
                                    <button onclick="openQuizReviewModal(${item.id})" class="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Xem lại</button>
                                    <button onclick="openQuizGenerationEditorModal(${item.id})" class="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-xl font-semibold transition">Sửa</button>
                                ` : ``}
                                ${item.notebookId ? `<button onclick="switchView('notebooks'); selectNotebook(${item.notebookId});" class="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 font-semibold">Xem Sổ tay</button>` : ''}
                            </div>
                        </div>

                        <p class="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-3">
                            ${summary}
                        </p>

                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 gap-2">
                            <span>Sổ tay: <strong>${item.notebookName || 'Không liên kết'}</strong></span>
                            <span>${new Date(item.created_at || Date.now()).toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderAllNotesView() {
            const container = document.getElementById('all-notes-list');
            if (!container) return;
            
            let allNotes = [];
            notebooks.forEach(nb => {
                const notes = nb.notes || [];
                notes.forEach(note => {
                    allNotes.push({ ...note, notebookName: nb.name, notebookId: nb.id });
                });
            });

            if (allNotes.length === 0) {
                container.innerHTML = `<div class="text-xs text-slate-400 text-center py-12">Không có ghi chú nào.</div>`;
                return;
            }

            container.innerHTML = allNotes.map(note => `
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:scale-[1.005] hover:shadow-md transition">
                    <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                            <h4 class="font-bold text-slate-850 dark:text-white text-sm">${note.title}</h4>
                            <span class="text-[10px] text-slate-400 mt-1 block">Trong sổ tay: <strong>${note.notebookName}</strong></span>
                        </div>
                        <button onclick="switchView('notebooks'); selectNotebook(${note.notebookId});" class="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700">Xem chi tiết</button>
                    </div>
                    ${note.is_locked ? `
                        <div class="bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-350 p-4 rounded-xl text-xs flex items-center space-x-2">
                            <span>🔒</span>
                            <span>Bài viết phản biện đang ở trạng thái Khóa. Hãy truy cập Sổ tay để mở khóa cùng AI.</span>
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-150/40 dark:border-slate-800 text-xs">
                                <span class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Ý kiến của bạn</span>
                                <p class="text-slate-750 dark:text-slate-300 line-clamp-4">${note.initial_content}</p>
                            </div>
                            <div class="bg-indigo-50/30 dark:bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 text-xs">
                                <span class="text-[9px] text-indigo-500 uppercase font-bold block mb-1">Phân tích Logic</span>
                                <p class="text-slate-750 dark:text-slate-350 line-clamp-4">${note.ai_rebuttal}</p>
                            </div>
                        </div>
                    `}
                </div>
            `).join('');
        }

        function switchView(viewName) {
            activeView = viewName;
            
            if (viewName === 'dashboard') {
                fetchNotifications();
            }
            
            // Toggle view visibility
            ['dashboard', 'notebooks', 'documents', 'study-materials', 'notes', 'progress', 'settings'].forEach(v => {
                const el = document.getElementById(`view-${v}`);
                if (el) {
                    el.classList.toggle('hidden', v !== viewName);
                }
                
                // Toggle active styles on navbar links
                const navBtn = document.getElementById(`nav-${v}`);
                if (navBtn) {
                    if (v === viewName) {
                        navBtn.className = "w-full flex items-center justify-start space-x-2.5 px-3 py-2 rounded-xl text-xs text-left font-semibold transition bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 shadow-sm";
                    } else {
                        navBtn.className = "w-full flex items-center justify-start space-x-2.5 px-3 py-2 rounded-xl text-xs text-left font-semibold transition text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white";
                    }
                }
            });

            // Re-render specific view resources
            if (viewName === 'dashboard') {
                updateDashboardStats();
                renderRecentActivityTable();
                setTimeout(renderCharts, 100);
            } else if (viewName === 'documents') {
                renderAllDocumentsView();
            } else if (viewName === 'study-materials') {
                renderStudyMaterialsView();
            } else if (viewName === 'notes') {
                renderAllNotesView();
            } else if (viewName === 'progress') {
                updateProgressViewStats();
            }
            
            // Auto close mobile sidebar
            const sidebar = document.getElementById('sidebar');
            if (!sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.add('-translate-x-full');
            }
        }

