        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getColorClasses(color) {
            const maps = {
                'indigo': { bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20', title: 'text-indigo-800 dark:text-indigo-300', text: 'text-indigo-600 dark:text-indigo-400/80' },
                'rose': { bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20', title: 'text-rose-800 dark:text-rose-300', text: 'text-rose-600 dark:text-rose-400/80' },
                'emerald': { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', title: 'text-emerald-800 dark:text-emerald-300', text: 'text-emerald-600 dark:text-emerald-400/80' },
                'orange': { bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20', title: 'text-orange-800 dark:text-orange-300', text: 'text-orange-600 dark:text-orange-400/80' },
                'amber': { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', title: 'text-amber-800 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400/80' },
                'slate': { bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20', title: 'text-slate-800 dark:text-slate-300', text: 'text-slate-600 dark:text-slate-400/80' },
            };
            return maps[color] || maps['slate'];
        }

        function showToastNotification(message, type = 'success') {
            const existing = document.querySelectorAll('.edubrain-toast-msg');
            existing.forEach(t => t.remove());

            const toast = document.createElement('div');
            toast.className = 'edubrain-toast-msg fixed bottom-5 right-5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold z-[99999] transition-all duration-300 transform translate-y-0 opacity-100 flex items-center space-x-2.5 backdrop-blur-md border';

            let iconSvg = '';
            if (type === 'error') {
                toast.classList.add('bg-rose-600/95', 'text-white', 'border-rose-400/30', 'shadow-rose-950/40');
                iconSvg = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>`;
            } else if (type === 'warning') {
                toast.classList.add('bg-amber-600/95', 'text-white', 'border-amber-400/30', 'shadow-amber-950/40');
                iconSvg = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
            } else {
                toast.classList.add('bg-emerald-600/95', 'text-white', 'border-emerald-400/30', 'shadow-emerald-950/40');
                iconSvg = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>`;
            }

            toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('opacity-0', 'translate-y-2');
                setTimeout(() => toast.remove(), 350);
            }, 3200);
        }

        /**
         * Global In-Web Confirm Modal Promise Helper
         * Replaces native window.confirm to avoid exiting Fullscreen / Focus Mode
         */
        function showConfirmModal({
            title = '',
            message = '',
            confirmText = '',
            cancelText = '',
            isDanger = true
        } = {}) {
            const t = window.t || ((k, f) => f);
            const resolvedTitle = title || (isDanger ? t('key_confirm_delete_title', 'Xác nhận xóa') : t('key_confirm_title', 'Xác nhận'));
            const resolvedMessage = message || t('key_confirm_default_msg', 'Bạn có chắc chắn muốn thực hiện hành động này?');
            const resolvedConfirmText = confirmText || (isDanger ? t('key_btn_delete', 'Xóa') : t('key_confirm', 'Xác nhận'));
            const resolvedCancelText = cancelText || t('key_cancel', 'Hủy');

            return new Promise((resolve) => {
                const modal = document.getElementById('global-confirm-modal');
                if (!modal) {
                    resolve(false);
                    return;
                }

                const titleEl = document.getElementById('global-confirm-title');
                const messageEl = document.getElementById('global-confirm-message');
                const confirmBtn = document.getElementById('global-confirm-btn');
                const cancelBtn = document.getElementById('global-confirm-cancel-btn');
                const iconDanger = document.getElementById('global-confirm-icon-danger');
                const iconInfo = document.getElementById('global-confirm-icon-info');
                const iconBox = document.getElementById('global-confirm-icon-box');

                if (titleEl) titleEl.textContent = resolvedTitle;
                if (messageEl) messageEl.textContent = resolvedMessage;
                if (cancelBtn) cancelBtn.textContent = resolvedCancelText;

                if (confirmBtn) {
                    confirmBtn.textContent = resolvedConfirmText;
                    if (isDanger) {
                        confirmBtn.className = "px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-500/25 cursor-pointer";
                        if (iconBox) {
                            iconBox.className = "w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-500 shrink-0 shadow-sm";
                        }
                        if (iconDanger) iconDanger.classList.remove('hidden');
                        if (iconInfo) iconInfo.classList.add('hidden');
                    } else {
                        confirmBtn.className = "px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-brand-500/25 cursor-pointer";
                        if (iconBox) {
                            iconBox.className = "w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/50 flex items-center justify-center text-brand-500 shrink-0 shadow-sm";
                        }
                        if (iconDanger) iconDanger.classList.add('hidden');
                        if (iconInfo) iconInfo.classList.remove('hidden');
                    }
                }

                let isCleanedUp = false;
                const cleanup = (result) => {
                    if (isCleanedUp) return;
                    isCleanedUp = true;
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                    confirmBtn?.removeEventListener('click', onConfirm);
                    cancelBtn?.removeEventListener('click', onCancel);
                    modal.removeEventListener('click', onBackdrop);
                    document.removeEventListener('keydown', onKeyDown);
                    resolve(result);
                };

                const onConfirm = (e) => {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    cleanup(true);
                };
                const onCancel = (e) => {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    cleanup(false);
                };
                const onBackdrop = (e) => {
                    if (e.target === modal) cleanup(false);
                };
                const onKeyDown = (e) => {
                    if (e.key === 'Escape') cleanup(false);
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        cleanup(true);
                    }
                };

                confirmBtn?.addEventListener('click', onConfirm);
                cancelBtn?.addEventListener('click', onCancel);
                modal.addEventListener('click', onBackdrop);
                document.addEventListener('keydown', onKeyDown);

                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        }

