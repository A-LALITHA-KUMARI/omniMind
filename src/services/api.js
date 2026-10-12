/**
 * OmniMind AI API Services (Pure JavaScript)
 */

export async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed with status: ${res.status}`);
  }
  return res.json();
}

export async function fetchModels() {
  const res = await fetch('/api/models');
  if (!res.ok) {
    throw new Error('Failed to fetch available models.');
  }
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch('/api/documents');
  if (!res.ok) {
    throw new Error('Failed to fetch documents.');
  }
  return res.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload document.');
  }
  return data;
}

export async function deleteDocument(id) {
  const res = await fetch(`/api/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete document.');
  }
}

export async function fetchDocumentChunks(id) {
  const res = await fetch(`/api/documents/${id}/chunks`);
  if (!res.ok) {
    throw new Error('Failed to fetch document chunks.');
  }
  return res.json();
}

export async function searchDocuments(query, topK = 5, minSimilarity = 0.25) {
  const res = await fetch('/api/documents/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK, minSimilarity }),
  });
  if (!res.ok) {
    throw new Error('Search failed.');
  }
  return res.json();
}

/**
 * Non-streaming chat request with Groq
 */
export async function sendChatRequest({
  messages,
  model,
  domain,
  languageMode,
  enableRag,
  signal,
}) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, domain, languageMode, enableRag }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Server returned error (${res.status})`);
  }

  if (!data.text) {
    throw new Error('Groq returned an empty response. Please try again.');
  }

  return {
    text: data.text,
    citations: data.citations || [],
    modelUsed: data.modelUsed,
  };
}

/**
 * Stream chat using SSE POST /api/chat/stream with graceful fallback to /api/chat
 */
export async function streamChat({
  messages,
  model,
  domain,
  languageMode,
  enableRag,
  onChunk,
  onCitations,
  signal,
}) {
  let streamedAny = false;

  const internalController = new AbortController();
  const forwardAbort = () => internalController.abort();
  signal?.addEventListener('abort', forwardAbort);

  // 6s fallback watchdog
  const fallbackTimeout = setTimeout(() => {
    if (!streamedAny) {
      console.warn('[SSE timeout] No chunks received within 6s, falling back to /api/chat.');
      internalController.abort();
    }
  }, 6000);

  try {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, domain, languageMode, enableRag }),
      signal: internalController.signal,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Streaming connection failed (${res.status})`);
    }

    if (!res.body) {
      throw new Error('ReadableStream not supported by response.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const trimmed = block.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const payloadStr = trimmed.slice(6);
          try {
            const payload = JSON.parse(payloadStr);
            if (payload.type === 'chunk' && payload.text) {
              if (!streamedAny) {
                clearTimeout(fallbackTimeout);
                streamedAny = true;
              }
              onChunk(payload.text);
            } else if (payload.type === 'citations' && Array.isArray(payload.citations)) {
              onCitations(payload.citations);
            } else if (payload.type === 'error') {
              throw new Error(payload.error || 'Groq stream reported an error');
            } else if (payload.type === 'done') {
              clearTimeout(fallbackTimeout);
              return;
            }
          } catch (e) {
            if (e.message && e.message.includes('Groq stream reported')) {
              throw e;
            }
            console.warn('Failed to parse SSE payload:', payloadStr);
          }
        }
      }
    }
    clearTimeout(fallbackTimeout);
  } catch (streamErr) {
    clearTimeout(fallbackTimeout);
    signal?.removeEventListener('abort', forwardAbort);

    if (signal?.aborted) {
      throw streamErr;
    }

    if (!streamedAny) {
      console.warn('[Falling back to /api/chat]:', streamErr?.message);
      const fallback = await sendChatRequest({
        messages,
        model,
        domain,
        languageMode,
        enableRag,
        signal,
      });
      onChunk(fallback.text);
      if (fallback.citations?.length) {
        onCitations(fallback.citations);
      }
      return;
    }

    throw streamErr;
  } finally {
    clearTimeout(fallbackTimeout);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
