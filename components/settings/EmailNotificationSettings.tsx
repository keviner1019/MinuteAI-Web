'use client';

import { useEmailPreferences } from '@/hooks/useEmailPreferences';
import { Mail, Bell, Calendar, Users, FileText, Clock, Loader2 } from 'lucide-react';

export function EmailNotificationSettings() {
  const {
    preferences,
    loading,
    saving,
    error,
    togglePreference,
    setReminderMinutes,
  } = useEmailPreferences();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const toggleItems = [
    {
      key: 'meeting_reminders' as const,
      label: 'Meeting Reminders',
      description: 'Get notified before your meetings start',
      icon: Calendar,
    },
    {
      key: 'deadline_reminders' as const,
      label: 'Deadline Reminders',
      description: 'Get notified when tasks are due soon',
      icon: Bell,
    },
    {
      key: 'daily_summary' as const,
      label: 'Daily Summary',
      description: "Receive a daily overview of your meetings and tasks",
      icon: Mail,
    },
    {
      key: 'friend_requests' as const,
      label: 'Friend Requests',
      description: 'Get notified when someone sends you a friend request',
      icon: Users,
    },
    {
      key: 'note_shared' as const,
      label: 'Shared Notes',
      description: 'Get notified when someone shares a note with you',
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {toggleItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => togglePreference(item.key)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  preferences[item.key] ? 'bg-indigo-600' : 'bg-gray-200'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={preferences[item.key]}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    preferences[item.key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Reminder timing setting */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Reminder Timing</p>
            <p className="text-sm text-gray-500 mb-3">
              How many minutes before a meeting should we send the reminder?
            </p>
            <select
              value={preferences.reminder_minutes_before}
              onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
              disabled={saving || !preferences.meeting_reminders}
              className={`block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                !preferences.meeting_reminders ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value={5}>5 minutes before</option>
              <option value={10}>10 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
            </select>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Email notifications are sent to your registered email address. You can change your email in your profile settings.
      </p>
    </div>
  );
}
