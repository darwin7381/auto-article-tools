
import sys
import pymupdf4llm

# 輸入和輸出文件路徑
pdf_path = sys.argv[1]
output_path = sys.argv[2]

# 轉換PDF為Markdown
markdown_text = pymupdf4llm.extract_pdf_md(pdf_path)

# 保存Markdown到文件
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(markdown_text)

print("轉換完成!")
