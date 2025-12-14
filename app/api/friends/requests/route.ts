import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';

// GET /api/friends/requests - Get pending friend requests
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get incoming requests (where user is the addressee)
    const { data: incomingData, error: incomingError } = await supabaseAdmin
      .from('friendships')
      .select('id, requester_id, created_at')
      .eq('addressee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (incomingError) {
      console.error('Error fetching incoming requests:', incomingError);
      return NextResponse.json({ error: 'Failed to fetch incoming requests' }, { status: 500 });
    }

    // Get outgoing requests (where user is the requester)
    const { data: outgoingData, error: outgoingError } = await supabaseAdmin
      .from('friendships')
      .select('id, addressee_id, created_at')
      .eq('requester_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (outgoingError) {
      console.error('Error fetching outgoing requests:', outgoingError);
      return NextResponse.json({ error: 'Failed to fetch outgoing requests' }, { status: 500 });
    }

    // Get user IDs to fetch profiles
    const incomingUserIds = incomingData?.map(r => r.requester_id) || [];
    const outgoingUserIds = outgoingData?.map(r => r.addressee_id) || [];
    const allUserIds = [...new Set([...incomingUserIds, ...outgoingUserIds])];

    // Fetch profiles
    let profileMap = new Map();
    if (allUserIds.length > 0) {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, display_name, avatar_url, email')
        .in('id', allUserIds);

      if (!profileError && profiles) {
        profileMap = new Map(profiles.map(p => [p.id, p]));
      }
    }

    // Format incoming requests
    const incoming = (incomingData || []).map(r => {
      const profile = profileMap.get(r.requester_id);
      return {
        friendshipId: r.id,
        userId: r.requester_id,
        displayName: profile?.display_name || null,
        avatarUrl: profile?.avatar_url || null,
        email: profile?.email || null,
        createdAt: r.created_at,
      };
    });

    // Format outgoing requests
    const outgoing = (outgoingData || []).map(r => {
      const profile = profileMap.get(r.addressee_id);
      return {
        friendshipId: r.id,
        userId: r.addressee_id,
        displayName: profile?.display_name || null,
        avatarUrl: profile?.avatar_url || null,
        email: profile?.email || null,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({
      incoming,
      outgoing,
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
    });
  } catch (error) {
    console.error('Error in GET /api/friends/requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
