import os

html_path = 'notebook/templates/notebook/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the dynamic color interpolation with a switch case or predefined class maps
old_js = """                            <div class="bg-${item.color}-50 dark:bg-${item.color}-500/10 border border-${item.color}-200 dark:border-${item.color}-500/20 rounded-xl p-4 flex items-start space-x-4 transition hover:shadow-sm">
                                <div class="text-2xl">${item.icon}</div>
                                <div>
                                    <h4 class="text-sm font-bold text-${item.color}-800 dark:text-${item.color}-300 mb-1">${item.title}</h4>
                                    <p class="text-xs text-${item.color}-600 dark:text-${item.color}-400/80 leading-relaxed">${item.message}</p>
                                </div>
                            </div>"""

new_js = """                            <div class="${getColorClasses(item.color).bg} ${getColorClasses(item.color).border} rounded-xl p-4 flex items-start space-x-4 transition hover:shadow-sm">
                                <div class="text-2xl">${item.icon}</div>
                                <div>
                                    <h4 class="text-sm font-bold ${getColorClasses(item.color).title} mb-1">${item.title}</h4>
                                    <p class="text-xs ${getColorClasses(item.color).text} leading-relaxed">${item.message}</p>
                                </div>
                            </div>"""

helper_function = """        function getColorClasses(color) {
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

        // Fetch Dashboard Notifications"""

if "function getColorClasses" not in content:
    content = content.replace(old_js, new_js)
    content = content.replace("// Fetch Dashboard Notifications", helper_function)
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed Tailwind dynamic classes.")
else:
    print("Already fixed.")
