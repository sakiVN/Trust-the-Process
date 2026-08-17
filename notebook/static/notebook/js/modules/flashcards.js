// ==========================================
// Flashcards Module (Single-Card Mode & Navigation)
// ==========================================

window.openFlashcardReviewModal = openFlashcardReviewModal;
window.closeFlashcardReviewModal = closeFlashcardReviewModal;
window.openFlashcardEditorModal = openFlashcardEditorModal;
window.closeFlashcardEditorModal = closeFlashcardEditorModal;
window.saveFlashcardEdit = saveFlashcardEdit;

let currentFlashcardIndex = 0;
let currentFlashcardsList = [];
let isFlashcardFlipped = false;
let currentFlashcardMaterialId = null;
let flashcardViewMode = 'single'; // 'single' | 'list'
let isFlashcardKeydownBound = false;

// 1. Open Flashcard Review Modal
async function openFlashcardReviewModal(materialId) {
    if (!materialId) return;
    currentFlashcardMaterialId = materialId;
    currentFlashcardIndex = 0;
    isFlashcardFlipped = false;
    flashcardViewMode = 'single';
    const t = window.t || ((k, fallback) => fallback);

    const modal = document.getElementById('flashcard-review-modal');
    const content = document.getElementById('flashcard-review-content');
    if (!modal || !content) return;

    content.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 space-y-3">
            <div class="w-8 h-8 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin"></div>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">${t('key_105', 'Đang tải thẻ ghi nhớ...')}</p>
        </div>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        const res = await fetch(`${API_URL}/generations/${materialId}/`);
        if (!res.ok) throw new Error('Không thể tải flashcard');
        const material = await res.json();
        currentFlashcardsList = parseFlashcardJson(material.content);

        if (!currentFlashcardsList.length) {
            content.innerHTML = `
                <div class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs space-y-3">
                    <p>${t('key_flashcard_editor_empty', 'Bộ thẻ ghi nhớ này chưa có nội dung để xem lại.')}</p>
                    <button onclick="openFlashcardEditorModal(${materialId})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition">${t('key_btn_add_card', 'Thêm thẻ mới')}</button>
                </div>
            `;
            return;
        }

        renderFlashcardReviewContent();
        bindFlashcardKeyboardEvents();
    } catch (err) {
        console.error('Flashcard review error:', err);
        content.innerHTML = `<div class="text-center py-12 text-rose-500 dark:text-rose-400 text-xs">${t('key_113', 'Không thể tải flashcard. Vui lòng thử lại.')}</div>`;
    }
}

