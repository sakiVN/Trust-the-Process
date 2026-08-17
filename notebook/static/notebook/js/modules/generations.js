        async function triggerAIGeneration(type) {
            if (!activeNotebookId) return alert("Vui lòng chọn một sổ tay trước.");
            const lang = localStorage.getItem('user_language') || 'vi';
            try {
                const res = await fetchWithCsrf(`${API_URL}/notebooks/${activeNotebookId}/generate/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        generation_type: type,
                        language: lang
                    })
                });
                
                if (res.ok) {
                    await selectNotebook(activeNotebookId, true);
                } else {
                    const data = await res.json();
                    alert("Lỗi Hệ thống sinh nội dung: " + (data.error || JSON.stringify(data)));
                }
            } catch (err) {
                console.error("Lỗi kết nối AI Generation:", err);
            }
        }

        function renderAIGenerations(generations, quizzes = []) {
            const t = window.t || ((k, f) => f);
            const categories = ['quiz', 'flashcards', 'mind_map', 'report'];
            const allStudyMaterials = [...(generations || []), ...(quizzes || []).map(q => ({
                ...q,
                generation_type: 'quiz',
                isQuizSet: true,
                created_at: q.created_at || new Date().toISOString()
            }))];
            const genericContainer = document.getElementById('ai-generations-container');
            
            // Clear containers
            categories.forEach(cat => {
                const el = document.getElementById(`ai-generations-${cat}`);
                if (el) el.innerHTML = '';
            });
            if (genericContainer) genericContainer.innerHTML = '';
            
            if (allStudyMaterials.length === 0) {
                categories.forEach(cat => {
                    const el = document.getElementById(`ai-generations-${cat}`);
                    if (el) el.innerHTML = '';
                });
                if (genericContainer) genericContainer.innerHTML = '';
                return;
            }

            if (genericContainer) {
                const labelMap = {
                    quiz: t('key_tag_quiz', 'Trắc nghiệm'),
                    flashcards: t('key_tag_flashcards', 'Flashcards'),
                    mind_map: t('key_tag_mindmap', 'Mind Map'),
                    report: t('key_tag_report', 'Báo cáo'),
                    audio_overview: t('key_tag_audio', 'Audio Overview'),
                    presentation: t('key_tag_presentation', 'Presentation'),
                    video_overview: t('key_tag_video', 'Video Overview'),
                    infographics: t('key_tag_infographic', 'Infographics'),
                    data_table: t('key_tag_data_table', 'Data Table')
                };

                const deleteText = t('key_btn_delete', 'Xóa');
                const lang = localStorage.getItem('user_language') || 'vi';
                const localeStr = lang === 'en' ? 'en-US' : (lang === 'jp' ? 'ja-JP' : 'vi-VN');

                genericContainer.innerHTML = allStudyMaterials.slice().reverse().map(gen => {
                    const label = labelMap[gen.generation_type] || t('key_32', 'Tài liệu học tập');
                    let preview = t('key_ph_quiz_desc', 'Tài liệu học tập đã lưu.');
                    try {
                        const raw = String(gen.content || '').trim();
                        if (raw) {
                            const contentPreview = raw.replace(/```/g, '').replace(/<[^>]*>/g, '').trim();
                            preview = contentPreview.length > 120 ? `${contentPreview.slice(0, 120)}...` : contentPreview;
                        }
                    } catch (err) {
                        preview = t('key_ph_quiz_desc', 'Tài liệu học tập đã lưu.');
                    }

                    return `
                        <div class="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                            <div class="flex justify-between items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span class="text-[9px] uppercase tracking-wider font-bold text-slate-500">${label}</span>
                                <button onclick="deleteGeneration(${gen.id})" class="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline" title="${deleteText}">${deleteText}</button>
                            </div>
                            <p class="text-xs text-slate-700 dark:text-slate-300 line-clamp-4">${preview}</p>
                            <div class="text-[10px] text-slate-400">${new Date(gen.created_at).toLocaleString(localeStr)}</div>
                        </div>
                    `;
                }).join('');
            }
            
            categories.forEach(cat => {
                const catGens = allStudyMaterials.filter(g => g.generation_type === cat || (cat === 'quiz' && g.isQuizSet));
                const el = document.getElementById(`ai-generations-${cat}`);
                if (!el) return;
                
                if (catGens.length === 0) {
                    el.innerHTML = '';
                    el.classList.add('hidden');
                    return;
                }
                
                el.classList.remove('hidden');
                el.innerHTML = catGens.map(gen => {
                    let renderedContent = '';
                    if (gen.isQuizSet) {
                        renderedContent = `
                            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">Bài tập trắc nghiệm</span>
                                    <span class="text-[10px] text-slate-400 font-semibold">${gen.attempts_count || 0} lượt làm</span>
                                </div>
                                <h5 class="font-bold text-slate-900 dark:text-white text-xs">${escapeHtml(gen.name || 'Bài tập trắc nghiệm')}</h5>
                                <div class="flex items-center gap-2 pt-1">
                                    <button onclick="openQuizPlayModal(${gen.id})" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        <span>Làm bài</span>
                                    </button>
                                    <button onclick="openQuizReviewModal(${gen.id})" class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2 px-3 rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                        <span>Chi tiết</span>
                                    </button>
                                </div>
                            </div>
                        `;
                    } else if (gen.generation_type === 'quiz' || gen.generation_type === 'flashcards') {
                        try {
                            let cleanContent = gen.content.trim();
                            if (cleanContent.startsWith("```")) {
                                cleanContent = cleanContent.replace(/^```(?:json)?/, "");
                                cleanContent = cleanContent.replace(/```$/, "");
                                cleanContent = cleanContent.trim();
                            }
                            const items = JSON.parse(cleanContent);
                            if (gen.generation_type === 'quiz') {
                                renderedContent = `
                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3">
                                            <span class="text-xs font-bold text-indigo-900 dark:text-indigo-300">Bộ câu hỏi trắc nghiệm (${items.length} câu)</span>
                                            <button onclick="openQuizReviewModal(${gen.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1.5">
                                                <span>Xem chi tiết</span>
                                            </button>
                                        </div>
                                        ${items.map((q, idx) => {
                                            const qId = `quiz-${gen.id}-${idx}`;
                                            return `
                                            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-left">
                                                <div class="font-bold text-slate-900 dark:text-slate-200 text-xs">Câu ${idx + 1}: ${escapeHtml(q.question || q.question_text || '')}</div>
                                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" id="${qId}-options">
                                                    ${(q.options || []).map((opt, optIdx) => {
                                                        const letter = String.fromCharCode(65 + optIdx);
                                                        const corr = (q.answer || q.correct_option || 'A').toString().toUpperCase();
                                                        return `
                                                        <button onclick="checkQuizAnswer('${qId}', '${letter}', '${corr}', ${optIdx})" id="${qId}-opt-${optIdx}" class="w-full text-left bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition font-medium">
                                                            ${formatQuizOption(opt, optIdx)}
                                                        </button>
                                                        `;
                                                    }).join('')}
                                                </div>
                                                <div id="${qId}-result" class="hidden text-xs font-semibold p-3 rounded-xl"></div>
                                                <div id="${qId}-explanation" class="hidden text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    Giải thích: ${escapeHtml(q.explanation || '')}
                                                </div>
                                            </div>
                                            `;
                                        }).join('')}
                                    </div>
                                `;
                            } else {
                                renderedContent = `
                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3">
                                            <span class="text-xs font-bold text-indigo-900 dark:text-indigo-300">Bộ thẻ ghi nhớ (${items.length} thẻ)</span>
                                            <button onclick="openFlashcardReviewModal(${gen.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center space-x-1.5">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                                <span>Chế độ từng câu</span>
                                            </button>
                                        </div>
                                        ${items.slice(0, 3).map((f, idx) => `
                                            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center space-y-3 shadow-sm">
                                                <div id="front-${gen.id}-${idx}">
                                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Thẻ ${idx + 1} / ${items.length} (Câu hỏi)</div>
                                                    <div class="text-xs font-semibold text-slate-900 dark:text-white">${escapeHtml(f.question || '')}</div>
                                                </div>

                                                <div id="back-${gen.id}-${idx}" class="hidden">
                                                    <div class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Đáp án</div>
                                                    <div class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">${escapeHtml(f.answer || '')}</div>
                                                </div>

                                                <button onclick="flipCard('${gen.id}-${idx}')" class="mt-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-1.5 rounded-xl text-xs font-medium transition flex items-center justify-center space-x-1.5 mx-auto">
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                                    <span>Lật thẻ</span>
                                                </button>
                                            </div>
                                        `).join('')}
                                        ${items.length > 3 ? `
                                            <div class="text-center pt-1">
                                                <button onclick="openFlashcardReviewModal(${gen.id})" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                                    Xem toàn bộ ${items.length} thẻ ghi nhớ →
                                                </button>
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }
                        } catch (e) {
                            renderedContent = `<pre class="text-[11px] bg-slate-900 text-indigo-400 p-4 rounded-xl overflow-auto whitespace-pre-wrap text-left">${escapeHtml(gen.content)}</pre>`;
                        }
                    } else {
                        if (gen.generation_type === 'mind_map' && gen.content.includes("mindmap")) {
                            let cleanCode = gen.content.trim();
                            if (cleanCode.startsWith("```")) {
                                cleanCode = cleanCode.replace(/^```(?:mermaid)?/, "");
                                cleanCode = cleanCode.replace(/```$/, "");
                                cleanCode = cleanCode.trim();
                            }
                            const wsUniqueId = `jsmind-ws-${gen.id}-${Date.now()}`;
                            const wsGenId = String(gen.id);
                            const wsCleanCode = cleanCode;
                            renderedContent = `
                                <div class="space-y-3 text-left w-full mt-2">
                                    <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-100/60 dark:bg-slate-900/40 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                                        <div class="flex flex-wrap items-center gap-1.5">
                                            <button onclick="addJsMindChildNode('ws-${gen.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1 px-2.5 rounded-lg text-xs transition shadow-sm">Thêm nhánh</button>
                                            <button onclick="editJsMindNodeName('ws-${gen.id}')" class="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium py-1 px-2.5 rounded-lg text-xs transition">Sửa tên</button>
                                            <button onclick="removeJsMindNode('ws-${gen.id}')" class="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-medium py-1 px-2.5 rounded-lg text-xs transition">Xóa</button>
                                            <button onclick="updateSavedMindmap(${gen.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-2.5 rounded-lg text-xs transition shadow-sm">Lưu</button>
                                            <button onclick="openMindmapReviewModal(${gen.id})" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium py-1 px-2.5 rounded-lg text-xs transition hover:bg-slate-300 dark:hover:bg-slate-700">Phóng to</button>
                                        </div>
                                        <div class="flex items-center space-x-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                                            <span class="text-[10px] font-medium text-slate-400 uppercase">Màu:</span>
                                            <button onclick="changeJsMindNodeColor('ws-${gen.id}', '#6366f1')" class="w-4 h-4 rounded-full bg-[#6366f1] hover:scale-110 transition ring-1 ring-white/50"></button>
                                            <button onclick="changeJsMindNodeColor('ws-${gen.id}', '#10b981')" class="w-4 h-4 rounded-full bg-[#10b981] hover:scale-110 transition ring-1 ring-white/50"></button>
                                            <button onclick="changeJsMindNodeColor('ws-${gen.id}', '#f43f5e')" class="w-4 h-4 rounded-full bg-[#f43f5e] hover:scale-110 transition ring-1 ring-white/50"></button>
                                            <button onclick="changeJsMindNodeColor('ws-${gen.id}', '#f59e0b')" class="w-4 h-4 rounded-full bg-[#f59e0b] hover:scale-110 transition ring-1 ring-white/50"></button>
                                        </div>
                                    </div>
                                    <div class="relative w-full border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950">
                                        <div class="absolute top-2 left-3 text-[10px] font-medium text-slate-400 z-10 select-none">Đúp chuột để sửa, kéo để di chuyển</div>
                                        <div id="${wsUniqueId}" style="width:100%;height:300px;"></div>
                                    </div>
                                </div>
                            `;
                            
                            (function(captId, captKey, captCode) {
                                setTimeout(function() {
                                    const parsedTree = parseMermaidToJsMind(captCode);
                                    initJsMindInstance(captKey, captId, parsedTree);
                                }, 200);
                            })(wsUniqueId, 'ws-' + wsGenId, wsCleanCode);
                        } else if (gen.generation_type === 'report') {
                            renderedContent = `
                                <div class="space-y-3 text-left">
                                    <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Báo cáo tóm tắt</span>
                                        <button onclick="openReportReviewModal(${gen.id})" class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 shadow-sm">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                            <span>Xem toàn bộ</span>
                                        </button>
                                    </div>
                                    <div class="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed text-left max-h-60 overflow-y-auto">${escapeHtml(gen.content)}</div>
                                </div>
                            `;
                        } else {
                            renderedContent = `<div class="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed text-left">${escapeHtml(gen.content)}</div>`;
                        }
                    }

                    
                    return `
                        <div class="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                            <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span class="text-[9px] text-slate-400 font-semibold">${new Date(gen.created_at).toLocaleString('vi-VN')}</span>
                                <button onclick="deleteGeneration(${gen.id})" class="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline" title="Xóa kết quả">Xóa</button>
                            </div>
                            <div class="space-y-3">
                                ${renderedContent}
                            </div>
                        </div>
                    `;
                }).reverse().join('');
            });
        }

        async function deleteGeneration(id) {
            if (!confirm("Bạn có chắc chắn muốn xóa tài nguyên AI này?")) return;
            
            try {
                const res = await fetchWithCsrf(`${API_URL}/generations/${id}/`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    alert("Đã xóa tài nguyên AI thành công!");
                    // Refresh data
                    await loadNotebooks();
                    if (activeNotebookId) {
                        await selectNotebook(activeNotebookId, true);
                    }
                } else {
                    alert("Không thể xóa tài nguyên. Vui lòng thử lại.");
                }
            } catch (err) {
                console.error("Lỗi khi xóa tài nguyên AI:", err);
            }
        }

        async function generateWorkspaceMaterial(category) {
            const input = document.getElementById('tool-title-input-' + category);
            if (!input) return;
            const title = input.value.trim();
            if (!title) return alert("Vui lòng nhập chủ đề ôn tập!");
            
            const btn = document.getElementById('tool-btn-' + category);
            const output = document.getElementById('ai-generations-' + category);
            
            if (btn) {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            
            // Show loading animation locally inside the results section
            if (output) {
                output.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-6 space-y-2 animate-pulse">
                        <div class="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                        <p class="text-[10px] text-slate-400">Đang sinh học liệu mẫu cho chủ đề: ${title}...</p>
                    </div>
                `;
            }
            
            setTimeout(async () => {
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
                
                let generatedContent = '';
                if (category === 'quiz') {
                    generatedContent = JSON.stringify([
                        {
                            "question": `Khái niệm cốt lõi nào quan trọng nhất khi thảo luận về ${title}?`,
                            "options": [
                                "A. Phân tích ngữ nghĩa thời gian thực",
                                "B. Xử lý offline độc lập và bảo mật cục bộ (Đáp án đúng)",
                                "C. Sử dụng tài nguyên điện toán đám mây lớn",
                                "D. Đòi hỏi cấu hình phần cứng đắt tiền"
                            ],
                            "answer": "B",
                            "explanation": `Đặc trưng nổi bật của ${title} khi triển khai là tính hoạt động offline hoàn chỉnh.`
                        },
                        {
                            "question": `Ưu điểm lớn nhất của mô hình lưu trữ cục bộ là gì?`,
                            "options": [
                                "A. Tăng băng thông mạng",
                                "B. Tối ưu chi phí hạ tầng và bảo mật thông tin tối đa (Đáp án đúng)",
                                "C. Đồng bộ hóa chậm",
                                "D. Kết nối nhiều API trực tuyến"
                            ],
                            "answer": "B",
                            "explanation": "Lưu trữ offline cục bộ giúp giảm thiểu rò rỉ dữ liệu học tập ra Internet."
                        }
                    ]);
                } else if (category === 'flashcards') {
                    generatedContent = JSON.stringify([
                        {
                            "question": `Khái niệm cơ bản của ${title} là gì?`,
                            "answer": `Giải pháp học tập thông minh chạy offline hoàn chỉnh cho phép sinh câu hỏi và sơ đồ.`
                        },
                        {
                            "question": `Mục tiêu phát triển chính của hệ thống?`,
                            "answer": "Tối ưu hóa khả năng phản biện tư duy của học sinh mà không phụ thuộc API key ngoài."
                        }
                    ]);
                } else if (category === 'report') {
                    generatedContent = `BÁO CÁO TÓM TẮT HỌC THUẬT: ${title.toUpperCase()}\n\n1. Tổng quan: Đây là báo cáo mô phỏng về chủ đề ${title}.\n2. Nội dung cốt lõi: Thiết kế hệ thống tự học, sinh học liệu và sơ đồ tư duy Mermaid.js.\n3. Khuyến nghị: Cần tăng cường áp dụng các cấu trúc offline để đẩy nhanh tốc độ phản hồi học tập.`;
                } else if (category === 'mind_map') {
                    generatedContent = generateMockMermaidMindmap(title);
                }
                
                try {
                    // Send request to create the generation in Database
                    const res = await fetchWithCsrf(`${API_URL}/generations/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            notebook: activeNotebookId,
                            generation_type: category,
                            content: generatedContent
                        })
                    });
                    
                    if (res.ok) {
                        // Reload notebook generations list
                        if (activeNotebookId) {
                            selectNotebook(activeNotebookId, true);
                        }
                    } else {
                        const err = await res.json();
                        alert("Lỗi khi sinh tài liệu học tập: " + JSON.stringify(err));
                    }
                } catch (err) {
                    console.error("Lỗi sinh dữ liệu học tập:", err);
                }
            }, 1500);
        }

        function selectGenType(type) {
            selectedGenType = type;
            const labels = {
                'quiz': 'Trắc nghiệm ôn tập (Quiz)',
                'flashcards': 'Thẻ nhớ thông minh (Flashcards)',
                'mind_map': 'Sơ đồ tư duy (Mind Map)',
                'report': 'Báo cáo tóm tắt (Report)',
                'audio_overview': 'Kịch bản Podcast (Audio)',
                'presentation': 'Dàn ý Slide (Presentation)'
            };
            document.getElementById('selected-type-label').innerText = labels[type];
            
            ['quiz', 'flashcards', 'mind_map', 'report', 'audio_overview', 'presentation'].forEach(t => {
                const card = document.getElementById(`gen-card-${t}`);
                if (card) {
                    if (t === type) {
                        card.classList.add('border-brand-500', 'ring-2', 'ring-brand-100', 'dark:ring-slate-800');
                        card.classList.remove('border-slate-200', 'dark:border-slate-800');
                    } else {
                        card.classList.remove('border-brand-500', 'ring-2', 'ring-brand-100', 'dark:ring-slate-800');
                        card.classList.add('border-slate-200', 'dark:border-slate-800');
                    }
                }
            });
        }

