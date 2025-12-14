'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface EmailPreferences {
  meeting_reminders: boolean;
  deadline_reminders: boolean;
  daily_summary: boolean;
  friend_requests: boolean;
  note_shared: boolean;
  reminder_minutes_before: number;
}

const DEFAULT_PREFERENCES: EmailPreferences = {
  meeting_reminders: true,
  deadline_reminders: true,
  daily_summary: true,
  friend_requests: true,
  note_shared: true,
  reminder_minutes_before: 15,
};

export function useEmailPreferences() {
  const [preferences, setPreferences] = useState<EmailPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences || DEFAULT_PREFERENCES);
    } catch (err) {
      console.error('Error fetching email preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<EmailPreferences>) => {
    try {
      setSaving(true);
      setError(null);

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);

      return { success: true };
    } catch (err) {
      console.error('Error updating email preferences:', err);
      const message = err instanceof Error ? err.message : 'Failed to save preferences';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  }, []);

  const togglePreference = useCallback(async (key: keyof Omit<EmailPreferences, 'reminder_minutes_before'>) => {
    const newValue = !preferences[key];
    return updatePreferences({ [key]: newValue });
  }, [preferences, updatePreferences]);

  const setReminderMinutes = useCallback(async (minutes: number) => {
    return updatePreferences({ reminder_minutes_before: minutes });
  }, [updatePreferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    saving,
    error,
    updatePreferences,
    togglePreference,
    setReminderMinutes,
    refetch: fetchPreferences,
  };
}
