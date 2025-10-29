import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error('GOOGLE_GEMINI_API_KEY is not set in environment variables');
}

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Get the gemini-pro model for text generation
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });

export default genAI;

