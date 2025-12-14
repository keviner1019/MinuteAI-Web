export { sendEmail, verifyEmailConnection, type EmailOptions, type SendEmailResult } from './emailService';
export { emailConfig, isEmailConfigured } from './config';
export {
  meetingReminderTemplate,
  deadlineReminderTemplate,
  meetingInvitationTemplate,
  friendRequestTemplate,
  noteSharedTemplate,
  dailySummaryTemplate,
  type MeetingReminderData,
  type DeadlineReminderData,
  type MeetingInvitationData,
  type FriendRequestData,
  type NoteSharedData,
  type DailySummaryData,
} from './templates';
