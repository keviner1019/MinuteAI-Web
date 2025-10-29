// @ts-nocheck
import { supabase } from './config';
import type { Note, ActionItem } from '@/types';
import type { Database } from '@/types/supabase';

type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];
type NoteUpdate = Database['public']['Tables']['notes']['Update'];

/**
 * Convert database row to Note type
 */
function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    storageUrl: row.storage_url,
    duration: row.duration || undefined,
    status: row.status,
    transcript: row.transcript || undefined,
    summary: row.summary || undefined,
    actionItems: (row.action_items || []) as ActionItem[],
    keyTopics: row.key_topics || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get all notes for a user
 */
export async function getNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    throw new Error(`Failed to fetch notes: ${error.message}`);
  }

  return (data || []).map(rowToNote);
}

/**
 * Get a single note by ID
 */
export async function getNote(noteId: string): Promise<Note | null> {
  const { data, error } = await supabase.from('notes').select('*').eq('id', noteId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Note not found
    }
    console.error('Error fetching note:', error);
    throw new Error(`Failed to fetch note: ${error.message}`);
  }

  return data ? rowToNote(data) : null;
}

/**
 * Create a new note
 */
export async function createNote(
  note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Note> {
  const insertData: NoteInsert = {
    user_id: note.userId,
    title: note.title,
    file_name: note.fileName,
    file_size: note.fileSize,
    file_type: note.fileType,
    storage_url: note.storageUrl,
    duration: note.duration,
    status: note.status,
    transcript: note.transcript,
    summary: note.summary,
    action_items: note.actionItems as any,
    key_topics: note.keyTopics,
  };

  const { data, error } = await supabase
    .from('notes')
    .insert(insertData as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating note:', error);
    throw new Error(`Failed to create note: ${error.message}`);
  }

  return rowToNote(data);
}

/**
 * Update a note
 */
export async function updateNote(noteId: string, updates: Partial<Note>): Promise<Note> {
  const updateData: NoteUpdate = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.transcript !== undefined) updateData.transcript = updates.transcript;
  if (updates.summary !== undefined) updateData.summary = updates.summary;
  if (updates.actionItems !== undefined) updateData.action_items = updates.actionItems as any;
  if (updates.keyTopics !== undefined) updateData.key_topics = updates.keyTopics;
  if (updates.duration !== undefined) updateData.duration = updates.duration;

  const { data, error } = await supabase
    .from('notes')
    .update(updateData as any)
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating note:', error);
    throw new Error(`Failed to update note: ${error.message}`);
  }

  return rowToNote(data);
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', noteId);

  if (error) {
    console.error('Error deleting note:', error);
    throw new Error(`Failed to delete note: ${error.message}`);
  }
}

/**
 * Subscribe to notes changes in real-time
 */
export function subscribeToNotes(userId: string, callback: (notes: Note[]) => void) {
  // Initial fetch
  getNotes(userId).then(callback).catch(console.error);

  // Subscribe to changes
  const subscription = supabase
    .channel('notes-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        // Refetch all notes when changes occur
        getNotes(userId).then(callback).catch(console.error);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}
