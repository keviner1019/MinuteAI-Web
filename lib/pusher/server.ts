import Pusher from 'pusher';

// Initialize Pusher server instance
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export default pusher;

// Event types for real-time notifications
export type NotificationEventType =
  | 'collaborator-added'
  | 'collaborator-removed'
  | 'action-item-completed'
  | 'action-item-updated'
  | 'action-item-deleted'
  | 'note-updated';

export interface NotificationPayload {
  type: NotificationEventType;
  noteId: string;
  noteTitle?: string;
  triggeredBy: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  data?: Record<string, any>;
  timestamp: string;
}

/**
 * Send a notification to a specific user
 */
export async function sendUserNotification(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    await pusher.trigger(`private-user-${userId}`, 'notification', payload);
  } catch (error) {
    console.error('Error sending user notification:', error);
  }
}

/**
 * Send a notification to all collaborators of a note
 */
export async function sendNoteNotification(
  noteId: string,
  payload: NotificationPayload,
  excludeUserId?: string
): Promise<void> {
  try {
    await pusher.trigger(`private-note-${noteId}`, 'notification', {
      ...payload,
      excludeUserId, // Client can filter this out
    });
  } catch (error) {
    console.error('Error sending note notification:', error);
  }
}
