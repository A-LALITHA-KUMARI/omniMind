import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function printLog(msg: string) {
  process.stdout.write(msg + '\n');
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function logResult(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  printLog(`${status}: [${name}] - ${details}`);
}

async function runAudit() {
  printLog('====================================================');
  printLog('       EduGPT COMPREHENSIVE LIVE AUDIT & TEST       ');
  printLog('====================================================\n');

  // 1. Health Check
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
    const data = await res.json();
    const passed = (
      res.ok && 
      data.status === 'healthy' && 
      data.geminiConfigured === true &&
      data.chatModel === 'gemini-3.8-flash' &&
      data.embeddingModel === 'gemini-embedding-2-preview'
    );
    await logResult(
      'Health Check & Model Config',
      passed,
      `Status: ${data.status}, Model: ${data.chatModel}, EmbeddingModel: ${data.embeddingModel}`
    );
  } catch (err: any) {
    await logResult('Health Check & Model Config', false, err.message);
  }

  // 2. Secret Protection Audit
  try {
    const healthRes = await fetchWithTimeout(`${BASE_URL}/api/health`);
    const healthText = await healthRes.text();
    const indexRes = await fetchWithTimeout(`${BASE_URL}/`);
    const indexText = await indexRes.text();
    const rawKey = process.env.GEMINI_API_KEY || '';

    let leaksKey = false;
    if (rawKey && rawKey.length > 8) {
      if (healthText.includes(rawKey) || indexText.includes(rawKey)) {
        leaksKey = true;
      }
    }

    await logResult(
      'Secret Protection Audit',
      !leaksKey,
      leaksKey 
        ? 'CRITICAL FAILURE: API key exposed in network responses!' 
        : 'Confirmed: No Gemini API keys exposed in HTML or JSON endpoints.'
    );
  } catch (err: any) {
    await logResult('Secret Protection Audit', false, err.message);
  }

  // 3. Live Gemini Chat Request (English & Model Validation)
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is the capital of France? Reply with only the single word.' }],
        domain: 'general',
        enableRag: false,
      }),
    });
    const data = await res.json();
    const text = (data.text || '').trim();
    const passed = res.ok && data.success === true && text.toLowerCase().includes('paris');
    await logResult(
      'Live Gemini Chat (gemini-3.8-flash)',
      passed,
      `Model responded: "${text}"`
    );
  } catch (err: any) {
    await logResult('Live Gemini Chat (gemini-3.8-flash)', false, err.message);
  }

  // 4. Bilingual Telugu Chat Request
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'హలో, కంప్యూటర్ అంటే ఏమిటి? ఒక్క మాటలో చెప్పండి.' }],
        domain: 'general',
        languageMode: 'telugu',
        enableRag: false,
      }),
    });
    const data = await res.json();
    const text = (data.text || '').trim();
    const hasTeluguScript = /[\u0C00-\u0C7F]/.test(text);
    const passed = res.ok && data.success === true && hasTeluguScript;
    await logResult(
      'Telugu Multilingual Support',
      passed,
      `Telugu response received (${text.slice(0, 60)}...)`
    );
  } catch (err: any) {
    await logResult('Telugu Multilingual Support', false, err.message);
  }

  // 5. TXT Document Upload, Embeddings, Semantic Retrieval, Grounded Answer & Attribution
  let txtDocId = '';
  try {
    const txtBuffer = fs.readFileSync('tests/test_fact.txt');
    const form = new FormData();
    form.append('file', new Blob([txtBuffer], { type: 'text/plain' }), 'test_fact.txt');

    const uploadRes = await fetchWithTimeout(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: form,
    });
    const uploadData = await uploadRes.json();
    txtDocId = uploadData.document?.id || '';
    const uploadOk = uploadRes.ok && uploadData.success === true && uploadData.document?.chunkCount > 0;

    await logResult(
      'TXT Document Upload & Indexing',
      uploadOk,
      `Uploaded test_fact.txt, Created ${uploadData.document?.chunkCount} chunks`
    );

    // Search query
    const searchRes = await fetchWithTimeout(`${BASE_URL}/api/documents/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'What is the confidential code for Project Falcon?' }),
    });
    const searchData = await searchRes.json();
    const foundChunk = (searchData.results || []).find((r: any) => r.text.includes('FALCON-GAMMA-7788'));
    const searchOk = Boolean(foundChunk);

    await logResult(
      'TXT Semantic Vector Retrieval',
      searchOk,
      searchOk ? `Retrieved unique fact with similarity ${foundChunk.similarity}` : 'Failed to retrieve chunk with unique fact'
    );

    // Grounded Chat Answer with Attribution
    const chatRes = await fetchWithTimeout(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is the confidential code for Project Falcon according to my uploaded document?' }],
        domain: 'general',
        enableRag: true,
      }),
    });
    const chatData = await chatRes.json();
    const chatText = chatData.text || '';
    const hasUniqueFact = chatText.includes('FALCON-GAMMA-7788');
    const hasCitation = (chatData.citations || []).some((c: any) => c.documentName === 'test_fact.txt');
    const groundedOk = chatRes.ok && hasUniqueFact && hasCitation;

    await logResult(
      'TXT Grounded Gemini Answer & Source Attribution',
      groundedOk,
      `Contains unique fact: ${hasUniqueFact}, Source citations: ${chatData.citations?.length || 0}`
    );

    // Delete document
    if (txtDocId) {
      const delRes = await fetchWithTimeout(`${BASE_URL}/api/documents/${txtDocId}`, { method: 'DELETE' });
      const delData = await delRes.json();
      await logResult('TXT Document Deletion', delRes.ok && delData.success === true, 'Deleted document and associated vector chunks');
    }
  } catch (err: any) {
    await logResult('TXT RAG Workflow', false, err.message);
  }

  // 6. DOCX Document Upload, Extraction, Embeddings, Grounded Answer & Deletion
  let docxDocId = '';
  try {
    const docxBuffer = fs.readFileSync('tests/test_doc.docx');
    const form = new FormData();
    form.append('file', new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'test_doc.docx');

    const uploadRes = await fetchWithTimeout(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: form,
    });
    const uploadData = await uploadRes.json();
    docxDocId = uploadData.document?.id || '';
    const uploadOk = uploadRes.ok && uploadData.success === true && uploadData.document?.chunkCount > 0;

    await logResult(
      'DOCX Document Upload & Mammoth Extraction',
      uploadOk,
      `Uploaded test_doc.docx, Created ${uploadData.document?.chunkCount} chunks`
    );

    // Semantic search for unique DOCX fact
    const searchRes = await fetchWithTimeout(`${BASE_URL}/api/documents/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'What is the secret hydroponic formula?' }),
    });
    const searchData = await searchRes.json();
    const foundDocxChunk = (searchData.results || []).find((r: any) => r.text.includes('BIO-HYDROPONIC-X42'));
    const searchOk = Boolean(foundDocxChunk);

    await logResult(
      'DOCX Semantic Vector Retrieval',
      searchOk,
      searchOk ? `Retrieved unique fact with similarity ${foundDocxChunk.similarity}` : 'Failed to retrieve DOCX chunk'
    );

    // Grounded chat
    const chatRes = await fetchWithTimeout(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is the secret hydroponic yield booster formula according to the uploaded report?' }],
        domain: 'agriculture',
        enableRag: true,
      }),
    });
    const chatData = await chatRes.json();
    const chatText = chatData.text || '';
    const hasDocxFact = chatText.includes('BIO-HYDROPONIC-X42');
    const hasCitation = (chatData.citations || []).some((c: any) => c.documentName === 'test_doc.docx');
    const docxGroundedOk = chatRes.ok && hasDocxFact && hasCitation;

    await logResult(
      'DOCX Grounded Gemini Answer & Source Attribution',
      docxGroundedOk,
      `Contains unique fact: ${hasDocxFact}, Source citations: ${chatData.citations?.length || 0}`
    );

    // Delete DOCX
    if (docxDocId) {
      const delRes = await fetchWithTimeout(`${BASE_URL}/api/documents/${docxDocId}`, { method: 'DELETE' });
      const delData = await delRes.json();
      await logResult('DOCX Document Deletion', delRes.ok && delData.success === true, 'Deleted DOCX document and associated vector chunks');
    }
  } catch (err: any) {
    await logResult('DOCX RAG Workflow', false, err.message);
  }

  // 7. PDF Document Upload, Extraction, Embeddings, Grounded Answer & Deletion
  let pdfDocId = '';
  try {
    const pdfBuffer = fs.readFileSync('tests/test_doc.pdf');
    const form = new FormData();
    form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'test_doc.pdf');

    const uploadRes = await fetchWithTimeout(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      body: form,
    });
    const uploadData = await uploadRes.json();
    pdfDocId = uploadData.document?.id || '';
    const uploadOk = uploadRes.ok && uploadData.success === true && uploadData.document?.chunkCount > 0;

    await logResult(
      'PDF Document Upload & PDF-Parse Extraction',
      uploadOk,
      `Uploaded test_doc.pdf, Created ${uploadData.document?.chunkCount} chunks`
    );

    // Semantic search for unique PDF fact
    const searchRes = await fetchWithTimeout(`${BASE_URL}/api/documents/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'What is the research laboratory quantum key?' }),
    });
    const searchData = await searchRes.json();
    const foundPdfChunk = (searchData.results || []).find((r: any) => r.text.includes('QUANTUM-CIPHER-9900'));
    const searchOk = Boolean(foundPdfChunk);

    await logResult(
      'PDF Semantic Vector Retrieval',
      searchOk,
      searchOk ? `Retrieved unique fact with similarity ${foundPdfChunk.similarity}` : 'Failed to retrieve PDF chunk'
    );

    // Grounded chat
    const chatRes = await fetchWithTimeout(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is the research laboratory quantum key from the uploaded PDF document?' }],
        domain: 'stem',
        enableRag: true,
      }),
    });
    const chatData = await chatRes.json();
    const chatText = chatData.text || '';
    const hasPdfFact = chatText.includes('QUANTUM-CIPHER-9900');
    const hasCitation = (chatData.citations || []).some((c: any) => c.documentName === 'test_doc.pdf');
    const pdfGroundedOk = chatRes.ok && hasPdfFact && hasCitation;

    await logResult(
      'PDF Grounded Gemini Answer & Source Attribution',
      pdfGroundedOk,
      `Contains unique fact: ${hasPdfFact}, Source citations: ${chatData.citations?.length || 0}`
    );

    // Delete PDF
    if (pdfDocId) {
      const delRes = await fetchWithTimeout(`${BASE_URL}/api/documents/${pdfDocId}`, { method: 'DELETE' });
      const delData = await delRes.json();
      await logResult('PDF Document Deletion', delRes.ok && delData.success === true, 'Deleted PDF document and associated vector chunks');
    }
  } catch (err: any) {
    await logResult('PDF RAG Workflow', false, err.message);
  }

  printLog('\n====================================================');
  printLog('                 AUDIT SUMMARY                      ');
  printLog('====================================================');
  const allPassed = results.every(r => r.passed);
  printLog(`Total tests: ${results.length}`);
  printLog(`Passed: ${results.filter(r => r.passed).length}`);
  printLog(`Failed: ${results.filter(r => !r.passed).length}`);
  printLog(`Overall status: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  printLog('====================================================\n');
}

runAudit().catch((e) => {
  console.error('Audit fatal error:', e);
});
