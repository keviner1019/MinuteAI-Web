import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';
import { CalendarEvent, CalendarStats } from '@/types/calendar';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || new Date().getMonth().toString());

    // Calculate start and end of month
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const events: CalendarEvent[] = [];
    const today = new Date();

    // Fetch notes created in this month
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('notes')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (notesError) {
      console.error('Error fetching notes:', notesError);
    } else if (notes) {
      notes.forEach(note => {
        events.push({
          id: `note-${note.id}`,
          type: 'note',
          title: note.title || 'Untitled Note',
          date: new Date(note.created_at),
          noteId: note.id,
        });
      });
    }

    // Fetch meetings in this month
    const { data: meetings, error: meetingsError } = await supabaseAdmin
      .from('meetings')
      .select('id, room_id, title, scheduled_at, created_at')
      .eq('host_id', user.id)
      .or(`scheduled_at.gte.${startOfMonth.toISOString()},created_at.gte.${startOfMonth.toISOString()}`)
      .or(`scheduled_at.lte.${endOfMonth.toISOString()},created_at.lte.${endOfMonth.toISOString()}`);

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError);
    } else if (meetings) {
      meetings.forEach(meeting => {
        const meetingDate = meeting.scheduled_at || meeting.created_at;
        const date = new Date(meetingDate);

        // Only include if within the month
        if (date >= startOfMonth && date <= endOfMonth) {
          events.push({
            id: `meeting-${meeting.id}`,
            type: 'meeting',
            title: meeting.title || 'Quick Meeting',
            date: date,
            meetingId: meeting.room_id,
          });
        }
      });
    }

    // Fetch action items with deadlines in this month
    const { data: notesWithActionItems, error: actionItemsError } = await supabaseAdmin
      .from('notes')
      .select('id, title, action_items')
      .eq('user_id', user.id)
      .not('action_items', 'is', null);

    if (actionItemsError) {
      console.error('Error fetching action items:', actionItemsError);
    } else if (notesWithActionItems) {
      notesWithActionItems.forEach(note => {
        const actionItems = note.action_items as any[] || [];
        actionItems.forEach(item => {
          if (item.deadline) {
            const deadlineDate = new Date(item.deadline);
            if (deadlineDate >= startOfMonth && deadlineDate <= endOfMonth) {
              events.push({
                id: `action-${item.id}`,
                type: 'action_item',
                title: item.text,
                date: deadlineDate,
                status: item.completed ? 'completed' : 'pending',
                priority: item.priority,
                noteId: note.id,
              });
            }
          }
        });
      });
    }

    // Calculate stats
    const stats: CalendarStats = {
      upcoming: events.filter(e => new Date(e.date) >= today).length,
      past: events.filter(e => new Date(e.date) < today).length,
      meetings: events.filter(e => e.type === 'meeting').length,
      pendingTasks: events.filter(e => e.type === 'action_item' && e.status === 'pending').length,
    };

    return NextResponse.json({
      events,
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/calendar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
