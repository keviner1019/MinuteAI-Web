/**
 * Mobile-specific Supabase Configuration
 * This file should be used in your mobile app project
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Your app's deep link scheme
// Change this to match your app's scheme (e.g., 'minuteai', 'yourapp', etc.)
const APP_SCHEME = 'minuteai'; // ⚠️ CHANGE THIS to your actual app scheme

// Platform detection
const isWeb = typeof window !== 'undefined' && !('ReactNativeWebView' in window);
const isMobile = !isWeb;

/**
 * Get the appropriate redirect URL based on platform
 */
export function getRedirectUrl(path: string = 'dashboard'): string {
  if (isMobile) {
    // For mobile apps, use deep link
    return `${APP_SCHEME}://oauth-callback`;
  } else {
    // For web, use the current origin
    return `${window.location.origin}/${path}`;
  }
}

/**
 * Create Supabase client with platform-aware configuration
 */
export function createMobileClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Mobile apps need custom storage implementation
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // flowType: 'pkce' is more secure for mobile apps
      flowType: 'pkce',
    },
  });
}

/**
 * Sign in with Google OAuth with platform-aware redirect
 */
export async function signInWithGoogleMobile(supabaseClient: ReturnType<typeof createMobileClient>) {
  const redirectUrl = getRedirectUrl('dashboard');
  
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
      // Skip browser redirect on mobile - let the app handle it
      skipBrowserRedirect: isMobile,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
