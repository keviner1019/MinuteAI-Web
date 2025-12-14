import { emailConfig } from './config';

const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  .header {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    padding: 24px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }
  .content {
    padding: 32px 24px;
  }
  .button {
    display: inline-block;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white !important;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 500;
    margin: 16px 0;
  }
  .footer {
    background-color: #f9fafb;
    padding: 16px 24px;
    text-align: center;
    font-size: 12px;
    color: #6b7280;
  }
  .highlight {
    background-color: #fef3c7;
    padding: 16px;
    border-radius: 6px;
    border-left: 4px solid #f59e0b;
    margin: 16px 0;
  }
  .info-box {
    background-color: #eff6ff;
    padding: 16px;
    border-radius: 6px;
    border-left: 4px solid #3b82f6;
    margin: 16px 0;
  }
  .urgent {
    background-color: #fef2f2;
    padding: 16px;
    border-radius: 6px;
    border-left: 4px solid #ef4444;
    margin: 16px 0;
  }
`;

function wrapTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div style="padding: 20px; background-color: #f5f5f5;">
    <div class="container">
      ${content}
    </div>
  </div>
</body>
</html>
  `;
}

export interface MeetingReminderData {
  userName: string;
  meetingTitle: string;
  meetingTime: string;
  minutesUntil: number;
  roomId: string;
}

export function meetingReminderTemplate(data: MeetingReminderData): string {
  const joinUrl = `${emailConfig.appUrl}/meeting/${data.roomId}`;
  const urgencyClass = data.minutesUntil <= 10 ? 'urgent' : 'highlight';

  return wrapTemplate(`
    <div class="header">
      <h1>Meeting Reminder</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName},</p>
      <div class="${urgencyClass}">
        <strong>Your meeting "${data.meetingTitle}" starts in ${data.minutesUntil} minutes!</strong>
      </div>
      <p><strong>Scheduled Time:</strong> ${data.meetingTime}</p>
      <p style="text-align: center;">
        <a href="${joinUrl}" class="button">Join Meeting Now</a>
      </p>
      <p style="font-size: 14px; color: #6b7280;">
        Or copy this link: <a href="${joinUrl}">${joinUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>MinuteAI - Your AI-powered meeting assistant</p>
      <p>You're receiving this because you have meeting reminders enabled.</p>
    </div>
  `);
}

export interface DeadlineReminderData {
  userName: string;
  taskTitle: string;
  dueDate: string;
  dueText: string; // "today", "tomorrow", or specific date
  noteId?: string;
}

export function deadlineReminderTemplate(data: DeadlineReminderData): string {
  const todosUrl = `${emailConfig.appUrl}/todos`;
  const urgencyClass = data.dueText === 'today' ? 'urgent' : 'highlight';

  return wrapTemplate(`
    <div class="header">
      <h1>Task Due ${data.dueText.charAt(0).toUpperCase() + data.dueText.slice(1)}</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName},</p>
      <div class="${urgencyClass}">
        <strong>Task: ${data.taskTitle}</strong>
        <p style="margin: 8px 0 0 0;">Due: ${data.dueDate}</p>
      </div>
      <p>Don't forget to complete this task ${data.dueText}!</p>
      <p style="text-align: center;">
        <a href="${todosUrl}" class="button">View Your Tasks</a>
      </p>
    </div>
    <div class="footer">
      <p>MinuteAI - Your AI-powered meeting assistant</p>
      <p>You're receiving this because you have deadline reminders enabled.</p>
    </div>
  `);
}

export interface MeetingInvitationData {
  inviterName: string;
  inviteeEmail: string;
  meetingTitle: string;
  meetingTime: string;
  roomId: string;
  message?: string;
}

export function meetingInvitationTemplate(data: MeetingInvitationData): string {
  const joinUrl = `${emailConfig.appUrl}/meeting/${data.roomId}`;

  return wrapTemplate(`
    <div class="header">
      <h1>Meeting Invitation</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <div class="info-box">
        <strong>${data.inviterName}</strong> has invited you to a meeting!
      </div>
      <p><strong>Meeting:</strong> ${data.meetingTitle}</p>
      <p><strong>Scheduled Time:</strong> ${data.meetingTime}</p>
      ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
      <p style="text-align: center;">
        <a href="${joinUrl}" class="button">Join Meeting</a>
      </p>
      <p style="font-size: 14px; color: #6b7280;">
        Or copy this link: <a href="${joinUrl}">${joinUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>MinuteAI - Your AI-powered meeting assistant</p>
    </div>
  `);
}

