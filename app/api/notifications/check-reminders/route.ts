import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendEmail,
  isEmailConfigured,
  meetingReminderTemplate,
  deadlineReminderTemplate,
  dailySummaryTemplate,
  type MeetingReminderData,
  type DeadlineReminderData,
  type DailySummaryData,
} from '@/lib/email';

// This API can be called by Vercel Cron Jobs or external services
// Configure in vercel.json:
// {
//   "crons": [{
//     "path": "/api/notifications/check-reminders",
//     "schedule": "*/5 * * * *"  // Every 5 minutes
//   }]
// }

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  email_preferences?: {
    meeting_reminders: boolean;
    deadline_reminders: boolean;
    daily_summary: boolean;
    reminder_minutes_before: number;
  };
}

interface Meeting {
  id: string;
  title: string;
  room_id: string;
  scheduled_start: string;
  host_id: string;
}

interface NoteWithActions {
  id: string;
  user_id: string;
  action_items: ActionItem[] | null;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  // Verify cron secret for security (optional but recommended)
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, verify it
  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { message: 'Email service not configured', sent: 0 },
      { status: 200 }
    );
  }

  const results = {
    meetingReminders: 0,
    deadlineReminders: 0,
    errors: [] as string[],
  };

  try {
    // Check for upcoming meetings
    await checkMeetingReminders(results);

    // Check for upcoming deadlines
    await checkDeadlineReminders(results);

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Check reminders error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: results.errors },
      { status: 500 }
    );
  }
}

async function checkMeetingReminders(results: { meetingReminders: number; deadlineReminders: number; errors: string[] }) {
  const now = new Date();

  // Get users with email preferences enabled for meeting reminders
  const { data: users } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, full_name, email_preferences')
    .not('email', 'is', null);

  if (!users || users.length === 0) return;

  for (const user of users as UserProfile[]) {
    // Default reminder time is 15 minutes if not set
    const reminderMinutes = user.email_preferences?.reminder_minutes_before || 15;

    // Skip if meeting reminders are explicitly disabled
    if (user.email_preferences?.meeting_reminders === false) continue;

    const reminderWindowStart = new Date(now.getTime() + (reminderMinutes - 1) * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + (reminderMinutes + 1) * 60 * 1000);

    // Get user's upcoming meetings
    const { data: hostedMeetings } = await supabaseAdmin
      .from('meetings')
      .select('id, title, room_id, scheduled_start, host_id')
      .eq('host_id', user.id)
      .eq('status', 'scheduled')
      .gte('scheduled_start', reminderWindowStart.toISOString())
      .lte('scheduled_start', reminderWindowEnd.toISOString());

    const { data: participantLinks } = await supabaseAdmin
      .from('meeting_participants')
      .select('meeting_id')
      .eq('user_id', user.id);

    const participantMeetingIds = (participantLinks || []).map((p) => (p as { meeting_id: string }).meeting_id);

    const { data: participantMeetings } = participantMeetingIds.length > 0
      ? await supabaseAdmin
          .from('meetings')
          .select('id, title, room_id, scheduled_start, host_id')
          .in('id', participantMeetingIds)
          .eq('status', 'scheduled')
          .gte('scheduled_start', reminderWindowStart.toISOString())
          .lte('scheduled_start', reminderWindowEnd.toISOString())
      : { data: [] };

    const allMeetings = [...(hostedMeetings || []), ...(participantMeetings || [])] as Meeting[];

    // Dedupe by meeting ID
    const uniqueMeetings = Array.from(
      new Map(allMeetings.map((m) => [m.id, m])).values()
    );

    // Check notification history to avoid duplicates
    for (const meeting of uniqueMeetings) {
      const notificationKey = `meeting_reminder:${user.id}:${meeting.id}`;

      // Check if we already sent this reminder
      const { data: existingNotification } = await supabaseAdmin
        .from('email_notifications_log')
        .select('id')
        .eq('notification_key', notificationKey)
        .single();

      if (existingNotification) continue;

      // Send the reminder
      const scheduledTime = new Date(meeting.scheduled_start);
      const minutesUntil = Math.round((scheduledTime.getTime() - now.getTime()) / 60000);

      const emailData: MeetingReminderData = {
        userName: user.full_name || user.email.split('@')[0],
        meetingTitle: meeting.title,
        meetingTime: scheduledTime.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        minutesUntil,
        roomId: meeting.room_id,
      };

      const result = await sendEmail({
        to: user.email,
        subject: `Reminder: ${meeting.title} starts in ${minutesUntil} minutes`,
        html: meetingReminderTemplate(emailData),
      });

      if (result.success) {
        results.meetingReminders++;

        // Log the notification to prevent duplicates
        await supabaseAdmin.from('email_notifications_log').insert({
          notification_key: notificationKey,
          user_id: user.id,
          notification_type: 'meeting_reminder',
          sent_at: new Date().toISOString(),
        });
      } else {
        results.errors.push(`Failed to send meeting reminder to ${user.email}: ${result.error}`);
      }
    }
  }
}

