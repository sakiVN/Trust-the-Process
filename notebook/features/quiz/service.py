import re
import json

def generate(sources_text, source_title=''):
    """
    Parses a raw text containing Q/A blocks and converts it to a JSON array of questions.
    
    Expected format:
    Q: Question text
    A: Option 1
    B: Option 2 (*)
    C: Option 3
    D: Option 4
    EXP: Explanation text
    """
    questions = []
    
    # Split text by \nQ: to get individual question blocks
    # Prepend \n to make sure the first Q: is matched if it's at the start of the text
    blocks = re.split(r'\nQ:\s+', '\n' + sources_text)
    
    for block in blocks:
        if not block.strip():
            continue
            
        # Extract the question text (everything before A:)
        q_match = re.search(r'^(.*?)\nA:', block, re.DOTALL)
        if not q_match:
            continue
            
        question_text = q_match.group(1).strip()
        
        # Extract options
        a_match = re.search(r'\nA:\s*(.*?)\nB:', block, re.DOTALL)
        b_match = re.search(r'\nB:\s*(.*?)\nC:', block, re.DOTALL)
        c_match = re.search(r'\nC:\s*(.*?)\nD:', block, re.DOTALL)
        d_match = re.search(r'\nD:\s*(.*?)(?:\nEXP:|$)', block, re.DOTALL)
        
        if not (a_match and b_match and c_match and d_match):
            continue
            
        opt_A = a_match.group(1).strip()
        opt_B = b_match.group(1).strip()
        opt_C = c_match.group(1).strip()
        opt_D = d_match.group(1).strip()
        
        options = [opt_A, opt_B, opt_C, opt_D]
        correct_index = 0
        
        clean_options = []
        for i, opt in enumerate(options):
            if '(*)' in opt:
                correct_index = i
                opt = opt.replace('(*)', '').strip()
            # Prefix with letter for display if it doesn't already have one
            # The user might not have included "A. " in the A: block
            letter = chr(65 + i)
            clean_options.append(f"{letter}. {opt}")
            
        # Extract explanation
        exp_match = re.search(r'\nEXP:\s*(.*)', block, re.DOTALL)
        explanation = exp_match.group(1).strip() if exp_match else "Không có giải thích."
        
        questions.append({
            "question": question_text,
            "options": clean_options,
            "correct_index": correct_index,
            "explanation": explanation
        })
    
    # If no questions parsed, return empty array
    if not questions:
        return "[]"
        
    return json.dumps(questions, ensure_ascii=False)
