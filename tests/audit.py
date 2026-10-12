import urllib.request
import urllib.error
import json
import os
import re
import uuid

BASE_URL = "http://localhost:3000"
results = []

def log(name, passed, details=""):
    results.append({"name": name, "passed": passed, "details": details})
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: [{name}] - {details}", flush=True)

def post_json(endpoint, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_json(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8")), resp.read().decode("utf-8")

def post_multipart(endpoint, filepath, filename, content_type):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    with open(filepath, "rb") as f:
        file_bytes = f.read()
    
    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
    body.extend(file_bytes)
    body.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))
    
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=bytes(body),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body))
        }
    )
    with urllib.request.urlopen(req, timeout=35) as resp:
        return json.loads(resp.read().decode("utf-8"))

def delete_req(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}", method="DELETE")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))

print("\n" + "="*56, flush=True)
print("     EduGPT VERIFICATION & AUDIT SUITE", flush=True)
print("="*56 + "\n", flush=True)

# 1. Health & Model Config
try:
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw_health = resp.read().decode("utf-8")
        h = json.loads(raw_health)
    passed = (
        h.get("status") == "healthy" and
        h.get("geminiConfigured") is True and
        h.get("chatModel") == "gemini-3.8-flash" and
        h.get("embeddingModel") == "gemini-embedding-2-preview"
    )
    log("Health Check & Model Config", passed, f"Model: {h.get('chatModel')}, Embedding: {h.get('embeddingModel')}")
except Exception as e:
    log("Health Check & Model Config", False, str(e))

# 2. Secret Protection Audit
try:
    req_root = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req_root, timeout=10) as resp:
        html = resp.read().decode("utf-8")
    key = os.environ.get("GEMINI_API_KEY", "")
    has_leak = bool(key and len(key) > 8 and (key in html or key in raw_health))
    log("Secret Protection Audit", not has_leak, "Confirmed: No API key in HTML or /api/health response")
except Exception as e:
    log("Secret Protection Audit", False, str(e))

# 3. Live Gemini Chat Request
try:
    chat_resp = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "What is 15 + 27? Reply with only the number."}],
        "domain": "general",
        "enableRag": False
    })
    ans = chat_resp.get("text", "").strip()
    passed = chat_resp.get("success") is True and "42" in ans
    log("Live Gemini Chat (gemini-3.8-flash)", passed, f'Model response: "{ans}"')
except Exception as e:
    log("Live Gemini Chat (gemini-3.8-flash)", False, str(e))

# 4. Telugu Multilingual Chat
try:
    telugu_resp = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "నమస్కారం! ఒక మంచి తెలుగు సామెత చెప్పండి."}],
        "domain": "general",
        "languageMode": "telugu",
        "enableRag": False
    })
    t_text = telugu_resp.get("text", "")
    has_telugu = bool(re.search(r'[\u0C00-\u0C7F]', t_text))
    passed = telugu_resp.get("success") is True and has_telugu
    preview = t_text[:60].replace("\n", " ")
    log("Telugu Multilingual Conversation", passed, f'Telugu response: "{preview}..."')
except Exception as e:
    log("Telugu Multilingual Conversation", False, str(e))

# 5. Real TXT Document Upload, Embeddings, Semantic Search, Grounded Answer & Deletion
txt_id = ""
try:
    up = post_multipart("/api/documents/upload", "tests/test_fact.txt", "test_fact.txt", "text/plain")
    txt_id = up.get("document", {}).get("id", "")
    chunk_count = up.get("document", {}).get("chunkCount", 0)
    log("TXT Upload & Extraction", up.get("success") is True and chunk_count > 0, f"Indexed {chunk_count} chunks")
    
    sr = post_json("/api/documents/search", {"query": "What is the confidential code for Project Falcon?"})
    results_list = sr.get("results", [])
    found_chunk = any("FALCON-GAMMA-7788" in r.get("text", "") for r in results_list)
    log("TXT Semantic Vector Retrieval", found_chunk, f"Retrieved unique fact 'FALCON-GAMMA-7788' (found {len(results_list)} results)")
    
    gr = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "What is the confidential code for Project Falcon according to the uploaded document?"}],
        "enableRag": True
    })
    gr_text = gr.get("text", "")
    cites = gr.get("citations", [])
    grounded_passed = "FALCON-GAMMA-7788" in gr_text and len(cites) > 0
    log("TXT Grounded Gemini Answer & Citations", grounded_passed, f"Fact present: {'FALCON-GAMMA-7788' in gr_text}, Citations: {len(cites)}")
    
    if txt_id:
        dr = delete_req(f"/api/documents/{txt_id}")
        log("TXT Document Deletion", dr.get("success") is True, "Document and indexed vectors removed")
