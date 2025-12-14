import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';

// Generate a random room ID (10 chars alphanumeric)
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 12);
}

// Generate a 6-character meeting code (uppercase letters + numbers, no ambiguous chars)
function generateMeetingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/meetings - Create a new meeting
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title = 'Quick Meeting',
      scheduled_at,
      description,
      max_participants = 10,
      invited_friend_ids = [],
      invited_emails = [],
    } = body;

    // Validate title length
    if (title && title.length > 100) {
      return NextResponse.json(
        { error: 'Meeting name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Validate description length
    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Validate scheduled_at if provided
    if (scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduled date format' },
          { status: 400 }
        );
      }
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        );
      }
    }

    const roomId = generateRoomId();
    const meetingCode = generateMeetingCode();
    const status = scheduled_at ? 'scheduled' : 'active';

    // Create the meeting
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('meetings')
      .insert({
        room_id: roomId,
        meeting_code: meetingCode,
        host_id: user.id,
        title: title.trim() || 'Quick Meeting',
        status,
        scheduled_at: scheduled_at || null,
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (meetingError) {
      console.error('Failed to create meeting:', meetingError);
      return NextResponse.json(
        { error: 'Failed to create meeting' },
        { status: 500 }
      );
    }

    // Add host as participant with host role
    try {
      // Get host's profile
      const { data: hostProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();

      const profile = hostProfile as { display_name: string | null; avatar_url: string | null } | null;

      await supabaseAdmin.from('meeting_participants').insert({
        meeting_id: meeting.id,
        user_id: user.id,
        session_id: `host-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        display_name: profile?.display_name || user.email?.split('@')[0] || 'Host',
        avatar_url: profile?.avatar_url || null,
        role: 'host',
        permissions: {
          can_speak: true,
          can_share_screen: true,
          can_record: true,
          can_invite: true,
          can_kick: true,
        },
      });
    } catch (participantError) {
      console.error('Failed to add host as participant:', participantError);
      // Don't fail the meeting creation if participant insert fails
    }

    // Send invitations to friends
    if (invited_friend_ids.length > 0) {
      try {
        // Get friend emails from user_profiles
        const { data: friendProfiles } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .in('id', invited_friend_ids);

        if (friendProfiles && friendProfiles.length > 0) {
          // Get emails from auth.users via a different method
          // For now, we'll create invitations with just the user IDs
          const invitations = friendProfiles.map((profile: { id: string }) => ({
            meeting_id: meeting.id,
            inviter_id: user.id,
            invitee_id: profile.id,
            token: generateMeetingCode() + generateMeetingCode(),
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          }));

          await supabaseAdmin.from('meeting_invitations').insert(invitations);
        }
      } catch (inviteError) {
        console.error('Failed to create friend invitations:', inviteError);
        // Don't fail the meeting creation if invitations fail
      }
    }

    // Send email invitations
    if (invited_emails.length > 0) {
      try {
        const emailInvitations = invited_emails.map((email: string) => ({
          meeting_id: meeting.id,
          inviter_id: user.id,
          invitee_email: email.toLowerCase(),
          token: generateMeetingCode() + generateMeetingCode(),
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }));

        await supabaseAdmin.from('meeting_invitations').insert(emailInvitations);
      } catch (emailError) {
        console.error('Failed to create email invitations:', emailError);
        // Don't fail the meeting creation if invitations fail
      }
    }

    return NextResponse.json({
      id: meeting.id,
      room_id: meeting.room_id,
      meeting_code: meeting.meeting_code,
      host_id: meeting.host_id,
      title: meeting.title,
      status: meeting.status,
      scheduled_at: meeting.scheduled_at,
      created_at: meeting.created_at,
    });
  } catch (error: any) {
    console.error('Create meeting error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/meetings - Get user's meetings
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Authorization header
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: meetings, error: meetingsError } = await query;

    if (meetingsError) {
      console.error('Failed to fetch meetings:', meetingsError);
      return NextResponse.json(
        { error: 'Failed to fetch meetings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ meetings: meetings || [] });
  } catch (error: any) {
    console.error('Get meetings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
