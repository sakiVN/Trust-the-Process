import re

# Stop words tiếng Việt phổ biến
STOP_WORDS = {
    "và", "là", "của", "có", "thì", "mà", "ở", "các", "những", "được",
    "với", "cho", "trong", "đã", "không", "như", "này", "để", "từ",
    "một", "sẽ", "đến", "khi", "nhưng", "theo", "về", "ra", "phải", "đó",
    "cũng", "rất", "lên", "người", "nhất", "còn", "nhiều", "hơn", "vào",
    "nếu", "bị", "bởi", "lại", "nào", "đang", "đều", "làm", "sau", "cùng",
    "chỉ", "có thể", "kẻ", "tại", "sự", "nhau", "vì", "đây", "nên",
    "trên", "dưới", "qua", "trước", "cách", "rằng", "nữa", "việc",
    "tôi", "bạn", "anh", "chị", "em", "ông", "bà", "họ", "chúng", "nó", "ấy"
}

def clean_word(word):
    # Xóa các ký tự đặc biệt ở đầu/cuối từ
    return re.sub(r'^[.,!?()\[\]{}"\':;]+|[.,!?()\[\]{}"\':;]+$', '', word).lower()

def generate_report(sources_text: str, title: str) -> str:
    """
    Generate an extractive summary report from the sources text.
    Returns HTML content to match the JS implementation.
    """
    if not sources_text or not sources_text.strip():
        return '<div class="p-4 text-center text-slate-500">Bản nháp rỗng.</div>'
        
    # 1. Split into sentences
    sentences_raw = re.split(r'[^.!?]+[.!?]+', sources_text)
    # Using re.split this way might lose punctuation or give empty strings.
    # Better: finditer or simple split
    # Let's just use re.split with a capturing group to keep punctuation if needed,
    # but the JS just splits and keeps the text. We will use a simpler regex.
    sentences = [s.strip() for s in re.split(r'[.!?]+', sources_text) if len(s.strip()) > 0]
    
    if not sentences:
        return ""
        
    # 2. Calculate word frequencies
    word_freq = {}
    for sentence in sentences:
        words = sentence.split()
        for raw_word in words:
            word = clean_word(raw_word)
            if len(word) > 1 and word not in STOP_WORDS:
                word_freq[word] = word_freq.get(word, 0) + 1
                
    if not word_freq:
        return ""
        
    max_freq = max(word_freq.values())
    for word in word_freq:
        word_freq[word] /= max_freq
        
    # 3. Score sentences
    sentence_scores = []
    for i, sentence in enumerate(sentences):
        words = sentence.split()
        score = 0
        valid_words = 0
        for raw_word in words:
            word = clean_word(raw_word)
            if word in word_freq:
                score += word_freq[word]
                valid_words += 1
                
        # Length penalty
        if len(words) < 5 or len(words) > 50:
            score *= 0.5
            
        sentence_scores.append((i, sentence, score))
        
    # 4. Extract top sentences (max 5)
    sentence_scores.sort(key=lambda x: x[2], reverse=True)
    num_pick = min(5, len(sentence_scores))
    top_sentences = sentence_scores[:num_pick]
    top_sentences.sort(key=lambda x: x[0])  # Restore original order
    
    # 5. Extract top keywords
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    top_keywords = [word for word, freq in sorted_words[:3] if len(word) > 2]
    
    # Generate HTML
    points_html = ""
    for idx, (original_idx, text, score) in enumerate(top_sentences):
        points_html += f'''
            <div class="flex items-start space-x-2">
                <span class="text-brand-500 font-bold bg-brand-50 dark:bg-brand-500/10 w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 text-[10px]">{idx + 1}</span>
                <p class="leading-relaxed">{text}</p>
            </div>
        '''
        
    keywords_html = ""
    for kw in top_keywords:
        keywords_html += f'<span class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-1 rounded-md text-[10px] font-bold uppercase">{kw}</span>'
        
    display_title = title.upper() if title else "BÁO CÁO TÓM TẮT TÀI LIỆU"
    
    html = f'''
        <div class="text-left font-sans space-y-3 w-full max-w-2xl mx-auto">
            <p class="text-xs font-semibold text-slate-500">🏷️ Báo cáo sinh tự động (Extractive Backend)</p>
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <h4 class="text-sm font-bold text-brand-600 dark:text-brand-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center space-x-2">
                    <span>📄</span>
                    <span>{display_title}</span>
                </h4>
                
                <div class="space-y-2">
                    <h5 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Từ khóa cốt lõi</h5>
                    <div class="flex flex-wrap gap-2">
                        {keywords_html}
                    </div>
                </div>
                
                <div class="space-y-2">
                    <h5 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-4">Điểm mấu chốt được rút trích</h5>
                    <div class="text-[13px] text-slate-700 dark:text-slate-300 space-y-3 font-medium">
                        {points_html}
                    </div>
                </div>
                
                <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p class="text-[10px] text-slate-400 italic">Được tóm tắt tự động ở Backend dựa trên thuật toán TF-Extractive.</p>
                </div>
            </div>
        </div>
    '''
    
    # We do not need the hidden textarea in backend response because backend response is usually not edited in the modal.
    # It directly saves to DB or acts as final string.
    return html
