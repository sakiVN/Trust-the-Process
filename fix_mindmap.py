import sys
with open('notebook/templates/notebook/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = "} else if (activeToolType === 'mindmap') {"
end_str = "document.getElementById('tool-output-section').classList.remove('hidden');"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    end_idx += len(end_str)
    new_block = """} else if (activeToolType === 'mindmap') {
                    const mindmapData = getMindmapMockHTML(title);
                    mockResult = mindmapData.html;
                    
                    setTimeout(() => {
                        const parsedTree = parseMermaidToJsMind(mindmapData.mermaid);
                        initJsMindInstance('modal', mindmapData.id, parsedTree);
                    }, 100);
                }
                
                outputContent.innerHTML = mockResult;
                document.getElementById('tool-output-section').classList.remove('hidden');"""
    
    new_content = content[:start_idx] + new_block + content[end_idx:]
    with open('notebook/templates/notebook/index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Fixed mindmap!')
else:
    print('Not found')
