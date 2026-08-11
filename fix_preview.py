import os

html_path = 'notebook/templates/notebook/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_js = """                const summary = isQuiz
                    ? (item.description || 'Bộ câu hỏi trắc nghiệm đã lưu.')
                    : (item.content ? String(item.content).replace(/<[^>]*>/g, '').slice(0, 180) : 'Không có mô tả nội dung.');"""

new_js = """                let summary = 'Không có mô tả nội dung.';
                if (isQuiz) {
                    summary = item.description || 'Bộ câu hỏi trắc nghiệm đã lưu.';
                } else if (item.content) {
                    if (item.generation_type === 'quiz' || item.generation_type === 'flashcards') {
                        try {
                            let cleanContent = item.content.trim();
                            if (cleanContent.startsWith("```")) {
                                cleanContent = cleanContent.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
                            }
                            const arr = JSON.parse(cleanContent);
                            summary = `Gồm ${arr.length} ${item.generation_type === 'quiz' ? 'câu hỏi trắc nghiệm' : 'thẻ nhớ'}.`;
                        } catch (e) {
                            summary = 'Tài liệu học tập đã lưu.';
                        }
                    } else if (item.generation_type === 'mind_map') {
                        summary = 'Sơ đồ tư duy trực quan (Mermaid).';
                    } else {
                        summary = String(item.content).replace(/<[^>]*>/g, '').slice(0, 180);
                    }
                }"""

if old_js in content:
    content = content.replace(old_js, new_js)
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed preview summary.")
else:
    print("Code not found or already fixed.")
