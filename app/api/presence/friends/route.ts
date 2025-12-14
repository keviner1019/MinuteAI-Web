import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';

// GET /api/presence/friends - Get presence status for all friends
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all accepted friendships
    const { data: friendships, error: friendshipError } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (friendshipError) {
      console.error('Error fetching friendships:', friendshipError);
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
    }

    // Get friend IDs
    const friendIds = (friendships || []).map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Get friend profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, display_name, avatar_url, email')
      .in('id', friendIds);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
    }

    // Get presence for all friends
    const { data: presences, error: presenceError } = await supabaseAdmin
      .from('user_presence')
      .select('user_id, status, last_seen_at, current_meeting_id')
      .in('user_id', friendIds);

    if (presenceError) {
      console.error('Error fetching presence:', presenceError);
    }

    // Create lookup maps
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const presenceMap = new Map((presences || []).map(p => [p.user_id, p]));

    // Build friends with presence info
    const friends = friendIds.map(friendId => {
      const profile = profileMap.get(friendId);
      const presence = presenceMap.get(friendId);

      return {
        friendId,
        displayName: profile?.display_name || null,
        avatarUrl: profile?.avatar_url || null,
        email: profile?.email || null,
        status: presence?.status || 'offline',
        lastSeenAt: presence?.last_seen_at || null,
        currentMeetingId: presence?.current_meeting_id || null,
      };
    });

    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Error in GET /api/presence/friends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
