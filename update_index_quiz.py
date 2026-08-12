import sys
import re

# Update template.html
with open('notebook/templates/notebook/features/quiz/template.html', 'r', encoding='utf-8') as f:
    template_content = f.read()

parser_js = """
// Method 2: Text Parser for Quiz
function parseQuizText(rawText) {
    if (!rawText || rawText.trim() === '') return getQuizMockHTML('Bản nháp rỗng');
    
    const blocks = rawText.split('\\nQ:');
    let questions = [];
    
    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i].trim();
        if (!block) continue;
        
        // If the first block didn't have Q: prefix but we split by \nQ:, it might just be the first Q:
        // Or if the string started with Q:, the first block is empty and skipped.
        
        // Extract Question
        const qMatch = block.match(/^(.*?)\\nA:/s);
        if (!qMatch) {
            // Handle case where Q: was stripped and it's just the rest of the block
            // or there's no A:
            continue;
        }
        const questionText = qMatch[1].trim();
        
        // Extract Options
        const aMatch = block.match(/\\nA:\\s*(.*?)\\nB:/s);
        const bMatch = block.match(/\\nB:\\s*(.*?)\\nC:/s);
        const cMatch = block.match(/\\nC:\\s*(.*?)\\nD:/s);
        const dMatch = block.match(/\\nD:\\s*(.*?)(?:\\nEXP:|$)/s);
        
        if (!aMatch || !bMatch || !cMatch || !dMatch) continue;
        
        let options = [aMatch[1].trim(), bMatch[1].trim(), cMatch[1].trim(), dMatch[1].trim()];
        let correctIndex = 0;
        let cleanOptions = [];
        
        for (let j = 0; j < options.length; j++) {
            let opt = options[j];
            if (opt.includes('(*)')) {
                correctIndex = j;
                opt = opt.replace('(*)', '').trim();
            }
            const letter = String.fromCharCode(65 + j);
            cleanOptions.push(`${letter}. ${opt}`);
        }
        
        // Extract EXP
        const expMatch = block.match(/\\nEXP:\\s*(.*)/s);
        const explanation = expMatch ? expMatch[1].trim() : "Không có giải thích.";
        
        questions.append({
            question: questionText,
            options: cleanOptions,
            answer: String.fromCharCode(65 + correctIndex),
            explanation: explanation
        });
    }
    
    if (questions.length === 0) {
        return getQuizMockHTML('Lỗi: Cú pháp không hợp lệ. Vui lòng nhập đúng định dạng Q: A: B: C: D: EXP:');
    }
    
    // Now render these questions into HTML
    let html = `<div class="text-left font-sans space-y-4 w-full max-w-2xl mx-auto">
        <p class="text-xs font-semibold text-slate-500">🏷️ Bài thi trắc nghiệm (Tự tạo)</p>`;
    
    questions.forEach((q, index) => {
        const qId = `quiz-q-${index}-${Date.now()}`;
        
        let optionsHtml = '';
        q.options.forEach((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            optionsHtml += `
                <button id="${qId}-opt-${optIdx}" onclick="checkQuizAnswer('${qId}', '${letter}', '${q.answer}', ${optIdx})" 
                class="text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm w-full">
                    ${opt}
                </button>
            `;
        });
        
        html += `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm hover:border-brand-300 transition-colors group">
                <span class="text-xs font-bold text-slate-800 dark:text-slate-100">Câu ${index + 1}: ${q.question}</span>
                <div class="grid grid-cols-1 gap-2 mt-2" id="${qId}-options">
                    ${optionsHtml}
                </div>
                <div id="${qId}-result" class="hidden mt-3 p-3 rounded-lg text-xs">
                    <p class="font-bold mb-1 status-text"></p>
                    <p class="text-slate-600 dark:text-slate-300 italic opacity-90">${q.explanation}</p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Convert to JSON array to save in textarea
    let jsonStr = JSON.stringify(questions);
    // Escape quotes to put in HTML
    jsonStr = jsonStr.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
    
    html += `<textarea id="quiz-hidden-data" class="hidden">${jsonStr}</textarea>`;
    
    return html;
}
"""

if "function parseQuizText" not in template_content:
    with open('notebook/templates/notebook/features/quiz/template.html', 'w', encoding='utf-8') as f:
        f.write(template_content + "\n<script>\n" + parser_js + "\n</script>\n")

# Update index.html
with open('notebook/templates/notebook/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Textarea to Modal
if 'id="tool-input-text"' not in content:
    input_html = '<input type="text" id="tool-input-title"'
    # We find the whole line to replace
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if input_html in line:
            lines[i] = line + '\n                        <textarea id="tool-input-text" placeholder="Dán văn bản có cấu trúc:\\nQ: Câu hỏi?\\nA: Đáp án 1\\nB: Đáp án 2 (*)\\nC: Đáp án 3\\nD: Đáp án 4\\nEXP: Giải thích chi tiết" class="w-full hidden h-48 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap"></textarea>'
            break
    content = '\n'.join(lines)

# Toggle in openCreateModal
if "textInput.classList.remove('hidden');" not in content:
    toggle_code_old = "            // Configure modal details based on selected tool"
    toggle_code_new = """            // Configure modal details based on selected tool
            const titleInput = document.getElementById('tool-input-title');
            const textInput = document.getElementById('tool-input-text');
            if (type === 'quiz') {
                titleInput.classList.add('hidden');
                textInput.classList.remove('hidden');
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
"""
    content = content.replace(toggle_code_old, toggle_code_new)

# Modify handleToolSubmit
import re
def replacer(match):
    return """} else if (activeToolType === 'quiz') {
                    const rawText = document.getElementById('tool-input-text').value;
                    mockResult = parseQuizText(rawText);
                }"""
content = re.sub(r"\} else if \(activeToolType === 'quiz'\) \{[\s\S]*?\} else if \(activeToolType === 'report'\) \{", r"} else if (activeToolType === 'quiz') {\n                    const rawText = document.getElementById('tool-input-text').value;\n                    mockResult = parseQuizText(rawText);\n                } else if (activeToolType === 'report') {", content)


with open('notebook/templates/notebook/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html and template.html for Quiz text parsing!")
