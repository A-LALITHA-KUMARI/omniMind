import { 
  getGroqClient, 
  isGroqConfigured, 
  DEFAULT_GROQ_MODEL, 
  SUPPORTED_GROQ_MODELS,
  FALLBACK_CHAT_MODELS 
} from './groq.ts';
import { retrieveRelevantChunks, buildGroundingPrompt, RetrievedChunk } from './rag.ts';

export type DomainId = 
  | 'general' 
  | 'coding' 
  | 'education' 
  | 'stem' 
  | 'agriculture' 
  | 'healthcare' 
  | 'career' 
  | 'english_telugu';

export type LanguageMode = 'auto' | 'bilingual' | 'telugu' | 'english';

export interface ChatRequestOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  domain?: DomainId;
  languageMode?: LanguageMode;
  enableRag?: boolean;
}

/**
 * Builds domain and language-specific system instructions
 */
function buildSystemInstruction(domain: DomainId = 'general', languageMode: LanguageMode = 'auto'): string {
  let instruction = `You are OmniMind AI, an intelligent, versatile, and articulate AI workspace assistant.
Your subtitle is "Your intelligent AI workspace."
Your mission is to provide accurate, comprehensive, step-by-step, and empowering explanations.
Maintain an encouraging, professional, and clear tone. Structure your answers with markdown headings, bullet points, and code blocks where helpful.
`;

  switch (domain) {
    case 'coding':
      instruction += `
SPECIALIZATION - PROGRAMMING & SOFTWARE ENGINEERING:
- Provide clean, robust, modern, production-grade code snippets.
- Include language tags on all code blocks (e.g., \`\`\`python, \`\`\`javascript).
- Explain time and space complexity (Big-O) when discussing algorithms.
- Highlight edge cases, performance considerations, and testing suggestions.
`;
      break;

    case 'education':
      instruction += `
SPECIALIZATION - ACADEMICS & PEDAGOGY:
- Break complex conceptual topics down into intuitive steps using first-principles reasoning.
- Provide relevant real-world analogies, historical contexts, and practical study frameworks.
- Provide self-check questions or practice exercises at the end of deep explanations.
`;
      break;

    case 'stem':
      instruction += `
SPECIALIZATION - STEM (SCIENCE, TECH, ENGINEERING & MATH):
- Show mathematical derivations step-by-step with clear definitions for all variables.
- Explain scientific phenomena using empirical principles.
`;
      break;

    case 'agriculture':
      instruction += `
SPECIALIZATION - AGRICULTURE & FARMING:
- Provide practical, sustainable, and scientifically backed guidance for crop management and soil nutrition.
- Clarify that local weather, soil testing, and regional agricultural extension services should always guide on-field applications.
`;
      break;

    case 'healthcare':
      instruction += `
SPECIALIZATION - GENERAL HEALTHCARE & WELLNESS EDUCATION:
- Provide objective, evidence-based physiological and anatomical explanations.
- ALWAYS include a clear disclaimer: "This information is educational only and not medical advice. Consult a qualified physician for symptoms or conditions."
`;
      break;

    case 'career':
      instruction += `
SPECIALIZATION - CAREER GUIDANCE & INTERVIEWS:
- Coach on interview communication using frameworks like STAR (Situation, Task, Action, Result).
- Review resumes and portfolio structures with actionable feedback.
`;
      break;

    case 'english_telugu':
    default:
      break;
  }

  if (languageMode === 'telugu') {
    instruction += `
LANGUAGE DIRECTIVE - TELUGU (తెలుగు):
- Always respond in authentic Telugu script (తెలుగు లిపి).
- Ensure grammatically correct, polite, and natural Telugu vocabulary.
- You may include English technical terms in brackets for clarity (e.g., కంప్యూటర్ (Computer)).
`;
  } else if (languageMode === 'bilingual') {
    instruction += `
LANGUAGE DIRECTIVE - BILINGUAL (ENGLISH + TELUGU):
- Provide responses in both English and Telugu (తెలుగు) side-by-side or sectioned.
`;
  } else {
    instruction += `
MULTILINGUAL DIRECTIVE:
- Automatically adapt to the language the user speaks: if they write in Telugu (తెలుగు), respond in Telugu; if English, respond in English; if mixed, respond with bilingual clarity.
`;
  }

  return instruction;
}

/**
 * Normalizes error messages from Groq SDK
 */
function formatGroqError(err: any): Error {
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || '';

  if (status === 401 || message.includes('API key') || message.includes('Unauthorized')) {
    return new Error('Invalid or missing GROQ_API_KEY. Please verify your Groq API key in Settings > Secrets or in the server .env configuration.');
  }
  if (status === 429 || message.includes('rate limit') || message.includes('Rate limit') || message.includes('quota')) {
    return new Error('Groq API rate limit or quota exceeded. Please wait a few seconds before retrying.');
  }
  if (status === 404 || message.includes('model') || message.includes('not found')) {
    return new Error(`The requested Groq model is currently unavailable or deprecated. Falling back to default.`);
  }

  return new Error(message || 'An error occurred while communicating with the Groq API.');
}

