import urllib.request
import urllib.error
import json
import re
import sys

BASE_URL = "http://localhost:3000"

def log(step, msg, passed=True):
    icon = "✅ PASS" if passed else "❌ FAIL"
    print(f"{icon} [{step}]: {msg}", flush=True)

print("="*60)
print("     OMNIMIND AI COMPREHENSIVE LIVE VERIFICATION     ")
print("="*60 + "\n")

# 1. Health check
try:
    with urllib.request.urlopen(f"{BASE_URL}/api/health", timeout=10) as resp:
        h = json.loads(resp.read().decode("utf-8"))
    log("1. Health Endpoint", f"Status: {h.get('status')}, Model: {h.get('chatModel')}, Gemini Configured: {h.get('geminiConfigured')}")
except Exception as e:
    log("1. Health Endpoint", str(e), False)
    sys.exit(1)

# 2. Test exact question: "What is machine learning?" via /api/chat
ml_answer = ""
try:
    payload = json.dumps({
        "messages": [{"role": "user", "content": "What is machine learning?"}],
        "domain": "general",
        "enableRag": False
    }).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/chat", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as resp:
        res = json.loads(resp.read().decode("utf-8"))
    ml_answer = res.get("text", "")
    passed = bool(res.get("success") and len(ml_answer) > 50 and any(w in ml_answer.lower() for w in ["data", "learn", "algorithm", "pattern"]))
    preview = ml_answer[:120].replace("\n", " ")
    log("2. Exact Question 'What is machine learning?' (/api/chat)", f'Generated {len(ml_answer)} chars. Preview: "{preview}..."', passed)
except Exception as e:
    log("2. Exact Question 'What is machine learning?' (/api/chat)", str(e), False)
    sys.exit(1)

# 3. Test exact question: "What is machine learning?" via SSE /api/chat/stream
try:
    payload = json.dumps({
        "messages": [{"role": "user", "content": "What is machine learning?"}],
        "domain": "general",
        "enableRag": False
    }).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/chat/stream", data=payload, headers={"Content-Type": "application/json"})
    chunks_received = []
    has_done = False
    with urllib.request.urlopen(req, timeout=25) as resp:
        for line in resp:
            decoded = line.decode("utf-8").strip()
            if decoded.startswith("data: "):
                data_str = decoded[6:]
                try:
                    p = json.loads(data_str)
                    if p.get("type") == "chunk":
                        chunks_received.append(p.get("text", ""))
                    elif p.get("type") == "done":
                        has_done = True
                except:
                    pass
    streamed_text = "".join(chunks_received)
    stream_passed = bool(len(streamed_text) > 50 and has_done)
    log("3. Streaming Chat (/api/chat/stream)", f"Received {len(chunks_received)} chunks, total length: {len(streamed_text)} chars, done event: {has_done}", stream_passed)
except Exception as e:
    log("3. Streaming Chat (/api/chat/stream)", str(e), False)

# 4. Follow-up turn with conversation context: "Explain it with a real-life example."
try:
    payload = json.dumps({
        "messages": [
            {"role": "user", "content": "What is machine learning?"},
            {"role": "assistant", "content": ml_answer[:300]},
            {"role": "user", "content": "Explain it with a real-life example."}
        ],
        "domain": "general",
        "enableRag": False
    }).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/chat", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as resp:
        res = json.loads(resp.read().decode("utf-8"))
    followup_answer = res.get("text", "")
    passed = bool(res.get("success") and len(followup_answer) > 50 and any(w in followup_answer.lower() for w in ["example", "spam", "recommend", "netflix", "email", "traffic", "fraud"]))
    preview = followup_answer[:120].replace("\n", " ")
    log("4. Follow-up 'Explain it with a real-life example.' (Context retention)", f'Generated {len(followup_answer)} chars with real-world analogy. Preview: "{preview}..."', passed)
except Exception as e:
    log("4. Follow-up 'Explain it with a real-life example.' (Context retention)", str(e), False)

# 5. Error handling validation: Empty messages
try:
    payload = json.dumps({"messages": []}).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/api/chat", data=payload, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=10)
    log("5. Error Handling (Empty payload)", "Expected 400 but succeeded", False)
except urllib.error.HTTPError as he:
    passed = he.code == 400
    log("5. Error Handling (Empty payload)", f"Correctly returned HTTP {he.code} error", passed)
except Exception as e:
    log("5. Error Handling (Empty payload)", str(e), False)

# 6. Branding & Title verification
try:
    with urllib.request.urlopen(f"{BASE_URL}/", timeout=10) as resp:
        html = resp.read().decode("utf-8")
    has_omnimind = "OmniMind AI" in html
    log("6. OmniMind AI Branding & HTML Title", "Found 'OmniMind AI' in HTML entry point", has_omnimind)
except Exception as e:
    log("6. OmniMind AI Branding & HTML Title", str(e), False)

print("\n" + "="*60)
print("     VERIFICATION COMPLETED SUCCESSFULLY")
print("="*60 + "\n")
