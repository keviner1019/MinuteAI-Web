'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  assignee?: string;
}

interface Meeting {
  id: string;
  title: string;
  room_id: string;
  scheduled_start: string;
  status: string;
}

/**
 * Hook that checks for upcoming deadlines and meetings and shows reminder toasts
 * Runs periodic checks for:
 * - Meetings starting in 15 minutes
 * - Action items with approaching deadlines
 */
export function useReminderNotifications() {
  const { showMeetingReminderToast, showDeadlineReminderToast } = useToast();
  const userIdRef = useRef<string | null>(null);
  const userEmailRef = useRef<string | null>(null);
  const notifiedMeetingsRef = useRef<Set<string>>(new Set());
  const notifiedTodosRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkUpcomingMeetings = useCallback(async () => {
    if (!userIdRef.current) return;

    try {
      const supabase = createClient();
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
      const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);

      // Get meetings starting in 15-20 minutes that user is involved in
      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, title, room_id, scheduled_start, status')
        .gte('scheduled_start', fifteenMinutesFromNow.toISOString())
        .lte('scheduled_start', twentyMinutesFromNow.toISOString())
        .eq('status', 'scheduled');

      if (!meetings || meetings.length === 0) return;

      for (const meetingRow of meetings) {
        const meeting = meetingRow as Meeting;
        // Skip if already notified
        if (notifiedMeetingsRef.current.has(meeting.id)) continue;

        // Check if user is host or participant
        const { data: isParticipant } = await supabase
          .from('meeting_participants')
          .select('id')
          .eq('meeting_id', meeting.id)
          .eq('user_id', userIdRef.current!)
          .single();

        const { data: isInvited } = await supabase
          .from('meeting_invitations')
          .select('id')
          .eq('meeting_id', meeting.id)
          .eq('invitee_email', userEmailRef.current!)
          .single();

        const { data: meetingData } = await supabase
          .from('meetings')
          .select('host_id')
          .eq('id', meeting.id)
          .single();

        const hostId = (meetingData as { host_id: string } | null)?.host_id;
        const isHost = hostId === userIdRef.current;

        if (isParticipant || isInvited || isHost) {
          const scheduledTime = new Date(meeting.scheduled_start);
          const minutesUntil = Math.round((scheduledTime.getTime() - now.getTime()) / 60000);

          showMeetingReminderToast(meeting.title, minutesUntil, meeting.room_id);
          notifiedMeetingsRef.current.add(meeting.id);
        }
      }
    } catch (error) {
      console.error('Error checking upcoming meetings:', error);
    }
  }, [showMeetingReminderToast]);

  const checkUpcomingDeadlines = useCallback(async () => {
    if (!userIdRef.current) return;

    try {
      const supabase = createClient();
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Get notes with action items (user owns or collaborates on)
      const { data: ownedNotes } = await supabase
        .from('notes')
        .select('id, action_items')
        .eq('user_id', userIdRef.current)
        .not('action_items', 'is', null);

      const { data: collaboratorLinks } = await supabase
        .from('note_collaborators')
        .select('note_id')
        .eq('user_id', userIdRef.current);

      const collaboratorNoteIds = (collaboratorLinks as { note_id: string }[] | null)?.map((c) => c.note_id) || [];

      const { data: sharedNotes } = collaboratorNoteIds.length > 0
        ? await supabase
            .from('notes')
            .select('id, action_items')
            .in('id', collaboratorNoteIds)
            .not('action_items', 'is', null)
        : { data: [] };

      interface NoteWithActions {
        id: string;
        action_items: ActionItem[] | null;
      }

      const allNotes = [...((ownedNotes as NoteWithActions[] | null) || []), ...((sharedNotes as NoteWithActions[] | null) || [])];

      for (const note of allNotes) {
        if (!note.action_items) continue;

        const actionItems: ActionItem[] = Array.isArray(note.action_items)
          ? note.action_items
          : [];

        for (const item of actionItems) {
          if (item.completed || !item.dueDate) continue;

          const dueDate = new Date(item.dueDate);

          // Check if due within 24 hours and not already notified
          if (dueDate <= tomorrow && dueDate > now) {
            const todoKey = `${note.id}-${item.id || item.text}`;
            if (notifiedTodosRef.current.has(todoKey)) continue;

            // Format due date for display
            const isToday = dueDate.toDateString() === now.toDateString();
            const isTomorrow = dueDate.toDateString() === tomorrow.toDateString();
            let dueText = 'soon';
            if (isToday) {
              dueText = 'today';
            } else if (isTomorrow) {
              dueText = 'tomorrow';
            }

            showDeadlineReminderToast(item.text, dueText, item.id);
            notifiedTodosRef.current.add(todoKey);
          }
        }
      }
    } catch (error) {
      console.error('Error checking upcoming deadlines:', error);
    }
  }, [showDeadlineReminderToast]);

  useEffect(() => {
    const supabase = createClient();

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      userIdRef.current = session.user.id;
      userEmailRef.current = session.user.email || null;

      // Initial check
      checkUpcomingMeetings();
      checkUpcomingDeadlines();

      // Set up periodic checks (every 5 minutes)
      intervalRef.current = setInterval(() => {
        checkUpcomingMeetings();
        checkUpcomingDeadlines();
      }, 5 * 60 * 1000);
    };

    setup();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkUpcomingMeetings, checkUpcomingDeadlines]);

  // Clear notified sets daily to allow re-notification for recurring items
  useEffect(() => {
    const midnightCheck = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 5) {
        notifiedMeetingsRef.current.clear();
        notifiedTodosRef.current.clear();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(midnightCheck);
  }, []);
}
