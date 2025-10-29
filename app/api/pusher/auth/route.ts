import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

// Initialize Pusher server
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const data = await request.text();
    const params = new URLSearchParams(data);

    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // For presence channels, you can add user info
    if (channelName.startsWith('presence-')) {
      const presenceData = {
        user_id: socketId, // You can use actual user ID from auth
        user_info: {
          name: 'User',
        },
      };

      const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
      return NextResponse.json(authResponse);
    }

    // For private channels
    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
