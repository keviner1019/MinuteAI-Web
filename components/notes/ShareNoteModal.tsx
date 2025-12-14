'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Share2, Trash2, Search, Users, ChevronDown } from 'lucide-react';
import { useNoteCollaborators, NoteCollaborator, NoteOwner } from '@/hooks/useNoteCollaborators';
import { useFriends } from '@/hooks/useFriends';
import { Friend } from '@/types';

interface ShareNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle?: string;
  currentUserId: string;
}

export default function ShareNoteModal({
  isOpen,
  onClose,
  noteId,
  noteTitle: initialTitle,
  currentUserId,
}: ShareNoteModalProps) {
  const {
    collaborators,
    owner,
    noteTitle,
    isOwner,
    loading: collaboratorsLoading,
    error: collaboratorsError,
    fetchCollaborators,
    addCollaborators,
    removeCollaborator,
    updateRole,
  } = useNoteCollaborators();

  const { friends, loading: friendsLoading } = useFriends();

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [addingLoading, setAddingLoading] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && noteId) {
      fetchCollaborators(noteId);
      setIsAddingMode(false);
      setSelectedFriends([]);
      setSearchQuery('');
    }
  }, [isOpen, noteId, fetchCollaborators]);

  // Filter friends who are not already collaborators
  const availableFriends = useMemo(() => {
    const collaboratorIds = new Set(collaborators.map((c) => c.userId));
    return friends.filter((f) => !collaboratorIds.has(f.friendId) && f.friendId !== owner?.id);
  }, [friends, collaborators, owner]);

  // Filter available friends by search and online status
  const filteredFriends = useMemo(() => {
    let filtered = availableFriends;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.displayName?.toLowerCase().includes(query) ||
          f.email?.toLowerCase().includes(query)
      );
    }

    if (showOnlineOnly) {
      filtered = filtered.filter((f) => f.status === 'online');
    }

    return filtered;
  }, [availableFriends, searchQuery, showOnlineOnly]);

  const handleToggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleAddCollaborators = async () => {
    if (selectedFriends.length === 0) return;

    setAddingLoading(true);
    const success = await addCollaborators(noteId, selectedFriends, 'editor');
    setAddingLoading(false);

    if (success) {
      setIsAddingMode(false);
      setSelectedFriends([]);
      setSearchQuery('');
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    await removeCollaborator(noteId, userId);
  };

  const handleUpdateRole = async (userId: string, newRole: 'editor' | 'viewer') => {
    await updateRole(noteId, userId, newRole);
    setRoleDropdownOpen(null);
  };

  if (!isOpen) return null;

  const displayTitle = noteTitle || initialTitle || 'Untitled Note';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Share2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Share Note</h2>
              <p className="text-sm text-gray-500 truncate max-w-[200px]">{displayTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {collaboratorsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
          ) : collaboratorsError ? (
            <div className="text-center py-8">
              <p className="text-red-500">{collaboratorsError}</p>
            </div>
          ) : (
            <>
              {/* Owner Section */}
              {owner && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Owner
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    {owner.avatarUrl ? (
                      <img
                        src={owner.avatarUrl}
                        alt={owner.displayName || 'Owner'}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {(owner.displayName || owner.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">
                          {owner.displayName || 'Unknown'}
                        </p>
                        {owner.id === currentUserId && (
                          <span className="text-xs text-purple-600 font-medium">(You)</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{owner.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collaborators Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Collaborators ({collaborators.length})
                  </p>
                  {isOwner && !isAddingMode && (
                    <button
                      onClick={() => setIsAddingMode(true)}
                      className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                    >
                      + Add
                    </button>
                  )}
                </div>

                {collaborators.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No collaborators yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map((collaborator) => (
                      <CollaboratorRow
                        key={collaborator.id}
                        collaborator={collaborator}
                        isOwner={isOwner}
                        currentUserId={currentUserId}
                        onRemove={handleRemoveCollaborator}
                        onUpdateRole={handleUpdateRole}
                        roleDropdownOpen={roleDropdownOpen}
                        setRoleDropdownOpen={setRoleDropdownOpen}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Add Collaborators Section */}
              {isAddingMode && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Add collaborators from friends
                  </p>

                  {/* Search and Filter */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => setShowOnlineOnly(!showOnlineOnly)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        showOnlineOnly
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Online
                    </button>
                  </div>

                  {/* Friends List */}
                  <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                    {friendsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
                      </div>
                    ) : filteredFriends.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">
                        {availableFriends.length === 0
                          ? 'No friends available to add'
                          : 'No friends match your search'}
                      </p>
                    ) : (
                      filteredFriends.map((friend) => (
                        <FriendSelectRow
                          key={friend.friendId}
                          friend={friend}
                          isSelected={selectedFriends.includes(friend.friendId)}
                          onToggle={() => handleToggleFriendSelection(friend.friendId)}
                        />
                      ))
                    )}
                  </div>

                  {/* Add Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsAddingMode(false);
                        setSelectedFriends([]);
                        setSearchQuery('');
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCollaborators}
                      disabled={selectedFriends.length === 0 || addingLoading}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingLoading ? 'Adding...' : `Add (${selectedFriends.length})`}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Collaborators can view and edit this note, but only you can delete it.
          </p>
        </div>
      </div>
    </div>
  );
}

// Collaborator Row Component
interface CollaboratorRowProps {
  collaborator: NoteCollaborator;
  isOwner: boolean;
  currentUserId: string;
  onRemove: (userId: string) => void;
  onUpdateRole: (userId: string, role: 'editor' | 'viewer') => void;
  roleDropdownOpen: string | null;
  setRoleDropdownOpen: (id: string | null) => void;
}

function CollaboratorRow({
  collaborator,
  isOwner,
  currentUserId,
  onRemove,
  onUpdateRole,
  roleDropdownOpen,
  setRoleDropdownOpen,
}: CollaboratorRowProps) {
  const isCurrentUser = collaborator.userId === currentUserId;
  const isDropdownOpen = roleDropdownOpen === collaborator.id;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group">
      {collaborator.user?.avatarUrl ? (
        <img
          src={collaborator.user.avatarUrl}
          alt={collaborator.user.displayName || 'Collaborator'}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
          {(collaborator.user?.displayName || collaborator.user?.email || 'U')[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 truncate">
            {collaborator.user?.displayName || 'Unknown'}
          </p>
          {isCurrentUser && (
            <span className="text-xs text-purple-600 font-medium">(You)</span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">{collaborator.user?.email}</p>
      </div>

      {/* Role Badge with Dropdown */}
      <div className="relative">
        <button
          onClick={() => isOwner && setRoleDropdownOpen(isDropdownOpen ? null : collaborator.id)}
          disabled={!isOwner}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
            collaborator.role === 'editor'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-200 text-gray-700'
          } ${isOwner ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        >
          {collaborator.role}
          {isOwner && <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
            <button
              onClick={() => onUpdateRole(collaborator.userId, 'editor')}
              className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                collaborator.role === 'editor' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => onUpdateRole(collaborator.userId, 'viewer')}
              className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                collaborator.role === 'viewer' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              Viewer
            </button>
          </div>
        )}
      </div>

      {/* Remove Button */}
      {isOwner && (
        <button
          onClick={() => onRemove(collaborator.userId)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Friend Select Row Component
interface FriendSelectRowProps {
  friend: Friend;
  isSelected: boolean;
  onToggle: () => void;
}

function FriendSelectRow({ friend, isSelected, onToggle }: FriendSelectRowProps) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
        isSelected ? 'bg-purple-50 border-2 border-purple-300' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
      }`}
    >
      <div className="relative">
        {friend.avatarUrl ? (
          <img
            src={friend.avatarUrl}
            alt={friend.displayName || 'Friend'}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-bold">
            {(friend.displayName || friend.email || 'F')[0].toUpperCase()}
          </div>
        )}
        {/* Online indicator */}
        {friend.status === 'online' && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">
          {friend.displayName || 'Unknown'}
        </p>
        <p className="text-sm text-gray-500 truncate">{friend.email}</p>
      </div>
      <div
        className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected
            ? 'bg-purple-600 border-purple-600'
            : 'border-gray-300 hover:border-purple-400'
        }`}
      >
        {isSelected && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
