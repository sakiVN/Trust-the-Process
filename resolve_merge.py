import re

with open('notebook/templates/notebook/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix conflict 1
content = re.sub(
    r"<<<<<<< HEAD\n\s*const createRes = await fetch\(`/api/notebooks/`, {\n=======\n\s*// Create a default notebook\n\s*const createRes = await fetchWithCsrf\(`\$\{API_URL\}/notebooks/`, {\n>>>>>>> origin/feature-backend-day2",
    r"                        // Create a default notebook\n                        const createRes = await fetchWithCsrf(`${API_URL}/notebooks/`, {",
    content
)

# Fix conflict 2
content = re.sub(
    r"<<<<<<< HEAD\n\s*const saveRes = await fetch\(`/api/generations/`, {\n=======\n\s*// POST to AIGeneration endpoint\n\s*const saveRes = await fetchWithCsrf\(`\$\{API_URL\}/generations/`, {\n>>>>>>> origin/feature-backend-day2",
    r"                // POST to AIGeneration endpoint\n                const saveRes = await fetchWithCsrf(`${API_URL}/generations/`, {",
    content
)

with open('notebook/templates/notebook/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Resolved conflicts in index.html!")
