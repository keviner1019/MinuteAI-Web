export interface CalendarEvent {
  id: string;
  type: 'note' | 'meeting' | 'action_item';
  title: string;
  date: Date;
  time?: string;
  status?: 'pending' | 'completed';
  priority?: 'high' | 'medium' | 'low';
  noteId?: string;
  meetingId?: string;
}

export interface CalendarStats {
  upcoming: number;
  past: number;
  meetings: number;
  pendingTasks: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  events: CalendarEvent[];
  stats: CalendarStats;
}
