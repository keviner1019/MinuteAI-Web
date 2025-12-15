import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';
import pusher from '@/lib/pusher/server';

// POST /api/meetings/notify-start - Notify all invited users that a meeting has started
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, roomId } = body;

    if (!meetingId && !roomId) {
      return NextResponse.json(
        { error: 'Either meetingId or roomId is required' },
        { status: 400 }
      );
    }

    // Get meeting
    let meeting;
    if (meetingId) {
      const { data } = await supabaseAdmin
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();
      meeting = data;
    } else {
      const { data } = await supabaseAdmin
        .from('meetings')
        .select('*')
        .eq('room_id', roomId)
        .single();
      meeting = data;
    }

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Verify user is the host
    if (meeting.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the host can send start notifications' },
        { status: 403 }
      );
    }

    // Update meeting status to active
    await supabaseAdmin
      .from('meetings')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', meeting.id);

    // Get host profile
    const { data: hostProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single();

    const profile = hostProfile as { display_name: string | null; avatar_url: string | null } | null;
    const hostName = profile?.display_name || user.email?.split('@')[0] || 'Someone';

    // Get all pending/accepted invitations
    const { data: invitations } = await supabaseAdmin
      .from('meeting_invitations')
      .select('invitee_email')
      .eq('meeting_id', meeting.id)
      .in('status', ['pending', 'accepted']);

    // Get user IDs from emails
    const inviteeEmails = invitations?.map((inv: { invitee_email: string }) => inv.invitee_email) || [];

    if (inviteeEmails.length > 0) {
      // Get user IDs from auth
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailToUserId = new Map<string, string>();

      authUsers?.users?.forEach((u: { id: string; email?: string }) => {
        if (u.email && inviteeEmails.includes(u.email.toLowerCase())) {
          emailToUserId.set(u.email.toLowerCase(), u.id);
        }
      });

      // Also check online status from presence
      const userIds = Array.from(emailToUserId.values());

      if (userIds.length > 0) {
        const { data: onlineUsers } = await supabaseAdmin
          .from('user_presence')
          .select('user_id, status')
          .in('user_id', userIds)
          .eq('status', 'online');

        const onlineUserIds = onlineUsers?.map((u: { user_id: string }) => u.user_id) || [];

        // Send notifications to online users
        for (const userId of onlineUserIds) {
          try {
            await pusher.trigger(`private-user-${userId}`, 'meeting-started', {
              type: 'meeting-started',
              meetingId: meeting.id,
              roomId: meeting.room_id,
              meetingTitle: meeting.title,
              startedBy: {
                id: user.id,
                displayName: hostName,
                avatarUrl: profile?.avatar_url || null,
              },
              timestamp: new Date().toISOString(),
            });
          } catch (pusherError) {
            console.error(`Failed to notify user ${userId}:`, pusherError);
          }
        }

        return NextResponse.json({
          success: true,
          notifiedCount: onlineUserIds.length,
          totalInvited: inviteeEmails.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      notifiedCount: 0,
      totalInvited: inviteeEmails.length,
    });
  } catch (error: any) {
    console.error('Notify start error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
