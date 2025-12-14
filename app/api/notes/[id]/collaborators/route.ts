import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, supabaseAdmin } from '@/lib/supabase/auth';
import { sendUserNotification } from '@/lib/pusher/server';

// Helper to check if user is note owner
async function isNoteOwner(noteId: string, userId: string): Promise<boolean> {
  const { data: note } = await supabaseAdmin
    .from('notes')
    .select('user_id')
    .eq('id', noteId)
    .single();

  return note?.user_id === userId;
}

// Helper to check if two users are friends
async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('are_friends', {
    user1_id: userId1,
    user2_id: userId2,
  });
  return data === true;
}

// GET /api/notes/[id]/collaborators - List collaborators on a note
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;

    // Check if user has access to this note (owner or collaborator)
    const isOwner = await isNoteOwner(noteId, user.id);

    const { data: isCollaborator } = await supabaseAdmin
      .from('note_collaborators')
      .select('id')
      .eq('note_id', noteId)
      .eq('user_id', user.id)
      .single();

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: 'You do not have access to this note' }, { status: 403 });
    }

    // Get note info
    const { data: note } = await supabaseAdmin
      .from('notes')
      .select('user_id, title')
      .eq('id', noteId)
      .single();

    // Get owner profile separately
    let ownerProfile = null;
    if (note?.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('display_name, avatar_url, email')
        .eq('id', note.user_id)
        .single();
      ownerProfile = profile;
    }

    // Get collaborators
    const { data: collaborators, error: collabError } = await supabaseAdmin
      .from('note_collaborators')
      .select('id, user_id, role, added_by, created_at')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });

    if (collabError) {
      console.error('Error fetching collaborators:', collabError);
      return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 });
    }

    // Fetch user profiles for all collaborators
    const collaboratorUserIds = (collaborators || []).map((c: any) => c.user_id);
    let userProfilesMap: Record<string, any> = {};

    if (collaboratorUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, display_name, avatar_url, email')
        .in('id', collaboratorUserIds);

      if (profiles) {
        userProfilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    // Transform the data
    const transformedCollaborators = (collaborators || []).map((c: any) => {
      const profile = userProfilesMap[c.user_id];
      return {
        id: c.id,
        noteId,
        userId: c.user_id,
        role: c.role,
        addedBy: c.added_by,
        createdAt: c.created_at,
        user: profile
          ? {
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
              email: profile.email,
            }
          : null,
      };
    });

    return NextResponse.json({
      noteId,
      noteTitle: note?.title,
      owner: {
        id: note?.user_id,
        displayName: ownerProfile?.display_name,
        avatarUrl: ownerProfile?.avatar_url,
        email: ownerProfile?.email,
      },
      collaborators: transformedCollaborators,
      isOwner,
    });
  } catch (error) {
    console.error('Error in GET /api/notes/[id]/collaborators:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notes/[id]/collaborators - Add a collaborator (must be a friend)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body = await request.json();
    const { userId, email, role = 'editor' } = body;

    // Only note owner can add collaborators
    const isOwner = await isNoteOwner(noteId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the note owner can add collaborators' },
        { status: 403 }
      );
    }

    let targetUserId = userId;

    // If email is provided, look up the user
    if (email && !targetUserId) {
      const { data: targetUser } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
      }

      targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'userId or email is required' }, { status: 400 });
    }

    // Check if target user is a friend
    const isFriend = await areFriends(user.id, targetUserId);
    if (!isFriend) {
      return NextResponse.json({ error: 'You can only share notes with friends' }, { status: 400 });
    }

    // Check if already a collaborator
    const { data: existing } = await supabaseAdmin
      .from('note_collaborators')
      .select('id')
      .eq('note_id', noteId)
      .eq('user_id', targetUserId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'User is already a collaborator on this note' },
        { status: 400 }
      );
    }

    // Add collaborator
    const { data: collaborator, error: createError } = await supabaseAdmin
      .from('note_collaborators')
      .insert({
        note_id: noteId,
        user_id: targetUserId,
        role: role,
        added_by: user.id,
      })
      .select('id, user_id, role, added_by, created_at')
      .single();

    if (createError) {
      console.error('Error adding collaborator:', createError);
      return NextResponse.json({ error: 'Failed to add collaborator' }, { status: 500 });
    }

    // Fetch the user profile for the new collaborator
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('display_name, avatar_url, email')
      .eq('id', targetUserId)
      .single();

    // Get note title and owner profile for the notification
    const { data: note } = await supabaseAdmin
      .from('notes')
      .select('title')
      .eq('id', noteId)
      .single();

    const { data: ownerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Send real-time notification to the invited user
    await sendUserNotification(targetUserId, {
      type: 'collaborator-added',
      noteId,
      noteTitle: note?.title || 'Untitled Note',
      triggeredBy: {
        id: user.id,
        displayName: ownerProfile?.display_name || null,
        avatarUrl: ownerProfile?.avatar_url || null,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'Collaborator added successfully',
      collaborator: {
        id: collaborator.id,
        noteId,
        userId: collaborator.user_id,
        role: collaborator.role,
        addedBy: collaborator.added_by,
        createdAt: collaborator.created_at,
        user: userProfile
          ? {
              displayName: userProfile.display_name,
              avatarUrl: userProfile.avatar_url,
              email: userProfile.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/notes/[id]/collaborators:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notes/[id]/collaborators - Update collaborator role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Role must be "editor" or "viewer"' }, { status: 400 });
    }

    // Only note owner can update collaborator roles
    const isOwner = await isNoteOwner(noteId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the note owner can update collaborator roles' },
        { status: 403 }
      );
    }

    // Update the collaborator role
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('note_collaborators')
      .update({ role })
      .eq('note_id', noteId)
      .eq('user_id', userId)
      .select('id, user_id, role')
      .single();

    if (updateError) {
      console.error('Error updating collaborator role:', updateError);
      return NextResponse.json({ error: 'Failed to update collaborator role' }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Collaborator role updated successfully',
      collaborator: {
        id: updated.id,
        userId: updated.user_id,
        role: updated.role,
      },
    });
  } catch (error) {
    console.error('Error in PATCH /api/notes/[id]/collaborators:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notes/[id]/collaborators - Remove a collaborator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body = await request.json();
    const { collaboratorId, userId } = body;

    // Only note owner can remove collaborators
    const isOwner = await isNoteOwner(noteId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the note owner can remove collaborators' },
        { status: 403 }
      );
    }

    // Delete by collaborator ID or user ID
    let deleteQuery = supabaseAdmin.from('note_collaborators').delete().eq('note_id', noteId);

    if (collaboratorId) {
      deleteQuery = deleteQuery.eq('id', collaboratorId);
    } else if (userId) {
      deleteQuery = deleteQuery.eq('user_id', userId);
    } else {
      return NextResponse.json({ error: 'collaboratorId or userId is required' }, { status: 400 });
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('Error removing collaborator:', deleteError);
      return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Collaborator removed successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]/collaborators:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
