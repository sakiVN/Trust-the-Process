def generate(sources_text, source_title='', language='vi'):
    title = source_title or ("Sơ đồ tư duy" if language == 'vi' else ("マインドマップ" if language == 'jp' else "Mind Map"))
    title_lower = title.lower()

    if language == 'jp':
        return f"""mindmap
  root(({title}))
    [基礎概念・定義]
      (主要原則と背景)
      (基本用語の整理)
    [構造と展開]
      (動作原理と機能)
      (システム連携)
    [応用・今後の展望]
      (実践的ユースケース)
      (最適化と発展)"""
    elif language == 'en':
        return f"""mindmap
  root(({title}))
    [Core Concepts]
      (Definitions & Overview)
      (Foundational Principles)
    [Structure & Mechanism]
      (Key Components)
      (System Architecture)
    [Applications & Insights]
      (Practical Use Cases)
      (Optimization & Future Directions)"""
    else:
        return f"""mindmap
  root(({title}))
    [Khái niệm nền tảng]
      (Định nghĩa & Tổng quan)
      (Nguyên lý cốt lõi)
    [Cấu trúc & Cơ chế]
      (Các thành phần chính)
      (Quy trình vận hành)
    [Ứng dụng & Phát triển]
      (Giải pháp thực tiễn)
      (Hướng tối ưu hóa)"""
