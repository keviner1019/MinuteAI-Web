// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CalendarEvent, CalendarStats } from '@/types/calendar';

/**
 * Custom hook to fetch calendar events for a specific month
 * Includes both owned and shared notes/meetings
 */
export function useCalendarEvents(
  userId: string | null,
  year: number,
  month: number,
  userEmail?: string | null
) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<CalendarStats>({
    upcoming: 0,
    past: 0,
    meetings: 0,
    pendingTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      const today = new Date();

      // Fetch owned notes
      const { data: ownedNotes, error: notesError } = await supabase
        .from('notes')
        .select('id, title, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (notesError) throw notesError;

      // Fetch shared notes (where user is collaborator)
      const { data: collaborations } = await supabase
        .from('note_collaborators')
        .select('note_id, role')
        .eq('user_id', userId);

      let sharedNotes: any[] = [];
      if (collaborations && collaborations.length > 0) {
        const noteIds = collaborations.map(c => c.note_id);
        const { data: shared } = await supabase
          .from('notes')
          .select('id, title, created_at, user_id')
          .in('id', noteIds)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        sharedNotes = shared || [];
      }

      // Combine owned and shared notes
      const notes = [...(ownedNotes || []), ...sharedNotes];

      // Fetch meetings where user is host
      const { data: hostedMeetings, error: hostedError } = await supabase
        .from('meetings')
        .select('id, room_id, title, created_at, scheduled_at, status, host_id')
        .eq('host_id', userId);

      if (hostedError) throw hostedError;

      // Fetch meetings where user is a participant
      const { data: participantMeetings } = await supabase
        .from('meeting_participants')
        .select('meeting_id, meetings(id, room_id, title, created_at, scheduled_at, status, host_id)')
        .eq('user_id', userId);

      // Fetch meetings where user is invited (via email) - include both pending and accepted
      let invitedMeetings: any[] = [];
      if (userEmail) {
        const { data: invitations } = await supabase
          .from('meeting_invitations')
          .select('meeting_id, meetings(id, room_id, title, created_at, scheduled_at, status, host_id)')
          .eq('invitee_email', userEmail.toLowerCase())
          .in('status', ['pending', 'accepted']);

        if (invitations) {
          invitedMeetings = invitations
            .filter((inv: any) => inv.meetings)
            .map((inv: any) => inv.meetings);
        }
      }

      // Combine all meetings and deduplicate by ID
      const allMeetings: any[] = [
        ...(hostedMeetings || []),
        ...(participantMeetings?.filter((p: any) => p.meetings).map((p: any) => p.meetings) || []),
        ...invitedMeetings,
      ];

      // Deduplicate by meeting ID
      const meetingMap = new Map<string, any>();
      allMeetings.forEach((meeting: any) => {
        if (meeting && !meetingMap.has(meeting.id)) {
          meetingMap.set(meeting.id, meeting);
        }
      });
      const meetings = Array.from(meetingMap.values());

      // Fetch owned notes with action items that have deadlines
      const { data: ownedNotesWithActions, error: actionsError } = await supabase
        .from('notes')
        .select('id, title, action_items')
        .eq('user_id', userId)
        .not('action_items', 'is', null);

      if (actionsError) throw actionsError;

      // Fetch shared notes with action items
      let sharedNotesWithActions: any[] = [];
      if (collaborations && collaborations.length > 0) {
        const noteIds = collaborations.map(c => c.note_id);
        const { data: shared } = await supabase
          .from('notes')
          .select('id, title, action_items, user_id')
          .in('id', noteIds)
          .not('action_items', 'is', null);
        sharedNotesWithActions = shared || [];
      }

      const notesWithActions = [...(ownedNotesWithActions || []), ...sharedNotesWithActions];

      // Create a set of shared note IDs for quick lookup
      const sharedNoteIds = new Set(sharedNotes.map(n => n.id));
      const sharedActionNoteIds = new Set(sharedNotesWithActions.map(n => n.id));

      // Transform data into calendar events
      const calendarEvents: CalendarEvent[] = [];

      // Add notes
      (notes || []).forEach((note: any) => {
        const isShared = sharedNoteIds.has(note.id);
        calendarEvents.push({
          id: `note-${note.id}`,
          type: 'note',
          title: note.title,
          date: new Date(note.created_at),
          noteId: note.id,
          isShared,
        });
      });

      // Add meetings
      (meetings || []).forEach((meeting: any) => {
        const meetingDate = meeting.scheduled_at || meeting.created_at;
        const dateObj = new Date(meetingDate);
        const isShared = meeting.host_id !== userId; // User is guest, not host
        if (dateObj >= startDate && dateObj <= endDate) {
          calendarEvents.push({
            id: `meeting-${meeting.id}`,
            type: 'meeting',
            title: meeting.title || 'Quick Meeting',
            date: dateObj,
            meetingId: meeting.room_id,
            status: meeting.status === 'completed' ? 'completed' : 'pending',
            isShared,
          });
        }
      });

      // Add action items with deadlines
      (notesWithActions || []).forEach((note: any) => {
        const isShared = sharedActionNoteIds.has(note.id);
        const actionItems = note.action_items || [];
        actionItems.forEach((item: any) => {
          if (item.deadline) {
            const deadlineDate = new Date(item.deadline);
            if (deadlineDate >= startDate && deadlineDate <= endDate) {
              calendarEvents.push({
                id: `action-${item.id}`,
                type: 'action_item',
                title: item.text,
                date: deadlineDate,
                time: deadlineDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                status: item.completed ? 'completed' : 'pending',
                priority: item.priority,
                noteId: note.id,
                isShared,
              });
            }
          }
        });
      });

      setEvents(calendarEvents);

      // Calculate stats
      const upcomingCount = calendarEvents.filter(
        (e) => new Date(e.date) >= today && e.status !== 'completed'
      ).length;
      const pastCount = calendarEvents.filter(
        (e) => new Date(e.date) < today || e.status === 'completed'
      ).length;
      const meetingsCount = calendarEvents.filter((e) => e.type === 'meeting').length;
      const pendingTasksCount = calendarEvents.filter(
        (e) => e.type === 'action_item' && e.status !== 'completed'
      ).length;

      setStats({
        upcoming: upcomingCount,
        past: pastCount,
        meetings: meetingsCount,
        pendingTasks: pendingTasksCount,
      });
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [userId, year, month, userEmail, supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const toggleActionItem = useCallback(
    async (eventId: string, noteId: string) => {
      // Extract the actual action item ID
      const actionItemId = eventId.replace('action-', '');

      try {
        // Get the note
        const { data: note, error: fetchError } = await supabase
          .from('notes')
          .select('action_items')
          .eq('id', noteId)
          .single();

        if (fetchError) throw fetchError;

        // Find the item being toggled
        const noteData = note as { action_items: any[] } | null;
        const itemToToggle = (noteData?.action_items || []).find((item: any) => item.id === actionItemId);
        if (!itemToToggle) {
          console.error('Action item not found:', actionItemId);
          return;
        }

        // Toggle the action item
        const toggledItem = { ...itemToToggle, completed: !itemToToggle.completed };
        const actionItems = (noteData?.action_items || []).map((item: any) => {
          if (item.id === actionItemId) {
            return toggledItem;
          }
          return item;
        });

        // Get current session for auth
        const { data: { session } } = await supabase.auth.getSession();

        // Update via API to trigger real-time notifications
        const response = await fetch(`/api/notes/${noteId}/action-items`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            actionItems,
            changeType: itemToToggle.completed ? 'uncompleted' : 'completed',
            changedItem: toggledItem,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to toggle action item');
        }

        // Refetch events
        await fetchEvents();
      } catch (err) {
        console.error('Error toggling action item:', err);
      }
    },
    [supabase, fetchEvents]
  );

  return {
    events,
    stats,
    loading,
    error,
    refetch: fetchEvents,
    toggleActionItem,
  };
}