export interface FriendRequestData {
  recipientName: string;
  senderName: string;
  senderEmail: string;
}

export function friendRequestTemplate(data: FriendRequestData): string {
  const friendsUrl = `${emailConfig.appUrl}/dashboard?tab=friends`;

  return wrapTemplate(`
    <div class="header">
      <h1>New Friend Request</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <div class="info-box">
        <strong>${data.senderName}</strong> (${data.senderEmail}) wants to connect with you on MinuteAI!
      </div>
      <p>Accept the request to collaborate on notes and join meetings together.</p>
      <p style="text-align: center;">
        <a href="${friendsUrl}" class="button">View Friend Request</a>
      </p>
    </div>
    <div class="footer">
      <p>MinuteAI - Your AI-powered meeting assistant</p>
    </div>
  `);
}

export interface NoteSharedData {
  recipientName: string;
  sharerName: string;
  noteTitle: string;
  noteId: string;
}

export function noteSharedTemplate(data: NoteSharedData): string {
  const noteUrl = `${emailConfig.appUrl}/notes/${data.noteId}`;

  return wrapTemplate(`
    <div class="header">
      <h1>Note Shared With You</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <div class="info-box">
        <strong>${data.sharerName}</strong> has shared a note with you!
      </div>
      <p><strong>Note:</strong> ${data.noteTitle}</p>
      <p>You can now view and collaborate on this note.</p>
      <p style="text-align: center;">
        <a href="${noteUrl}" class="button">View Note</a>
      </p>
    </div>
    <div class="footer">
      <p>MinuteAI - Your AI-powered meeting assistant</p>
    </div>
  `);
}

export interface DailySummaryData {
  userName: string;
  meetingsToday: { title: string; time: string; roomId: string }[];
  tasksDueToday: { title: string; noteId?: string }[];
  tasksDueTomorrow: { title: string; noteId?: string }[];
}

export function dailySummaryTemplate(data: DailySummaryData): string {
  const dashboardUrl = `${emailConfig.appUrl}/dashboard`;

  const meetingsHtml = data.meetingsToday.length > 0
    ? data.meetingsToday.map(m => `
        <li style="margin: 8px 0;">
          <strong>${m.title}</strong> at ${m.time}
          <a href="${emailConfig.appUrl}/meeting/${m.roomId}" style="margin-left: 8px; font-size: 12px;">Join</a>
        </li>
      `).join('')
    : '<li style="color: #6b7280;">No meetings scheduled</li>';

  const todayTasksHtml = data.tasksDueToday.length > 0
    ? data.tasksDueToday.map(t => `<li style="margin: 8px 0;">${t.title}</li>`).join('')
    : '<li style="color: #6b7280;">No tasks due today</li>';

  const tomorrowTasksHtml = data.tasksDueTomorrow.length > 0
    ? data.tasksDueTomorrow.map(t => `<li style="margin: 8px 0;">${t.title}</li>`).join('')
    : '<li style="color: #6b7280;">No tasks due tomorrow</li>';

  return wrapTemplate(`
    <div class="header">
      <h1>Your Daily Summary</h1>
    </div>
    <div class="content">
      <p>Good morning, ${data.userName}!</p>
      <p>Here's what's on your agenda:</p>

      <h3 style="color: #6366f1; margin-top: 24px;">Today's Meetings</h3>
      <ul style="padding-left: 20px;">${meetingsHtml}</ul>

      ${data.tasksDueToday.length > 0 ? `
        <h3 style="color: #ef4444; margin-top: 24px;">Tasks Due Today</h3>
        <div class="urgent">
          <ul style="padding-left: 20px; margin: 0;">${todayTasksHtml}</ul>
        </div>
      ` : ''}

      ${data.tasksDueTomorrow.length > 0 ? `
        <h3 style="color: #f59e0b; margin-top: 24px;">Tasks Due Tomorrow</h3>
        <div class="highlight">
          <ul style="padding-left: 20px; margin: 0;">${tomorrowTasksHtml}</ul>
        </div>
      ` : ''}

      <p style="text-align: center; margin-top: 24px;">
        <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
      </p>
    </div>
    <div class="footer">
      <p>MinuteAI - Your AI-powered meeting assistant</p>
      <p>You're receiving this daily summary because you have it enabled in your settings.</p>
    </div>
  `);
}
