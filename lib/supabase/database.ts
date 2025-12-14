// @ts-nocheck
import { supabase } from './config';
import type { Note, ActionItem, TranscriptSegment } from '@/types';
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
    // status field removed - no longer tracking
    transcript: row.transcript || undefined,
    transcriptSegments: (row.transcript_segments || []) as TranscriptSegment[],
    summary: row.summary || undefined,
    markdownAnalysis: row.markdown_analysis || undefined,
    actionItems: (row.action_items || []) as ActionItem[],
    keyTopics: row.key_topics || undefined,
    // Optional: if the DB row stores attachments or audio_files as JSON/columns
    attachments: (row as any).attachments || undefined,
    audioFiles: (row as any).audio_files || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get all notes owned by a user with isShared status
 */
export async function getNotes(userId: string): Promise<Note[]> {
  // Fetch notes with a left join to note_collaborators to check if shared
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      note_collaborators(id)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    throw new Error(`Failed to fetch notes: ${error.message}`);
  }

  return (data || []).map(row => ({
    ...rowToNote(row),
    isShared: Array.isArray(row.note_collaborators) && row.note_collaborators.length > 0,
  }));
}

/**
 * Get notes shared with a user (where user is a collaborator)
 */
export async function getSharedNotes(userId: string): Promise<(Note & { collaboratorRole: 'editor' | 'viewer'; ownerName?: string })[]> {
  // First get the note IDs where user is a collaborator
  const { data: collaborations, error: collabError } = await supabase
    .from('note_collaborators')
    .select('note_id, role')
    .eq('user_id', userId);

  if (collabError) {
    console.error('Error fetching collaborations:', collabError);
    throw new Error(`Failed to fetch collaborations: ${collabError.message}`);
  }

  if (!collaborations || collaborations.length === 0) {
    return [];
  }

  const noteIds = collaborations.map(c => c.note_id);
  const roleMap = collaborations.reduce((acc, c) => {
    acc[c.note_id] = c.role;
    return acc;
  }, {} as Record<string, 'editor' | 'viewer'>);

  // Fetch the actual notes
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('*')
    .in('id', noteIds)
    .order('created_at', { ascending: false });

  if (notesError) {
    console.error('Error fetching shared notes:', notesError);
    throw new Error(`Failed to fetch shared notes: ${notesError.message}`);
  }

  // Get owner profiles
  const ownerIds = [...new Set((notes || []).map(n => n.user_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', ownerIds);

  const profileMap = (profiles || []).reduce((acc, p) => {
    acc[p.id] = p.display_name;
    return acc;
  }, {} as Record<string, string>);

  return (notes || []).map(row => ({
    ...rowToNote(row),
    isShared: true,
    collaboratorRole: roleMap[row.id] || 'viewer',
    ownerName: profileMap[row.user_id] || undefined,
  }));
}

/**
 * Get all notes (owned + shared) for a user
 */
export async function getAllNotesWithShared(userId: string): Promise<{
  owned: Note[];
  shared: (Note & { collaboratorRole: 'editor' | 'viewer'; ownerName?: string })[];
}> {
  const [owned, shared] = await Promise.all([
    getNotes(userId),
    getSharedNotes(userId),
  ]);

  return { owned, shared };
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
    // status field removed
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
  // status field removed
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
 * Update action items for a note
 */
export async function updateActionItems(noteId: string, actionItems: ActionItem[]): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ action_items: actionItems as any })
    .eq('id', noteId);

  if (error) {
    console.error('Error updating action items:', error);
    throw new Error(`Failed to update action items: ${error.message}`);
  }
}

/**
 * Update transcript segments for a note
 */
export async function updateTranscriptSegments(
  noteId: string,
  segments: TranscriptSegment[]
): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ transcript_segments: segments as any })
    .eq('id', noteId);

  if (error) {
    console.error('Error updating transcript segments:', error);
    throw new Error(`Failed to update transcript segments: ${error.message}`);
  }
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

/**
 * Get all action items across all notes for a user
 * Returns action items with their associated note information
 */
