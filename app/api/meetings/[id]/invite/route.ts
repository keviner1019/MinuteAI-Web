import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';
import pusher from '@/lib/pusher/server';

// Generate a random token for invitations
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// POST /api/meetings/[id]/invite - Invite friends to an existing meeting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: meetingId } = await params;
    const body = await request.json();
    const { friendIds = [] } = body;

    if (!friendIds || friendIds.length === 0) {
      return NextResponse.json({ error: 'No friends specified' }, { status: 400 });
    }

    // Verify the meeting exists and user has permission to invite
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('meetings')
      .select('id, room_id, title, host_id, status, scheduled_at')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user is the host or has invite permissions
    const isHost = meeting.host_id === user.id;

    if (!isHost) {
      // Check if user is a participant with invite permission
      const { data: participant } = await supabaseAdmin
        .from('meeting_participants')
        .select('permissions')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .single();

      const permissions = participant?.permissions as { can_invite?: boolean } | null;
      if (!permissions?.can_invite) {
        return NextResponse.json(
          { error: 'You do not have permission to invite others' },
          { status: 403 }
        );
      }
    }

    // Get user profile for notifications
    const { data: inviterProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single();

    const profile = inviterProfile as { display_name: string | null; avatar_url: string | null } | null;
    const inviterName = profile?.display_name || user.email?.split('@')[0] || 'Someone';

    // Get friend emails from auth.users
    const { data: friendUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Failed to list users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    // Filter to only invited friends and get their emails
    const friendsMap = new Map<string, string>();
    friendUsers?.users?.forEach((u: { id: string; email?: string }) => {
      if (friendIds.includes(u.id) && u.email) {
        friendsMap.set(u.id, u.email);
      }
    });

    if (friendsMap.size === 0) {
      return NextResponse.json({ error: 'No valid friends found' }, { status: 400 });
    }

    // Check for existing pending invitations to avoid duplicates
    const existingEmails = Array.from(friendsMap.values()).map(e => e.toLowerCase());
    const { data: existingInvites } = await supabaseAdmin
      .from('meeting_invitations')
      .select('invitee_email')
      .eq('meeting_id', meetingId)
      .eq('status', 'pending')
      .in('invitee_email', existingEmails);

    const alreadyInvited = new Set(existingInvites?.map(i => i.invitee_email) || []);

    // Create new invitations (skip already invited)
    const newInvitations = Array.from(friendsMap.entries())
      .filter(([_, email]) => !alreadyInvited.has(email.toLowerCase()))
      .map(([friendId, email]) => ({
        meeting_id: meetingId,
        inviter_id: user.id,
        invitee_email: email.toLowerCase(),
        token: generateToken(),
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

    if (newInvitations.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('meeting_invitations')
        .insert(newInvitations);

      if (insertError) {
        console.error('Failed to create invitations:', insertError);
        return NextResponse.json({ error: 'Failed to create invitations' }, { status: 500 });
      }
    }

    // Send real-time notifications to each friend
    const invitedFriendIds = Array.from(friendsMap.keys())
      .filter(id => {
        const email = friendsMap.get(id);
        return email && !alreadyInvited.has(email.toLowerCase());
      });

    const isInstant = meeting.status === 'active';

    for (const friendId of invitedFriendIds) {
      try {
        await pusher.trigger(`private-user-${friendId}`, 'meeting-invite', {
          type: 'meeting-invite',
          meetingId: meeting.id,
          roomId: meeting.room_id,
          meetingTitle: meeting.title,
          scheduledAt: meeting.scheduled_at,
          isInstant,
          invitedBy: {
            id: user.id,
            displayName: inviterName,
            avatarUrl: profile?.avatar_url || null,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (pusherError) {
        console.error(`Failed to send notification to ${friendId}:`, pusherError);
      }
    }

    const skippedCount = friendIds.length - invitedFriendIds.length;

    return NextResponse.json({
      success: true,
      invited: invitedFriendIds.length,
      skipped: skippedCount,
      message: skippedCount > 0
        ? `Invited ${invitedFriendIds.length} friend(s). ${skippedCount} already invited.`
        : `Successfully invited ${invitedFriendIds.length} friend(s).`,
    });
  } catch (error: any) {
    console.error('Invite to meeting error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
