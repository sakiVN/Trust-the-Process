import re

with open('notebook/templates/notebook/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update openCreateModal to toggle textarea for 'report'
# Currently it's:
# if (type === 'quiz') {
# We will replace it with:
# if (type === 'quiz' || type === 'report') {
old_logic = "if (type === 'quiz') {\n                titleInput.classList.add('hidden');\n                textInput.classList.remove('hidden');"
new_logic = """if (type === 'quiz' || type === 'report') {
                titleInput.classList.add('hidden');
                textInput.classList.remove('hidden');
                if (type === 'quiz') {
                    textInput.placeholder = "Dán văn bản có cấu trúc:\\nQ: Câu hỏi?\\nA: Đáp án 1\\nB: Đáp án 2 (*)\\nC: Đáp án 3\\nD: Đáp án 4\\nEXP: Giải thích chi tiết";
                } else {
                    textInput.placeholder = "Dán nội dung tài liệu dài vào đây để hệ thống tự động tóm tắt...";
                }"""
content = content.replace(old_logic, new_logic)

# 2. Update handleToolSubmit for report
# Currently it's:
# } else if (activeToolType === 'report') {
#     mockResult = getReportMockHTML(title);
# }
old_handle = "} else if (activeToolType === 'report') {\n                    mockResult = getReportMockHTML(title);"
new_handle = "} else if (activeToolType === 'report') {\n                    const rawText = document.getElementById('tool-input-text').value;\n                    mockResult = generateReportHTML(rawText, title);"
content = content.replace(old_handle, new_handle)

# 3. Fix saveToolResult for report
# Currently:
# } else if (activeToolType === 'report') {
#    content = window.currentReportText || '';
# }
# We will change it so that it extracts from a hidden textarea inside the report just like quiz.
old_save = "} else if (activeToolType === 'report') {\n                content = window.currentReportText || '';"
new_save = "} else if (activeToolType === 'report') {\n                const hiddenData = document.getElementById('report-hidden-data');\n                content = hiddenData ? hiddenData.value : '';"
content = content.replace(old_save, new_save)


with open('notebook/templates/notebook/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html for report feature")
