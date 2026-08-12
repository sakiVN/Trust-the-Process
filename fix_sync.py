import os

html_path = 'notebook/templates/notebook/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_js = """                if (saveRes.ok) {
                    showToastNotification("Đã lưu vào Sổ tay thành công!");
                    if (activeNotebookId) {
                        selectNotebook(activeNotebookId, true);
                    }
                    closeToolModal();
                } else {"""

new_js = """                if (saveRes.ok) {
                    showToastNotification("Đã lưu vào Sổ tay thành công!");
                    await loadNotebooks(); // Refresh the global notebooks array
                    if (activeNotebookId) {
                        selectNotebook(activeNotebookId, true); // Refresh the workspace view
                    }
                    closeToolModal();
                } else {"""

if old_js in content:
    content = content.replace(old_js, new_js)
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed state sync issue.")
else:
    print("Code not found or already fixed.")
