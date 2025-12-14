'use client';

import { useFriendNotifications } from '@/hooks/useFriendNotifications';
import { useCollaborationNotifications } from '@/hooks/useCollaborationNotifications';

/**
 * Component that initializes real-time notification listeners
 * This runs the hooks that listen for friend requests and collaboration events
 */
export default function NotificationListener() {
  // Listen for friend request/acceptance notifications
  useFriendNotifications();

  // Listen for collaboration notifications (note sharing, action item updates)
  useCollaborationNotifications();

  // This component doesn't render anything
  return null;
}
