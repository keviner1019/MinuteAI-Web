// Test script for email service
// Run with: node scripts/test-email.js

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
const testRecipient = 'eyongxian1019@gmail.com';

async function sendTestEmail() {
  console.log('📧 Email Test Script\n');
  console.log('Configuration:');
  console.log(`  SMTP Host: ${emailConfig.host}`);
  console.log(`  SMTP Port: ${emailConfig.port}`);
  console.log(`  SMTP User: ${emailConfig.auth.user}`);
  console.log(`  From Email: ${fromEmail}`);
  console.log(`  To: ${testRecipient}\n`);

  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.error('❌ Error: SMTP credentials not configured!');
    console.log('Please ensure SMTP_USER and SMTP_PASS are set in .env.local');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport(emailConfig);

  // Verify connection
  console.log('Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    process.exit(1);
  }

  // Send test email
  console.log('Sending test email...');

  const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 24px; text-align: center; }
    .content { padding: 32px 24px; }
    .success-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 16px 0; }
    .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div style="padding: 20px; background: #f5f5f5;">
    <div class="container">
      <div class="header">
        <h1>🎉 Email Test Successful!</h1>
      </div>
      <div class="content">
        <div class="success-box">
          <strong>Your MinuteAI email notifications are working!</strong>
        </div>
        <p>This is a test email to confirm that your email notification service is properly configured.</p>
        <p><strong>What this means:</strong></p>
        <ul>
          <li>✅ SMTP connection is working</li>
          <li>✅ Email credentials are valid</li>
          <li>✅ You can receive notifications</li>
        </ul>
        <p><strong>You will now receive emails for:</strong></p>
        <ul>
          <li>📅 Meeting reminders</li>
          <li>⏰ Task deadline alerts</li>
          <li>📬 Daily summaries</li>
          <li>👥 Friend requests</li>
          <li>📝 Shared notes</li>
        </ul>
        <p style="color: #6b7280; font-size: 14px;">Sent at: ${new Date().toLocaleString()}</p>
      </div>
      <div class="footer">
        <p>MinuteAI - Your AI-powered meeting assistant</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: testRecipient,
      subject: '✅ MinuteAI Email Test - Success!',
      html: testHtml,
      text: 'Your MinuteAI email notifications are working! This is a test email to confirm your email service is properly configured.',
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`\n📬 Check your inbox at: ${testRecipient}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    process.exit(1);
  }
}

sendTestEmail();
