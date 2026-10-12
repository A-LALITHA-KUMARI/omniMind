import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Ensure User-Agent is 'aistudio-build' as required by platform instructions
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Supported chat models with automatic resilience fallback
export const PRIMARY_CHAT_MODEL = 'gemini-2.5-flash';
export const FALLBACK_CHAT_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];

export const GEMINI_CHAT_MODEL = PRIMARY_CHAT_MODEL;
export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-2-preview';

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
}
