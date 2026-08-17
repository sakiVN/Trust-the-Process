        // ==========================================
        // Quiz Module (Play, Review, Builder & Retake)
        // ==========================================

        window.openQuizBuilderModal = openQuizBuilderModal;
        window.openQuizPlayModal = openQuizPlayModal;
        window.openQuizReviewModal = openQuizReviewModal;
        window.openQuizGenerationEditorModal = openQuizGenerationEditorModal;
        window.openQuizGenerationReviewModal = openQuizGenerationReviewModal;

        async function openQuizBuilderModal(quizId = null) {
            const modal = document.getElementById('quiz-builder-modal');
            const container = document.getElementById('quiz-questions-container');
            currentEditingQuizId = quizId;
            document.getElementById('quiz-builder-name').value = '';
            document.getElementById('quiz-builder-desc').value = '';
            container.innerHTML = '';
            currentQuizAnswers = {};
            populateNotebookSelectors();

            if (quizId) {
                try {
                    let questions = [];
                    const res = await fetch(`${API_URL}/quizzes/${quizId}/`);
                    if (res.ok) {
                        const quiz = await res.json();
                        document.getElementById('quiz-builder-name').value = quiz.name || '';
                        document.getElementById('quiz-builder-desc').value = quiz.description || '';
                        document.getElementById('quiz-builder-notebook').value = quiz.notebook ? String(quiz.notebook) : '';
                        questions = Array.isArray(quiz.questions) ? quiz.questions : [];
                    } else {
                        // Fallback to Generation
                        const genRes = await fetch(`${API_URL}/generations/${quizId}/`);
                        if (genRes.ok) {
                            const gen = await genRes.json();
                            const fallback = parseQuizGenerationContent(gen.content);
                            document.getElementById('quiz-builder-name').value = fallback?.title || 'Bộ câu hỏi trắc nghiệm';
                            document.getElementById('quiz-builder-desc').value = fallback?.description || '';
                            document.getElementById('quiz-builder-notebook').value = gen.notebook ? String(gen.notebook) : '';
                            questions = Array.isArray(fallback?.questions) ? fallback.questions : [];
                        }
                    }

                    questions.forEach((question, index) => {
                        const row = document.createElement('div');
                        row.className = 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3';
                        row.setAttribute('data-question-row', index);
                        row.innerHTML = `
                            <div class="flex items-start justify-between gap-3">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Câu hỏi ${index + 1}</span>
                                <button type="button" onclick="this.closest('div[data-question-row]').remove()" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">Xóa</button>
                            </div>
                            <div>
                                <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Nội dung câu hỏi</label>
                                <textarea data-question-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(question.question_text || question.question || '')}</textarea>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án A</label>
                                    <input data-option-input="A" type="text" value="${escapeHtml(normalizeQuizOption((question.options || [])[0] || ''))}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án B</label>
                                    <input data-option-input="B" type="text" value="${escapeHtml(normalizeQuizOption((question.options || [])[1] || ''))}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án C</label>
                                    <input data-option-input="C" type="text" value="${escapeHtml(normalizeQuizOption((question.options || [])[2] || ''))}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án D</label>
                                    <input data-option-input="D" type="text" value="${escapeHtml(normalizeQuizOption((question.options || [])[3] || ''))}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án đúng</label>
                                    <select data-correct-option class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                        ${['A','B','C','D'].map(letter => `<option value="${letter}" ${letter === ((question.correct_option || question.answer || 'A').toUpperCase()) ? 'selected' : ''}>${letter}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Giải thích</label>
                                    <textarea data-explanation-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(question.explanation || '')}</textarea>
                                </div>
                            </div>
                        `;
                        container.appendChild(row);
                    });

                    if (!questions.length) {
                        addQuizQuestionRow();
                    }
                } catch (err) {
                    console.error('Lỗi khi tải quiz để sửa:', err);
                    addQuizQuestionRow();
                }
            } else {
                addQuizQuestionRow();
            }

            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        async function saveQuizBuilder() {
            const name = document.getElementById('quiz-builder-name').value.trim();
            const description = document.getElementById('quiz-builder-desc').value.trim();
            const notebookId = document.getElementById('quiz-builder-notebook').value || null;
            const questionRows = Array.from(document.querySelectorAll('#quiz-questions-container [data-question-row]'));

            if (!name) {
                return alert('Vui lòng nhập tên bộ câu hỏi.');
            }
            if (!questionRows.length) {
                return alert('Vui lòng thêm ít nhất một câu hỏi.');
            }

            const questions = [];
            for (const row of questionRows) {
                const questionText = row.querySelector('[data-question-input]').value.trim();
                const optionA = row.querySelector('[data-option-input="A"]').value.trim();
                const optionB = row.querySelector('[data-option-input="B"]').value.trim();
                const optionC = row.querySelector('[data-option-input="C"]').value.trim();
                const optionD = row.querySelector('[data-option-input="D"]').value.trim();
                const correct_option = row.querySelector('[data-correct-option]').value;
                const explanation = row.querySelector('[data-explanation-input]').value.trim();

                if (!questionText || !optionA || !optionB || !optionC || !optionD) {
                    return alert('Vui lòng điền đầy đủ câu hỏi và 4 đáp án cho mỗi mục.');
                }

                questions.push({
                    question_text: questionText,
                    options: [optionA, optionB, optionC, optionD].map(normalizeQuizOption),
                    correct_option,
                    explanation
                });
            }

            try {
                const payload = {
                    name,
                    description,
                    notebook: notebookId,
                    tag: 'Bài tập trắc nghiệm',
                    questions
                };
                const endpoint = currentEditingQuizId ? `${API_URL}/quizzes/${currentEditingQuizId}/` : `${API_URL}/quizzes/`;
                const method = currentEditingQuizId ? 'PATCH' : 'POST';

                const res = await fetchWithCsrf(endpoint, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const err = await res.json();
                    return alert('Lỗi khi lưu bộ câu hỏi: ' + JSON.stringify(err));
                }
                const quiz = await res.json();
                closeQuizBuilderModal();
                await loadNotebooks();
                if (notebookId) {
                    selectNotebook(parseInt(notebookId, 10), true);
                }
                alert(currentEditingQuizId ? 'Đã cập nhật bộ câu hỏi trắc nghiệm thành công!' : 'Đã lưu bộ câu hỏi trắc nghiệm thành công!');
            } catch (err) {
                console.error('Lỗi lưu quiz:', err);
                alert('Đã xảy ra lỗi khi lưu bộ câu hỏi.');
            }
        }

        function closeQuizBuilderModal() {
            const modal = document.getElementById('quiz-builder-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            const container = document.getElementById('quiz-questions-container');
            if (container) container.innerHTML = '';
            currentEditingQuizId = null;
        }

        function addQuizQuestionRow() {
            const container = document.getElementById('quiz-questions-container');
            if (!container) return;
            const index = container.children.length;
            const row = document.createElement('div');
            row.className = 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3';
            row.innerHTML = `
                <div class="flex items-start justify-between gap-3">
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Câu hỏi ${index + 1}</span>
                    <button type="button" onclick="this.closest('div[data-question-row]').remove()" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">Xóa</button>
                </div>
                <div>
                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Nội dung câu hỏi</label>
                    <textarea data-question-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án A</label>
                        <input data-option-input="A" type="text" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án B</label>
                        <input data-option-input="B" type="text" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án C</label>
                        <input data-option-input="C" type="text" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án D</label>
                        <input data-option-input="D" type="text" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án đúng</label>
                        <select data-correct-option class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Giải thích</label>
                        <textarea data-explanation-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
                    </div>
                </div>
            `;
            row.setAttribute('data-question-row', index);
            container.appendChild(row);
        }

        function renderQuizSets(quizzes) {
            const container = document.getElementById('quiz-sets-container');
            if (!container) return;
            const t = window.t || ((k, fallback) => fallback);

            if (!quizzes || quizzes.length === 0) {
                container.innerHTML = '';
                container.classList.add('hidden');
                return;
            }

            container.classList.remove('hidden');
            container.innerHTML = quizzes.map(quiz => `
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
                    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                            <div class="flex items-center gap-2 mb-1.5">
                                <span class="text-[10px] uppercase font-bold tracking-wide text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">${t('key_tag_quiz', 'Trắc nghiệm')}</span>
                                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${quiz.attempts_count || 0} ${t('key_quiz_attempts_count', 'lượt làm')}</span>
                            </div>
                            <h4 class="font-bold text-slate-900 dark:text-white text-sm">${escapeHtml(quiz.name)}</h4>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${escapeHtml(quiz.description || t('key_ph_notebook_desc', 'Không có mô tả'))}</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <button onclick="openQuizPlayModal(${quiz.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <span>${t('key_quiz_take_now_btn', 'Làm bài')}</span>
                            </button>
                            <button onclick="openQuizReviewModal(${quiz.id})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">
                                <span>${t('key_btn_view_details', 'Chi tiết')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function selectQuizSet(quizId) {
            if (!quizId) return;
            openQuizPlayModal(quizId);
        }

        function openQuizPlayModal(quizId) {
            if (!quizId) return;
            currentQuizPlaying = quizId;
            currentQuizAnswers = {};
            const t = window.t || ((k, fallback) => fallback);
            const modal = document.getElementById('quiz-play-modal');
            const title = document.getElementById('quiz-play-title');
            if (title) title.innerText = t('key_quiz_take_now_btn', 'Làm bài trắc nghiệm');
            const content = document.getElementById('quiz-play-content');
            if (!content || !modal) return;

            content.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 space-y-3">
                    <div class="w-10 h-10 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin"></div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">${t('key_105', 'Đang tải câu hỏi bài tập...')}</p>
                </div>
            `;
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            fetchWithCsrf(`${API_URL}/quizzes/${quizId}/shuffle/`, { method: 'POST' })
                .then(async res => {
                    if (!res.ok) {
                        // Fallback to direct quiz questions if shuffle is not available
                        const fallbackRes = await fetch(`${API_URL}/quizzes/${quizId}/`);
                        if (fallbackRes.ok) {
                            const quizData = await fallbackRes.json();
                            if (title && quizData.name) title.innerText = quizData.name;
                            return quizData.questions || [];
                        }

                        // Fallback to AIGeneration
                        const genRes = await fetch(`${API_URL}/generations/${quizId}/`);
                        if (genRes.ok) {
                            const genData = await genRes.json();
                            const fallback = parseQuizGenerationContent(genData.content);
                            if (fallback && Array.isArray(fallback.questions) && fallback.questions.length) {
                                if (title && fallback.title) title.innerText = fallback.title;
                                return fallback.questions.map((q, idx) => ({
                                    id: `gen-${quizId}-${idx}`,
                                    question_text: q.question_text || q.question || '',
                                    options: q.options || [],
                                    correct_option: q.correct_option || q.answer || 'A',
                                    explanation: q.explanation || ''
                                }));
                            }
                        }
                        throw new Error('Không thể tải bài tập.');
                    }
                    return res.json();
                })
                .then(questions => {
                    if (!Array.isArray(questions) || questions.length === 0) {
                        content.innerHTML = `
                            <div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs space-y-3">
                                <p>${t('key_quiz_editor_empty', 'Bài tập chưa có câu hỏi nào.')}</p>
                                <button onclick="openQuizBuilderModal(${quizId})" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-semibold">${t('key_btn_add_question', '+ Thêm câu hỏi')}</button>
                            </div>
                        `;
                        return;
                    }
                    currentQuizAnswers = {};
                    renderQuizPlayContent(quizId, questions);
                })
                .catch(err => {
                    console.error('Quiz play error:', err);
                    content.innerHTML = `<div class="text-center py-12 text-rose-500 dark:text-rose-400 text-xs">${t('key_113', 'Không thể tải bài tập. Vui lòng thử lại sau.')}</div>`;
                });
        }

        function closeQuizPlayModal() {
            const modal = document.getElementById('quiz-play-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            currentQuizPlaying = null;
            currentQuizAnswers = {};
            const content = document.getElementById('quiz-play-content');
            if (content) content.innerHTML = '';
        }

        function renderQuizPlayContent(quizId, questions) {
            const content = document.getElementById('quiz-play-content');
            if (!content) return;
            const t = window.t || ((k, fallback) => fallback);

            const total = questions.length;

            const quizBlocks = questions.map((question, idx) => {
                const qId = `quiz-play-${question.id}`;
                const options = Array.isArray(question.options) ? question.options : [];
                const correctOption = (question.correct_option || question.answer || 'A').toString().toUpperCase();

                const optionsHtml = options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    return `
                        <button type="button" onclick="selectQuizOption('${question.id}', '${letter}', '${correctOption}')" id="${qId}-opt-${optIdx}" class="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition font-medium">
                            ${formatQuizOption(opt, optIdx)}
                        </button>
                    `;
                }).join('');

                return `
                    <div class="quiz-question-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm" data-question-id="${question.id}">
                        <div class="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                ${idx + 1} / ${total}
                            </span>
                            <span id="${qId}-status" class="text-xs font-semibold text-slate-400">${t('key_quiz_unanswered_status', 'Chưa trả lời')}</span>
                        </div>
                        
                        <p class="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                            ${escapeHtml(question.question_text || question.question || t('key_ph_quiz_desc', 'Câu hỏi chưa có nội dung'))}
                        </p>
                        
                        <div id="${qId}-options" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            ${optionsHtml}
                        </div>
                        
                        <div id="${qId}-result" class="hidden text-xs font-semibold p-3.5 rounded-xl"></div>
                        <div id="${qId}-explanation" class="hidden text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">${escapeHtml(question.explanation || '')}</div>
                    </div>
                `;
            }).join('');

            content.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-center justify-between bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl px-4 py-3 text-xs text-indigo-900 dark:text-indigo-300">
                        <span class="font-medium">${t('key_quiz_play_prompt', 'Chọn đáp án cho từng câu hỏi và bấm Nộp bài để lưu kết quả.')}</span>
                        <button type="button" onclick="retakeCurrentQuiz()" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline flex items-center space-x-1.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            <span>${t('key_quiz_play_retake', 'Làm lại từ đầu')}</span>
                        </button>
                    </div>

                    ${quizBlocks}

                    <!-- Footer Submission Bar -->
                    <div id="quiz-play-footer" class="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p class="font-bold text-slate-900 dark:text-white text-sm">${t('key_quiz_play_finish_title', 'Hoàn thành bài kiểm tra')}</p>
                                <p id="quiz-play-status-text" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${t('key_quiz_play_answered_status', 'Đã trả lời')} 0 / ${total}.</p>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button type="button" onclick="submitQuizAttempt()" class="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs shadow-sm transition">
                                    <span>${t('key_quiz_play_submit_btn', 'Nộp bài')}</span>
                                </button>
                            </div>
                        </div>
                        <div id="quiz-play-summary" class="hidden"></div>
                    </div>
                </div>
            `;
        }

        function selectQuizOption(questionId, selectedLetter, correctOption) {
            const qId = `quiz-play-${questionId}`;
            const optionsContainer = document.getElementById(`${qId}-options`);
            if (!optionsContainer) return;
            const t = window.t || ((k, fallback) => fallback);

            const buttons = optionsContainer.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-70', 'cursor-not-allowed');
            });

            const selectedIdx = selectedLetter.charCodeAt(0) - 65;
            const selectedBtn = document.getElementById(`${qId}-opt-${selectedIdx}`);
            const isCorrect = selectedLetter.toUpperCase() === correctOption.toUpperCase();

            if (selectedBtn) {
                if (isCorrect) {
                    selectedBtn.classList.add('bg-emerald-50', 'dark:bg-emerald-950/40', 'border-emerald-500', 'text-emerald-800', 'dark:text-emerald-300', 'font-semibold');
                } else {
                    selectedBtn.classList.add('bg-rose-50', 'dark:bg-rose-950/40', 'border-rose-500', 'text-rose-800', 'dark:text-rose-300', 'font-semibold');
                    buttons.forEach((btn, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        if (letter === correctOption.toUpperCase()) {
                            btn.classList.add('bg-emerald-50', 'dark:bg-emerald-950/40', 'border-emerald-500', 'text-emerald-800', 'dark:text-emerald-300', 'font-semibold');
                        }
                    });
                }
            }

            const statusSpan = document.getElementById(`${qId}-status`);
            if (statusSpan) {
                statusSpan.innerText = isCorrect ? t('key_quiz_correct_badge', 'Chính xác') : t('key_quiz_incorrect_badge', 'Chưa chính xác');
                statusSpan.className = `text-xs font-semibold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;
            }

            const resultDiv = document.getElementById(`${qId}-result`);
            if (resultDiv) {
                resultDiv.classList.remove('hidden');
                if (isCorrect) {
                    resultDiv.className = 'text-xs font-semibold p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50';
                    resultDiv.innerText = t('key_quiz_result_correct', '✓ Chính xác! Bạn đã chọn đáp án đúng.');
                } else {
                    resultDiv.className = 'text-xs font-semibold p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50';
                    resultDiv.innerText = `${t('key_quiz_result_incorrect', '✗ Chưa chính xác. Đáp án đúng là')} ${correctOption}.`;
                }
            }

            const explanationDiv = document.getElementById(`${qId}-explanation`);
            if (explanationDiv) {
                explanationDiv.classList.remove('hidden');
            }

            currentQuizAnswers[String(questionId)] = selectedLetter.toUpperCase();
            const answeredCount = Object.keys(currentQuizAnswers).length;
            const totalQuestions = document.querySelectorAll('#quiz-play-content .quiz-question-card').length;
            const statusText = document.getElementById('quiz-play-status-text');
            if (statusText) {
                statusText.innerText = `${t('key_quiz_play_answered_status', 'Đã trả lời')} ${answeredCount} / ${totalQuestions}.`;
            }
        }

        // Retake Quiz Function
        function retakeCurrentQuiz() {
            if (!currentQuizPlaying) return;
            currentQuizAnswers = {};
            openQuizPlayModal(currentQuizPlaying);
            if (typeof showToastNotification === 'function') {
                showToastNotification('Bắt đầu làm lại bài tập.');
            }
        }

        async function submitQuizAttempt() {
            if (!currentQuizPlaying) return;
            const t = window.t || ((k, fallback) => fallback);
            const totalQuestions = document.querySelectorAll('#quiz-play-content .quiz-question-card').length;
            const answeredCount = Object.keys(currentQuizAnswers).length;
            if (answeredCount < totalQuestions) {
                if (!confirm(t('key_quiz_unanswered_alert', 'Bạn còn câu hỏi chưa trả lời. Bạn có chắc chắn muốn nộp bài không?'))) {
                    return;
                }
            }

            try {
                let data = null;
                const res = await fetchWithCsrf(`${API_URL}/attempts/submit/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quiz: currentQuizPlaying, answers: currentQuizAnswers })
                });
                if (res.ok) {
                    data = await res.json();
                } else {
                    // Fallback to client-side evaluation for standalone AI Generations
                    const questionCards = Array.from(document.querySelectorAll('#quiz-play-content .quiz-question-card'));
                    let score = 0;
                    questionCards.forEach(card => {
                        const qId = card.getAttribute('data-question-id');
                        const statusSpan = document.getElementById(`quiz-play-${qId}-status`);
                        if (statusSpan && (statusSpan.innerText === 'Chính xác' || statusSpan.innerText === t('key_quiz_correct_badge', 'Chính xác') || statusSpan.innerText === 'Correct')) {
                            score++;
                        }
                    });
                    const total = questionCards.length;
                    const percentage = total ? Math.round((score / total) * 100) : 0;
                    data = { score, total, percentage };
                }

                const summary = document.getElementById('quiz-play-summary');
                if (summary) {
                    summary.classList.remove('hidden');
                    
                    let badgeColor = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50';
                    let cheerMessage = 'Bạn đã nắm vững kiến thức bài tập này.';
                    if (data.percentage < 50) {
                        badgeColor = 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50';
                        cheerMessage = 'Điểm chưa cao, hãy đọc lại phần giải thích và làm lại để cải thiện nhé.';
                    } else if (data.percentage < 80) {
                        badgeColor = 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50';
                        cheerMessage = 'Kết quả khá tốt. Bạn có thể làm lại để đạt điểm tối đa.';
                    }

                    summary.innerHTML = `
                        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 mt-4 shadow-sm">
                            <div class="inline-flex items-center justify-center px-4 py-2 rounded-xl ${badgeColor} font-bold text-lg">
                                Kết quả: ${data.score} / ${data.total} (${data.percentage}%)
                            </div>
                            
                            <div>
                                <h4 class="text-sm font-bold text-slate-900 dark:text-white">${cheerMessage}</h4>
                                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Lượt làm bài đã được ghi nhận.</p>
                            </div>
                            
                            <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
                                <button type="button" onclick="retakeCurrentQuiz()" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                    <span>${t('key_quiz_retake_this_quiz', 'Làm lại bài thi này')}</span>
                                </button>
                                <button type="button" onclick="closeQuizPlayModal()" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <span>${t('key_quiz_finish_close', 'Hoàn thành & Đóng')}</span>
                                </button>
                            </div>
                        </div>
                    `;
                    
                    // Scroll summary into view
                    summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                if (typeof loadNotebooks === 'function') await loadNotebooks();
                if (activeNotebookId && typeof selectNotebook === 'function') {
                    await selectNotebook(activeNotebookId, true);
                }
            } catch (err) {
                console.error('Lỗi khi nộp quiz:', err);
                alert('Đã xảy ra lỗi khi gửi kết quả.');
            }
        }

        function checkQuizAnswer(qId, selectedLetter, correctAnswer, selectedIdx) {
            const optionsContainer = document.getElementById(`${qId}-options`);
            if (!optionsContainer) return;
            const buttons = optionsContainer.getElementsByTagName('button');
            
            for (let btn of buttons) {
                btn.disabled = true;
                btn.classList.add('opacity-70', 'cursor-not-allowed');
            }
            
            const selectedBtn = document.getElementById(`${qId}-opt-${selectedIdx}`);
            const isCorrect = selectedLetter.toUpperCase() === correctAnswer.toUpperCase();
            
            if (selectedBtn) {
                if (isCorrect) {
                    selectedBtn.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800');
                    selectedBtn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
                } else {
                    selectedBtn.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800');
                    selectedBtn.classList.add('bg-rose-500/10', 'dark:bg-rose-500/20', 'border-rose-500', 'text-rose-700', 'dark:text-rose-400');
                    
                    for (let i = 0; i < buttons.length; i++) {
                        const letter = String.fromCharCode(65 + i);
                        if (letter.toUpperCase() === correctAnswer.toUpperCase()) {
                            const correctBtn = document.getElementById(`${qId}-opt-${i}`);
                            if (correctBtn) {
                                correctBtn.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800');
                                correctBtn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
                            }
                        }
                    }
                }
            }
            
            const resultDiv = document.getElementById(`${qId}-result`);
            if (resultDiv) {
                resultDiv.classList.remove('hidden');
                if (isCorrect) {
                    resultDiv.innerText = "✓ Chính xác!";
                    resultDiv.className = "text-[11px] font-bold p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
                } else {
                    resultDiv.innerText = `✗ Chưa chính xác. Đáp án đúng là ${correctAnswer}.`;
                    resultDiv.className = "text-[11px] font-bold p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20";
                }
            }
            
            const exp = document.getElementById(`${qId}-explanation`);
            if (exp) exp.classList.remove('hidden');
        }

        async function openQuizReviewModal(quizId) {
            if (!quizId) return;
            const modal = document.getElementById('quiz-review-modal');
            const content = document.getElementById('quiz-review-content');
            const title = document.getElementById('quiz-review-title');
            if (title) title.innerText = 'Xem lại bộ câu hỏi';
            if (!content || !modal) return;

            content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Đang tải nội dung câu hỏi...</div>';
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            try {
                let quiz = null;
                let res = await fetch(`${API_URL}/quizzes/${quizId}/`);
                if (res.ok) {
                    quiz = await res.json();
                } else {
                    const generationRes = await fetch(`${API_URL}/generations/${quizId}/`);
                    if (!generationRes.ok) throw new Error('Không thể tải bộ câu hỏi');
                    const generation = await generationRes.json();
                    const fallback = parseQuizGenerationContent(generation.content);
                    if (!fallback || !Array.isArray(fallback.questions) || fallback.questions.length === 0) {
                        content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Bộ câu hỏi này chưa có nội dung nào.</div>';
                        return;
                    }
                    if (title) title.innerText = generation.generation_type === 'quiz' ? 'Xem lại bộ câu hỏi đã lưu' : 'Xem lại tài liệu';
                    content.innerHTML = `
                        <div class="space-y-4">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                <div>
                                    <p class="text-[10px] uppercase tracking-wider font-bold text-slate-500">${t('key_tag_quiz', 'Bộ câu hỏi')}</p>
                                    <h4 class="font-bold text-slate-900 dark:text-white text-base mt-1">${escapeHtml(fallback.title)}</h4>
                                    <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(fallback.description)}</p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button onclick="convertGenerationToQuizSet(${quizId})" class="bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1">
                                        <span>💾</span> <span>${t('key_quiz_convert_official_btn', 'Lưu thành bài tập chính thức')}</span>
                                    </button>
                                    <button onclick="openQuizGenerationEditorModal(${quizId})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">${t('key_quiz_edit_questions_btn', 'Sửa câu hỏi')}</button>
                                </div>
                            </div>
                            ${fallback.questions.map((question, idx) => {
                                const options = Array.isArray(question.options) ? question.options : [];
                                const correctOption = (question.correct_option || question.answer || 'A').toString().toUpperCase();
                                return `
                                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                                        <div class="flex items-center justify-between gap-3">
                                            <span class="text-[10px] uppercase tracking-wider font-bold text-slate-500">${idx + 1}</span>
                                            <span id="quiz-review-status-${generation.id}-${idx}" class="text-[10px] font-bold uppercase tracking-wide text-slate-400">&nbsp;</span>
                                        </div>
                                        <p class="text-sm font-semibold text-slate-900 dark:text-white">${escapeHtml(question.question_text || question.question || t('key_ph_quiz_desc', 'Câu hỏi chưa có nội dung'))}</p>
                                        <div id="quiz-review-${generation.id}-${idx}-options" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            ${options.map((opt, optIdx) => `
                                                <button type="button" onclick="selectQuizReviewOption('${generation.id}-${idx}', '${String.fromCharCode(65 + optIdx)}', '${correctOption}')" id="quiz-review-${generation.id}-${idx}-opt-${optIdx}" data-explanation="${escapeHtml(question.explanation || '')}" class="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition font-medium">
                                                    ${formatQuizOption(opt, optIdx)}
                                                </button>
                                            `).join('')}
                                        </div>
                                        <div id="quiz-review-${generation.id}-${idx}-result" class="hidden text-[11px] font-bold p-3 rounded-xl"></div>
                                        <div id="quiz-review-${generation.id}-${idx}-explanation" class="hidden text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800"></div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                    return;
                }

                const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
                if (!questions.length) {
                    content.innerHTML = `<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">${t('key_quiz_editor_empty', 'Bộ câu hỏi này chưa có nội dung nào.')}</div>`;
                    return;
                }

                if (title) title.innerText = quiz.name || t('key_tag_quiz', 'Xem lại bộ câu hỏi');
                content.innerHTML = `
                    <div class="space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                            <div>
                                <p class="text-[10px] uppercase tracking-wider font-bold text-slate-500">${t('key_tag_quiz', 'Bộ câu hỏi trắc nghiệm')}</p>
                                <h4 class="font-bold text-slate-900 dark:text-white text-base mt-1">${escapeHtml(quiz.name || t('key_tag_quiz', 'Bộ câu hỏi'))}</h4>
                                <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(quiz.description || t('key_ph_notebook_desc', 'Không có mô tả'))}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="openQuizPlayModal(${quiz.id})" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm">
                                    <span>🎯</span> <span>${t('key_quiz_take_now_btn', 'Làm bài ngay')}</span>
                                </button>
                                <button onclick="openQuizBuilderModal(${quiz.id})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">${t('key_quiz_edit_questions_btn', 'Sửa câu hỏi')}</button>
                            </div>
                        </div>
                        ${questions.map((question, idx) => {
                            const options = Array.isArray(question.options) ? question.options : [];
                            const correctOption = (question.correct_option || 'A').toString().toUpperCase();
                            return `
                                <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-[10px] uppercase tracking-wider font-bold text-slate-500">${idx + 1}</span>
                                        <span id="quiz-review-status-${quiz.id}-${idx}" class="text-[10px] font-bold uppercase tracking-wide text-slate-400">&nbsp;</span>
                                    </div>
                                    <p class="text-sm font-semibold text-slate-900 dark:text-white">${escapeHtml(question.question_text || t('key_ph_quiz_desc', 'Câu hỏi chưa có nội dung'))}</p>
                                    <div id="quiz-review-${quiz.id}-${idx}-options" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        ${options.map((opt, optIdx) => `
                                            <button type="button" onclick="selectQuizReviewOption('${quiz.id}-${idx}', '${String.fromCharCode(65 + optIdx)}', '${correctOption}')" id="quiz-review-${quiz.id}-${idx}-opt-${optIdx}" data-explanation="${escapeHtml(question.explanation || '')}" class="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition font-medium">
                                                ${formatQuizOption(opt, optIdx)}
                                            </button>
                                        `).join('')}
                                    </div>
                                    <div id="quiz-review-${quiz.id}-${idx}-result" class="hidden text-[11px] font-bold p-3 rounded-xl"></div>
                                    <div id="quiz-review-${quiz.id}-${idx}-explanation" class="hidden text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800"></div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } catch (err) {
                console.error('Quiz review error:', err);
                content.innerHTML = `<div class="text-center py-12 text-rose-500 dark:text-rose-400 text-xs">${t('key_113', 'Không thể tải nội dung bộ câu hỏi. Vui lòng thử lại.')}</div>`;
            }
        }

        function closeQuizReviewModal() {
            const modal = document.getElementById('quiz-review-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            const content = document.getElementById('quiz-review-content');
            if (content) content.innerHTML = '';
        }

        function selectQuizReviewOption(reviewId, selectedLetter, correctOption) {
            const qId = `quiz-review-${reviewId}`;
            const optionsContainer = document.getElementById(`${qId}-options`);
            if (!optionsContainer) return;
            const t = window.t || ((k, fallback) => fallback);
            const buttons = optionsContainer.querySelectorAll('button');
            const correctClasses = ['bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400'];
            const wrongClasses = ['bg-rose-500/10', 'dark:bg-rose-500/20', 'border-rose-500', 'text-rose-700', 'dark:text-rose-400'];
            const normalClasses = ['bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800', 'text-slate-700', 'dark:text-slate-300'];
            buttons.forEach(btn => {
                btn.classList.remove(...correctClasses, ...wrongClasses);
                btn.classList.add(...normalClasses);
            });

            const selectedIdx = selectedLetter.charCodeAt(0) - 65;
            const selectedBtn = document.getElementById(`${qId}-opt-${selectedIdx}`);
            const isCorrect = selectedLetter.toUpperCase() === correctOption.toUpperCase();
            if (selectedBtn) {
                if (isCorrect) {
                    selectedBtn.classList.remove(...normalClasses);
                    selectedBtn.classList.add(...correctClasses);
                } else {
                    selectedBtn.classList.remove(...normalClasses);
                    selectedBtn.classList.add(...wrongClasses);
                    buttons.forEach((btn, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        if (letter === correctOption.toUpperCase()) {
                            btn.classList.remove(...normalClasses);
                            btn.classList.add(...correctClasses);
                        }
                    });
                }
            }

            buttons.forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-70', 'cursor-not-allowed');
            });

            const resultDiv = document.getElementById(`${qId}-result`);
            const statusSpan = document.getElementById(`quiz-review-status-${reviewId}`);
            if (resultDiv) {
                resultDiv.classList.remove('hidden');
                if (isCorrect) {
                    resultDiv.className = 'text-[11px] font-bold p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
                    resultDiv.innerText = t('key_quiz_result_correct', '✓ Chính xác!');
                } else {
                    resultDiv.className = 'text-[11px] font-bold p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20';
                    resultDiv.innerText = t('key_quiz_result_incorrect', '✗ Chưa chính xác.');
                }
            }
            if (statusSpan) {
                statusSpan.innerText = isCorrect ? t('key_quiz_correct_badge', 'Đúng') : t('key_quiz_incorrect_badge', 'Sai');
                statusSpan.className = `text-[10px] font-bold uppercase tracking-wide ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`;
            }

            const explanationDiv = document.getElementById(`${qId}-explanation`);
            const explanation = selectedBtn?.dataset?.explanation || '';
            if (explanationDiv) {
                explanationDiv.classList.remove('hidden');
                explanationDiv.innerText = explanation ? `${t('key_quiz_explanation_prefix', 'Giải thích:')} ${explanation}` : (isCorrect ? t('key_quiz_result_correct', 'Bạn đã chọn đúng!') : t('key_quiz_result_incorrect', 'Hãy đọc kỹ và thử lại lần sau.'));
            }
        }

        async function convertGenerationToQuizSet(generationId) {
            const t = window.t || ((k, fallback) => fallback);
            try {
                const res = await fetchWithCsrf(`${API_URL}/generations/${generationId}/convert_to_quiz/`, {
                    method: 'POST'
                });
                if (res.ok) {
                    const quizSet = await res.json();
                    alert(t('key_tool_save_success', "Đã chuyển đổi và lưu thành bài tập Quiz chính thức thành công!"));
                    closeQuizReviewModal();
                    await loadNotebooks();
                    if (activeNotebookId) await selectNotebook(activeNotebookId, true);
                    openQuizPlayModal(quizSet.id);
                } else {
                    const err = await res.json();
                    alert(t('key_tool_save_error', "Lỗi khi chuyển đổi quiz: ") + (err.error || JSON.stringify(err)));
                }
            } catch (e) {
                console.error("Convert to QuizSet error:", e);
                alert("Đã có lỗi xảy ra khi chuyển đổi quiz.");
            }
        }

        async function openQuizGenerationEditorModal(materialId) {
            if (!materialId) return;
            currentQuizGenerationEditingId = materialId;
            try {
                let parsed = [];
                const res = await fetch(`${API_URL}/generations/${materialId}/`);
                if (res.ok) {
                    const material = await res.json();
                    try {
                        let raw = (material.content || '').trim();
                        if (raw.startsWith('```')) {
                            raw = raw.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim();
                        }
                        parsed = JSON.parse(raw);
                        if (!Array.isArray(parsed)) parsed = [];
                    } catch (err) {
                        const fallback = parseQuizGenerationContent(material.content);
                        if (fallback && Array.isArray(fallback.questions)) {
                            parsed = fallback.questions;
                        } else {
                            parsed = [];
                        }
                    }
                } else {
                    // Fallback to QuizSet
                    const quizRes = await fetch(`${API_URL}/quizzes/${materialId}/`);
                    if (quizRes.ok) {
                        const quiz = await quizRes.json();
                        parsed = Array.isArray(quiz.questions) ? quiz.questions : [];
                    }
                }

                currentQuizGenerationEditorQuestions = parsed.length ? parsed.map(item => ({
                    question_text: item.question || item.question_text || '',
                    options: Array.isArray(item.options) ? item.options.slice(0, 4) : ['', '', '', ''],
                    answer: (item.answer || item.correct_option || item.correctOption || 'A').toString().toUpperCase(),
                    explanation: item.explanation || ''
                })) : [{ question_text: '', options: ['', '', '', ''], answer: 'A', explanation: '' }];
                currentQuizGenerationEditorQuestions = currentQuizGenerationEditorQuestions.map(item => ({
                    ...item,
                    options: [...item.options, '', '', '', ''].slice(0, 4)
                }));
                renderQuizGenerationEditorForm(currentQuizGenerationEditorQuestions);
                const modal = document.getElementById('quiz-generation-editor-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }
            } catch (err) {
                console.error('Open quiz generation editor error:', err);
                alert('Không thể mở trình chỉnh sửa bộ câu hỏi.');
            }
        }

        function closeQuizGenerationEditorModal() {
            const modal = document.getElementById('quiz-generation-editor-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            currentQuizGenerationEditingId = null;
            currentQuizGenerationEditorQuestions = [];
        }

        async function saveQuizGenerationEdit() {
            if (!currentQuizGenerationEditingId) return;
            const t = window.t || ((k, fallback) => fallback);
            const questions = collectQuizGenerationEditorQuestions();
            if (!questions.length) return alert('Vui lòng thêm ít nhất một câu hỏi.');
            try {
                const payload = JSON.stringify(questions, null, 2);
                const res = await fetchWithCsrf(`${API_URL}/generations/${currentQuizGenerationEditingId}/`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: payload })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(JSON.stringify(err));
                }
                closeQuizGenerationEditorModal();
                await loadNotebooks();
                if (activeNotebookId) await selectNotebook(activeNotebookId, true);
                alert(t('key_tool_save_success', 'Đã cập nhật bộ câu hỏi thành công!'));
            } catch (err) {
                console.error('Save quiz generation edit error:', err);
                alert('Lỗi khi lưu bộ câu hỏi.');
            }
        }

        function parseQuizGenerationContent(content) {
            if (!content) return null;

            let raw = String(content).trim();
            if (!raw) return null;

            try {
                if (raw.startsWith('```')) {
                    raw = raw.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim();
                }
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) {
                    const questions = parsed.map((item) => ({
                        question_text: item.question_text || item.question || '',
                        options: Array.isArray(item.options) ? item.options : [],
                        correct_option: (item.correct_option || item.answer || (typeof item.correct_index === 'number' ? String.fromCharCode(65 + item.correct_index) : 'A')).toString().toUpperCase(),
                        explanation: item.explanation || item.explanation || ''
                    }));
                    return {
                        title: 'Bộ câu hỏi đã lưu',
                        description: 'Đã lưu từ tài nguyên học tập.',
                        questions
                    };
                }
            } catch (err) {
                // Fallback
            }

            const text = raw.replace(/\r\n/g, '\n');
            const cleaned = text.replace(/^\s*🏷️\s*Chủ đề:\s*.*?\n?/i, '').trim();
            if (!cleaned) return null;
            return {
                title: 'Bộ câu hỏi đã lưu',
                description: 'Đã lưu từ tài nguyên học tập.',
                questions: [{
                    question_text: cleaned,
                    options: ['A. Xem thêm nội dung', 'B. Xem thêm nội dung', 'C. Xem thêm nội dung', 'D. Xem thêm nội dung'],
                    correct_option: 'A',
                    explanation: cleaned
                }]
            };
        }

        function renderQuizGenerationEditorForm(questions) {
            const container = document.getElementById('quiz-generation-editor-form');
            if (!container) return;
            const t = window.t || ((k, fallback) => fallback);
            container.innerHTML = `
                <div class="space-y-3">
                    ${questions.length ? questions.map((question, idx) => `
                        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3" data-quiz-generation-row="${idx}">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${idx + 1}</span>
                                <button type="button" onclick="removeQuizGenerationEditorRow(${idx})" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">${t('key_btn_delete', 'Xóa')}</button>
                            </div>
                            <div>
                                <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">${t('key_flashcard_question', 'Nội dung câu hỏi')}</label>
                                <textarea data-quiz-question rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(question.question_text || question.question || '')}</textarea>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                ${['A','B','C','D'].map((letter, optIdx) => `
                                    <div>
                                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">${t('key_flashcard_answer', 'Đáp án')} ${letter}</label>
                                        <input data-quiz-option="${letter}" type="text" value="${escapeHtml(normalizeQuizOption((question.options || [])[optIdx] || ''))}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                    </div>
                                `).join('')}
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">${t('key_quiz_correct_badge', 'Đáp án đúng')}</label>
                                    <select data-quiz-correct-answer class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                        ${['A','B','C','D'].map((letter) => `<option value="${letter}" ${letter === (question.answer || question.correct_option || 'A') ? 'selected' : ''}>${letter}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">${t('key_quiz_explanation_prefix', 'Giải thích')}</label>
                                    <textarea data-quiz-explanation rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(question.explanation || '')}</textarea>
                                </div>
                            </div>
                        </div>
                    `).join('') : `<div class="text-center py-6 text-[11px] text-slate-400">${t('key_quiz_editor_empty', 'Chưa có câu hỏi nào. Nhấn “+ Thêm câu hỏi” để bắt đầu.')}</div>`}
                </div>
            `;
        }

        function addQuizGenerationEditorRow() {
            currentQuizGenerationEditorQuestions.push({
                question_text: '',
                options: ['', '', '', ''],
                answer: 'A',
                explanation: ''
            });
            renderQuizGenerationEditorForm(currentQuizGenerationEditorQuestions);
        }

        function removeQuizGenerationEditorRow(index) {
            currentQuizGenerationEditorQuestions = currentQuizGenerationEditorQuestions.filter((_, idx) => idx !== index);
            if (!currentQuizGenerationEditorQuestions.length) {
                currentQuizGenerationEditorQuestions.push({
                    question_text: '',
                    options: ['', '', '', ''],
                    answer: 'A',
                    explanation: ''
                });
            }
            renderQuizGenerationEditorForm(currentQuizGenerationEditorQuestions);
        }

        function collectQuizGenerationEditorQuestions() {
            const container = document.getElementById('quiz-generation-editor-form');
            if (!container) return [];
            return Array.from(container.querySelectorAll('[data-quiz-generation-row]')).map((row) => {
                const options = ['A', 'B', 'C', 'D'].map(letter => row.querySelector(`[data-quiz-option="${letter}"]`).value.trim());
                return {
                    question: row.querySelector('[data-quiz-question]').value.trim(),
                    options: options.map(normalizeQuizOption),
                    answer: row.querySelector('[data-quiz-correct-answer]').value.trim().toUpperCase(),
                    explanation: row.querySelector('[data-quiz-explanation]').value.trim()
                };
            }).filter(item => item.question || item.options.some(Boolean) || item.explanation);
        }

        function normalizeQuizOption(option) {
            const value = String(option ?? '').trim();
            return value.replace(/^[A-D]\.\s*/i, '').trim();
        }

        function formatQuizOption(option, optIdx) {
            const cleanText = normalizeQuizOption(option);
            const letter = String.fromCharCode(65 + optIdx);
            return `${letter}. ${cleanText}`;
        }

        function openQuizGenerationReviewModal(materialId) {
            return openQuizReviewModal(materialId);
        }

        // Expose functions globally to window
        window.openQuizBuilderModal = openQuizBuilderModal;
        window.saveQuizBuilder = saveQuizBuilder;
        window.closeQuizBuilderModal = closeQuizBuilderModal;
        window.addQuizQuestionRow = addQuizQuestionRow;
        window.renderQuizSets = renderQuizSets;
        window.selectQuizSet = selectQuizSet;
        window.openQuizPlayModal = openQuizPlayModal;
        window.closeQuizPlayModal = closeQuizPlayModal;
        window.renderQuizPlayContent = renderQuizPlayContent;
        window.selectQuizOption = selectQuizOption;
        window.retakeCurrentQuiz = retakeCurrentQuiz;
        window.submitQuizAttempt = submitQuizAttempt;
        window.checkQuizAnswer = checkQuizAnswer;
        window.openQuizReviewModal = openQuizReviewModal;
        window.closeQuizReviewModal = closeQuizReviewModal;
        window.selectQuizReviewOption = selectQuizReviewOption;
        window.convertGenerationToQuizSet = convertGenerationToQuizSet;
        window.openQuizGenerationEditorModal = openQuizGenerationEditorModal;
        window.closeQuizGenerationEditorModal = closeQuizGenerationEditorModal;
        window.saveQuizGenerationEdit = saveQuizGenerationEdit;
        window.parseQuizGenerationContent = parseQuizGenerationContent;
        window.renderQuizGenerationEditorForm = renderQuizGenerationEditorForm;
        window.addQuizGenerationEditorRow = addQuizGenerationEditorRow;
        window.removeQuizGenerationEditorRow = removeQuizGenerationEditorRow;
        window.collectQuizGenerationEditorQuestions = collectQuizGenerationEditorQuestions;
        window.normalizeQuizOption = normalizeQuizOption;
        window.formatQuizOption = formatQuizOption;
        window.openQuizGenerationReviewModal = openQuizGenerationReviewModal;