// 2. Close Modal
function closeFlashcardReviewModal() {
    const modal = document.getElementById('flashcard-review-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    unbindFlashcardKeyboardEvents();
}

// 3. Render Flashcard Review UI
function renderFlashcardReviewContent() {
    const content = document.getElementById('flashcard-review-content');
    if (!content || !currentFlashcardsList.length) return;

    if (flashcardViewMode === 'single') {
        renderSingleFlashcardPlayer(content);
    } else {
        renderListFlashcardPlayer(content);
    }
}

// 4. Single-Card Player Mode (Clean Card + Bottom Navigation)
function renderSingleFlashcardPlayer(container) {
    const total = currentFlashcardsList.length;
    const current = currentFlashcardsList[currentFlashcardIndex];
    const progressPercent = Math.round(((currentFlashcardIndex + 1) / total) * 100);
    const isFirst = currentFlashcardIndex === 0;
    const isLast = currentFlashcardIndex === total - 1;
    const t = window.t || ((k, fallback) => fallback);

    const restartLabel = t('key_flashcard_restart_btn', 'Về đầu');
    const flipLabel = t('key_btn_flip', 'Lật thẻ');
    const prevLabel = t('key_flashcard_prev', 'Câu trước');
    const nextLabel = t('key_flashcard_next', 'Câu sau');
    const finishLabel = t('key_btn_finish', 'Hoàn thành');
    const questionLabel = t('key_flashcard_question', 'Câu hỏi');
    const answerLabel = t('key_flashcard_answer', 'Đáp án');
    const flipHintFront = t('key_flashcard_flip_hint_front', 'Nhấn vào thẻ hoặc phím Space để xem đáp án');
    const flipHintBack = t('key_flashcard_flip_hint_back', 'Nhấn vào thẻ hoặc phím Space để xem lại câu hỏi');

    const cardContainerClasses = isFlashcardFlipped
        ? 'bg-gradient-to-b from-emerald-50/50 via-white to-slate-50 dark:from-emerald-950/25 dark:via-slate-900 dark:to-slate-900/95 border-2 border-emerald-500/50 dark:border-emerald-500/40 shadow-md shadow-emerald-500/10'
        : 'bg-gradient-to-b from-indigo-50/50 via-white to-slate-50 dark:from-indigo-950/25 dark:via-slate-900 dark:to-slate-900/95 border-2 border-indigo-500/35 dark:border-indigo-500/30 shadow-md shadow-indigo-500/5';

    container.innerHTML = `
        <div class="space-y-4">
            <!-- Header Toolbar -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-5 py-3.5">
                <div class="flex items-center space-x-3">
                    <span class="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                        ${currentFlashcardIndex + 1} / ${total}
                    </span>
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">${t('key_flashcard_single_mode', 'Chế độ học từng câu')}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">${progressPercent}%</span>
                        </div>
                        <p class="text-[11px] text-slate-400 mt-0.5">${isFlashcardFlipped ? t('key_flashcard_viewing_answer', 'Đang xem mặt Đáp án') : t('key_flashcard_viewing_question', 'Đang xem mặt Câu hỏi')}</p>
                    </div>
                </div>
                
                <div class="flex flex-wrap items-center gap-2">
                    <button onclick="toggleFlashcardViewMode()" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5" title="${t('key_flashcard_list_mode', 'Danh sách')}">
                        <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
                        <span>${t('key_flashcard_list_mode', 'Danh sách')}</span>
                    </button>
                    <button onclick="shuffleFlashcards()" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5" title="${t('key_flashcard_shuffle', 'Trộn thẻ')}">
                        <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                        <span>${t('key_flashcard_shuffle', 'Trộn thẻ')}</span>
                    </button>
                    <button onclick="openFlashcardEditorModal(${currentFlashcardMaterialId})" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5" title="${t('key_flashcard_edit', 'Chỉnh sửa')}">
                        <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        <span>${t('key_flashcard_edit', 'Chỉnh sửa')}</span>
                    </button>
                </div>
            </div>

            <!-- Progress Indicator Bar -->
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div class="bg-indigo-600 h-full transition-all duration-300 rounded-full" style="width: ${progressPercent}%"></div>
            </div>

            <!-- Interactive Card (Front / Back with distinct styles & symmetric alignment) -->
            <div onclick="flipCurrentFlashcard()" class="group relative cursor-pointer select-none min-h-[320px] ${cardContainerClasses} rounded-3xl p-7 transition-all duration-300 flex flex-col justify-between hover:shadow-lg">
                
                <!-- Front Side (Question) -->
                <div id="flashcard-front" class="${isFlashcardFlipped ? 'hidden' : 'flex flex-col justify-between flex-1 space-y-4'}">
                    <div class="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-3">
                        <span class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                            ${questionLabel}
                        </span>
                        <span class="text-xs text-indigo-900/60 dark:text-indigo-300/60 font-semibold">${currentFlashcardIndex + 1} / ${total}</span>
                    </div>

                    <div class="flex-1 flex items-center justify-center text-center px-4 py-8">
                        <p class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed max-w-2xl mx-auto text-center">
                            ${escapeHtml((current.question || 'Câu hỏi chưa có nội dung').trim())}
                        </p>
                    </div>

                    <div class="flex items-center justify-center text-indigo-600/80 dark:text-indigo-400/80 text-xs font-medium space-x-1.5 pt-3 border-t border-indigo-100 dark:border-indigo-900/30">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        <span>${flipHintFront}</span>
                    </div>
                </div>

                <!-- Back Side (Answer) -->
                <div id="flashcard-back" class="${!isFlashcardFlipped ? 'hidden' : 'flex flex-col justify-between flex-1 space-y-4'}">
                    <div class="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-3">
                        <span class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                            ${answerLabel}
                        </span>
                        <span class="text-xs text-emerald-900/60 dark:text-emerald-300/60 font-semibold">${currentFlashcardIndex + 1} / ${total}</span>
                    </div>

                    <div class="flex-1 flex items-center justify-center text-center px-4 py-8">
                        <p class="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed max-w-2xl mx-auto text-center">
                            ${escapeHtml((current.answer || 'Chưa có đáp án').trim())}
                        </p>
                    </div>

                    <div class="flex items-center justify-center text-emerald-600/90 dark:text-emerald-400/90 text-xs font-medium space-x-1.5 pt-3 border-t border-emerald-100 dark:border-emerald-900/30">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        <span>${flipHintBack}</span>
                    </div>
                </div>
            </div>

            <!-- Bottom Navigation Bar -->
            <div class="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-5 py-3.5">
                <div class="flex items-center justify-between gap-3">
                    <!-- Left: Prev Button -->
                    <button type="button" onclick="prevFlashcard()" ${isFirst ? 'disabled' : ''} class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold text-xs flex items-center space-x-2 transition ${isFirst ? 'opacity-40 cursor-not-allowed text-slate-400 bg-white/50 dark:bg-slate-900/50' : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm'}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                        <span>${prevLabel}</span>
                    </button>

                    <!-- Center: Flip Button & Restart Button with text and icon -->
                    <div class="flex items-center space-x-2">
                        <button type="button" onclick="flipCurrentFlashcard()" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            <span>${flipLabel}</span>
                        </button>
                        <button type="button" onclick="restartFlashcards()" class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-xs transition flex items-center space-x-1.5 shadow-sm" title="${restartLabel}">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                            <span>${restartLabel}</span>
                        </button>
                    </div>

                    <!-- Right: Next / Finish Button -->
                    ${isLast ? `
                        <button type="button" onclick="handleFinishFlashcards()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-sm transition">
                            <span>${finishLabel}</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </button>
                    ` : `
                        <button type="button" onclick="nextFlashcard()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center space-x-2 shadow-sm transition">
                            <span>${nextLabel}</span>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

// 5. List View Mode (Alternative Full List)
function renderListFlashcardPlayer(container) {
    const total = currentFlashcardsList.length;
    const t = window.t || ((k, fallback) => fallback);

    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-5 py-3.5">
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${t('key_flashcard_list_mode', 'Danh sách thẻ')} (${total} ${t('key_count_cards', 'thẻ')})</span>
                    <h4 class="font-bold text-slate-900 dark:text-white text-sm mt-0.5">${t('key_flashcard_view_all', 'Toàn bộ thẻ ghi nhớ')}</h4>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="toggleFlashcardViewMode()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                        <span>${t('key_flashcard_single_mode', 'Chế độ từng câu')}</span>
                    </button>
                    <button onclick="openFlashcardEditorModal(${currentFlashcardMaterialId})" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5">
                        <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        <span>${t('key_flashcard_edit', 'Sửa thẻ')}</span>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${currentFlashcardsList.map((card, idx) => `
                    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
                        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span class="text-xs font-semibold text-slate-500">${idx + 1}</span>
                            <span class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">Flashcard</span>
                        </div>
                        
                        <div class="space-y-3">
                            <div id="flash-review-front-${idx}" class="space-y-1.5">
                                <div class="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400">${t('key_flashcard_question', 'Câu hỏi')}</div>
                                <p class="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">${escapeHtml(card.question || t('key_ph_quiz_desc', 'Câu hỏi chưa có nội dung'))}</p>
                            </div>
                            <div id="flash-review-back-${idx}" class="hidden space-y-1.5">
                                <div class="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">${t('key_flashcard_answer', 'Đáp án')}</div>
                                <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">${escapeHtml(card.answer || t('key_113', 'Chưa có đáp án'))}</p>
                            </div>
                        </div>

                        <button type="button" onclick="toggleFlashcardReviewCard(${idx})" class="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-medium transition flex items-center justify-center space-x-1.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            <span>${t('key_btn_flip', 'Lật thẻ')}</span>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// 6. Navigation Handlers
function nextFlashcard() {
    if (currentFlashcardIndex < currentFlashcardsList.length - 1) {
        currentFlashcardIndex++;
        isFlashcardFlipped = false;
        renderFlashcardReviewContent();
    }
}

function prevFlashcard() {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        isFlashcardFlipped = false;
        renderFlashcardReviewContent();
    }
}

function flipCurrentFlashcard() {
    isFlashcardFlipped = !isFlashcardFlipped;
    renderFlashcardReviewContent();
}

function flipCard(cardKey) {
    const front = document.getElementById(`front-${cardKey}`);
    const back = document.getElementById(`back-${cardKey}`);
    const btnText = document.getElementById(`flip-btn-text-${cardKey}`);
    const t = window.t || ((k, fallback) => fallback);

    if (front && back) {
        const isFlipped = front.classList.contains('hidden');
        if (isFlipped) {
            front.classList.remove('hidden');
            back.classList.add('hidden');
            if (btnText) btnText.innerText = t('key_btn_flip', 'Lật thẻ');
        } else {
            front.classList.add('hidden');
            back.classList.remove('hidden');
            if (btnText) btnText.innerText = t('key_flashcard_viewing_question', 'Quay lại câu hỏi');
        }
    }
}
window.flipCard = flipCard;

function shuffleFlashcards() {
    const t = window.t || ((k, fallback) => fallback);
    if (currentFlashcardsList.length <= 1) return;
    for (let i = currentFlashcardsList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentFlashcardsList[i], currentFlashcardsList[j]] = [currentFlashcardsList[j], currentFlashcardsList[i]];
    }
    currentFlashcardIndex = 0;
    isFlashcardFlipped = false;
    renderFlashcardReviewContent();
    if (typeof showToastNotification === 'function') {
        showToastNotification(t('key_flashcard_shuffle', 'Đã xáo trộn thứ tự thẻ flashcard.'));
    }
}

function restartFlashcards() {
    currentFlashcardIndex = 0;
    isFlashcardFlipped = false;
    renderFlashcardReviewContent();
}

function toggleFlashcardViewMode() {
    flashcardViewMode = flashcardViewMode === 'single' ? 'list' : 'single';
    renderFlashcardReviewContent();
}

function toggleFlashcardReviewCard(idx) {
    const front = document.getElementById(`flash-review-front-${idx}`);
    const back = document.getElementById(`flash-review-back-${idx}`);
    if (front && back) {
        front.classList.toggle('hidden');
        back.classList.toggle('hidden');
    }
}

function handleFinishFlashcards() {
    const content = document.getElementById('flashcard-review-content');
    if (!content) return;
    const t = window.t || ((k, fallback) => fallback);

    content.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
                <h3 class="text-base font-bold text-slate-900 dark:text-white">${t('key_flashcard_completed_title', 'Đã hoàn thành bộ thẻ ghi nhớ')}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${t('key_flashcard_completed_desc', 'Bạn đã ôn tập toàn bộ các thẻ trong tài liệu.')}</p>
            </div>
            <div class="flex items-center justify-center gap-3 pt-2">
                <button type="button" onclick="restartFlashcards()" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition">
                    ${t('key_flashcard_restart_btn', 'Ôn lại từ đầu')}
                </button>
                <button type="button" onclick="closeFlashcardReviewModal()" class="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    ${t('key_btn_cancel', 'Đóng')}
                </button>
            </div>
        </div>
    `;
}

// 7. Keyboard Navigation Listener
function bindFlashcardKeyboardEvents() {
    if (isFlashcardKeydownBound) return;
    window.addEventListener('keydown', onFlashcardKeyDown);
    isFlashcardKeydownBound = true;
}

function unbindFlashcardKeyboardEvents() {
    if (!isFlashcardKeydownBound) return;
    window.removeEventListener('keydown', onFlashcardKeyDown);
    isFlashcardKeydownBound = false;
}

function onFlashcardKeyDown(e) {
    const modal = document.getElementById('flashcard-review-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

    if (e.code === 'ArrowRight') {
        e.preventDefault();
        nextFlashcard();
    } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        prevFlashcard();
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        flipCurrentFlashcard();
    } else if (e.code === 'Escape') {
        closeFlashcardReviewModal();
    }
}

// 8. Flashcard JSON Parsing & Editor Logic
function parseFlashcardJson(content) {
    if (!content) return [];
    try {
        let raw = String(content).trim();
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed
                .filter(item => item && typeof item === 'object')
                .map(item => ({
                    question: String(item.question || item.front || '').trim(),
                    answer: String(item.answer || item.back || '').trim()
                })).filter(item => item.question || item.answer);
        }
    } catch (err) {
        // Fallback to text parsing
    }

    const text = String(content).replace(/\r\n/g, '\n');
    const questionMatches = [...text.matchAll(/QUESTION\s*[:\-]?\s*([\s\S]*?)(?=(?:\s*ANSWER\s*[:\-]?\s*|\s*QUESTION\s*[:\-]?|\s*$))/gi)];
    if (questionMatches.length) {
        const cards = [];
        questionMatches.forEach((match) => {
            let question = (match[1] || '').trim();
            const answerMatch = text.match(new RegExp(`ANSWER\\s*[:\\-]?\\s*([\\s\\S]*?)(?=(?:\\s*QUESTION\\s*[:\\-]?|\\s*$))`, 'i'));
            let answer = answerMatch ? answerMatch[1].trim() : '';

            if (question.includes('ANSWER')) {
                const answerSplit = question.split(/\s*ANSWER\s*[:\-]?\s*/i);
                if (answerSplit.length > 1) {
                    question = answerSplit[0].trim();
                    answer = answerSplit.slice(1).join(' ANSWER ').trim();
                }
            }

            question = question.replace(/^[^A-Za-z0-9À-ỹ]+/, '').trim();
            if (!question) return;
            cards.push({ question, answer: answer || '' });
        });
        if (cards.length) return cards;
    }

    return [];
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
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    currentFlashcardEditingId = null;
    currentFlashcardEditorCards = [];
}

function renderFlashcardEditorForm(cards) {
    const container = document.getElementById('flashcard-editor-form');
    if (!container) return;
    const t = window.t || ((k, fallback) => fallback);

    container.innerHTML = `
        <div class="space-y-3">
            ${cards.length ? cards.map((card, idx) => `
                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3" data-flashcard-row="${idx}">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${idx + 1}</span>
                        <button type="button" onclick="removeFlashcardEditorRow(${idx})" class="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">${t('key_btn_delete', 'Xóa')}</button>
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">${t('key_flashcard_question', 'Câu hỏi')}</label>
                        <input data-flashcard-question type="text" value="${escapeHtml(card.question || '')}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-1">${t('key_flashcard_answer', 'Đáp án')}</label>
                        <textarea data-flashcard-answer rows="3" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500">${escapeHtml(card.answer || '')}</textarea>
                    </div>
                </div>
            `).join('') : `<div class="text-center py-6 text-[11px] text-slate-400">${t('key_flashcard_editor_empty', 'Chưa có flashcard nào. Nhấn “+ Thêm flashcard” để bắt đầu.')}</div>`}
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

async function saveFlashcardEdit() {
    if (!currentFlashcardEditingId) return;
    const t = window.t || ((k, fallback) => fallback);
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
        await loadNotebooks();
        if (activeNotebookId) await selectNotebook(activeNotebookId, true);
        
        // Re-open review modal with fresh data
        openFlashcardReviewModal(currentFlashcardEditingId);
        alert(t('key_tool_save_success', 'Đã cập nhật flashcard thành công!'));
    } catch (err) {
        console.error('Save flashcard edit error:', err);
        alert('Lỗi khi lưu flashcard.');
    }
}
