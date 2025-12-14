'use client';

import { useFriendNotifications } from '@/hooks/useFriendNotifications';
import { useCollaborationNotifications } from '@/hooks/useCollaborationNotifications';
import { useMeetingNotifications } from '@/hooks/useMeetingNotifications';
import { useReminderNotifications } from '@/hooks/useReminderNotifications';

/**
 * Component that initializes real-time notification listeners
 * This runs the hooks that listen for various notification events:
 * - Friend requests and acceptances
 * - Collaboration events (note sharing, action item updates)
 * - Meeting invitations and status changes
 * - Deadline and meeting reminders
 */
export default function NotificationListener() {
  // Listen for friend request/acceptance notifications
  useFriendNotifications();

  // Listen for collaboration notifications (note sharing, action item updates)
  useCollaborationNotifications();

  // Listen for meeting invitations and status changes
  useMeetingNotifications();

  // Check for upcoming deadlines and meeting reminders
  useReminderNotifications();

  // This component doesn't render anything
  return null;
}
