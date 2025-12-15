'use client';

import { CalendarEvent } from '@/types/calendar';
import EventPill from './EventPill';

interface CalendarDayProps {
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export default function CalendarDay({
  date,
  events,
  isCurrentMonth,
  isToday,
  isSelected,
  onClick,
}: CalendarDayProps) {
  const maxVisibleEvents = 3;
  const visibleEvents = events.slice(0, maxVisibleEvents);
  const remainingCount = events.length - maxVisibleEvents;

  return (
    <button
      id={isCurrentMonth ? `calendar-day-${date.getDate()}` : undefined}
      onClick={onClick}
      className={`
        min-h-[100px] p-2 border-b border-r border-gray-100 text-left
        transition-all duration-200 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset
        ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
        ${isSelected ? 'ring-2 ring-blue-500 ring-inset bg-blue-50' : ''}
      `}
    >
      {/* Date Number */}
      <div className="flex justify-between items-start mb-1">
        <span
          className={`
            inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full
            ${isToday
              ? 'bg-purple-600 text-white'
              : isCurrentMonth
                ? 'text-gray-900'
                : 'text-gray-400'
            }
          `}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Events */}
      <div className="space-y-1">
        {visibleEvents.map((event) => (
          <EventPill key={event.id} event={event} />
        ))}
        {remainingCount > 0 && (
          <div className="text-xs text-gray-500 font-medium px-1">
            +{remainingCount} more
          </div>
        )}
      </div>
    </button>
  );
}
