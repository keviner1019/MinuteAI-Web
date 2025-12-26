'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RecordingState {
  userId: string;
  userName: string;
  isRecording: boolean;
  startedAt: number | null;
}

interface RecordingNotification {
  type: 'recording_started' | 'recording_stopped';
  userId: string;
  userName: string;
  timestamp: number;
}

interface UseRecordingNotificationProps {
  meetingId: string | null;
  userId: string | null;
  userName: string;
}

interface UseRecordingNotificationReturn {
  // State
  recordingUsers: Map<string, RecordingState>;
  isAnyoneRecording: boolean;
  recordingCount: number;
  notifications: RecordingNotification[];

  // Actions
  broadcastRecordingStarted: () => void;
  broadcastRecordingStopped: () => void;
  clearNotifications: () => void;
}

export function useRecordingNotification({
  meetingId,
  userId,
  userName,
}: UseRecordingNotificationProps): UseRecordingNotificationReturn {
  const supabase = useMemo(() => createClient(), []);

  const [recordingUsers, setRecordingUsers] = useState<Map<string, RecordingState>>(new Map());
  const [notifications, setNotifications] = useState<RecordingNotification[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const notificationTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Computed values
  const isAnyoneRecording = recordingUsers.size > 0;
  const recordingCount = recordingUsers.size;

  // Broadcast recording started
  const broadcastRecordingStarted = useCallback(() => {
    if (!channelRef.current || !userId) return;

    const payload: RecordingState = {
      userId,
      userName,
      isRecording: true,
      startedAt: Date.now(),
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'recording_state',
      payload,
    });

    // Note: Do NOT update local recordingUsers state here
    // Local recording state is tracked via the isLocalRecording prop
    // Adding to recordingUsers would cause double-counting

    console.log('Broadcasted recording started');
  }, [userId, userName]);

  // Broadcast recording stopped
  const broadcastRecordingStopped = useCallback(() => {
    if (!channelRef.current || !userId) return;

    const payload: RecordingState = {
      userId,
      userName,
      isRecording: false,
      startedAt: null,
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'recording_state',
      payload,
    });

    // Note: Do NOT update local recordingUsers state here
    // Local recording state is tracked via the isLocalRecording prop
    // Removing from recordingUsers would cause incorrect counts

    console.log('Broadcasted recording stopped');
  }, [userId, userName]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Auto-clear old notifications after 5 seconds
  const addNotification = useCallback((notification: RecordingNotification) => {
    setNotifications((prev) => [...prev, notification]);

    // Clear this notification after 5 seconds
    const timeoutId = setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((n) => n.timestamp !== notification.timestamp)
      );
    }, 5000);

    // Store timeout for cleanup
    notificationTimeoutRef.current.set(notification.timestamp.toString(), timeoutId);
  }, []);

  // Setup Supabase Realtime channel
  useEffect(() => {
    if (!meetingId || !userId) return;

    const channelName = `recording-${meetingId}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // Don't receive own messages
      },
    });

    channel
      .on('broadcast', { event: 'recording_state' }, ({ payload }) => {
        const state = payload as RecordingState;

        if (state.userId === userId) return; // Ignore own messages

        if (state.isRecording) {
          // Someone started recording
          setRecordingUsers((prev) => {
            const updated = new Map(prev);
            updated.set(state.userId, state);
            return updated;
          });

          addNotification({
            type: 'recording_started',
            userId: state.userId,
            userName: state.userName,
            timestamp: Date.now(),
          });
        } else {
          // Someone stopped recording
          setRecordingUsers((prev) => {
            const updated = new Map(prev);
            updated.delete(state.userId);
            return updated;
          });

          addNotification({
            type: 'recording_stopped',
            userId: state.userId,
            userName: state.userName,
            timestamp: Date.now(),
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // When a user leaves, remove their recording state
        leftPresences.forEach((presence: any) => {
          if (presence?.user_id) {
            setRecordingUsers((prev) => {
              const updated = new Map(prev);
              updated.delete(presence.user_id);
              return updated;
            });
          }
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to recording notifications channel');

          // Track presence
          channel.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      // Cleanup timeouts
      notificationTimeoutRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      notificationTimeoutRef.current.clear();

      // Cleanup channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [meetingId, userId, userName, supabase, addNotification]);

  // Note: Unmount cleanup for broadcasting recording stopped is handled
  // by the parent component (meeting page) which tracks isRecording state

  return {
    recordingUsers,
    isAnyoneRecording,
    recordingCount,
    notifications,
    broadcastRecordingStarted,
    broadcastRecordingStopped,
    clearNotifications,
  };
}
