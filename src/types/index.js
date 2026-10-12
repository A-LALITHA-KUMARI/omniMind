/**
 * OmniMind AI Client Constants and Helpers
 */

export const DOMAINS = [
  'general',
  'coding',
  'education',
  'stem',
  'agriculture',
  'healthcare',
  'career',
  'english_telugu',
];

export const LANGUAGE_MODES = [
  'auto',
  'bilingual',
  'telugu',
  'english',
];

export const DEFAULT_GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)', description: 'Fast, highly capable reasoning & coding' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)', description: 'Ultra low latency, instantaneous response' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k)', description: 'Large context window' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', description: 'Google open model hosted on Groq' },
];
