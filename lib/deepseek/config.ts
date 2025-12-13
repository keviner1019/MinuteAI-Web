import OpenAI from 'openai';

if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error('DEEPSEEK_API_KEY is not set in environment variables');
}

// DeepSeek uses OpenAI-compatible API
export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// Default model for text generation
export const DEEPSEEK_MODEL = 'deepseek-chat';

export default deepseek;
