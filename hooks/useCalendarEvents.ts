// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CalendarEvent, CalendarStats } from '@/types/calendar';

/**
 * Custom hook to fetch calendar events for a specific month
 */
export function useCalendarEvents(
  userId: string | null,
  year: number,
  month: number
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

      // Fetch notes
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('id, title, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (notesError) throw notesError;

      // Fetch meetings
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id, room_id, title, created_at, scheduled_at, status')
        .eq('host_id', userId)
        .or(`created_at.gte.${startDate.toISOString()},scheduled_at.gte.${startDate.toISOString()}`);

      if (meetingsError) throw meetingsError;

      // Fetch notes with action items that have deadlines
      const { data: notesWithActions, error: actionsError } = await supabase
        .from('notes')
        .select('id, title, action_items')
        .eq('user_id', userId)
        .not('action_items', 'is', null);

      if (actionsError) throw actionsError;

      // Transform data into calendar events
      const calendarEvents: CalendarEvent[] = [];

      // Add notes
      (notes || []).forEach((note: any) => {
        calendarEvents.push({
          id: `note-${note.id}`,
          type: 'note',
          title: note.title,
          date: new Date(note.created_at),
          noteId: note.id,
        });
      });

      // Add meetings
      (meetings || []).forEach((meeting: any) => {
        const meetingDate = meeting.scheduled_at || meeting.created_at;
        const dateObj = new Date(meetingDate);
        if (dateObj >= startDate && dateObj <= endDate) {
          calendarEvents.push({
            id: `meeting-${meeting.id}`,
            type: 'meeting',
            title: meeting.title || 'Quick Meeting',
            date: dateObj,
            meetingId: meeting.room_id,
            status: meeting.status === 'completed' ? 'completed' : 'pending',
          });
        }
      });

      // Add action items with deadlines
      (notesWithActions || []).forEach((note: any) => {
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
  }, [userId, year, month, supabase]);

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

        // Toggle the action item
        const noteData = note as { action_items: any[] } | null;
        const actionItems = (noteData?.action_items || []).map((item: any) => {
          if (item.id === actionItemId) {
            return { ...item, completed: !item.completed };
          }
          return item;
        });

        // Update the note
        const { error: updateError } = await supabase
          .from('notes')
          .update({ action_items: actionItems } as any)
          .eq('id', noteId);

        if (updateError) throw updateError;

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
