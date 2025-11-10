/**
 * API Client for MinuteAI Mobile App
 *
 * This file provides HTTP client functions to call the deployed Next.js backend
 * Backend URL: https://minute-ai-web.vercel.app
 *
 * SETUP REQUIRED:
 * 1. Create .env file in your mobile project root
 * 2. Add: EXPO_PUBLIC_API_URL=https://minute-ai-web.vercel.app
 * 3. Restart Expo dev server: npx expo start -c
 */

// Get API base URL from environment variable
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://minute-ai-web.vercel.app';

console.log('[API Client] Initialized with base URL:', API_BASE_URL);

/**
 * Transcription API
 * Handles audio transcription and AI analysis
 */
export const transcriptionApi = {
  /**
   * Trigger server-side transcription for uploaded audio
   *
   * Server workflow (automatic):
   * 1. Use AssemblyAI to transcribe audio (Universal-1 model, 99+ languages)
   * 2. Update note with transcript and set status to 'processing'
   * 3. Trigger AI analysis automatically (Google Gemini)
   * 4. Update note with summary, action items, key topics
   * 5. Set note status to 'completed'
   *
   * Mobile app should:
   * - Call this once after upload
   * - Poll or listen to note.status changes
   * - Show "processing" → "completed" states in UI
   *
   * @param noteId - ID of the note record in database
   * @param audioUrl - Public URL of audio file in Supabase Storage
   * @returns Promise with transcript text
   */
  async transcribe(noteId: string, audioUrl: string): Promise<{ transcript: string }> {
    try {
      console.log(`[API] POST /api/transcribe - Note: ${noteId}`);

      const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId, audioUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));

        console.error(`[API] Transcription failed:`, errorData);
        throw new Error(errorData.error || 'Transcription request failed');
      }

      const data = await response.json();
      console.log(`[API] Transcription successful:`, data);
      return data;
    } catch (error: any) {
      // Enhanced error handling for common issues
      if (error.message?.includes('Network request failed')) {
        throw new Error(
          'Cannot reach backend server. Please check:\n' +
            '1. Internet connection is active\n' +
            '2. EXPO_PUBLIC_API_URL is set correctly in .env\n' +
            '3. Backend is deployed and running'
        );
      }

      throw error;
    }
  },

  /**
   * Get AI analysis for a transcription
   * Generates summary, action items, and key topics using Google Gemini
   *
   * @param noteId - ID of the note
   * @param transcript - Transcription text
   * @returns Promise with AI analysis
   */
  async analyze(
    noteId: string,
    transcript: string
  ): Promise<{
    summary: string;
    action_items: Array<{ id: string; text: string; completed: boolean }>;
    key_topics: string[];
  }> {
    try {
      console.log(`[API] POST /api/analyze - Note: ${noteId}`);

      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId, transcript }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}`,
        }));

        console.error(`[API] Analysis failed:`, errorData);
        throw new Error(errorData.error || 'AI analysis failed');
      }

      const data = await response.json();
      console.log(`[API] Analysis successful`);
      return data;
    } catch (error: any) {
      if (error.message?.includes('Network request failed')) {
        throw new Error('Cannot reach backend server for AI analysis');
      }
      throw error;
    }
  },
};

/**
 * Test API connectivity
 * Call this during app initialization to verify backend is reachable
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    console.log('[API] Testing connection to:', API_BASE_URL);

    const response = await fetch(`${API_BASE_URL}`, {
      method: 'HEAD',
      // Timeout after 5 seconds
      signal: AbortSignal.timeout(5000),
    });

    const isReachable = response.ok || response.status === 405; // 405 = method not allowed (still means server is there)
    console.log(`[API] Connection test:`, isReachable ? '✅ Success' : '❌ Failed');
    return isReachable;
  } catch (error) {
    console.error('[API] Connection test failed:', error);
    return false;
  }
}

export default transcriptionApi;
