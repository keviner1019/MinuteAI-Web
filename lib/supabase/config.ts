import { createClient } from './client';

// Re-export the singleton Supabase client to avoid multiple instances
export const supabase = createClient();

// Storage bucket name
export const AUDIO_BUCKET = 'audio-files';

