'use client';

import { CalendarEvent } from '@/types/calendar';
import { FileText, Video, CheckCircle2 } from 'lucide-react';

interface EventPillProps {
  event: CalendarEvent;
}

export default function EventPill({ event }: EventPillProps) {
  const getEventStyle = () => {
    if (event.type === 'note') {
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: FileText,
      };
    }

    if (event.type === 'meeting') {
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        icon: Video,
      };
    }

    // Action items - color by priority and status
    if (event.status === 'completed') {
      return {
        bg: 'bg-green-100',
        text: 'text-green-700 line-through',
        icon: CheckCircle2,
      };
    }

    switch (event.priority) {
      case 'high':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          icon: null,
        };
      case 'medium':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-700',
          icon: null,
        };
      case 'low':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-700',
          icon: null,
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          icon: null,
        };
    }
  };

  const style = getEventStyle();
  const Icon = style.icon;

  return (
    <div
      className={`
        flex items-center gap-1 px-2 py-1 rounded text-xs font-medium truncate
        ${style.bg} ${style.text}
      `}
      title={event.title}
    >
      {Icon && <Icon className="h-3 w-3 flex-shrink-0" />}
      <span className="truncate">{event.title}</span>
    </div>
  );
}
