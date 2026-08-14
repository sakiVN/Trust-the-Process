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

        function showToastNotification(message) {
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold z-[9999] transition-opacity duration-500';
            toast.innerText = message;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('opacity-0');
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        }

