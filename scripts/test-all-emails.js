// Test all email templates
// Run with: node scripts/test-all-emails.js

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const fromEmail = process.env.FROM_EMAIL;
const fromName = process.env.FROM_NAME || 'MinuteAI';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const testRecipient = 'eyongxian1019@gmail.com';

const transporter = nodemailer.createTransport(emailConfig);

// Base styles for all emails
const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
  .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
  .content { padding: 32px 24px; }
  .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 16px 0; }
  .footer { background-color: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; }
  .highlight { background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 16px 0; }
  .info-box { background-color: #eff6ff; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 16px 0; }
  .urgent { background-color: #fef2f2; padding: 16px; border-radius: 6px; border-left: 4px solid #ef4444; margin: 16px 0; }
`;

function wrapTemplate(content) {
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

// Email templates
const emailTemplates = [
  {
    name: '1. Meeting Reminder (15 minutes)',
    subject: 'Reminder: Weekly Team Standup starts in 15 minutes',
    html: wrapTemplate(`
      <div class="header">
        <h1>⏰ Meeting Reminder</h1>
      </div>
      <div class="content">
        <p>Hi Eyong,</p>
        <div class="highlight">
          <strong>Your meeting "Weekly Team Standup" starts in 15 minutes!</strong>
        </div>
        <p><strong>Scheduled Time:</strong> ${new Date(Date.now() + 15 * 60000).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        <p style="text-align: center;">
          <a href="${appUrl}/meeting/abc123" class="button">Join Meeting Now</a>
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          Or copy this link: <a href="${appUrl}/meeting/abc123">${appUrl}/meeting/abc123</a>
        </p>
      </div>
      <div class="footer">
        <p>MinuteAI - Your AI-powered meeting assistant</p>
        <p>You're receiving this because you have meeting reminders enabled.</p>
      </div>
    `),
  },
  {
    name: '2. Meeting Reminder (URGENT - 5 minutes)',
    subject: '🚨 URGENT: Project Review starts in 5 minutes!',
    html: wrapTemplate(`
      <div class="header">
        <h1>🚨 Meeting Starting Soon!</h1>
      </div>
      <div class="content">
        <p>Hi Eyong,</p>
        <div class="urgent">
          <strong>Your meeting "Project Review" starts in 5 minutes!</strong>
        </div>
        <p><strong>Scheduled Time:</strong> ${new Date(Date.now() + 5 * 60000).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        <p style="text-align: center;">
          <a href="${appUrl}/meeting/xyz789" class="button">Join Meeting Now</a>
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          Or copy this link: <a href="${appUrl}/meeting/xyz789">${appUrl}/meeting/xyz789</a>
        </p>
      </div>
      <div class="footer">
        <p>MinuteAI - Your AI-powered meeting assistant</p>
        <p>You're receiving this because you have meeting reminders enabled.</p>
      </div>
    `),
  },
  {
    name: '3. Deadline Reminder (Due Today)',
    subject: '⚠️ Task Due Today: Complete API documentation',
    html: wrapTemplate(`
      <div class="header">
        <h1>📋 Task Due Today</h1>
      </div>
      <div class="content">
        <p>Hi Eyong,</p>
        <div class="urgent">
          <strong>Task: Complete API documentation</strong>
          <p style="margin: 8px 0 0 0;">Due: ${new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        </div>
        <p>Don't forget to complete this task today!</p>
        <p style="text-align: center;">
          <a href="${appUrl}/todos" class="button">View Your Tasks</a>
        </p>
      </div>
      <div class="footer">
        <p>MinuteAI - Your AI-powered meeting assistant</p>
        <p>You're receiving this because you have deadline reminders enabled.</p>
      </div>
    `),
  },
  {
    name: '4. Deadline Reminder (Due Tomorrow)',
    subject: '📅 Task Due Tomorrow: Review pull request #42',
    html: wrapTemplate(`
      <div class="header">
        <h1>📋 Task Due Tomorrow</h1>
      </div>
      <div class="content">
        <p>Hi Eyong,</p>
        <div class="highlight">
          <strong>Task: Review pull request #42</strong>
          <p style="margin: 8px 0 0 0;">Due: ${new Date(Date.now() + 24 * 60 * 60000).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        </div>
        <p>Don't forget to complete this task tomorrow!</p>
        <p style="text-align: center;">
          <a href="${appUrl}/todos" class="button">View Your Tasks</a>
        </p>
      </div>
      <div class="footer">
        <p>MinuteAI - Your AI-powered meeting assistant</p>
        <p>You're receiving this because you have deadline reminders enabled.</p>
      </div>
    `),
  },
  {
    name: '5. Meeting Invitation',
    subject: '📩 Meeting Invitation: Q4 Planning Session',
    html: wrapTemplate(`
      <div class="header">
        <h1>📩 Meeting Invitation</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <div class="info-box">
          <strong>John Smith</strong> has invited you to a meeting!
        </div>
        <p><strong>Meeting:</strong> Q4 Planning Session</p>
        <p><strong>Scheduled Time:</strong> ${new Date(Date.now() + 2 * 24 * 60 * 60000).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        <p><strong>Message:</strong> Looking forward to discussing our Q4 goals and milestones with you!</p>
        <p style="text-align: center;">
          <a href="${appUrl}/meeting/planning123" class="button">Join Meeting</a>
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          Or copy this link: <a href="${appUrl}/meeting/planning123">${appUrl}/meeting/planning123</a>
        </p>
      </div>
      <div class="footer">
        <p>MinuteAI - Your AI-powered meeting assistant</p>
      </div>
    `),
  },
  {
    name: '6. Friend Request',
    subject: '👋 Sarah Johnson wants to connect with you on MinuteAI',
    html: wrapTemplate(`
      <div class="header">
        <h1>👥 New Friend Request</h1>
      </div>
      <div class="content">
        <p>Hi Eyong,</p>
        <div class="info-box">
          <strong>Sarah Johnson</strong> (sarah.johnson@example.com) wants to connect with you on MinuteAI!
        </div>
        <p>Accept the request to collaborate on notes and join meetings together.</p>
        <p style="text-align: center;">
          <a href="${appUrl}/dashboard?tab=friends" class="button">View Friend Request</a>
        </p>
      </div>
      <div class="footer">
        <p>MinuteAI - Your AI-powered meeting assistant</p>
      </div>
    `),
  },
  {
    name: '7. Note Shared',
    subject: '📝 Mike Chen shared a note with you',
    html: wrapTemplate(`
      <div class="header">
        <h1>📝 Note Shared With You</h1>
      </div>
      <div class="content">
        <p>Hi Eyong,</p>
        <div class="info-box">
          <strong>Mike Chen</strong> has shared a note with you!
        </div>
        <p><strong>Note:</strong> Product Roadmap 2024</p>
        <p>You can now view and collaborate on this note.</p>
        <p style="text-align: center;">
          <a href="${appUrl}/notes/note123" class="button">View Note</a>
        </p>
      </div>
      <div class="footer">
        <p>MinuteAI - Your AI-powered meeting assistant</p>
      </div>
    `),
  },
  {
    name: '8. Daily Summary',
    subject: `📊 Your MinuteAI Daily Summary - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
    html: wrapTemplate(`
      <div class="header">
        <h1>📊 Your Daily Summary</h1>
      </div>
      <div class="content">
        <p>Good morning, Eyong!</p>
        <p>Here's what's on your agenda:</p>

        <h3 style="color: #6366f1; margin-top: 24px;">📅 Today's Meetings</h3>
        <ul style="padding-left: 20px;">
          <li style="margin: 8px 0;">
            <strong>Daily Standup</strong> at 9:00 AM
            <a href="${appUrl}/meeting/standup" style="margin-left: 8px; font-size: 12px;">Join</a>
          </li>
          <li style="margin: 8px 0;">
            <strong>Design Review</strong> at 2:00 PM
            <a href="${appUrl}/meeting/design" style="margin-left: 8px; font-size: 12px;">Join</a>
          </li>
          <li style="margin: 8px 0;">
            <strong>Client Call</strong> at 4:30 PM
            <a href="${appUrl}/meeting/client" style="margin-left: 8px; font-size: 12px;">Join</a>
          </li>
        </ul>

        <h3 style="color: #ef4444; margin-top: 24px;">⚠️ Tasks Due Today</h3>
        <div class="urgent">
          <ul style="padding-left: 20px; margin: 0;">
            <li style="margin: 8px 0;">Submit expense report</li>
            <li style="margin: 8px 0;">Review PR #156</li>
          </ul>
        </div>

        <h3 style="color: #f59e0b; margin-top: 24px;">📋 Tasks Due Tomorrow</h3>
        <div class="highlight">
          <ul style="padding-left: 20px; margin: 0;">
            <li style="margin: 8px 0;">Prepare presentation slides</li>
            <li style="margin: 8px 0;">Update project documentation</li>
            <li style="margin: 8px 0;">Schedule team retrospective</li>
          </ul>
        </div>

        <p style="text-align: center; margin-top: 24px;">
          <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
        </p>
      </div>
      <div class="footer">
        <p>MinuteAI - Your AI-powered meeting assistant</p>
        <p>You're receiving this daily summary because you have it enabled in your settings.</p>
      </div>
    `),
  },
];

async function sendAllEmails() {
  console.log('📧 Sending All Email Templates\n');
  console.log(`Recipient: ${testRecipient}\n`);
  console.log('='.repeat(50) + '\n');

  for (let i = 0; i < emailTemplates.length; i++) {
    const template = emailTemplates[i];
    console.log(`Sending ${template.name}...`);

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: testRecipient,
        subject: template.subject,
        html: template.html,
      });

      console.log(`✅ Sent! Message ID: ${info.messageId}\n`);

      // Wait 2 seconds between emails to avoid rate limiting
      if (i < emailTemplates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Failed: ${error.message}\n`);
    }
  }

  console.log('='.repeat(50));
  console.log(`\n✅ All ${emailTemplates.length} emails sent!`);
  console.log(`📬 Check your inbox at: ${testRecipient}`);
}

sendAllEmails();
