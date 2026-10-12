import express from 'express';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';
import { isGroqConfigured, DEFAULT_GROQ_MODEL, SUPPORTED_GROQ_MODELS, getLiveGroqModels } from './server/groq.ts';
import { handleChatCompletion, handleChatStream } from './server/chat.ts';
import { indexDocument, vectorStore, retrieveRelevantChunks } from './server/rag.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Multer storage for document uploads (memory buffer for fast processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.docx', '.txt'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Please upload PDF, DOCX, or TXT documents.`));
    }
  },
});

// -------------------------------------------------------------
// Health Check Endpoint
// -------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  const stats = vectorStore.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    provider: 'groq',
    groqConfigured: isGroqConfigured(),
    chatModel: DEFAULT_GROQ_MODEL,
    supportedModels: SUPPORTED_GROQ_MODELS,
    knowledgeBase: {
      documentCount: stats.documentCount,
      chunkCount: stats.chunkCount,
    },
  });
});

// -------------------------------------------------------------
// Available Models Endpoint
// -------------------------------------------------------------
app.get('/api/models', async (_req, res) => {
  const models = await getLiveGroqModels();
  res.json({
    models,
    defaultModel: DEFAULT_GROQ_MODEL,
    groqConfigured: isGroqConfigured(),
  });
});

// -------------------------------------------------------------
// Chat Completion Endpoint (Non-streaming)
// -------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model, domain, languageMode, enableRag } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Valid messages array is required.' });
    }

    const result = await handleChatCompletion({
      messages,
      model,
      domain,
      languageMode,
      enableRag: enableRag !== false,
    });

    res.json({
      success: true,
      text: result.text,
      modelUsed: result.modelUsed,
      citations: result.citations,
    });
  } catch (error: any) {
    console.error('[OmniMind Chat Error]:', error);
    const message = error?.message || 'Failed to generate chat response.';
    const status = message.includes('GROQ_API_KEY') ? 401 : (error?.status || 500);
    res.status(status).json({ error: message });
  }
});

// -------------------------------------------------------------
// Chat Streaming Endpoint (Server-Sent Events)
// -------------------------------------------------------------
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages, model, domain, languageMode, enableRag } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Valid messages array is required.' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    let isClosed = false;
    req.on('close', () => {
      isClosed = true;
      clearInterval(heartbeat);
    });

    try {
      await handleChatStream(
        {
          messages,
          model,
          domain,
          languageMode,
          enableRag: enableRag !== false,
        },
        (chunk) => {
          if (!isClosed) {
            res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          }
        },
        (citations) => {
          if (!isClosed) {
            res.write(`data: ${JSON.stringify({ type: 'citations', citations })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          }
        }
      );

      if (!isClosed) {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
        clearInterval(heartbeat);
        res.end();
      }
    } catch (err: any) {
      clearInterval(heartbeat);
      if (!isClosed) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: err?.message || 'Streaming failed.' })}\n\n`);
        res.end();
      }
    }
  } catch (error: any) {
    console.error('[OmniMind Stream Error]:', error);
    res.status(500).json({ error: error?.message || 'Internal server streaming error' });
  }
});

// -------------------------------------------------------------
// Document Upload & RAG Indexing Endpoint
// -------------------------------------------------------------
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select a valid document.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    let fileType: 'pdf' | 'docx' | 'txt';

    if (ext === '.pdf') {
      fileType = 'pdf';
    } else if (ext === '.docx') {
      fileType = 'docx';
    } else if (ext === '.txt') {
      fileType = 'txt';
    } else {
      return res.status(400).json({ error: 'Unsupported file extension. Only .pdf, .docx, and .txt are allowed.' });
    }

    const docRecord = await indexDocument(buffer, originalname, mimetype, fileType);

    res.json({
      success: true,
      document: docRecord,
      message: `Successfully indexed ${docRecord.filename} into ${docRecord.chunkCount} vector chunks.`,
    });
  } catch (error: any) {
    console.error('[OmniMind Document Indexing Error]:', error);
    res.status(500).json({ error: error?.message || 'Failed to process and index document.' });
  }
});

// -------------------------------------------------------------
// Document Retrieval & Management Endpoints
// -------------------------------------------------------------
app.get('/api/documents', (_req, res) => {
  const documents = vectorStore.getDocuments();
  const stats = vectorStore.getStats();
  res.json({ documents, stats });
});

app.delete('/api/documents/:id', (req, res) => {
  const { id } = req.params;
  const removed = vectorStore.deleteDocument(id);
  if (!removed) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  res.json({ success: true, message: 'Document removed from knowledge base.' });
});

app.get('/api/documents/:id/chunks', (req, res) => {
  const { id } = req.params;
  const doc = vectorStore.getDocument(id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  const chunks = vectorStore.getDocumentChunks(id).map((c) => ({
    id: c.id,
    chunkIndex: c.chunkIndex,
    pageNumber: c.pageNumber,
    snippet: c.text.slice(0, 300) + (c.text.length > 300 ? '...' : ''),
    hasEmbedding: Boolean(c.embedding && c.embedding.length > 0),
  }));
  res.json({ document: doc, chunks });
});

app.post('/api/documents/search', async (req, res) => {
  try {
    const { query, topK, minSimilarity } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'A search query string is required.' });
    }
    const results = await retrieveRelevantChunks(query, Number(topK) || 5, Number(minSimilarity) || 0.25);
    res.json({ query, results });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Search failed.' });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OmniMind AI Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[OmniMind AI Server] Groq Configured: ${isGroqConfigured()}`);
    console.log(`[OmniMind AI Server] Groq Model: ${DEFAULT_GROQ_MODEL}`);
  });
}

startServer().catch((err) => {
  console.error('[OmniMind Server Fatal Error]:', err);
  process.exit(1);
});
