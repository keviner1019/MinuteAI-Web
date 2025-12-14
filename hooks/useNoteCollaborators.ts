import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface NoteCollaborator {
  id: string;
  noteId: string;
  userId: string;
  role: 'editor' | 'viewer';
  addedBy: string;
  createdAt: string;
  user: {
    displayName: string | null;
    avatarUrl: string | null;
    email: string | null;
  } | null;
}

export interface NoteOwner {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

export interface CollaboratorsData {
  noteId: string;
  noteTitle: string;
  owner: NoteOwner;
  collaborators: NoteCollaborator[];
  isOwner: boolean;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

interface UseNoteCollaboratorsReturn {
  collaborators: NoteCollaborator[];
  owner: NoteOwner | null;
  noteTitle: string;
  isOwner: boolean;
  loading: boolean;
  error: string | null;
  fetchCollaborators: (noteId: string) => Promise<void>;
  addCollaborators: (noteId: string, userIds: string[], role?: 'editor' | 'viewer') => Promise<boolean>;
  removeCollaborator: (noteId: string, userId: string) => Promise<boolean>;
  updateRole: (noteId: string, userId: string, role: 'editor' | 'viewer') => Promise<boolean>;
}

export function useNoteCollaborators(): UseNoteCollaboratorsReturn {
  const [collaborators, setCollaborators] = useState<NoteCollaborator[]>([]);
  const [owner, setOwner] = useState<NoteOwner | null>(null);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollaborators = useCallback(async (noteId: string) => {
    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/notes/${noteId}/collaborators`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch collaborators');
      }

      setCollaborators(data.collaborators || []);
      setOwner(data.owner || null);
      setNoteTitle(data.noteTitle || '');
      setIsOwner(data.isOwner || false);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching collaborators:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCollaborators = useCallback(async (
    noteId: string,
    userIds: string[],
    role: 'editor' | 'viewer' = 'editor'
  ): Promise<boolean> => {
    try {
      setError(null);
      const headers = await getAuthHeaders();

      // Add each collaborator one by one (API accepts single userId)
      for (const userId of userIds) {
        const response = await fetch(`/api/notes/${noteId}/collaborators`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId, role }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add collaborator');
        }
      }

      // Refresh the collaborators list
      await fetchCollaborators(noteId);
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding collaborators:', err);
      return false;
    }
  }, [fetchCollaborators]);

  const removeCollaborator = useCallback(async (
    noteId: string,
    userId: string
  ): Promise<boolean> => {
    try {
      setError(null);
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/notes/${noteId}/collaborators`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove collaborator');
      }

      // Update local state
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error removing collaborator:', err);
      return false;
    }
  }, []);

  const updateRole = useCallback(async (
    noteId: string,
    userId: string,
    role: 'editor' | 'viewer'
  ): Promise<boolean> => {
    try {
      setError(null);
      const headers = await getAuthHeaders();

      const response = await fetch(`/api/notes/${noteId}/collaborators`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId, role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      // Update local state
      setCollaborators((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, role } : c))
      );
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating role:', err);
      return false;
    }
  }, []);

  return {
    collaborators,
    owner,
    noteTitle,
    isOwner,
    loading,
    error,
    fetchCollaborators,
    addCollaborators,
    removeCollaborator,
    updateRole,
  };
}
