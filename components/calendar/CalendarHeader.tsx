'use client';

import { CalendarStats } from '@/types/calendar';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Video,
  ListTodo,
} from 'lucide-react';

interface CalendarHeaderProps {
  currentYear: number;
  currentMonth: number;
  stats: CalendarStats;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarHeader({
  currentYear,
  currentMonth,
  stats,
  onPrevMonth,
  onNextMonth,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Month/Year and Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <p className="text-purple-200 mt-1">
            {stats.upcoming} upcoming · {stats.past} past events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToday}
            className="px-4 py-2 bg-white text-purple-700 rounded-lg font-semibold text-sm hover:bg-purple-50 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevMonth}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={onNextMonth}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.upcoming}</p>
              <p className="text-sm text-purple-200">Upcoming</p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.past}</p>
              <p className="text-sm text-purple-200">Past</p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.meetings}</p>
              <p className="text-sm text-purple-200">Meetings</p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ListTodo className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pendingTasks}</p>
              <p className="text-sm text-purple-200">Pending Tasks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
