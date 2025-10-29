'use client';

import { useState, useEffect } from 'react';
import { subscribeToNotes } from '@/lib/supabase/database';
import { Note } from '@/types';

/**
 * Custom hook to fetch a real-time list of notes for the current user
 */
export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Subscribe to real-time updates
      const unsubscribe = subscribeToNotes(
        userId,
        (updatedNotes) => {
          setNotes(updatedNotes);
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up notes listener:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      setLoading(false);
    }
  }, [userId]);

  return { notes, loading, error };
}
