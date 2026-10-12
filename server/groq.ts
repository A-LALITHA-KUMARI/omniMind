import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Returns a configured instance of the official Groq client
 */
export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY || '';
  return new Groq({
    apiKey,
  });
}

/**
 * Checks whether GROQ_API_KEY is configured in server environment
 */
export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY;
  return Boolean(key && key.trim().length > 5 && !key.includes('your_groq_api_key'));
}

/**
 * Default verified Groq model (can be overridden by GROQ_MODEL env var)
 */
export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

/**
 * Fallback chat models hierarchy verified on Groq
 */
export const FALLBACK_CHAT_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'allam-2-7b',
];

/**
 * Static metadata for verified Groq models
 */
export const SUPPORTED_GROQ_MODELS = [
  { 
    id: 'openai/gpt-oss-120b', 
    name: 'GPT OSS 120B', 
    description: 'Premier large open model for deep reasoning, STEM, and full-stack development' 
  },
  { 
    id: 'qwen/qwen3.8-27b', 
    name: 'Qwen 3.8 27B', 
    description: 'Ultra-fast low-latency responses (~140ms) with strong multilingual fluency' 
  },
  { 
    id: 'openai/gpt-oss-20b', 
    name: 'GPT OSS 20B', 
    description: 'High-speed versatile conversational model' 
  },
  { 
    id: 'allam-2-7b', 
    name: 'Allam 2 7B', 
    description: 'Fast lightweight dialogue model' 
  },
];

/**
 * Dynamically queries available models from Groq Models API
 */
export async function getLiveGroqModels() {
  if (!isGroqConfigured()) {
    return SUPPORTED_GROQ_MODELS;
  }
  try {
    const groq = getGroqClient();
    const list = await groq.models.list();
    const activeModelIds = new Set(list.data.map((m: any) => m.id));

    // Filter chat-capable models (excluding whisper/guard only models)
    const chatCapable = list.data
      .filter((m: any) => !m.id.includes('whisper') && !m.id.includes('prompt-guard'))
      .map((m: any) => {
        const found = SUPPORTED_GROQ_MODELS.find((s) => s.id === m.id);
        return {
          id: m.id,
          name: found?.name || m.id,
          description: found?.description || 'Groq high-speed language model',
        };
      });

    return chatCapable.length > 0 ? chatCapable : SUPPORTED_GROQ_MODELS;
  } catch (err) {
    console.warn('[Groq Models List Error]:', err);
    return SUPPORTED_GROQ_MODELS;
  }
}
