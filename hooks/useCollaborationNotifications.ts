'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import Pusher, { Channel } from 'pusher-js';
import { createClient } from '@/lib/supabase/client';

interface NotificationPayload {
  type:
    | 'collaborator-added'
    | 'collaborator-removed'
    | 'action-item-completed'
    | 'action-item-updated'
    | 'action-item-deleted'
    | 'note-updated'
    | 'invitation-accepted'
    | 'invitation-declined';
  noteId?: string;
  meetingId?: string;
  roomId?: string;
  meetingTitle?: string;
  noteTitle?: string;
  triggeredBy?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  respondedBy?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  data?: Record<string, any>;
  timestamp: string;
  excludeUserId?: string;
}

// Note: MeetingInvitePayload handling has been moved to MeetingNotificationContext
// which shows the proper MeetingInvitationModal with accept/decline and countdown timer

// Singleton Pusher instance
let pusherInstance: Pusher | null = null;

function getPusherInstance(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    });
  }
  return pusherInstance;
}

/**
 * Hook that listens for collaboration notifications (invites, action item updates)
 * Note: Meeting invites are handled by MeetingNotificationContext which shows the proper modal
 */
export function useCollaborationNotifications() {
  const { showCollaboratorAddedToast, showActionItemUpdateToast, showToast } = useToast();
  const channelRef = useRef<Channel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());

  const handleNotification = useCallback(
    (payload: NotificationPayload) => {
      // Skip if this event was triggered by the current user
      if (payload.triggeredBy?.id === userIdRef.current) return;
      if (payload.respondedBy?.id === userIdRef.current) return;
      if (payload.excludeUserId === userIdRef.current) return;

      // Create unique event key to avoid duplicates
      const eventKey = `${payload.type}-${payload.noteId || payload.meetingId}-${payload.timestamp}`;
      if (processedEventsRef.current.has(eventKey)) return;
      processedEventsRef.current.add(eventKey);

      const senderName = payload.triggeredBy?.displayName || payload.respondedBy?.displayName || 'Someone';
      const avatarUrl = payload.triggeredBy?.avatarUrl || payload.respondedBy?.avatarUrl;

      switch (payload.type) {
        case 'collaborator-added':
          showCollaboratorAddedToast(senderName, payload.noteTitle || 'a note', avatarUrl, payload.noteId);
          break;
        case 'action-item-completed':
          showActionItemUpdateToast(
            senderName,
            'completed',
            payload.data?.itemText || 'a task',
            avatarUrl,
            payload.data?.itemId
          );
          break;
        case 'action-item-updated':
          showActionItemUpdateToast(
            senderName,
            'updated',
            payload.data?.itemText || 'a task',
            avatarUrl,
            payload.data?.itemId
          );
          break;
        case 'action-item-deleted':
          showActionItemUpdateToast(
            senderName,
            'deleted',
            payload.data?.itemText || 'a task',
            avatarUrl,
            payload.data?.itemId
          );
          break;
        case 'invitation-accepted':
          showToast({
            type: 'success',
            title: `${senderName} accepted`,
            message: `Joining "${payload.meetingTitle}"`,
            avatar: avatarUrl,
            duration: 5000,
            navigateTo: payload.roomId ? `/meeting/${payload.roomId}` : undefined,
          });
          break;
        case 'invitation-declined':
          showToast({
            type: 'info',
            title: `${senderName} declined`,
            message: `Can't join "${payload.meetingTitle}"`,
            avatar: avatarUrl,
            duration: 5000,
          });
          break;
      }
    },
    [showCollaboratorAddedToast, showActionItemUpdateToast, showToast]
  );

  // Note: meeting-invite handler removed - now handled by MeetingNotificationContext
  // which shows the proper MeetingInvitationModal with accept/decline and 60-second countdown

  useEffect(() => {
    const supabase = createClient();
    const pusher = getPusherInstance();

    const setupNotifications = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      userIdRef.current = session.user.id;

      // Subscribe to personal notification channel
      const channelName = `private-user-${session.user.id}`;
      channelRef.current = pusher.subscribe(channelName);

      // Bind notification handler for collaboration events
      channelRef.current.bind('notification', handleNotification);

      // Note: meeting-invite is handled by MeetingNotificationContext which shows the proper modal

      // Clean up old processed events periodically
      const cleanupInterval = setInterval(() => {
        if (processedEventsRef.current.size > 100) {
          processedEventsRef.current.clear();
        }
      }, 60000);

      return () => clearInterval(cleanupInterval);
    };

    setupNotifications();

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelRef.current.name);
      }
    };
  }, [handleNotification]);
}

/**
 * Hook that listens for updates on a specific note (for collaborators viewing the same note)
 */
export function useNoteCollaborationNotifications(noteId: string | null) {
  const { showActionItemUpdateToast } = useToast();
  const channelRef = useRef<Channel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());

  const handleNoteNotification = useCallback(
    (payload: NotificationPayload) => {
      // Skip if this event was triggered by the current user
      if (payload.triggeredBy?.id === userIdRef.current) return;
      if (payload.excludeUserId === userIdRef.current) return;

      // Create unique event key to avoid duplicates
      const eventKey = `${payload.type}-${payload.noteId}-${payload.timestamp}`;
      if (processedEventsRef.current.has(eventKey)) return;
      processedEventsRef.current.add(eventKey);

      const senderName = payload.triggeredBy?.displayName || 'Someone';
      const avatarUrl = payload.triggeredBy?.avatarUrl;

      switch (payload.type) {
        case 'action-item-completed':
          showActionItemUpdateToast(
            senderName,
            'completed',
            payload.data?.itemText || 'a task',
            avatarUrl,
            payload.data?.itemId
          );
          break;
        case 'action-item-updated':
          showActionItemUpdateToast(
            senderName,
            'updated',
            payload.data?.itemText || 'a task',
            avatarUrl,
            payload.data?.itemId
          );
          break;
        case 'action-item-deleted':
          showActionItemUpdateToast(
            senderName,
            'deleted',
            payload.data?.itemText || 'a task',
            avatarUrl,
            payload.data?.itemId
          );
          break;
      }
    },
    [showActionItemUpdateToast]
  );

  useEffect(() => {
    if (!noteId) return;

    const supabase = createClient();
    const pusher = getPusherInstance();

    const setupNoteNotifications = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      userIdRef.current = session.user.id;

      // Subscribe to note-specific channel
      const channelName = `private-note-${noteId}`;
      channelRef.current = pusher.subscribe(channelName);

      channelRef.current.bind('notification', handleNoteNotification);
    };

    setupNoteNotifications();

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelRef.current.name);
      }
    };
  }, [noteId, handleNoteNotification]);
}