except Exception as e:
    log("TXT RAG Workflow", False, str(e))

# 6. Real DOCX Document Upload, Mammoth Extraction, Embeddings, Grounded Answer & Deletion
docx_id = ""
try:
    up = post_multipart("/api/documents/upload", "tests/test_doc.docx", "test_doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    docx_id = up.get("document", {}).get("id", "")
    chunk_count = up.get("document", {}).get("chunkCount", 0)
    log("DOCX Upload & Mammoth Extraction", up.get("success") is True and chunk_count > 0, f"Indexed {chunk_count} chunks")
    
    sr = post_json("/api/documents/search", {"query": "What is the secret hydroponic formula?"})
    results_list = sr.get("results", [])
    found_chunk = any("BIO-HYDROPONIC-X42" in r.get("text", "") for r in results_list)
    log("DOCX Semantic Vector Retrieval", found_chunk, f"Retrieved unique fact 'BIO-HYDROPONIC-X42' (found {len(results_list)} results)")
    
    gr = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "What is the secret hydroponic yield booster formula according to the uploaded document?"}],
        "domain": "agriculture",
        "enableRag": True
    })
    gr_text = gr.get("text", "")
    cites = gr.get("citations", [])
    grounded_passed = "BIO-HYDROPONIC-X42" in gr_text and len(cites) > 0
    log("DOCX Grounded Gemini Answer & Citations", grounded_passed, f"Fact present: {'BIO-HYDROPONIC-X42' in gr_text}, Citations: {len(cites)}")
    
    if docx_id:
        dr = delete_req(f"/api/documents/{docx_id}")
        log("DOCX Document Deletion", dr.get("success") is True, "Document and indexed vectors removed")
except Exception as e:
    log("DOCX RAG Workflow", False, str(e))

# 7. Real PDF Document Upload, PDF-Parse Extraction, Embeddings, Grounded Answer & Deletion
pdf_id = ""
try:
    up = post_multipart("/api/documents/upload", "tests/test_doc.pdf", "test_doc.pdf", "application/pdf")
    pdf_id = up.get("document", {}).get("id", "")
    chunk_count = up.get("document", {}).get("chunkCount", 0)
    log("PDF Upload & PDF-Parse Extraction", up.get("success") is True and chunk_count > 0, f"Indexed {chunk_count} chunks")
    
    sr = post_json("/api/documents/search", {"query": "What is the quantum laboratory key?"})
    results_list = sr.get("results", [])
    found_chunk = any("QUANTUM-CIPHER-9900" in r.get("text", "") for r in results_list)
    log("PDF Semantic Vector Retrieval", found_chunk, f"Retrieved unique fact 'QUANTUM-CIPHER-9900' (found {len(results_list)} results)")
    
    gr = post_json("/api/chat", {
        "messages": [{"role": "user", "content": "What is the research laboratory quantum key according to the uploaded PDF document?"}],
        "domain": "stem",
        "enableRag": True
    })
    gr_text = gr.get("text", "")
    cites = gr.get("citations", [])
    grounded_passed = "QUANTUM-CIPHER-9900" in gr_text and len(cites) > 0
    log("PDF Grounded Gemini Answer & Citations", grounded_passed, f"Fact present: {'QUANTUM-CIPHER-9900' in gr_text}, Citations: {len(cites)}")
    
    if pdf_id:
        dr = delete_req(f"/api/documents/{pdf_id}")
        log("PDF Document Deletion", dr.get("success") is True, "Document and indexed vectors removed")
except Exception as e:
    log("PDF RAG Workflow", False, str(e))

print("\n" + "="*56, flush=True)
print("                 AUDIT SUMMARY", flush=True)
print("="*56, flush=True)
all_ok = all(r["passed"] for r in results)
print(f"Total Tests Executed: {len(results)}", flush=True)
print(f"Passed: {sum(1 for r in results if r['passed'])}", flush=True)
print(f"Failed: {sum(1 for r in results if not r['passed'])}", flush=True)
print(f"Status: {'ALL TESTS PASSED' if all_ok else 'SOME TESTS FAILED'}", flush=True)
print("="*56 + "\n", flush=True)
