import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';

// PATCH /api/friends/[id] - Accept or decline friend request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: friendshipId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "accept" or "decline"' }, { status: 400 });
    }

    // Get the friendship
    const { data: friendship, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .single();

    if (fetchError || !friendship) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Only the addressee can accept/decline a pending request
    if (friendship.addressee_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to modify this request' }, { status: 403 });
    }

    if (friendship.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('friendships')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', friendshipId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating friendship:', updateError);
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Friend request ${action}ed`,
      friendship: updated
    });
  } catch (error) {
    console.error('Error in PATCH /api/friends/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/friends/[id] - Remove friend or cancel request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: friendIdOrFriendshipId } = await params;

    // First try to find by friendship ID
    let { data: friendship, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .eq('id', friendIdOrFriendshipId)
      .single();

    // If not found by ID, try to find by friend's user ID
    if (fetchError || !friendship) {
      const { data: byUserId, error: byUserIdError } = await supabaseAdmin
        .from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendIdOrFriendshipId}),and(requester_id.eq.${friendIdOrFriendshipId},addressee_id.eq.${user.id})`)
        .single();

      if (byUserIdError || !byUserId) {
        return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
      }
      friendship = byUserId;
    }

    // Only participants can remove the friendship
    if (friendship.requester_id !== user.id && friendship.addressee_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to remove this friendship' }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('friendships')
      .delete()
      .eq('id', friendship.id);

    if (deleteError) {
      console.error('Error deleting friendship:', deleteError);
      return NextResponse.json({ error: 'Failed to remove friend' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/friends/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
