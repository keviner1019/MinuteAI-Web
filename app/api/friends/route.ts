import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';

// GET /api/friends - Get list of friends
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all accepted friendships with user profiles and presence
    const { data: friendships, error } = await supabaseAdmin
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        created_at
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching friendships:', error);
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
    }

    // Get friend IDs (the other person in each friendship)
    const friendIds = friendships.map(f =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [], count: 0 });
    }

    // Get friend profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, display_name, avatar_url, email')
      .in('id', friendIds);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return NextResponse.json({ error: 'Failed to fetch friend profiles' }, { status: 500 });
    }

    // Get presence for friends
    const { data: presences, error: presenceError } = await supabaseAdmin
      .from('user_presence')
      .select('user_id, status, last_seen_at')
      .in('user_id', friendIds);

    // Create lookup maps
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const presenceMap = new Map(presences?.map(p => [p.user_id, p]) || []);
    const friendshipMap = new Map(friendships.map(f => [
      f.requester_id === user.id ? f.addressee_id : f.requester_id,
      f
    ]));

    // Build friends list
    const friends = friendIds.map(friendId => {
      const profile = profileMap.get(friendId);
      const presence = presenceMap.get(friendId);
      const friendship = friendshipMap.get(friendId);

      return {
        friendId,
        friendshipId: friendship?.id,
        displayName: profile?.display_name || null,
        avatarUrl: profile?.avatar_url || null,
        email: profile?.email || null,
        status: presence?.status || 'offline',
        lastSeenAt: presence?.last_seen_at || null,
        createdAt: friendship?.created_at,
      };
    });

    return NextResponse.json({ friends, count: friends.length });
  } catch (error) {
    console.error('Error in GET /api/friends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/friends - Send friend request
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, userId } = body;

    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or userId is required' }, { status: 400 });
    }

    // Find the target user
    let targetUserId = userId;

    if (email) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      targetUserId = profile.id;
    }

    // Can't friend yourself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 });
    }

    // Check if friendship already exists (in either direction)
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('friendships')
      .select('id, status, requester_id, addressee_id')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json({ error: 'Already friends' }, { status: 400 });
      }
      if (existing.status === 'pending') {
        // If we're the addressee of a pending request, auto-accept it
        if (existing.addressee_id === user.id) {
          const { data: updated, error: updateError } = await supabaseAdmin
            .from('friendships')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) {
            return NextResponse.json({ error: 'Failed to accept request' }, { status: 500 });
          }

          return NextResponse.json({
            message: 'Friend request accepted',
            friendship: updated
          });
        }
        return NextResponse.json({ error: 'Friend request already pending' }, { status: 400 });
      }
      if (existing.status === 'blocked') {
        return NextResponse.json({ error: 'Cannot send friend request' }, { status: 400 });
      }
      if (existing.status === 'declined') {
        // Re-send the request by updating status
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('friendships')
          .update({
            status: 'pending',
            requester_id: user.id,
            addressee_id: targetUserId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
        }

        return NextResponse.json({
          message: 'Friend request sent',
          friendship: updated
        });
      }
    }

    // Create new friend request
    const { data: friendship, error: createError } = await supabaseAdmin
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: targetUserId,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating friendship:', createError);
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Friend request sent',
      friendship
    });
  } catch (error) {
    console.error('Error in POST /api/friends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
