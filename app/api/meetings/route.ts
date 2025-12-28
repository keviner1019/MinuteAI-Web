import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';
import pusher from '@/lib/pusher/server';

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

    // Get host profile for notifications
    let hostProfile: { display_name: string | null; avatar_url: string | null } | null = null;
    try {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();
      hostProfile = profile;
    } catch (err) {
      console.error('Failed to fetch host profile:', err);
    }

    // Send invitations to friends
    if (invited_friend_ids.length > 0) {
      try {
        // Get friend emails from auth.users using admin client
        const { data: friendUsers, error: friendsError } = await supabaseAdmin.auth.admin.listUsers();

        if (friendsError) {
          console.error('Failed to list users:', friendsError);
        } else {
          // Filter to only invited friends and get their emails
          const friendsMap = new Map<string, string>();
          friendUsers?.users?.forEach((u: { id: string; email?: string }) => {
            if (invited_friend_ids.includes(u.id) && u.email) {
              friendsMap.set(u.id, u.email);
            }
          });

          if (friendsMap.size > 0) {
            // For scheduled meetings, auto-accept invitations so they appear on calendar immediately
            // For instant meetings, keep as pending so user must explicitly accept
            const invitationStatus = scheduled_at ? 'accepted' : 'pending';

            // Create invitations with proper email addresses
            const invitations = Array.from(friendsMap.entries()).map(([friendId, email]) => ({
              meeting_id: meeting.id,
              inviter_id: user.id,
              invitee_email: email.toLowerCase(),
              token: generateMeetingCode() + generateMeetingCode(),
              status: invitationStatus,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            }));

            await supabaseAdmin.from('meeting_invitations').insert(invitations);

            // For scheduled meetings, also add invitees as participants
            if (scheduled_at) {
              for (const [friendId, email] of friendsMap.entries()) {
                try {
                  // Get friend's profile
                  const { data: friendProfile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('display_name, avatar_url')
                    .eq('id', friendId)
                    .single();

                  const friendProfileData = friendProfile as { display_name: string | null; avatar_url: string | null } | null;

                  await supabaseAdmin.from('meeting_participants').upsert({
                    meeting_id: meeting.id,
                    user_id: friendId,
                    session_id: `participant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    display_name: friendProfileData?.display_name || email.split('@')[0],
                    avatar_url: friendProfileData?.avatar_url || null,
                    role: 'participant',
                    is_active: false,
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
                  console.error(`Failed to add participant ${friendId}:`, participantError);
                }
              }
            }

            // Send real-time Pusher notifications to each friend
            const hostName = hostProfile?.display_name || user.email?.split('@')[0] || 'Someone';

            for (const friendId of invited_friend_ids) {
              try {
                await pusher.trigger(`private-user-${friendId}`, 'meeting-invite', {
                  type: 'meeting-invite',
                  meetingId: meeting.id,
                  roomId: meeting.room_id,
                  meetingTitle: meeting.title,
                  scheduledAt: meeting.scheduled_at,
                  invitedBy: {
                    id: user.id,
                    displayName: hostName,
                    avatarUrl: hostProfile?.avatar_url || null,
                  },
                  timestamp: new Date().toISOString(),
                });
              } catch (pusherError) {
                console.error(`Failed to send Pusher notification to ${friendId}:`, pusherError);
              }
            }
          }
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

// GET /api/meetings - Get user's meetings (hosted, participated, or invited)
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
    const includeInvited = searchParams.get('includeInvited') !== 'false'; // Default true

    // Fetch meetings where user is host
    let hostedQuery = supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      hostedQuery = hostedQuery.eq('status', status);
    }

    const { data: hostedMeetings, error: hostedError } = await hostedQuery;

    if (hostedError) {
      console.error('Failed to fetch hosted meetings:', hostedError);
      return NextResponse.json(
        { error: 'Failed to fetch meetings' },
        { status: 500 }
      );
    }

    let allMeetings = [...(hostedMeetings || [])];

    // Fetch meetings where user is a participant (but not host)
    const { data: participantData } = await supabaseAdmin
      .from('meeting_participants')
      .select('meeting_id')
      .eq('user_id', user.id);

    if (participantData && participantData.length > 0) {
      const participantMeetingIds = participantData.map((p: { meeting_id: string }) => p.meeting_id);
      // Filter out meetings already in hosted
      const hostedIds = new Set(hostedMeetings?.map(m => m.id) || []);
      const newMeetingIds = participantMeetingIds.filter((id: string) => !hostedIds.has(id));

      if (newMeetingIds.length > 0) {
        let participantQuery = supabaseAdmin
          .from('meetings')
          .select('*')
          .in('id', newMeetingIds)
          .order('created_at', { ascending: false });

        if (status) {
          participantQuery = participantQuery.eq('status', status);
        }

        const { data: participantMeetings } = await participantQuery;
        if (participantMeetings) {
          allMeetings = [...allMeetings, ...participantMeetings];
        }
      }
    }

    // Fetch meetings where user is invited (by email) - include both pending and accepted
    if (includeInvited && user.email) {
      const { data: invitations } = await supabaseAdmin
        .from('meeting_invitations')
        .select('meeting_id')
        .eq('invitee_email', user.email.toLowerCase())
        .in('status', ['pending', 'accepted']);

      if (invitations && invitations.length > 0) {
        const existingIds = new Set(allMeetings.map(m => m.id));
        const invitedMeetingIds = invitations
          .map((inv: { meeting_id: string }) => inv.meeting_id)
          .filter((id: string) => !existingIds.has(id));

        if (invitedMeetingIds.length > 0) {
          let invitedQuery = supabaseAdmin
            .from('meetings')
            .select('*')
            .in('id', invitedMeetingIds)
            .order('created_at', { ascending: false });

          if (status) {
            invitedQuery = invitedQuery.eq('status', status);
          }

          const { data: invitedMeetings } = await invitedQuery;
          if (invitedMeetings) {
            // Mark these as invited for frontend display
            const markedInvited = invitedMeetings.map(m => ({ ...m, isInvited: true }));
            allMeetings = [...allMeetings, ...markedInvited];
          }
        }
      }
    }

    // Sort all meetings by created_at descending
    allMeetings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply limit
    allMeetings = allMeetings.slice(0, limit);

    return NextResponse.json({ meetings: allMeetings });
  } catch (error: any) {
    console.error('Get meetings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