async function checkDeadlineReminders(results: { meetingReminders: number; deadlineReminders: number; errors: string[] }) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Get users with email preferences enabled for deadline reminders
  const { data: users } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, full_name, email_preferences')
    .not('email', 'is', null);

  if (!users || users.length === 0) return;

  for (const user of users as UserProfile[]) {
    // Skip if deadline reminders are explicitly disabled
    if (user.email_preferences?.deadline_reminders === false) continue;

    // Get user's notes with action items
    const { data: ownedNotes } = await supabaseAdmin
      .from('notes')
      .select('id, user_id, action_items')
      .eq('user_id', user.id)
      .not('action_items', 'is', null);

    const { data: collaboratorLinks } = await supabaseAdmin
      .from('note_collaborators')
      .select('note_id')
      .eq('user_id', user.id);

    const collaboratorNoteIds = (collaboratorLinks || []).map((c) => (c as { note_id: string }).note_id);

    const { data: sharedNotes } = collaboratorNoteIds.length > 0
      ? await supabaseAdmin
          .from('notes')
          .select('id, user_id, action_items')
          .in('id', collaboratorNoteIds)
          .not('action_items', 'is', null)
      : { data: [] };

    const allNotes = [...(ownedNotes || []), ...(sharedNotes || [])] as NoteWithActions[];

    for (const note of allNotes) {
      if (!note.action_items) continue;

      const actionItems: ActionItem[] = Array.isArray(note.action_items)
        ? note.action_items
        : [];

      for (const item of actionItems) {
        if (item.completed || !item.dueDate) continue;

        const dueDate = new Date(item.dueDate);

        // Only send reminder if due within 24 hours
        if (dueDate > tomorrow || dueDate <= now) continue;

        const notificationKey = `deadline_reminder:${user.id}:${note.id}:${item.id || item.text}`;

        // Check if we already sent this reminder
        const { data: existingNotification } = await supabaseAdmin
          .from('email_notifications_log')
          .select('id')
          .eq('notification_key', notificationKey)
          .single();

        if (existingNotification) continue;

        // Determine due text
        const isToday = dueDate.toDateString() === now.toDateString();
        const isTomorrow = dueDate.toDateString() === tomorrow.toDateString();
        let dueText = 'soon';
        if (isToday) dueText = 'today';
        else if (isTomorrow) dueText = 'tomorrow';

        const emailData: DeadlineReminderData = {
          userName: user.full_name || user.email.split('@')[0],
          taskTitle: item.text,
          dueDate: dueDate.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
          dueText,
          noteId: note.id,
        };

        const result = await sendEmail({
          to: user.email,
          subject: `Task Due ${dueText.charAt(0).toUpperCase() + dueText.slice(1)}: ${item.text}`,
          html: deadlineReminderTemplate(emailData),
        });

        if (result.success) {
          results.deadlineReminders++;

          // Log the notification to prevent duplicates
          await supabaseAdmin.from('email_notifications_log').insert({
            notification_key: notificationKey,
            user_id: user.id,
            notification_type: 'deadline_reminder',
            sent_at: new Date().toISOString(),
          });
        } else {
          results.errors.push(`Failed to send deadline reminder to ${user.email}: ${result.error}`);
        }
      }
    }
  }
}

// POST endpoint for sending daily summaries (can be called by a daily cron)
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { message: 'Email service not configured', sent: 0 },
      { status: 200 }
    );
  }

  const results = {
    dailySummaries: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

    // Get users with daily summary enabled
    const { data: users } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, email_preferences')
      .not('email', 'is', null);

    if (!users) {
      return NextResponse.json({ success: true, ...results });
    }

    for (const user of users as UserProfile[]) {
      // Skip if daily summary is disabled (default is enabled if not set)
      if (user.email_preferences?.daily_summary === false) continue;

      // Get today's meetings
      const { data: meetings } = await supabaseAdmin
        .from('meetings')
        .select('id, title, room_id, scheduled_start')
        .or(`host_id.eq.${user.id}`)
        .gte('scheduled_start', today.toISOString())
        .lt('scheduled_start', tomorrow.toISOString())
        .eq('status', 'scheduled');

      // Get tasks due today and tomorrow
      const { data: notes } = await supabaseAdmin
        .from('notes')
        .select('id, action_items')
        .eq('user_id', user.id)
        .not('action_items', 'is', null);

      const tasksDueToday: { title: string; noteId?: string }[] = [];
      const tasksDueTomorrow: { title: string; noteId?: string }[] = [];

      for (const note of (notes as NoteWithActions[] || [])) {
        if (!note.action_items) continue;

        const items: ActionItem[] = Array.isArray(note.action_items) ? note.action_items : [];

        for (const item of items) {
          if (item.completed || !item.dueDate) continue;

          const dueDate = new Date(item.dueDate);

          if (dueDate >= today && dueDate < tomorrow) {
            tasksDueToday.push({ title: item.text, noteId: note.id });
          } else if (dueDate >= tomorrow && dueDate < dayAfterTomorrow) {
            tasksDueTomorrow.push({ title: item.text, noteId: note.id });
          }
        }
      }

      // Skip if nothing to report
      if ((!meetings || meetings.length === 0) && tasksDueToday.length === 0 && tasksDueTomorrow.length === 0) {
        continue;
      }

      const summaryData: DailySummaryData = {
        userName: user.full_name || user.email.split('@')[0],
        meetingsToday: (meetings || []).map((m) => {
          const meeting = m as Meeting;
          return {
            title: meeting.title,
            time: new Date(meeting.scheduled_start).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            }),
            roomId: meeting.room_id,
          };
        }),
        tasksDueToday,
        tasksDueTomorrow,
      };

      const result = await sendEmail({
        to: user.email,
        subject: `Your MinuteAI Daily Summary - ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
        html: dailySummaryTemplate(summaryData),
      });

      if (result.success) {
        results.dailySummaries++;
      } else {
        results.errors.push(`Failed to send daily summary to ${user.email}: ${result.error}`);
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Daily summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: results.errors },
      { status: 500 }
    );
  }
}
