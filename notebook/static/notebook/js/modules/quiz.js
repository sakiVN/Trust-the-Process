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
                    const res = await fetch(`${API_URL}/quizzes/${quizId}/`);
                    if (!res.ok) throw new Error('Không thể tải dữ liệu quiz');
                    const quiz = await res.json();
                    document.getElementById('quiz-builder-name').value = quiz.name || '';
                    document.getElementById('quiz-builder-desc').value = quiz.description || '';
                    document.getElementById('quiz-builder-notebook').value = quiz.notebook ? String(quiz.notebook) : '';

                    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
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
                                <textarea data-question-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${question.question_text || ''}</textarea>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án A</label>
                                    <input data-option-input="A" type="text" value="${(question.options || [])[0] || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án B</label>
                                    <input data-option-input="B" type="text" value="${(question.options || [])[1] || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án C</label>
                                    <input data-option-input="C" type="text" value="${(question.options || [])[2] || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án D</label>
                                    <input data-option-input="D" type="text" value="${(question.options || [])[3] || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án đúng</label>
                                    <select data-correct-option class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                        ${['A','B','C','D'].map(letter => `<option value="${letter}" ${letter === (question.correct_option || 'A') ? 'selected' : ''}>${letter}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Giải thích</label>
                                    <textarea data-explanation-input rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${question.explanation || ''}</textarea>
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
                    options: [optionA, optionB, optionC, optionD],
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
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('quiz-questions-container').innerHTML = '';
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

            if (!quizzes || quizzes.length === 0) {
                container.innerHTML = '';
                container.classList.add('hidden');
                return;
            }

            container.classList.remove('hidden');
            container.innerHTML = quizzes.map(quiz => `
                <div class="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-300">
                    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-[10px] uppercase font-bold tracking-wide text-slate-400">Bài tập trắc nghiệm</span>
                                <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">${quiz.attempts_count || 0} lượt</span>
                            </div>
                            <h4 class="font-bold text-slate-900 dark:text-white text-sm">${quiz.name}</h4>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${quiz.description || 'Không có mô tả'}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="openQuizPlayModal(${quiz.id})" class="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-xl text-[10px] font-semibold transition">Làm bài</button>
                            <button onclick="selectQuizSet(${quiz.id})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-[10px] font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">Xem chi tiết</button>
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
            const modal = document.getElementById('quiz-play-modal');
            const title = document.getElementById('quiz-play-title');
            title.innerText = 'Làm bài trắc nghiệm';
            const content = document.getElementById('quiz-play-content');
            content.innerHTML = `
                <div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Đang tải bài tập...</div>
            `;
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            fetchWithCsrf(`${API_URL}/quizzes/${quizId}/shuffle/`, { method: 'POST' })
                .then(async res => {
                    if (!res.ok) {
                        throw new Error('Không thể tải bài tập.');
                    }
                    return res.json();
                })
                .then(questions => {
                    if (!Array.isArray(questions) || questions.length === 0) {
                        content.innerHTML = `<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Bài tập chưa có câu hỏi nào.</div>`;
                        return;
                    }
                    currentQuizAnswers = {};
                    renderQuizPlayContent(quizId, questions);
                })
                .catch(err => {
                    console.error('Quiz play error:', err);
                    content.innerHTML = `<div class="text-center py-12 text-rose-500 dark:text-rose-400 text-xs">Không thể tải bài tập. Vui lòng thử lại.</div>`;
                });
        }

        function closeQuizPlayModal() {
            const modal = document.getElementById('quiz-play-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            currentQuizPlaying = null;
            currentQuizAnswers = {};
            document.getElementById('quiz-play-content').innerHTML = '';
        }

        function renderQuizPlayContent(quizId, questions) {
            const content = document.getElementById('quiz-play-content');
            if (!content) return;
            const quizBlocks = questions.map((question, idx) => {
                const qId = `quiz-play-${question.id}`;
                const optionsHtml = question.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    return `
                        <button type="button" onclick="selectQuizOption(${question.id}, '${letter}', '${question.correct_option.toUpperCase()}')" id="${qId}-opt-${optIdx}" class="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-[11px] text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition font-medium">
                            ${formatQuizOption(opt, optIdx)}
                        </button>
                    `;
                }).join('');
                return `
                    <div class="quiz-question-card bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 space-y-3">
                        <div class="flex items-center justify-between gap-4">
                            <div>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Câu ${idx + 1}</span>
                                <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-white">${question.question_text}</p>
                            </div>
                            <span id="${qId}-status" class="text-[10px] font-bold uppercase tracking-wide text-slate-400"></span>
                        </div>
                        <div id="${qId}-options" class="grid grid-cols-1 gap-2">${optionsHtml}</div>
                        <div id="${qId}-result" class="hidden text-[11px] font-bold p-3 rounded-xl"></div>
                        <div id="${qId}-explanation" class="hidden text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800"></div>
                    </div>
                `;
            }).join('');

            content.innerHTML = `
                <div class="space-y-4">
                    ${quizBlocks}
                    <div id="quiz-play-footer" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 text-sm text-slate-700 dark:text-slate-300">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <p class="font-semibold text-slate-900 dark:text-white">Chưa hoàn thành</p>
                                <p class="text-[10px] text-slate-500 dark:text-slate-400">Hãy trả lời tất cả các câu hỏi để lưu lần làm bài.</p>
                            </div>
                            <button type="button" onclick="submitQuizAttempt()" class="inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition">Nộp bài và lưu kết quả</button>
                        </div>
                        <div id="quiz-play-summary" class="mt-4 text-[10px] text-slate-500 dark:text-slate-400"></div>
                    </div>
                </div>
            `;
        }

        function selectQuizOption(questionId, selectedLetter, correctOption) {
            const qId = `quiz-play-${questionId}`;
            const buttons = document.querySelectorAll(`#${qId}-options button`);
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-70', 'cursor-not-allowed');
            });

            const selectedIdx = selectedLetter.charCodeAt(0) - 65;
            const selectedBtn = document.getElementById(`${qId}-opt-${selectedIdx}`);
            const isCorrect = selectedLetter.toUpperCase() === correctOption.toUpperCase();
            if (isCorrect) {
                selectedBtn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
            } else {
                selectedBtn.classList.add('bg-rose-500/10', 'dark:bg-rose-500/20', 'border-rose-500', 'text-rose-700', 'dark:text-rose-400');
                buttons.forEach((btn, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    if (letter === correctOption.toUpperCase()) {
                        btn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
                    }
                });
            }

            const resultDiv = document.getElementById(`${qId}-result`);
            resultDiv.classList.remove('hidden');
            if (isCorrect) {
                resultDiv.className = 'text-[11px] font-bold p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
                resultDiv.innerText = '✓ Chính xác!';
            } else {
                resultDiv.className = 'text-[11px] font-bold p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20';
                resultDiv.innerText = `✗ Chưa chính xác. Đáp án đúng là ${correctOption}.`;
            }

            const explanationDiv = document.getElementById(`${qId}-explanation`);
            explanationDiv.classList.remove('hidden');
            explanationDiv.innerText = `Giải thích: ${isCorrect ? 'Bạn đã chọn đúng!' : 'Hãy đọc kỹ và thử lại ở bài tiếp theo.'}`;

            currentQuizAnswers[String(questionId)] = selectedLetter.toUpperCase();
            const answeredCount = Object.keys(currentQuizAnswers).length;
            const questionCount = document.querySelectorAll('#quiz-play-content .quiz-question-card').length;
            const summary = document.getElementById('quiz-play-summary');
            if (summary) {
                summary.innerText = `Đã trả lời ${answeredCount} trong tổng số ${questionCount} câu hỏi.`;
            }
        }

        async function submitQuizAttempt() {
            if (!currentQuizPlaying) return;
            const totalQuestions = document.querySelectorAll('#quiz-play-content .quiz-question-card').length;
            const answeredCount = Object.keys(currentQuizAnswers).length;
            if (answeredCount < totalQuestions) {
                return alert('Vui lòng trả lời tất cả câu hỏi trước khi nộp bài.');
            }

            try {
                const res = await fetchWithCsrf(`${API_URL}/attempts/submit/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quiz: currentQuizPlaying, answers: currentQuizAnswers })
                });
                if (!res.ok) {
                    const err = await res.json();
                    return alert('Lỗi khi lưu kết quả: ' + JSON.stringify(err));
                }
                const data = await res.json();
                const summary = document.getElementById('quiz-play-summary');
                if (summary) {
                    summary.innerHTML = `
                        <div class="space-y-2">
                            <p class="text-sm font-semibold text-slate-900 dark:text-white">Kết quả: ${data.score}/${data.total}</p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">Tỷ lệ chính xác: ${data.percentage}%</p>
                            <p class="text-[10px] text-slate-500 dark:text-slate-400">Lần làm bài đã được lưu.</p>
                        </div>
                    `;
                }
                await loadNotebooks();
                if (activeNotebookId) {
                    await selectNotebook(activeNotebookId, true);
                }
            } catch (err) {
                console.error('Lỗi khi nộp quiz:', err);
                alert('Đã xảy ra lỗi khi gửi kết quả.');
            }
        }

        function checkQuizAnswer(qId, selectedLetter, correctAnswer, selectedIdx) {
            const optionsContainer = document.getElementById(`${qId}-options`);
            const buttons = optionsContainer.getElementsByTagName('button');
            
            // Disable all buttons to prevent multiple clicks
            for (let btn of buttons) {
                btn.disabled = true;
                btn.classList.add('opacity-70', 'cursor-not-allowed');
            }
            
            const selectedBtn = document.getElementById(`${qId}-opt-${selectedIdx}`);
            const isCorrect = selectedLetter.toUpperCase() === correctAnswer.toUpperCase();
            
            // Highlight selected button
            if (isCorrect) {
                selectedBtn.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800');
                selectedBtn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
            } else {
                selectedBtn.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800');
                selectedBtn.classList.add('bg-rose-500/10', 'dark:bg-rose-500/20', 'border-rose-500', 'text-rose-700', 'dark:text-rose-400');
                
                // Find and highlight correct button in green
                for (let i = 0; i < buttons.length; i++) {
                    const letter = String.fromCharCode(65 + i);
                    if (letter.toUpperCase() === correctAnswer.toUpperCase()) {
                        const correctBtn = document.getElementById(`${qId}-opt-${i}`);
                        correctBtn.classList.remove('bg-white', 'dark:bg-slate-900', 'border-slate-200', 'dark:border-slate-800');
                        correctBtn.classList.add('bg-emerald-500/10', 'dark:bg-emerald-500/20', 'border-emerald-500', 'text-emerald-700', 'dark:text-emerald-400');
                    }
                }
            }
            
            // Show result text and explanation
            const resultDiv = document.getElementById(`${qId}-result`);
            resultDiv.classList.remove('hidden');
            if (isCorrect) {
                resultDiv.innerText = "✓ Chính xác!";
                resultDiv.className = "text-[11px] font-bold p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
            } else {
                resultDiv.innerText = `✗ Chưa chính xác. Đáp án đúng là ${correctAnswer}.`;
                resultDiv.className = "text-[11px] font-bold p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20";
            }
            
            document.getElementById(`${qId}-explanation`).classList.remove('hidden');
        }

        async function openFlashcardReviewModal(materialId) {
            if (!materialId) return;
            const modal = document.getElementById('flashcard-review-modal');
            const content = document.getElementById('flashcard-review-content');
            content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Đang tải flashcard...</div>';
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            try {
                const res = await fetch(`${API_URL}/generations/${materialId}/`);
                if (!res.ok) throw new Error('Không thể tải flashcard');
                const material = await res.json();
                const cards = parseFlashcardJson(material.content);
                if (!cards.length) {
                    content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Flashcard này chưa có nội dung để xem lại.</div>';
                    return;
                }

                content.innerHTML = `
                    <div class="space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                            <div>
                                <p class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Flashcard</p>
                                <h4 class="font-bold text-slate-900 dark:text-white text-base mt-1">Danh sách thẻ ghi nhớ</h4>
                            </div>
                            <button onclick="openFlashcardEditorModal(${material.id})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-[10px] font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">Sửa flashcard</button>
                        </div>
                        ${cards.map((card, idx) => `
                            <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                <div id="flash-review-front-${idx}" class="space-y-3">
                                    <div class="text-[10px] uppercase tracking-wider font-bold text-brand-500">Question</div>
                                    <p class="text-base font-bold text-slate-900 dark:text-white">${card.question || 'Câu hỏi chưa có nội dung'}</p>
                                </div>
                                <div id="flash-review-back-${idx}" class="hidden space-y-3">
                                    <div class="text-[10px] uppercase tracking-wider font-bold text-emerald-500">Answer</div>
                                    <p class="text-sm text-slate-700 dark:text-slate-300">${card.answer || 'Chưa có đáp án'}</p>
                                </div>
                                <button onclick="toggleFlashcardReviewCard(${idx})" class="mt-4 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-[10px] font-semibold transition">Lật thẻ</button>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (err) {
                console.error('Flashcard review error:', err);
                content.innerHTML = '<div class="text-center py-12 text-rose-500 dark:text-rose-400 text-xs">Không thể tải flashcard. Vui lòng thử lại.</div>';
            }
        }

        function closeFlashcardReviewModal() {
            const modal = document.getElementById('flashcard-review-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('flashcard-review-content').innerHTML = '';
        }

        function toggleFlashcardReviewCard(cardIndex) {
            const front = document.getElementById(`flash-review-front-${cardIndex}`);
            const back = document.getElementById(`flash-review-back-${cardIndex}`);
            if (!front || !back) return;
            front.classList.toggle('hidden');
            back.classList.toggle('hidden');
        }

        function flipCard(id){
            const front = document.getElementById(`front-${id}`);
            const back = document.getElementById(`back-${id}`);

            front.classList.toggle('hidden');
            back.classList.toggle('hidden');
        }

        async function openFlashcardEditorModal(materialId) {
            if (!materialId) return;
            currentFlashcardEditingId = materialId;
            try {
                const res = await fetch(`${API_URL}/generations/${materialId}/`);
                if (!res.ok) throw new Error('Không thể tải flashcard để sửa');
                const material = await res.json();
                currentFlashcardEditorCards = parseFlashcardJson(material.content);
                if (!currentFlashcardEditorCards.length) {
                    currentFlashcardEditorCards.push({ question: '', answer: '' });
                }
                renderFlashcardEditorForm(currentFlashcardEditorCards);
                document.getElementById('flashcard-editor-modal').classList.remove('hidden');
                document.getElementById('flashcard-editor-modal').classList.add('flex');
            } catch (err) {
                console.error('Open flashcard editor error:', err);
                alert('Không thể mở trình chỉnh sửa flashcard.');
            }
        }

        function closeFlashcardEditorModal() {
            const modal = document.getElementById('flashcard-editor-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            currentFlashcardEditingId = null;
            currentFlashcardEditorCards = [];
        }

        async function saveFlashcardEdit() {
            if (!currentFlashcardEditingId) return;
            const cards = collectFlashcardEditorCards();
            if (!cards.length) return alert('Vui lòng thêm ít nhất một flashcard.');
            try {
                const payload = JSON.stringify(cards, null, 2);
                const res = await fetchWithCsrf(`${API_URL}/generations/${currentFlashcardEditingId}/`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: payload })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(JSON.stringify(err));
                }
                closeFlashcardEditorModal();
                closeFlashcardReviewModal();
                await loadNotebooks();
                if (activeNotebookId) await selectNotebook(activeNotebookId, true);
                alert('Đã cập nhật flashcard thành công!');
            } catch (err) {
                console.error('Save flashcard edit error:', err);
                alert('Lỗi khi lưu flashcard.');
            }
        }

        function parseFlashcardJson(content) {
            if (!content) return [];
            try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    return parsed
                        .filter(item => item && typeof item === 'object')
                        .map(item => ({
                            question: String(item.question || item.front || ''),
                            answer: String(item.answer || item.back || '')
                        }));
                }
            } catch (err) {
                // Ignore invalid JSON and fall back to text parsing below
            }

            const text = String(content).replace(/\r\n/g, '\n');
            const questionMatches = [...text.matchAll(/QUESTION\s*[:\-]?\s*([\s\S]*?)(?=(?:\s*ANSWER\s*[:\-]?\s*|\s*QUESTION\s*[:\-]?|\s*$))/gi)];
            if (questionMatches.length) {
                const cards = [];
                questionMatches.forEach((match) => {
                    let question = (match[1] || '').trim();
                    const answerMatch = text.match(new RegExp(`ANSWER\\s*[:\\-]?\\s*([\\s\\S]*?)(?=(?:\\s*QUESTION\\s*[:\\-]?|\\s*$))`, 'i'));
                    let answer = answerMatch ? answerMatch[1].trim() : 'Chưa có đáp án';

                    if (question.includes('ANSWER')) {
                        const answerSplit = question.split(/\s*ANSWER\s*[:\-]?\s*/i);
                        if (answerSplit.length > 1) {
                            question = answerSplit[0].trim();
                            answer = answerSplit.slice(1).join(' ANSWER ').trim();
                        }
                    }

                    question = question.replace(/^[^A-Za-z0-9À-ỹ]+/, '').trim();
                    if (!question) return;
                    cards.push({ question, answer: answer && answer !== 'Chưa có đáp án' ? answer : 'Chưa có đáp án' });
                });
                if (cards.length) return cards;
            }

            return [];
        }

        function renderFlashcardEditorForm(cards) {
            const container = document.getElementById('flashcard-editor-form');
            if (!container) return;
            container.innerHTML = `
                <div class="space-y-3">
                    ${cards.length ? cards.map((card, idx) => `
                        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3" data-flashcard-row="${idx}">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Thẻ ${idx + 1}</span>
                                <button type="button" onclick="removeFlashcardEditorRow(${idx})" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">Xóa</button>
                            </div>
                            <div>
                                <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Câu hỏi</label>
                                <input data-flashcard-question type="text" value="${escapeHtml(card.question || '')}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                            </div>
                            <div>
                                <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án</label>
                                <textarea data-flashcard-answer rows="3" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(card.answer || '')}</textarea>
                            </div>
                        </div>
                    `).join('') : '<div class="text-center py-6 text-[11px] text-slate-400">Chưa có flashcard nào. Nhấn “+ Thêm flashcard” để bắt đầu.</div>'}
                </div>
            `;
        }

        function addFlashcardEditorRow() {
            currentFlashcardEditorCards.push({ question: '', answer: '' });
            renderFlashcardEditorForm(currentFlashcardEditorCards);
        }

        function removeFlashcardEditorRow(index) {
            currentFlashcardEditorCards = currentFlashcardEditorCards.filter((_, idx) => idx !== index);
            if (!currentFlashcardEditorCards.length) {
                currentFlashcardEditorCards.push({ question: '', answer: '' });
            }
            renderFlashcardEditorForm(currentFlashcardEditorCards);
        }

        function collectFlashcardEditorCards() {
            const container = document.getElementById('flashcard-editor-form');
            if (!container) return [];
            return Array.from(container.querySelectorAll('[data-flashcard-row]')).map((row) => ({
                question: row.querySelector('[data-flashcard-question]').value.trim(),
                answer: row.querySelector('[data-flashcard-answer]').value.trim()
            })).filter(card => card.question || card.answer);
        }

        async function openQuizGenerationEditorModal(materialId) {
            if (!materialId) return;
            currentQuizGenerationEditingId = materialId;
            try {
                const res = await fetch(`${API_URL}/generations/${materialId}/`);
                if (!res.ok) throw new Error('Không thể tải bộ câu hỏi để sửa');
                const material = await res.json();
                let parsed = [];
                try {
                    parsed = JSON.parse(material.content);
                    if (!Array.isArray(parsed)) parsed = [];
                } catch (err) {
                    parsed = [];
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
                document.getElementById('quiz-generation-editor-modal').classList.remove('hidden');
                document.getElementById('quiz-generation-editor-modal').classList.add('flex');
            } catch (err) {
                console.error('Open quiz generation editor error:', err);
                alert('Không thể mở trình chỉnh sửa bộ câu hỏi.');
            }
        }

        function closeQuizGenerationEditorModal() {
            const modal = document.getElementById('quiz-generation-editor-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            currentQuizGenerationEditingId = null;
            currentQuizGenerationEditorQuestions = [];
        }

        async function saveQuizGenerationEdit() {
            if (!currentQuizGenerationEditingId) return;
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
                alert('Đã cập nhật bộ câu hỏi thành công!');
            } catch (err) {
                console.error('Save quiz generation edit error:', err);
                alert('Lỗi khi lưu bộ câu hỏi.');
            }
        }

        function parseQuizGenerationContent(content) {
            if (!content) return null;

            let raw = String(content).trim();
            if (!raw) return null;

            // Try parse JSON content first, including fenced code blocks.
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
                // Ignore JSON parse errors and fall back to plain text parsing.
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
            container.innerHTML = `
                <div class="space-y-3">
                    ${questions.length ? questions.map((question, idx) => `
                        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3" data-quiz-generation-row="${idx}">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Câu hỏi ${idx + 1}</span>
                                <button type="button" onclick="removeQuizGenerationEditorRow(${idx})" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">Xóa</button>
                            </div>
                            <div>
                                <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Nội dung câu hỏi</label>
                                <textarea data-quiz-question rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(question.question_text || question.question || '')}</textarea>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                ${['A','B','C','D'].map((letter, optIdx) => `
                                    <div>
                                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án ${letter}</label>
                                        <input data-quiz-option="${letter}" type="text" value="${escapeHtml(normalizeQuizOption((question.options || [])[optIdx] || ''))}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                    </div>
                                `).join('')}
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Đáp án đúng</label>
                                    <select data-quiz-correct-answer class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                                        ${['A','B','C','D'].map((letter) => `<option value="${letter}" ${letter === (question.answer || question.correct_option || 'A') ? 'selected' : ''}>${letter}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Giải thích</label>
                                    <textarea data-quiz-explanation rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(question.explanation || '')}</textarea>
                                </div>
                            </div>
                        </div>
                    `).join('') : '<div class="text-center py-6 text-[11px] text-slate-400">Chưa có câu hỏi nào. Nhấn “+ Thêm câu hỏi” để bắt đầu.</div>'}
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

        function selectQuizReviewOption(reviewId, selectedLetter, correctOption) {
            const qId = `quiz-review-${reviewId}`;
            const optionsContainer = document.getElementById(`${qId}-options`);
            if (!optionsContainer) return;
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
                    resultDiv.innerText = '✓ Chính xác!';
                } else {
                    resultDiv.className = 'text-[11px] font-bold p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20';
                    resultDiv.innerText = '✗ Chưa chính xác.';
                }
            }
            if (statusSpan) {
                statusSpan.innerText = isCorrect ? 'Đúng' : 'Sai';
                statusSpan.className = `text-[10px] font-bold uppercase tracking-wide ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`;
            }

            const explanationDiv = document.getElementById(`${qId}-explanation`);
            const explanation = selectedBtn?.dataset?.explanation || '';
            if (explanationDiv) {
                explanationDiv.classList.remove('hidden');
                explanationDiv.innerText = explanation ? `Giải thích: ${explanation}` : (isCorrect ? 'Bạn đã chọn đúng!' : 'Hãy đọc kỹ và thử lại lần sau.');
            }
        }

        async function openQuizReviewModal(quizId) {
            if (!quizId) return;
            const modal = document.getElementById('quiz-review-modal');
            const content = document.getElementById('quiz-review-content');
            const title = document.getElementById('quiz-review-title');
            title.innerText = 'Xem lại bộ câu hỏi';
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
                    title.innerText = generation.generation_type === 'quiz' ? 'Xem lại bộ câu hỏi đã lưu' : 'Xem lại tài liệu';
                    content.innerHTML = `
                        <div class="space-y-4">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                                <div>
                                    <p class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Bộ câu hỏi</p>
                                    <h4 class="font-bold text-slate-900 dark:text-white text-base mt-1">${fallback.title}</h4>
                                    <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">${fallback.description}</p>
                                </div>
                                <button onclick="openQuizGenerationEditorModal(${quizId})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-[10px] font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">Sửa câu hỏi</button>
                            </div>
                            ${fallback.questions.map((question, idx) => {
                                const options = Array.isArray(question.options) ? question.options : [];
                                const correctOption = (question.correct_option || question.answer || 'A').toString().toUpperCase();
                                return `
                                    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                                        <div class="flex items-center justify-between gap-3">
                                            <span class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Câu ${idx + 1}</span>
                                            <span id="quiz-review-status-${generation.id}-${idx}" class="text-[10px] font-bold uppercase tracking-wide text-slate-400">&nbsp;</span>
                                        </div>
                                        <p class="text-sm font-semibold text-slate-900 dark:text-white">${question.question_text || question.question || 'Câu hỏi chưa có nội dung'}</p>
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
                    content.innerHTML = '<div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Bộ câu hỏi này chưa có nội dung nào.</div>';
                    return;
                }

                title.innerText = quiz.name || 'Xem lại bộ câu hỏi';
                content.innerHTML = `
                    <div class="space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                            <div>
                                <p class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Bộ câu hỏi</p>
                                <h4 class="font-bold text-slate-900 dark:text-white text-base mt-1">${quiz.name || 'Bộ câu hỏi'}</h4>
                                <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">${quiz.description || 'Không có mô tả'}</p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="openQuizPlayModal(${quiz.id})" class="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-xl text-[10px] font-semibold transition">Làm lại</button>
                                <button onclick="openQuizBuilderModal(${quiz.id})" class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-[10px] font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-700">Sửa câu hỏi</button>
                            </div>
                        </div>
                        ${questions.map((question, idx) => {
                            const options = Array.isArray(question.options) ? question.options : [];
                            const correctOption = (question.correct_option || 'A').toString().toUpperCase();
                            return `
                                <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                                    <div class="flex items-center justify-between gap-3">
                                        <span class="text-[10px] uppercase tracking-wider font-bold text-slate-500">Câu ${idx + 1}</span>
                                        <span id="quiz-review-status-${quiz.id}-${idx}" class="text-[10px] font-bold uppercase tracking-wide text-slate-400">&nbsp;</span>
                                    </div>
                                    <p class="text-sm font-semibold text-slate-900 dark:text-white">${question.question_text || 'Câu hỏi chưa có nội dung'}</p>
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
                content.innerHTML = '<div class="text-center py-12 text-rose-500 dark:text-rose-400 text-xs">Không thể tải nội dung bộ câu hỏi. Vui lòng thử lại.</div>';
            }
        }

        function closeQuizReviewModal() {
            const modal = document.getElementById('quiz-review-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.getElementById('quiz-review-content').innerHTML = '';
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

