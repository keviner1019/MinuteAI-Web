import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type AppSupabaseClient = SupabaseClient<Database, 'public'>;

// Singleton instance to avoid multiple client creation
let supabaseInstance: AppSupabaseClient | null = null;

export function createClient(): AppSupabaseClient {
  // Return existing instance if available (browser only)
  if (typeof window !== 'undefined' && supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client: AppSupabaseClient = createSupabaseClient<Database, 'public'>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  );

  // Store instance for reuse (browser only)
  if (typeof window !== 'undefined') {
    supabaseInstance = client;
  }

  return client;
}
