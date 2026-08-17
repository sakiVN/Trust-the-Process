        function openCreateModal(type) {
            activeToolType = type;
            const modal = document.getElementById('tool-modal');
            const icon = document.getElementById('modal-icon');
            const title = document.getElementById('modal-title');
            const subtitle = document.getElementById('modal-subtitle');
            const t = window.t || ((k, f) => f);
            
            // Reset modal state
            document.getElementById('tool-form').reset();
            document.getElementById('tool-form').classList.remove('hidden');
            document.getElementById('tool-loading').classList.add('hidden');
            document.getElementById('tool-output-section').classList.add('hidden');
            
            // Configure modal details based on selected tool
            const titleInput = document.getElementById('tool-input-title');
            const textInput = document.getElementById('tool-input-text');
            if (titleInput) {
                titleInput.placeholder = t('key_ph_tool_title', 'Nhập tiêu đề hoặc tên chủ đề...');
            }

            if (type === 'quiz' || type === 'report') {
                titleInput.classList.add('hidden');
                textInput.classList.remove('hidden');
                if (type === 'quiz') {
                    textInput.placeholder = t('key_ph_quick_quiz_text', "Dán văn bản có cấu trúc:\nQ: Câu hỏi?\nA: Đáp án 1\nB: Đáp án 2 (*)\nC: Đáp án 3\nD: Đáp án 4\nEXP: Giải thích chi tiết");
                } else {
                    textInput.placeholder = t('key_ph_quick_report_text', "Dán nội dung tài liệu dài vào đây để hệ thống tự động tóm tắt...");
                }
                textInput.value = ''; // Reset
                titleInput.required = false;
                textInput.required = true;
            } else {
                titleInput.classList.remove('hidden');
                textInput.classList.add('hidden');
                titleInput.value = ''; // Reset
                titleInput.required = true;
                textInput.required = false;
            }

            if (type === 'flashcards') {
                if (icon) icon.src = '/static/notebook/icon-set/flashcard.png';
                title.innerText = t('key_quick_title_flashcards', 'Tạo Flashcards');
                subtitle.innerText = t('key_quick_sub_flashcards', 'Nhập chủ đề học tập để hệ thống sinh thẻ nhớ thông minh');
            } else if (type === 'quiz') {
                if (icon) icon.src = '/static/notebook/icon-set/quiz.png';
                title.innerText = t('key_quick_title_quiz', 'Tạo Câu hỏi trắc nghiệm');
                subtitle.innerText = t('key_quick_sub_quiz', 'Nhập chủ đề học tập để sinh câu hỏi trắc nghiệm kèm giải thích');
            } else if (type === 'report') {
                if (icon) icon.src = '/static/notebook/icon-set/report.png';
                title.innerText = t('key_quick_title_report', 'Tạo Báo cáo tóm tắt');
                subtitle.innerText = t('key_quick_sub_report', 'Nhập chủ đề học tập để sinh báo cáo tóm lược học thuật');
            } else if (type === 'mindmap') {
                if (icon) icon.src = '/static/notebook/icon-set/mindmap.png';
                title.innerText = t('key_quick_title_mindmap', 'Tạo Sơ đồ tư duy');
                subtitle.innerText = t('key_quick_sub_mindmap', 'Nhập chủ đề học tập để sinh sơ đồ tư duy dạng cây Mermaid.js');
            }
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeToolModal() {
            const modal = document.getElementById('tool-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        function handleToolSubmit(e) {
            e.preventDefault();
            const title = document.getElementById('tool-input-title').value.trim();
            const submitBtn = document.getElementById('tool-submit-btn');
            
            // Show loading state and hide previous output, keeping form visible
            document.getElementById('tool-output-section').classList.add('hidden');
            document.getElementById('tool-loading').classList.remove('hidden');
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            
            // Simulate AI Model/Backend processing (1.5 seconds mock)
            setTimeout(() => {
                document.getElementById('tool-loading').classList.add('hidden');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
                
                const outputContent = document.getElementById('tool-output-content');
                let mockResult = '';
                
                if (activeToolType === 'flashcards') {
                    mockResult = getFlashcardMockHTML(title);
                } else if (activeToolType === 'quiz') {
                    const rawText = document.getElementById('tool-input-text').value;
                    mockResult = parseQuizText(rawText);
                } else if (activeToolType === 'report') {
                    const rawText = document.getElementById('tool-input-text').value;
                    mockResult = generateReportHTML(rawText, title);
                } else if (activeToolType === 'mindmap') {
                    const mindmapData = getMindmapMockHTML(title);
                    mockResult = mindmapData.html;
                    
                    setTimeout(() => {
                        const parsedTree = parseMermaidToJsMind(mindmapData.mermaid);
                        initJsMindInstance('modal', mindmapData.id, parsedTree);
                    }, 100);
                }
                
                outputContent.innerHTML = mockResult;
                document.getElementById('tool-output-section').classList.remove('hidden');
            }, 1500);
        }

        function copyToolResult() {
            const content = document.getElementById('tool-output-content');
            if (!content) return;
            const t = window.t || ((k, f) => f);
            
            navigator.clipboard.writeText(content.innerText).then(() => {
                alert(t('key_tool_copy_success', "Đã sao chép kết quả vào bộ nhớ tạm!"));
            }).catch(err => {
                console.error("Không thể sao chép:", err);
            });
        }

        async function saveToolResult() {
            const t = window.t || ((k, f) => f);
            const saveBtn = document.querySelector('button[onclick="saveToolResult()"]');
            let originalBtnHTML = '';
            if (saveBtn) {
                originalBtnHTML = saveBtn.innerHTML;
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"></span> ' + t('key_105', 'Đang lưu...');
            }

            let content = '';
            if (activeToolType === 'mindmap') {
                const jm = jmInstances['modal'];
                content = jm ? getMermaidFromJsMind(jm) : '';
            } else if (activeToolType === 'quiz') {
                const hiddenData = document.getElementById('quiz-hidden-data');
                content = hiddenData ? hiddenData.value : '';
            } else if (activeToolType === 'report') {
                const hiddenData = document.getElementById('report-hidden-data');
                content = hiddenData ? hiddenData.value : '';
            } else {
                const container = document.getElementById('tool-output-content');
                content = container ? container.innerText.trim() : '';
            }
            
            if (!content) {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnHTML;
                }
                return alert(t('key_tool_save_empty', "Không có nội dung để lưu!"));
            }
            
            try {
                if (!activeNotebookId) {
                    const nbRes = await fetch(`/api/notebooks/`);
                    const nbs = await nbRes.json();
                    if (nbs.length > 0) {
                        activeNotebookId = nbs[0].id;
                    } else {
                        // Create a default notebook
                        const createRes = await fetchWithCsrf(`${API_URL}/notebooks/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: t('key_tag_notebook', "Sổ tay học tập"), description: t('key_29', "Không gian học tập và lưu trữ sơ đồ tư duy") })
                        });
                        const newNb = await createRes.json();
                        activeNotebookId = newNb.id;
                    }
                }
                
                // POST to AIGeneration endpoint
                const saveRes = await fetchWithCsrf(`${API_URL}/generations/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notebook: activeNotebookId,
                        generation_type: activeToolType === 'mindmap' ? 'mind_map' : activeToolType,
                        content: content
                    })
                });
                
                if (saveRes.ok) {
                    showToastNotification(t('key_tool_save_success', "Đã lưu vào Sổ tay thành công!"));
                    await loadNotebooks(); // Refresh the global notebooks array
                    if (activeNotebookId) {
                        selectNotebook(activeNotebookId, true); // Refresh the workspace view
                    }
                    closeToolModal();
                } else {
                    const err = await saveRes.json();
                    alert(t('key_tool_save_error', "Lỗi lưu trữ: ") + JSON.stringify(err));
                }
            } catch (err) {
                console.error("Lỗi khi lưu trữ:", err);
                alert(t('key_tool_save_error', "Đã xảy ra lỗi khi kết nối lưu trữ."));
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnHTML;
                }
            }
        }

        function flipToolCard(id){
            const t = window.t || ((k, f) => f);
            const front = document.getElementById(`tool-front-${id}`);
            const back = document.getElementById(`tool-back-${id}`);
            const btn = document.getElementById(`tool-btn-${id}`);

            const showingQuestion = !front.classList.contains('hidden');

            front.classList.toggle('hidden');
            back.classList.toggle('hidden');

            if (btn) {
                if (showingQuestion){
                    btn.textContent = t('key_flashcard_viewing_question', 'Quay lại câu hỏi');
                } else {
                    btn.textContent = t('key_flashcard_viewing_answer', 'Xem đáp án');
                }
            }
        }

