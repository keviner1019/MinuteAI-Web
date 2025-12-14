'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import SelectedDatePanel from '@/components/calendar/SelectedDatePanel';
import {
  ArrowLeft,
  Loader2,
  Calendar as CalendarIcon,
  Plus,
} from 'lucide-react';
import { CalendarEvent, CalendarStats } from '@/types/calendar';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';

export default function CalendarPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { events, stats, loading, error, refetch, toggleActionItem } = useCalendarEvents(
    user?.id || null,
    currentYear,
    currentMonth
  );

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(today);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleClosePanel = () => {
    setSelectedDate(null);
  };

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      );
    });
  }, [selectedDate, events]);

  const handleToggleActionItem = async (eventId: string, noteId: string) => {
    await toggleActionItem(eventId, noteId);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-6 hover:scale-105 transition-transform group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                    <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-2xl">
                      <CalendarIcon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 bg-clip-text text-transparent">
                      Calendar
                    </h1>
                    <p className="text-gray-600 mt-1">View all your meetings, notes, and action items</p>
                  </div>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Schedule Meeting
              </Button>
            </div>
          </div>

          {/* Calendar Header with Month Navigation */}
          <CalendarHeader
            currentYear={currentYear}
            currentMonth={currentMonth}
            stats={stats}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onToday={goToToday}
          />

          {/* Main Content Area */}
          <div className="flex gap-6 mt-6">
            {/* Calendar Grid */}
            <div className={`flex-1 transition-all duration-300 ${selectedDate ? 'lg:w-2/3' : 'w-full'}`}>
              {loading ? (
                <div className="flex items-center justify-center py-20 bg-white rounded-2xl shadow-lg">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading calendar...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-2xl text-sm font-medium">
                  Error: {error}
                </div>
              ) : (
                <CalendarGrid
                  year={currentYear}
                  month={currentMonth}
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                />
              )}
            </div>

            {/* Selected Date Panel */}
            {selectedDate && (
              <div className="hidden lg:block w-96 animate-in slide-in-from-right-4 duration-300">
                <SelectedDatePanel
                  selectedDate={selectedDate}
                  events={selectedDateEvents}
                  onClose={handleClosePanel}
                  onToggleActionItem={handleToggleActionItem}
                  onViewDetails={(event) => {
                    if (event.type === 'note') {
                      router.push(`/notes/${event.noteId}`);
                    } else if (event.type === 'meeting') {
                      router.push(`/meeting/${event.meetingId}`);
                    } else if (event.type === 'action_item' && event.noteId) {
                      router.push(`/notes/${event.noteId}`);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Mobile Selected Date Panel */}
          {selectedDate && (
            <div className="lg:hidden mt-6 animate-in slide-in-from-bottom-4 duration-300">
              <SelectedDatePanel
                selectedDate={selectedDate}
                events={selectedDateEvents}
                onClose={handleClosePanel}
                onToggleActionItem={handleToggleActionItem}
                onViewDetails={(event) => {
                  if (event.type === 'note') {
                    router.push(`/notes/${event.noteId}`);
                  } else if (event.type === 'meeting') {
                    router.push(`/meeting/${event.meetingId}`);
                  } else if (event.type === 'action_item' && event.noteId) {
                    router.push(`/notes/${event.noteId}`);
                  }
                }}
              />
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
