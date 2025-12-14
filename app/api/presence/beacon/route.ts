import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/auth';

// POST /api/presence/beacon - Handle sendBeacon for offline status
// This endpoint is specifically for handling page close/unload events
// It uses cookies for auth since sendBeacon can't send custom headers
export async function POST(request: NextRequest) {
  try {
    // Parse the text body from sendBeacon
    let body: { status?: string } = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      body = { status: 'offline' };
    }

    const status = body.status || 'offline';

    // Try to get user from Supabase cookie session
    // Look for the sb-*-auth-token cookie
    const cookies = request.cookies;
    let accessToken: string | null = null;

    // Supabase stores the session in cookies with format: sb-<project-ref>-auth-token
    for (const [name, cookie] of cookies) {
      if (name.includes('auth-token')) {
        try {
          // The cookie value is base64 encoded JSON
          const decoded = Buffer.from(cookie.value, 'base64').toString('utf-8');
          const sessionData = JSON.parse(decoded);
          if (sessionData.access_token) {
            accessToken = sessionData.access_token;
            break;
          }
        } catch (e) {
          // Try parsing as plain JSON
          try {
            const sessionData = JSON.parse(cookie.value);
            if (sessionData.access_token) {
              accessToken = sessionData.access_token;
              break;
            }
          } catch (e2) {
            // Not the right cookie format
          }
        }
      }
    }

    if (!accessToken) {
      // Can't identify user - just return success (beacon doesn't care about response)
      return new NextResponse(null, { status: 204 });
    }

    // Verify the token and get user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return new NextResponse(null, { status: 204 });
    }

    // Update presence to offline
    await supabaseAdmin.from('user_presence').upsert(
      {
        user_id: user.id,
        status,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    // Return 204 No Content (standard response for beacons)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in POST /api/presence/beacon:', error);
    // Still return success - beacon requests don't need error responses
    return new NextResponse(null, { status: 204 });
  }
}
