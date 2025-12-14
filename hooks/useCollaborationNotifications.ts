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
    | 'note-updated';
  noteId: string;
  noteTitle?: string;
  triggeredBy: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  data?: Record<string, any>;
  timestamp: string;
  excludeUserId?: string;
}

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
 */
export function useCollaborationNotifications() {
  const { showCollaboratorAddedToast, showActionItemUpdateToast } = useToast();
  const channelRef = useRef<Channel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());

  const handleNotification = useCallback(
    (payload: NotificationPayload) => {
      // Skip if this event was triggered by the current user
      if (payload.triggeredBy.id === userIdRef.current) return;
      if (payload.excludeUserId === userIdRef.current) return;

      // Create unique event key to avoid duplicates
      const eventKey = `${payload.type}-${payload.noteId}-${payload.timestamp}`;
      if (processedEventsRef.current.has(eventKey)) return;
      processedEventsRef.current.add(eventKey);

      const senderName = payload.triggeredBy.displayName || 'Someone';
      const avatarUrl = payload.triggeredBy.avatarUrl;

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
      }
    },
    [showCollaboratorAddedToast, showActionItemUpdateToast]
  );

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

      channelRef.current.bind('notification', handleNotification);

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
      if (payload.triggeredBy.id === userIdRef.current) return;
      if (payload.excludeUserId === userIdRef.current) return;

      // Create unique event key to avoid duplicates
      const eventKey = `${payload.type}-${payload.noteId}-${payload.timestamp}`;
      if (processedEventsRef.current.has(eventKey)) return;
      processedEventsRef.current.add(eventKey);

      const senderName = payload.triggeredBy.displayName || 'Someone';
      const avatarUrl = payload.triggeredBy.avatarUrl;

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
