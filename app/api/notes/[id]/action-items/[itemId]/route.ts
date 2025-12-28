import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';
import { sendUserNotification, sendNoteNotification } from '@/lib/pusher/server';
import { ActionItem } from '@/types';

// Helper to check if user is note owner or collaborator with edit access
async function hasEditAccess(noteId: string, userId: string): Promise<boolean> {
  // Check if owner
  const { data: note } = await supabaseAdmin
    .from('notes')
    .select('user_id')
    .eq('id', noteId)
    .single();

  if (note?.user_id === userId) {
    return true;
  }

  // Check if collaborator with editor role
  const { data: collab } = await supabaseAdmin
    .from('note_collaborators')
    .select('id, role')
    .eq('note_id', noteId)
    .eq('user_id', userId)
    .single();

  return collab?.role === 'editor';
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

// Send notification to collaborators
async function notifyCollaborators(
  noteId: string,
  userId: string,
  changeType: 'completed' | 'uncompleted' | 'updated' | 'deleted' | 'added' | 'deadline-changed',
  changedItem: ActionItem,
  updatedItems?: ActionItem[],
  oldDeadline?: string | null
) {
  // Get note title and user profile for notification
  const { data: note } = await supabaseAdmin
    .from('notes')
    .select('title')
    .eq('id', noteId)
    .single();

  const { data: userProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .single();

  // Get all collaborators to notify
  const collaboratorIds = await getNoteCollaboratorIds(noteId);

  // Map change type to notification type
  const notificationType =
    changeType === 'completed'
      ? 'action-item-completed'
      : changeType === 'uncompleted'
      ? 'action-item-uncompleted'
      : changeType === 'deleted'
      ? 'action-item-deleted'
      : changeType === 'added'
      ? 'action-item-added'
      : changeType === 'deadline-changed'
      ? 'action-item-deadline-changed'
      : 'action-item-updated';

  // Build notification data with deadline info
  const notificationData: Record<string, any> = {
    itemText: changedItem.text,
    itemId: changedItem.id,
    deadline: changedItem.deadline || null,
  };

  // Add deadline change specific data
  if (changeType === 'deadline-changed') {
    notificationData.oldDeadline = oldDeadline || null;
    notificationData.newDeadline = changedItem.deadline || null;
  }

  // Send notification to each collaborator except the one who made the change
  for (const collaboratorId of collaboratorIds) {
    if (collaboratorId !== userId) {
      await sendUserNotification(collaboratorId, {
        type: notificationType as any,
        noteId,
        noteTitle: note?.title || 'Untitled Note',
        triggeredBy: {
          id: userId,
          displayName: userProfile?.display_name || null,
          avatarUrl: userProfile?.avatar_url || null,
        },
        data: notificationData,
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
        id: userId,
        displayName: userProfile?.display_name || null,
        avatarUrl: userProfile?.avatar_url || null,
      },
      data: {
        ...notificationData,
        actionItems: updatedItems, // Include updated items for sync
      },
      timestamp: new Date().toISOString(),
    },
    userId
  );
}

// PATCH /api/notes/[id]/action-items/[itemId] - Update a single action item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId, itemId } = await params;
    const body = await request.json();
    const { updates, changeType } = body as {
      updates: Partial<ActionItem>;
      changeType?: 'completed' | 'uncompleted' | 'updated';
    };

    // Check access
    if (!(await hasEditAccess(noteId, user.id))) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this note' },
        { status: 403 }
      );
    }

    // Get current note and action items
    const { data: note, error: fetchError } = await supabaseAdmin
      .from('notes')
      .select('action_items')
      .eq('id', noteId)
      .single();

    if (fetchError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const actionItems = (note.action_items as ActionItem[]) || [];
    const itemIndex = actionItems.findIndex((item) => item.id === itemId);

    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    // Update the specific item
    const originalItem = actionItems[itemIndex];
    const oldDeadline = originalItem.deadline;
    const updatedItem: ActionItem = {
      ...originalItem,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    actionItems[itemIndex] = updatedItem;

    // Save to database
    const { error: updateError } = await supabaseAdmin
      .from('notes')
      .update({ action_items: actionItems as any })
      .eq('id', noteId);

    if (updateError) {
      console.error('Error updating action item:', updateError);
      return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 });
    }

    // Determine change type if not provided
    let effectiveChangeType: 'completed' | 'uncompleted' | 'updated' | 'deadline-changed' =
      changeType || (updates.completed !== undefined ? (updates.completed ? 'completed' : 'uncompleted') : 'updated');

    // Check if deadline was changed
    const deadlineChanged = updates.deadline !== undefined && updates.deadline !== oldDeadline;
    if (deadlineChanged && effectiveChangeType === 'updated') {
      effectiveChangeType = 'deadline-changed';
    }

    // Send notifications
    await notifyCollaborators(noteId, user.id, effectiveChangeType, updatedItem, actionItems, oldDeadline);

    return NextResponse.json({
      message: 'Action item updated successfully',
      actionItem: updatedItem,
    });
  } catch (error) {
    console.error('Error in PATCH /api/notes/[id]/action-items/[itemId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notes/[id]/action-items/[itemId] - Delete a single action item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId, itemId } = await params;

    // Check access
    if (!(await hasEditAccess(noteId, user.id))) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this note' },
        { status: 403 }
      );
    }

    // Get current note and action items
    const { data: note, error: fetchError } = await supabaseAdmin
      .from('notes')
      .select('action_items')
      .eq('id', noteId)
      .single();

    if (fetchError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const actionItems = (note.action_items as ActionItem[]) || [];
    const itemToDelete = actionItems.find((item) => item.id === itemId);

    if (!itemToDelete) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    // Remove the item
    const updatedItems = actionItems.filter((item) => item.id !== itemId);

    // Save to database
    const { error: updateError } = await supabaseAdmin
      .from('notes')
      .update({ action_items: updatedItems as any })
      .eq('id', noteId);

    if (updateError) {
      console.error('Error deleting action item:', updateError);
      return NextResponse.json({ error: 'Failed to delete action item' }, { status: 500 });
    }

    // Send notifications
    await notifyCollaborators(noteId, user.id, 'deleted', itemToDelete, updatedItems);

    return NextResponse.json({
      message: 'Action item deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]/action-items/[itemId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
