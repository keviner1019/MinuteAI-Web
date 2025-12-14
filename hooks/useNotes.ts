'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeToNotes, getNotes, getSharedNotes } from '@/lib/supabase/database';
import { Note } from '@/types';

export interface SharedNote extends Note {
  collaboratorRole: 'editor' | 'viewer';
  ownerName?: string;
}

/**
 * Custom hook to fetch a real-time list of notes for the current user
 * Includes both owned notes and notes shared with the user
 */
export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch shared notes
  const fetchSharedNotes = useCallback(async () => {
    if (!userId) return;
    try {
      const shared = await getSharedNotes(userId);
      setSharedNotes(shared);
    } catch (err) {
      console.error('Error fetching shared notes:', err);
    }
  }, [userId]);

  // Manual refresh function
  const refreshNotes = useCallback(async () => {
    if (!userId) return;

    try {
      const [updatedNotes, shared] = await Promise.all([
        getNotes(userId),
        getSharedNotes(userId),
      ]);
      setNotes(updatedNotes);
      setSharedNotes(shared);
    } catch (err) {
      console.error('Error refreshing notes:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setSharedNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Subscribe to real-time updates for owned notes
      const unsubscribe = subscribeToNotes(userId, (updatedNotes) => {
        setNotes(updatedNotes);
        setLoading(false);
      });

      // Also fetch shared notes (not real-time for now)
      fetchSharedNotes();

      // Cleanup subscription on unmount
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up notes listener:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      setLoading(false);
    }
  }, [userId, fetchSharedNotes]);

  // Combined notes (all notes the user can access)
  const allNotes = [...notes, ...sharedNotes];

  return {
    notes,           // Owned notes
    sharedNotes,     // Notes shared with user
    allNotes,        // Combined list
    loading,
    error,
    refreshNotes
  };
}
