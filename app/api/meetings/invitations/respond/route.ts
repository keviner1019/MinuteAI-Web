import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';
import pusher from '@/lib/pusher/server';

// POST /api/meetings/invitations/respond - Accept or decline a meeting invitation
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, response } = body;

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    if (!response || !['accepted', 'declined'].includes(response)) {
      return NextResponse.json(
        { error: 'Response must be "accepted" or "declined"' },
        { status: 400 }
      );
    }

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('meeting_invitations')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('invitee_email', user.email?.toLowerCase())
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation has already been responded to' },
        { status: 400 }
      );
    }

    // Update invitation status
    const { error: updateError } = await supabaseAdmin
      .from('meeting_invitations')
      .update({ status: response })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Failed to update invitation:', updateError);
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    // Get meeting details
    const { data: meeting } = await supabaseAdmin
      .from('meetings')
      .select('id, room_id, title, host_id, status')
      .eq('id', meetingId)
      .single();

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Get user profile for notifications
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single();

    const profile = userProfile as { display_name: string | null; avatar_url: string | null } | null;
    const userName = profile?.display_name || user.email?.split('@')[0] || 'Someone';

    // If accepted, add as participant
    if (response === 'accepted') {
      try {
        await supabaseAdmin.from('meeting_participants').upsert({
          meeting_id: meetingId,
          user_id: user.id,
          session_id: `participant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          display_name: userName,
          avatar_url: profile?.avatar_url || null,
          role: 'participant',
          is_active: false, // Will be set to true when they actually join
          permissions: {
            can_speak: true,
            can_share_screen: true,
            can_record: false,
            can_invite: false,
            can_kick: false,
          },
        }, {
          onConflict: 'meeting_id,user_id',
        });
      } catch (participantError) {
        console.error('Failed to add participant:', participantError);
      }
    }

    // Notify the meeting host about the response
    try {
      await pusher.trigger(`private-user-${meeting.host_id}`, 'notification', {
        type: response === 'accepted' ? 'invitation-accepted' : 'invitation-declined',
        meetingId: meeting.id,
        roomId: meeting.room_id,
        meetingTitle: meeting.title,
        respondedBy: {
          id: user.id,
          displayName: userName,
          avatarUrl: profile?.avatar_url || null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (pusherError) {
      console.error('Failed to send notification to host:', pusherError);
    }

    return NextResponse.json({
      success: true,
      message: `Invitation ${response}`,
      meeting: {
        id: meeting.id,
        room_id: meeting.room_id,
        title: meeting.title,
        status: meeting.status,
      },
    });
  } catch (error: any) {
    console.error('Invitation response error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
