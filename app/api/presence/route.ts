import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';

// POST /api/presence - Update user's online status (heartbeat)
export async function POST(request: NextRequest) {
  try {
    // Try to get user from auth header first
    let user = await getAuthUser(request);

    // Parse body - handle both JSON and text/plain (from sendBeacon)
    let body: { status?: string; currentMeetingId?: string | null } = {};
    const contentType = request.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        body = await request.json();
      } else {
        // sendBeacon sends as text/plain
        const text = await request.text();
        if (text) {
          body = JSON.parse(text);
        }
      }
    } catch (e) {
      // If body parsing fails, default to empty
      body = {};
    }

    // For sendBeacon without auth, we need to extract user from a different source
    // Since sendBeacon can't include auth headers easily, we'll rely on the cookie session
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status = 'online', currentMeetingId = null } = body;

    // Validate status
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: online, away, busy, offline' },
        { status: 400 }
      );
    }

    // Upsert presence record
    const { data: presence, error: upsertError } = await supabaseAdmin
      .from('user_presence')
      .upsert(
        {
          user_id: user.id,
          status,
          last_seen_at: new Date().toISOString(),
          current_meeting_id: currentMeetingId,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('Error updating presence:', upsertError);
      return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Presence updated',
      presence: {
        userId: presence.user_id,
        status: presence.status,
        lastSeenAt: presence.last_seen_at,
        currentMeetingId: presence.current_meeting_id,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/presence - Get current user's presence
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: presence, error } = await supabaseAdmin
      .from('user_presence')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching presence:', error);
      return NextResponse.json({ error: 'Failed to fetch presence' }, { status: 500 });
    }

    if (!presence) {
      // Create a default presence record
      const { data: newPresence, error: createError } = await supabaseAdmin
        .from('user_presence')
        .insert({
          user_id: user.id,
          status: 'online',
          last_seen_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: 'Failed to create presence' }, { status: 500 });
      }

      return NextResponse.json({
        presence: {
          userId: newPresence.user_id,
          status: newPresence.status,
          lastSeenAt: newPresence.last_seen_at,
          currentMeetingId: newPresence.current_meeting_id,
        },
      });
    }

    return NextResponse.json({
      presence: {
        userId: presence.user_id,
        status: presence.status,
        lastSeenAt: presence.last_seen_at,
        currentMeetingId: presence.current_meeting_id,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
