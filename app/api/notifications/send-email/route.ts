import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendEmail,
  isEmailConfigured,
  meetingReminderTemplate,
  deadlineReminderTemplate,
  meetingInvitationTemplate,
  friendRequestTemplate,
  noteSharedTemplate,
  type MeetingReminderData,
  type DeadlineReminderData,
  type MeetingInvitationData,
  type FriendRequestData,
  type NoteSharedData,
} from '@/lib/email';

type NotificationType = 'meeting_reminder' | 'deadline_reminder' | 'meeting_invitation' | 'friend_request' | 'note_shared';

interface SendEmailRequest {
  type: NotificationType;
  to: string;
  data: MeetingReminderData | DeadlineReminderData | MeetingInvitationData | FriendRequestData | NoteSharedData;
}

export async function POST(request: NextRequest) {
  try {
    // Check if email is configured
    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body: SendEmailRequest = await request.json();
    const { type, to, data } = body;

    if (!type || !to || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, to, data' },
        { status: 400 }
      );
    }

    let subject: string;
    let html: string;

    switch (type) {
      case 'meeting_reminder':
        const meetingData = data as MeetingReminderData;
        subject = `Reminder: ${meetingData.meetingTitle} starts in ${meetingData.minutesUntil} minutes`;
        html = meetingReminderTemplate(meetingData);
        break;

      case 'deadline_reminder':
        const deadlineData = data as DeadlineReminderData;
        subject = `Task Due ${deadlineData.dueText}: ${deadlineData.taskTitle}`;
        html = deadlineReminderTemplate(deadlineData);
        break;

      case 'meeting_invitation':
        const inviteData = data as MeetingInvitationData;
        subject = `Meeting Invitation: ${inviteData.meetingTitle}`;
        html = meetingInvitationTemplate(inviteData);
        break;

      case 'friend_request':
        const friendData = data as FriendRequestData;
        subject = `${friendData.senderName} wants to connect with you on MinuteAI`;
        html = friendRequestTemplate(friendData);
        break;

      case 'note_shared':
        const noteData = data as NoteSharedData;
        subject = `${noteData.sharerName} shared a note with you`;
        html = noteSharedTemplate(noteData);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    const result = await sendEmail({ to, subject, html });

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