export interface ActionItemWithNote extends ActionItem {
  noteId: string;
  noteTitle: string;
  noteCreatedAt: Date;
  isFromSharedNote?: boolean;
  collaboratorRole?: 'editor' | 'viewer';
  ownerName?: string;
}

export async function getAllActionItems(userId: string): Promise<ActionItemWithNote[]> {
  // Get owned notes with action items
  const { data: ownedData, error: ownedError } = await supabase
    .from('notes')
    .select('id, title, action_items, created_at')
    .eq('user_id', userId)
    .not('action_items', 'is', null)
    .order('created_at', { ascending: false });

  if (ownedError) {
    console.error('Error fetching action items:', ownedError);
    throw new Error(`Failed to fetch action items: ${ownedError.message}`);
  }

  // Get shared notes
  const { data: collaborations } = await supabase
    .from('note_collaborators')
    .select('note_id, role')
    .eq('user_id', userId);

  let sharedData: any[] = [];
  let roleMap: Record<string, 'editor' | 'viewer'> = {};
  let ownerMap: Record<string, string> = {};

  if (collaborations && collaborations.length > 0) {
    const noteIds = collaborations.map(c => c.note_id);
    roleMap = collaborations.reduce((acc, c) => {
      acc[c.note_id] = c.role;
      return acc;
    }, {} as Record<string, 'editor' | 'viewer'>);

    const { data: sharedNotes } = await supabase
      .from('notes')
      .select('id, title, action_items, created_at, user_id')
      .in('id', noteIds)
      .not('action_items', 'is', null)
      .order('created_at', { ascending: false });

    if (sharedNotes && sharedNotes.length > 0) {
      sharedData = sharedNotes;

      // Get owner profiles
      const ownerIds = [...new Set(sharedNotes.map(n => n.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .in('id', ownerIds);

      if (profiles) {
        ownerMap = profiles.reduce((acc, p) => {
          acc[p.id] = p.display_name;
          return acc;
        }, {} as Record<string, string>);
      }
    }
  }

  // Flatten action items from all notes
  const allActionItems: ActionItemWithNote[] = [];

  // Add owned notes action items
  if (ownedData) {
    for (const note of ownedData) {
      const actionItems = note.action_items as ActionItem[] || [];
      for (const item of actionItems) {
        allActionItems.push({
          ...item,
          noteId: note.id,
          noteTitle: note.title,
          noteCreatedAt: new Date(note.created_at),
          isFromSharedNote: false,
        });
      }
    }
  }

  // Add shared notes action items
  for (const note of sharedData) {
    const actionItems = note.action_items as ActionItem[] || [];
    for (const item of actionItems) {
      allActionItems.push({
        ...item,
        noteId: note.id,
        noteTitle: note.title,
        noteCreatedAt: new Date(note.created_at),
        isFromSharedNote: true,
        collaboratorRole: roleMap[note.id],
        ownerName: ownerMap[note.user_id],
      });
    }
  }

  return allActionItems;
}

/**
 * Update a single action item within a note
 */
export async function updateSingleActionItem(
  noteId: string,
  actionItemId: string,
  updates: Partial<ActionItem>
): Promise<void> {
  // First, get the current note
  const note = await getNote(noteId);
  if (!note || !note.actionItems) {
    throw new Error('Note or action items not found');
  }

  // Update the specific action item
  const updatedItems = note.actionItems.map((item) =>
    item.id === actionItemId
      ? { ...item, ...updates, updatedAt: new Date().toISOString() }
      : item
  );

  // Save back to database
  await updateActionItems(noteId, updatedItems);
}

/**
 * Delete a single action item from a note
 */
export async function deleteSingleActionItem(noteId: string, actionItemId: string): Promise<void> {
  // First, get the current note
  const note = await getNote(noteId);
  if (!note || !note.actionItems) {
    throw new Error('Note or action items not found');
  }

  // Remove the specific action item
  const updatedItems = note.actionItems.filter((item) => item.id !== actionItemId);

  // Save back to database
  await updateActionItems(noteId, updatedItems);
}