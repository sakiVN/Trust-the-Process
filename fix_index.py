import re

with open('notebook/templates/notebook/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<button onclick="saveToolResult()" class="text-[10px] text-emerald-600 dark:text-emerald-500 hover:underline font-bold">💾 Lưu trữ sơ đồ</button>',
    '<button onclick="saveToolResult()" class="text-[10px] text-emerald-600 dark:text-emerald-500 hover:underline font-bold">💾 Lưu vào Notebook</button>'
)

if '{% include' not in content:
    content = content.replace('</body>', '''    {% include 'notebook/features/flashcard/template.html' %}
    {% include 'notebook/features/quiz/template.html' %}
    {% include 'notebook/features/report/template.html' %}
    {% include 'notebook/features/mindmap/template.html' %}
</body>''')

old_save_tool_result = """        // POST Request: Save generated tool result to database (persists in backend)
        async function saveToolResult() {
            let content = '';
            if (activeToolType === 'mindmap') {
                const jm = jmInstances['modal'];
                content = jm ? getMermaidFromJsMind(jm) : '';
            } else {
                const container = document.getElementById('tool-output-content');
                content = container ? container.innerText.trim() : '';
            }
            
            if (!content) return alert("Không có nội dung để lưu!");
            
            try {
                // Ensure there is at least one active notebook to link the AIGeneration
                if (!activeNotebookId) {
                    const nbRes = await fetch(`${API_URL}/notebooks/`);
                    const nbs = await nbRes.json();
                    if (nbs.length > 0) {
                        activeNotebookId = nbs[0].id;
                    } else {
                        // Create a default notebook
                        const createRes = await fetch(`${API_URL}/notebooks/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: "Sổ tay học tập", description: "Không gian học tập và lưu trữ sơ đồ tư duy" })
                        });
                        const newNb = await createRes.json();
                        activeNotebookId = newNb.id;
                    }
                }
                
                // POST to AIGeneration endpoint
                const saveRes = await fetch(`${API_URL}/generations/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notebook: activeNotebookId,
                        generation_type: activeToolType === 'mindmap' ? 'mind_map' : activeToolType,
                        content: content
                    })
                });
                
                if (saveRes.ok) {
                    alert("Đã lưu trữ sơ đồ tư duy/tài liệu học tập thành công vào cơ sở dữ liệu!");
                } else {
                    const err = await saveRes.json();
                    alert("Lỗi lưu trữ: " + JSON.stringify(err));
                }
            } catch (err) {
                console.error("Lỗi khi lưu trữ:", err);
                alert("Đã xảy ra lỗi khi kết nối lưu trữ.");
            }
        }"""

new_save_tool_result = """        // POST Request: Save generated tool result to database (persists in backend)
        async function saveToolResult() {
            const saveBtn = document.querySelector('button[onclick="saveToolResult()"]');
            let originalBtnHTML = '';
            if (saveBtn) {
                originalBtnHTML = saveBtn.innerHTML;
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"></span> Đang lưu...';
            }

            let content = '';
            if (activeToolType === 'mindmap') {
                const jm = jmInstances['modal'];
                content = jm ? getMermaidFromJsMind(jm) : '';
            } else if (activeToolType === 'quiz') {
                content = window.currentQuizJSON || '[]';
            } else if (activeToolType === 'report') {
                content = window.currentReportText || '';
            } else {
                const container = document.getElementById('tool-output-content');
                content = container ? container.innerText.trim() : '';
            }
            
            if (!content) {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnHTML;
                }
                return alert("Không có nội dung để lưu!");
            }
            
            try {
                if (!activeNotebookId) {
                    const nbRes = await fetch(`/api/notebooks/`);
                    const nbs = await nbRes.json();
                    if (nbs.length > 0) {
                        activeNotebookId = nbs[0].id;
                    } else {
                        const createRes = await fetch(`/api/notebooks/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: "Sổ tay học tập", description: "Không gian học tập và lưu trữ sơ đồ tư duy" })
                        });
                        const newNb = await createRes.json();
                        activeNotebookId = newNb.id;
                    }
                }
                
                const saveRes = await fetch(`/api/generations/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notebook: activeNotebookId,
                        generation_type: activeToolType === 'mindmap' ? 'mind_map' : activeToolType,
                        content: content
                    })
                });
                
                if (saveRes.ok) {
                    showToastNotification("Đã lưu vào Sổ tay thành công!");
                    if (activeNotebookId) {
                        selectNotebook(activeNotebookId, true);
                    }
                    closeToolModal();
                } else {
                    const err = await saveRes.json();
                    alert("Lỗi lưu trữ: " + JSON.stringify(err));
                }
            } catch (err) {
                console.error("Lỗi khi lưu trữ:", err);
                alert("Đã xảy ra lỗi khi kết nối lưu trữ.");
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnHTML;
                }
            }
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
        }"""

content = content.replace(old_save_tool_result, new_save_tool_result)

start_idx = content.find("if (activeToolType === 'flashcards') {")
end_idx = content.find("outputContent.innerHTML = mockResult;")

if start_idx != -1 and end_idx != -1:
    new_handle = """if (activeToolType === 'flashcards') {
                    mockResult = getFlashcardMockHTML(title);
                } else if (activeToolType === 'quiz') {
                    mockResult = getQuizMockHTML(title);
                } else if (activeToolType === 'report') {
                    mockResult = getReportMockHTML(title);
                } else if (activeToolType === 'mindmap') {
                    mockResult = getMindmapMockHTML(title);
                    
                    setTimeout(() => {
                        const jsmindContainer = outputContent.querySelector('.jsmind-container-override');
                        if (jsmindContainer) {
                            const mermaidDataMatch = mockResult.match(/<script class="mermaid-data" type="text\\/plain">([\\s\\S]*?)<\\/script>/);
                            if (mermaidDataMatch && mermaidDataMatch[1]) {
                                renderMermaidToJsMind(mermaidDataMatch[1], jsmindContainer.id, 'modal');
                            }
                        }
                    }, 50);
                }
                
                """
    content = content[:start_idx] + new_handle + content[end_idx:]
    with open('notebook/templates/notebook/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed handleToolSubmit")
else:
    print("Could not find boundaries")
