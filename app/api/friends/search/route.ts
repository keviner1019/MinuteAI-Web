import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';

// GET /api/friends/search?q=query - Search for users to add as friends
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    // Search for users by name or email (case insensitive)
    const { data: profiles, error: searchError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, display_name, avatar_url, email')
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('searchable', true)
      .neq('id', user.id)
      .limit(20);

    if (searchError) {
      console.error('Error searching users:', searchError);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Get existing friendships for these users
    const userIds = profiles.map(p => p.id);
    const { data: friendships, error: friendshipError } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.in.(${userIds.join(',')})),and(requester_id.in.(${userIds.join(',')}),addressee_id.eq.${user.id})`);

    // Create a map for quick lookup
    const friendshipMap = new Map<string, { isFriend: boolean; hasPendingRequest: boolean }>();

    if (friendships) {
      for (const f of friendships) {
        const otherUserId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        friendshipMap.set(otherUserId, {
          isFriend: f.status === 'accepted',
          hasPendingRequest: f.status === 'pending',
        });
      }
    }

    // Format results
    const users = profiles.map(p => ({
      userId: p.id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      email: p.email,
      isFriend: friendshipMap.get(p.id)?.isFriend || false,
      hasPendingRequest: friendshipMap.get(p.id)?.hasPendingRequest || false,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in GET /api/friends/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
