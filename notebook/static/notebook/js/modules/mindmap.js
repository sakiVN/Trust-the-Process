        function initJsMindInstance(key, containerId, treeData) {
            const tryInit = (retries) => {
                const containerEl = document.getElementById(containerId);
                if (!containerEl) {
                    if (retries > 0) {
                        setTimeout(() => tryInit(retries - 1), 100);
                    } else {
                        console.error("jsMind container not found after retries:", containerId);
                    }
                    return;
                }
                // Clean up any previous jsMind instance in this container
                if (jmInstances[key]) {
                    try { jmInstances[key] = null; } catch(e) {}
                }
                containerEl.innerHTML = '';
                const options = {
                    container: containerId,
                    editable: true,
                    theme: 'primary',
                    support_html: true
                };
                try {
                    const jm = new jsMind(options);
                    jm.show(treeData);
                    jmInstances[key] = jm;
                } catch(e) {
                    console.error("Error initializing jsMind:", e);
                }
            };
            setTimeout(() => tryInit(5), 100);
        }

        function parseMermaidToJsMind(text) {
            const lines = text.trim().split("\n");
            let root = null;
            let nodeStack = [];
            let idCounter = 0;
            
            for (let line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "mindmap") continue;
                
                const indent = line.length - line.trimStart().length;
                const level = Math.floor(indent / 2);
                
                let label = trimmed;
                if (label.startsWith("root((") && label.endsWith("))")) {
                    label = label.slice(6, -2);
                } else if (label.startsWith("root") && label.includes("((")) {
                    const start = label.indexOf("((");
                    const end = label.lastIndexOf("))");
                    if (start !== -1 && end !== -1) {
                        label = label.slice(start + 2, end);
                    }
                } else if (label.startsWith("((") && label.endsWith("))")) {
                    label = label.slice(2, -2);
                } else if (label.startsWith("{{") && label.endsWith("}}")) {
                    label = label.slice(2, -2);
                } else if (label.startsWith("[") && label.endsWith("]")) {
                    label = label.slice(1, -1);
                } else if (label.startsWith("(") && label.endsWith(")")) {
                    label = label.slice(1, -1);
                } else if (label.startsWith(")") && label.endsWith("(")) {
                    label = label.slice(1, -1);
                }
                
                const node = {
                    id: 'node_' + (++idCounter),
                    topic: label,
                    children: []
                };
                
                if (level === 1 || !root) {
                    node.id = 'root';
                    root = node;
                    nodeStack = [{ level: 1, node: node }];
                } else {
                    while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= level) {
                        nodeStack.pop();
                    }
                    if (nodeStack.length > 0) {
                        const parent = nodeStack[nodeStack.length - 1].node;
                        parent.children.push(node);
                    }
                    nodeStack.push({ level: level, node: node });
                }
            }
            
            return {
                meta: { name: "jsmind", author: "edubrain", version: "0.2" },
                format: "node_tree",
                data: root || { id: "root", topic: "Sơ đồ trống", children: [] }
            };
        }

        async function updateSavedMindmap(genId) {
            // Try workspace key first (ws-<id>), then fallback to direct key
            const jm = jmInstances['ws-' + genId] || jmInstances[genId];
            if (!jm) {
                alert("Không tìm thấy sơ đồ tư duy để lưu. Vui lòng thử lại.");
                return;
            }
            const mindData = jm.get_data();
            
            try {
                const res = await fetchWithCsrf(`${API_URL}/generations/${genId}/`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: mindData })
                });
                
                if (res.ok) {
                    alert("Đã cập nhật và lưu thay đổi sơ đồ tư duy thành công!");
                } else {
                    const err = await res.json();
                    alert("Lỗi lưu thay đổi: " + JSON.stringify(err));
                }
            } catch (err) {
                console.error("Lỗi cập nhật sơ đồ tư duy:", err);
            }
        }

        async function loadSavedMindmap(genId) {
            try {
                const res = await fetch(`${API_URL}/generations/${genId}/`);
                if (!res.ok) {
                    alert("Không thể tải sơ đồ tư duy!");
                    return;
                }

                const data = await res.json();
                // data.content chính là JSON bạn đã lưu từ jm.get_data()
                const mindData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;

                const jm = jmInstances['ws-' + genId] || jmInstances[genId];
                if (!jm) {
                    alert("Không tìm thấy workspace để hiển thị sơ đồ!");
                    return;
                }

                jm.show(mindData); // hiển thị lại sơ đồ với màu đã lưu
            } catch (err) {
                console.error("Lỗi tải sơ đồ tư duy:", err);
            }
        }

        function convertJsMindToMermaid(treeNode, indent = '  ') {
            let result = '';
            let topic = treeNode.topic || '';
            if (treeNode.id === 'root') {
                result += `${indent}root((${topic}))\n`;
            } else {
                result += `${indent}(${topic})\n`;
            }
            
            if (treeNode.children && treeNode.children.length > 0) {
                for (let child of treeNode.children) {
                    result += convertJsMindToMermaid(child, indent + '  ');
                }
            }
            return result;
        }

        function getMermaidFromJsMind(jmInstance) {
            const treeData = jmInstance.get_data('node_tree');
            let result = 'mindmap\n';
            result += convertJsMindToMermaid(treeData.data, '  ');
            return result;
        }

        function generateMockMermaidMindmap(title) {
            const titleLower = title.toLowerCase();
            if (titleLower.includes("toán") || titleLower.includes("math") || titleLower.includes("đại số") || titleLower.includes("hình học") || titleLower.includes("giải tích") || titleLower.includes("lượng giác")) {
                return `mindmap
  root((${title}))
    [Đại số & Giải tích]
      (Hàm số và Đồ thị)
      (Phương trình & Hệ phương trình)
      (Đạo hàm & Tích phân)
    [Hình học không gian]
      (Hình chóp & Hình lăng trụ)
      (Véctơ & Hệ tọa độ Oxyz)
    [Lượng giác]
      (Công thức lượng giác)
      (Phương trình lượng giác)`;
            } else if (titleLower.includes("vật lý") || titleLower.includes("vật lí") || titleLower.includes("physics") || titleLower.includes("cơ học") || titleLower.includes("điện") || titleLower.includes("quang học")) {
                return `mindmap
  root((${title}))
    [Cơ học]
      (Động lực học chất điểm)
      (Định luật bảo toàn năng lượng)
    [Điện từ học]
      (Điện tích & Điện trường)
      (Dòng điện không đổi)
    [Quang học & Hạt nhân]
      (Khúc xạ & Phản xạ ánh sáng)
      (Phóng xạ & Phản ứng hạt nhân)`;
            } else if (titleLower.includes("tin học") || titleLower.includes("lập trình") || titleLower.includes("code") || titleLower.includes("python") || titleLower.includes("javascript") || titleLower.includes("máy tính")) {
                return `mindmap
  root((${title}))
    [Cấu trúc dữ liệu]
      (Mảng & Danh sách liên kết)
      (Cây & Đồ thị)
    [Lập trình hướng đối tượng]
      (Kế thừa & Đa hình)
      (Đóng gói & Trừu tượng)
    [Cơ sở dữ liệu]
      (SQL & Thiết kế bảng)
      (NoSQL & Tối ưu truy vấn)`;
            } else {
                return `mindmap
  root((${title}))
    [Khái niệm nền tảng]
      (Định nghĩa & Lịch sử phát triển)
      (Cơ sở lý thuyết cốt lõi)
    [Thành phần & Cấu trúc]
      (Nguyên lý hoạt động)
      (Quy trình vận hành hệ thống)
    [Ứng dụng & Hướng phát triển]
      (Giải quyết bài toán thực tế)
      (Hướng tối ưu & Tích hợp)`;
            }
        }

        function addJsMindChildNode(key) {
            const jm = jmInstances[key];
            if (!jm) return;
            const selected = jm.get_selected_node();
            if (!selected) {
                alert("Vui lòng chọn một nút trước khi thêm nhánh con!");
                return;
            }
            const nodeId = 'node_' + Date.now();
            jm.add_node(selected, nodeId, "Nhánh mới");
        }

        function editJsMindNodeName(key) {
            const jm = jmInstances[key];
            if (!jm) return;
            const selected = jm.get_selected_node();
            if (!selected) {
                alert("Vui lòng chọn nhánh cần sửa!");
                return;
            }
            const newTopic = prompt("Nhập nội dung mới:", selected.topic);
            if (newTopic && newTopic.trim() !== "") {
                jm.update_node(selected.id, newTopic.trim());
            }
        }

        function removeJsMindNode(key) {
            const jm = jmInstances[key];
            if (!jm) return;
            const selected = jm.get_selected_node();
            if (!selected) {
                alert("Vui lòng chọn nút cần xóa!");
                return;
            }
            if (selected.id === 'root') {
                alert("Không thể xóa nút gốc!");
                return;
            }
            jm.remove_node(selected);
        }

        function changeJsMindNodeColor(key, color) {
            const jm = jmInstances[key];
            if (!jm) return;
            const selected = jm.get_selected_node();
            if (!selected) {
                alert("Vui lòng chọn một nút để đổi màu!");
                return;
            }
            // jsMind 0.6.4 stores node data - update via set_node_data and re-render
            // Use direct DOM manipulation as fallback
            try {
                if(!selected.data) selected.data = {};
                selected.data['background-color'] = color;
                // Try official API first (may work in some versions)
                if (typeof jm.set_node_color === 'function') {
                    jm.set_node_color(selected.id, color, '#ffffff');
                }
                else
                {
                    jm.update_node(selected.id, selected.topic);
                }
                // Direct DOM approach
                const nodeEl = document.querySelector(`jmnode[nodeid="${selected.id}"]`);
                if(nodeEl)
                {
                    nodeEl.style.setProperty('background-color', color, 'important');
                    nodeEl.style.setProperty('color', '#ffffff', 'important');
                }
            } catch(e) {
                console.warn('Color change error:', e);
            }
        }