/**
 * Handle non-streaming chat request with Groq
 */
export async function handleChatCompletion(options: ChatRequestOptions): Promise<{
  text: string;
  citations: RetrievedChunk[];
  modelUsed: string;
}> {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_API_KEY is not configured on the server. Please add your Groq API key in Settings > Secrets or configure GROQ_API_KEY in the server environment.');
  }

  const { messages, model: requestedModel, domain, languageMode, enableRag = true } = options;
  if (!messages || messages.length === 0) {
    throw new Error('No messages provided.');
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const userQuery = lastUserMessage?.content || '';

  // 1. RAG retrieval if enabled
  let citations: RetrievedChunk[] = [];
  let ragContextPrompt = '';

  if (enableRag && userQuery.trim().length > 0) {
    try {
      citations = await retrieveRelevantChunks(userQuery, 4, 0.28);
      if (citations.length > 0) {
        ragContextPrompt = buildGroundingPrompt(citations);
      }
    } catch (e) {
      console.warn('[RAG Retrieval Warning]:', e);
    }
  }

  const systemInstruction = buildSystemInstruction(domain, languageMode);

  // 2. Prepare OpenAI-compatible message list for Groq
  const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemInstruction },
  ];

  // Limit conversation history to the last 12 turns for speed and token limits
  const recentMessages = messages.slice(-12);

  for (let i = 0; i < recentMessages.length; i++) {
    const m = recentMessages[i];
    const isLast = i === recentMessages.length - 1;
    let content = m.content;

    if (isLast && m.role === 'user' && ragContextPrompt) {
      content = `${ragContextPrompt}\n\nUSER QUESTION:\n${m.content}`;
    }

    groqMessages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content,
    });
  }

  const groq = getGroqClient();
  const primaryModel = requestedModel || DEFAULT_GROQ_MODEL;
  const candidateModels = [
    primaryModel,
    ...FALLBACK_CHAT_MODELS.filter((m) => m !== primaryModel),
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 4096,
      });

      const replyText = completion.choices[0]?.message?.content || '';
      if (replyText.trim()) {
        return {
          text: replyText,
          citations,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      console.warn(`[Groq Model Attempt Failed] Model ${model}:`, err?.message || err);
      lastError = err;
      // If 401 (auth), don't try other models, fail fast
      if (err?.status === 401 || err?.statusCode === 401) {
        throw formatGroqError(err);
      }
    }
  }

  throw formatGroqError(lastError || new Error('All candidate Groq models failed to generate content.'));
}

/**
 * Handle streaming chat request using SSE with Groq
 */
export async function handleChatStream(
  options: ChatRequestOptions,
  onChunk: (textChunk: string) => void,
  onCitations: (citations: RetrievedChunk[]) => void
): Promise<void> {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_API_KEY is not configured on the server. Please add your Groq API key in Settings > Secrets or configure GROQ_API_KEY in the server environment.');
  }

  const { messages, model: requestedModel, domain, languageMode, enableRag = true } = options;
  if (!messages || messages.length === 0) {
    throw new Error('No messages provided.');
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const userQuery = lastUserMessage?.content || '';

  // 1. RAG retrieval if enabled
  let citations: RetrievedChunk[] = [];
  let ragContextPrompt = '';

  if (enableRag && userQuery.trim().length > 0) {
    try {
      citations = await retrieveRelevantChunks(userQuery, 4, 0.28);
      if (citations.length > 0) {
        ragContextPrompt = buildGroundingPrompt(citations);
        onCitations(citations);
      }
    } catch (e) {
      console.warn('[RAG Retrieval Warning]:', e);
    }
  }

  const systemInstruction = buildSystemInstruction(domain, languageMode);

  // 2. Prepare messages
  const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemInstruction },
  ];

  const recentMessages = messages.slice(-12);

  for (let i = 0; i < recentMessages.length; i++) {
    const m = recentMessages[i];
    const isLast = i === recentMessages.length - 1;
    let content = m.content;

    if (isLast && m.role === 'user' && ragContextPrompt) {
      content = `${ragContextPrompt}\n\nUSER QUESTION:\n${m.content}`;
    }

    groqMessages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content,
    });
  }

  const groq = getGroqClient();
  const primaryModel = requestedModel || DEFAULT_GROQ_MODEL;
  const candidateModels = [
    primaryModel,
    ...FALLBACK_CHAT_MODELS.filter((m) => m !== primaryModel),
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const stream = await groq.chat.completions.create({
        model,
        messages: groqMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      });

      let emitted = false;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          emitted = true;
          onChunk(delta);
        }
      }

      if (emitted) {
        return; // Successfully completed stream
      }
    } catch (err: any) {
      console.warn(`[Groq Stream Attempt Failed] Model ${model}:`, err?.message || err);
      lastError = err;
      if (err?.status === 401 || err?.statusCode === 401) {
        throw formatGroqError(err);
      }
    }
  }

  throw formatGroqError(lastError || new Error('All candidate Groq models failed to stream.'));
}
