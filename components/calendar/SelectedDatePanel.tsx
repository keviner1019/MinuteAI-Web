'use client';

import { CalendarEvent } from '@/types/calendar';
import { X, Check, FileText, Video, AlertCircle, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';

interface SelectedDatePanelProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onToggleActionItem: (eventId: string, noteId: string) => void;
  onViewDetails: (event: CalendarEvent) => void;
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatShortDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function SelectedDatePanel({
  selectedDate,
  events,
  onClose,
  onToggleActionItem,
  onViewDetails,
}: SelectedDatePanelProps) {
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-orange-100 text-orange-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'note':
        return FileText;
      case 'meeting':
        return Video;
      case 'action_item':
        return AlertCircle;
      default:
        return FileText;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">
              Selected Date
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-1">
              {formatDate(selectedDate)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            aria-label="Close panel"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block p-3 bg-gray-100 rounded-full mb-3">
              <Clock className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No events on this day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const TypeIcon = getTypeIcon(event.type);

              return (
                <div
                  key={event.id}
                  className={`
                    p-4 rounded-xl border-2 transition-all
                    ${event.type === 'action_item' && event.status === 'completed'
                      ? 'bg-gray-50 border-gray-200 opacity-75'
                      : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Event Header */}
                  <div className="flex items-start gap-3">
                    {event.type === 'action_item' && (
                      <button
                        onClick={() => event.noteId && onToggleActionItem(event.id, event.noteId)}
                        className={`
                          mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${event.status === 'completed'
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-purple-500'
                          }
                        `}
                      >
                        {event.status === 'completed' && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Type Label */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {event.type === 'action_item' ? 'ACTION ITEM' : event.type.toUpperCase()}
                        </span>
                        {event.priority && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPriorityColor(event.priority)}`}>
                            {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)} Priority
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className={`font-medium text-gray-900 ${event.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                        {event.title}
                      </p>

                      {/* Time if available */}
                      {event.time && (
                        <p className="text-sm text-gray-500 mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {event.time}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Type</span>
                        <p className="font-medium text-gray-900 capitalize flex items-center gap-1">
                          <TypeIcon className="h-3 w-3" />
                          {event.type.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Date</span>
                        <p className="font-medium text-gray-900">{formatShortDate(new Date(event.date))}</p>
                      </div>
                      {event.time && (
                        <div>
                          <span className="text-gray-500">Time</span>
                          <p className="font-medium text-gray-900">{event.time}</p>
                        </div>
                      )}
                      {event.priority && (
                        <div>
                          <span className="text-gray-500">Priority</span>
                          <p className={`font-medium capitalize ${
                            event.priority === 'high' ? 'text-red-600' :
                            event.priority === 'medium' ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {event.priority}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-3">
                    {event.type === 'action_item' && event.status !== 'completed' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => event.noteId && onToggleActionItem(event.id, event.noteId)}
                        className="w-full bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                      >
                        <Check className="h-3 w-3" />
                        Mark as Complete
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onViewDetails(event)}
                        className="w-full"
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
