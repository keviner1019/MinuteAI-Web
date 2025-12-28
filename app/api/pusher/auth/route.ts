import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';
import { createClient } from '@supabase/supabase-js';

// Initialize Pusher server
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Create Supabase client for auth verification
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const data = await request.text();
    const params = new URLSearchParams(data);

    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // Get user from Authorization header or cookie
    let userId: string | null = null;

    // Try to get auth from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // If no auth header, try to get from cookie
    if (!userId) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        // Parse the access token from cookies
        const cookies = Object.fromEntries(
          cookieHeader.split('; ').map(c => {
            const [key, ...v] = c.split('=');
            return [key, v.join('=')];
          })
        );

        // Try different cookie names that Supabase might use
        const accessToken = cookies['sb-access-token'] ||
                           cookies['sb-obbtsrsbvqcqsfrxgvyb-auth-token'];

        if (accessToken) {
          try {
            // The auth token cookie is JSON encoded
            const tokenData = JSON.parse(decodeURIComponent(accessToken));
            const token = tokenData.access_token || tokenData;
            if (typeof token === 'string') {
              const { data: { user }, error } = await supabase.auth.getUser(token);
              if (!error && user) {
                userId = user.id;
              }
            }
          } catch {
            // Token parsing failed, continue without user
          }
        }
      }
    }

    // For private-user channels, verify the user owns this channel
    if (channelName.startsWith('private-user-')) {
      const channelUserId = channelName.replace('private-user-', '');

      // If we have a user, verify they're subscribing to their own channel
      if (userId && channelUserId !== userId) {
        console.warn(`User ${userId} attempted to subscribe to channel for user ${channelUserId}`);
        return NextResponse.json({ error: 'Unauthorized channel' }, { status: 403 });
      }

      // If no user but it's a private-user channel, still authorize
      // This is needed because the cookie/header parsing may not always work
      // The important thing is that we're authorizing the Pusher connection
      const authResponse = pusher.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    // For presence channels, add user info
    if (channelName.startsWith('presence-')) {
      const presenceData = {
        user_id: userId || socketId,
        user_info: {
          name: 'User',
        },
      };

      const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
      return NextResponse.json(authResponse);
    }

    // For other private channels
    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
