import os

features_dir = 'notebook/features'
os.makedirs(features_dir, exist_ok=True)
with open(os.path.join(features_dir, '__init__.py'), 'w') as f:
    pass

for feature in ['flashcard', 'quiz', 'report', 'mindmap']:
    feature_dir = os.path.join(features_dir, feature)
    os.makedirs(feature_dir, exist_ok=True)
    with open(os.path.join(feature_dir, '__init__.py'), 'w') as f:
        pass
    with open(os.path.join(feature_dir, 'service.py'), 'w') as f:
        f.write(f"""def generate(sources_text, source_title=''):
    return '{feature}'
""")

import re
with open('notebook/ai_service.py', 'r', encoding='utf-8') as f:
    ai_content = f.read()

# Make ai_service use the routers
if "features.quiz" not in ai_content:
    new_ai_service = """from .features.flashcard import service as flashcard_service
from .features.quiz import service as quiz_service
from .features.report import service as report_service
from .features.mindmap import service as mindmap_service

def generate_learning_material(sources_text, source_title='', generation_type='quiz'):
    # Router pattern for the 4 features
    if generation_type == 'flashcards':
        return flashcard_service.generate(sources_text, source_title)
    elif generation_type == 'quiz':
        return quiz_service.generate(sources_text, source_title)
    elif generation_type == 'report':
        return report_service.generate(sources_text, source_title)
    elif generation_type == 'mind_map':
        return mindmap_service.generate(sources_text, source_title)
    return ''
"""
    with open('notebook/ai_service.py', 'w', encoding='utf-8') as f:
        f.write(new_ai_service)
