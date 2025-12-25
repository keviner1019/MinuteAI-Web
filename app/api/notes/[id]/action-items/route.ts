import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';
import { sendUserNotification, sendNoteNotification } from '@/lib/pusher/server';
import { ActionItem } from '@/types';

// Helper to check if user is note owner or collaborator
async function hasNoteAccess(
  noteId: string,
  userId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  // Check if owner
  const { data: note } = await supabaseAdmin
    .from('notes')
    .select('user_id')
    .eq('id', noteId)
    .single();

  if (note?.user_id === userId) {
    return { hasAccess: true, isOwner: true };
  }

  // Check if collaborator
  const { data: collab } = await supabaseAdmin
    .from('note_collaborators')
    .select('id, role')
    .eq('note_id', noteId)
    .eq('user_id', userId)
    .single();

  if (collab && collab.role === 'editor') {
    return { hasAccess: true, isOwner: false };
  }

  return { hasAccess: false, isOwner: false };
}

// Get all collaborators for a note (including owner)
async function getNoteCollaboratorIds(noteId: string): Promise<string[]> {
  const { data: note } = await supabaseAdmin
    .from('notes')
    .select('user_id')
    .eq('id', noteId)
    .single();

  const { data: collaborators } = await supabaseAdmin
    .from('note_collaborators')
    .select('user_id')
    .eq('note_id', noteId);

  const userIds: string[] = [];
  if (note?.user_id) userIds.push(note.user_id);
  if (collaborators) {
    collaborators.forEach((c) => {
      if (!userIds.includes(c.user_id)) {
        userIds.push(c.user_id);
      }
    });
  }

  return userIds;
}

// PUT /api/notes/[id]/action-items - Update action items with real-time notifications
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body = await request.json();
    const { actionItems, changeType, changedItem } = body as {
      actionItems: ActionItem[];
      changeType?: 'completed' | 'updated' | 'deleted' | 'added';
      changedItem?: ActionItem;
    };

    // Check access
    const { hasAccess } = await hasNoteAccess(noteId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this note' },
        { status: 403 }
      );
    }

    // Update action items in database
    const { error: updateError } = await supabaseAdmin
      .from('notes')
      .update({ action_items: actionItems as any })
      .eq('id', noteId);

    if (updateError) {
      console.error('Error updating action items:', updateError);
      return NextResponse.json({ error: 'Failed to update action items' }, { status: 500 });
    }

    // If there's a specific change, notify other collaborators
    if (changeType && changedItem) {
      // Get note title and user profile for notification
      const { data: note } = await supabaseAdmin
        .from('notes')
        .select('title')
        .eq('id', noteId)
        .single();

      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();

      // Get all collaborators to notify
      const collaboratorIds = await getNoteCollaboratorIds(noteId);

      // Map change type to notification type
      const notificationType =
        changeType === 'completed'
          ? 'action-item-completed'
          : changeType === 'deleted'
          ? 'action-item-deleted'
          : changeType === 'added'
          ? 'action-item-updated' // Treat added as updated for notifications
          : 'action-item-updated';

      // Send notification to each collaborator except the one who made the change
      for (const collaboratorId of collaboratorIds) {
        if (collaboratorId !== user.id) {
          await sendUserNotification(collaboratorId, {
            type: notificationType as any,
            noteId,
            noteTitle: note?.title || 'Untitled Note',
            triggeredBy: {
              id: user.id,
              displayName: userProfile?.display_name || null,
              avatarUrl: userProfile?.avatar_url || null,
            },
            data: {
              itemText: changedItem.text,
              itemId: changedItem.id,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Also send to the note channel for real-time sync
      await sendNoteNotification(
        noteId,
        {
          type: notificationType as any,
          noteId,
          noteTitle: note?.title || 'Untitled Note',
          triggeredBy: {
            id: user.id,
            displayName: userProfile?.display_name || null,
            avatarUrl: userProfile?.avatar_url || null,
          },
          data: {
            itemText: changedItem.text,
            itemId: changedItem.id,
            actionItems, // Include updated items for sync
          },
          timestamp: new Date().toISOString(),
        },
        user.id
      );
    }

    return NextResponse.json({
      message: 'Action items updated successfully',
      actionItems,
    });
  } catch (error) {
    console.error('Error in PUT /api/notes/[id]/action-items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/notes/[id]/action-items - Get action items for a note
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;

    // Check access
    const { hasAccess } = await hasNoteAccess(noteId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to view this note' },
        { status: 403 }
      );
    }

    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .select('action_items')
      .eq('id', noteId)
      .single();

    if (error) {
      console.error('Error fetching action items:', error);
      return NextResponse.json({ error: 'Failed to fetch action items' }, { status: 500 });
    }

    return NextResponse.json({
      actionItems: note?.action_items || [],
    });
  } catch (error) {
    console.error('Error in GET /api/notes/[id]/action-items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
