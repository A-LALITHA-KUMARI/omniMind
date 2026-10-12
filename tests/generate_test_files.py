import os
import zipfile

os.makedirs('tests', exist_ok=True)

# 1. Create test TXT file
with open('tests/test_fact.txt', 'w', encoding='utf-8') as f:
    f.write("""Project Falcon Confidential Briefing Document.
Section 1: Overview
The confidential code for Project Falcon is FALCON-GAMMA-7788.
Section 2: Security Guidelines
Ensure all communication channels use end-to-end 256-bit encryption.
""")

# 2. Create valid DOCX file using built-in zipfile
content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

document_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Agricultural Hydroponics Innovation Report 2026.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>The secret hydroponic yield booster formula is BIO-HYDROPONIC-X42.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Applying this booster increases tomato crop harvest by 35% in controlled greenhouse environments.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>"""

with zipfile.ZipFile('tests/test_doc.docx', 'w') as docx:
    docx.writestr('[Content_Types].xml', content_types)
    docx.writestr('_rels/.rels', rels)
    docx.writestr('word/document.xml', document_xml)

# 3. Create valid minimal PDF file
pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 124 >>
stream
BT
/F1 12 Tf
72 712 Td
(Quantum Laboratory Research Bulletin:) Tj
0 -20 Td
(The research laboratory quantum key is QUANTUM-CIPHER-9900.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000419 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
498
%%EOF
"""

with open('tests/test_doc.pdf', 'wb') as f:
    f.write(pdf_content)

print("Created test files successfully:")
print("- tests/test_fact.txt (size:", os.path.getsize('tests/test_fact.txt'), "bytes)")
print("- tests/test_doc.docx (size:", os.path.getsize('tests/test_doc.docx'), "bytes)")
print("- tests/test_doc.pdf (size:", os.path.getsize('tests/test_doc.pdf'), "bytes)")
