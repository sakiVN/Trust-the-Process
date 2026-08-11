import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    for old_str, new_str in replacements:
        if old_str in content:
            content = content.replace(old_str, new_str)
            modified = True
            print(f"Replaced in {os.path.basename(filepath)}: '{old_str}' -> '{new_str}'")
            
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

html_replacements = [
    ("Ghi chú & Phản biện AI", "Ghi chú & Phân tích Logic"),
    ("trợ lý AI", "hệ thống tự động"),
    ("AI sinh nội dung", "Hệ thống sinh nội dung"),
    ("AI sinh", "Tự động sinh"),
    ("nội dung AI", "nội dung tự động"),
    ("Phản biện AI", "Phân tích Logic"),
]

views_replacements = [
    ("tài liệu AI", "tài liệu tự động"),
]

replace_in_file('notebook/templates/notebook/index.html', html_replacements)
replace_in_file('notebook/views.py', views_replacements)

print("Done.")
