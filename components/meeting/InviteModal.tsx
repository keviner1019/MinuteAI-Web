'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Link as LinkIcon, Hash, X, Users, Video, Loader2 } from 'lucide-react';
import { useFriendsPresence } from '@/hooks/usePresence';
import { createClient } from '@/lib/supabase/client';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  meetingCode: string | null;
  meetingId?: string;
}

interface FriendWithPresence {
  friendId: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeenAt: string | null;
}

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-orange-500',
  offline: 'bg-red-500',
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function InviteModal({ isOpen, onClose, roomId, meetingCode, meetingId }: InviteModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { friends, onlineFriends, offlineFriends, loading: friendsLoading } = useFriendsPresence();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFriends(new Set());
      setInviteSuccess(null);
      setInviteError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const meetingLink = `${
    typeof window !== 'undefined' ? window.location.origin : ''
  }/meeting/${roomId}`;
  const joinPageUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join`;

  const copyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    if (meetingCode) {
      navigator.clipboard.writeText(meetingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
    // Clear any previous messages
    setInviteSuccess(null);
    setInviteError(null);
  };

  const inviteSelectedFriends = async () => {
    if (selectedFriends.size === 0 || !meetingId) return;

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setInviteError('Please sign in to invite friends');
        return;
      }

      const response = await fetch(`/api/meetings/${meetingId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          friendIds: Array.from(selectedFriends),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invitations');
        return;
      }

      setInviteSuccess(data.message || `Successfully invited ${selectedFriends.size} friend(s)`);
      setSelectedFriends(new Set());
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitations');
    } finally {
      setInviting(false);
    }
  };

  const renderFriendItem = (friend: FriendWithPresence) => {
    const isSelected = selectedFriends.has(friend.friendId);
    const isOnline = friend.status !== 'offline';

    return (
      <button
        key={friend.friendId}
        onClick={() => toggleFriendSelection(friend.friendId)}
        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
          isSelected
            ? 'bg-blue-50 border-2 border-blue-500'
            : 'bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        {/* Avatar with presence indicator */}
        <div className="relative flex-shrink-0">
          {friend.avatarUrl ? (
            <img
              src={friend.avatarUrl}
              alt={friend.displayName || 'Friend'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
              {getInitials(friend.displayName)}
            </div>
          )}
          {/* Presence dot with wave effect for online */}
          <span className="absolute -bottom-0.5 -right-0.5">
            <span
              className={`block w-3.5 h-3.5 rounded-full border-2 border-white ${statusColors[friend.status]}`}
            />
            {isOnline && (
              <>
                <span
                  className="absolute inset-0 w-3.5 h-3.5 bg-green-500 rounded-full animate-ping opacity-75"
                />
                <span
                  className="absolute inset-0 w-3.5 h-3.5 bg-green-400 rounded-full animate-pulse"
                />
              </>
            )}
          </span>
        </div>

        {/* Friend info */}
        <div className="flex-1 min-w-0 text-left">
          <p className="font-medium text-gray-900 truncate">
            {friend.displayName || 'Unknown User'}
          </p>
          <p className="text-xs text-gray-500">
            {friend.status === 'offline' && friend.lastSeenAt
              ? `Last seen ${getRelativeTime(friend.lastSeenAt)}`
              : friend.status.charAt(0).toUpperCase() + friend.status.slice(1)}
          </p>
        </div>

        {/* Selection indicator */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300'
          }`}
        >
          {isSelected && <Check size={12} className="text-white" />}
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col pointer-events-auto transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">Invite Participants</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Friends Section */}
            {meetingId && (
              <div>
                <label className="text-sm text-gray-600 mb-3 flex items-center gap-2 font-medium">
                  <Users size={16} />
                  Invite Friends
                </label>

                {friendsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading friends...</span>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <Users className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No friends yet</p>
                    <p className="text-xs text-gray-400 mt-1">Add friends to invite them directly</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Online Friends */}
                    {onlineFriends.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Online ({onlineFriends.length})
                        </p>
                        <div className="space-y-2">
                          {onlineFriends.map((friend) => renderFriendItem(friend as FriendWithPresence))}
                        </div>
                      </div>
                    )}

                    {/* Offline Friends */}
                    {offlineFriends.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-red-500 rounded-full" />
                          Offline ({offlineFriends.length})
                        </p>
                        <div className="space-y-2">
                          {offlineFriends.map((friend) => renderFriendItem(friend as FriendWithPresence))}
                        </div>
                      </div>
                    )}

                    {/* Invite Button */}
                    {selectedFriends.size > 0 && (
                      <button
                        onClick={inviteSelectedFriends}
                        disabled={inviting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
                      >
                        {inviting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending Invitations...
                          </>
                        ) : (
                          <>
                            <Video className="w-5 h-5" />
                            Invite {selectedFriends.size} Friend{selectedFriends.size > 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    )}

                    {/* Success/Error Messages */}
                    {inviteSuccess && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        <Check className="w-4 h-4 flex-shrink-0" />
                        {inviteSuccess}
                      </div>
                    )}
                    {inviteError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <X className="w-4 h-4 flex-shrink-0" />
                        {inviteError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Divider between friends and share options */}
            {meetingId && friends.length > 0 && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or share manually</span>
                </div>
              </div>
            )}

            {/* Meeting Code */}
            {meetingCode && (
              <div>
                <label className="text-sm text-gray-600 mb-2 block flex items-center gap-2 font-medium">
                  <Hash size={16} />
                  Meeting Code
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="text-center text-gray-900 font-mono text-2xl tracking-widest font-bold">
                      {meetingCode}
                    </div>
                  </div>
                  <button
                    onClick={copyCode}
                    className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white shadow-lg hover:shadow-xl"
                    title="Copy code"
                  >
                    {copiedCode ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Share this code with participants to join at{' '}
                  <span className="font-mono font-medium">{joinPageUrl}</span>
                </p>
              </div>
            )}

            {/* Divider */}
            {meetingCode && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or share link</span>
                </div>
              </div>
            )}

            {/* Meeting Link */}
            <div>
              <label className="text-sm text-gray-600 mb-2 block flex items-center gap-2 font-medium">
                <LinkIcon size={16} />
                Direct Meeting Link
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 overflow-hidden">
                  <div className="text-sm text-gray-900 truncate font-mono">{meetingLink}</div>
                </div>
                <button
                  onClick={copyLink}
                  className="p-3 rounded-lg bg-gray-700 hover:bg-gray-800 transition text-white shadow-lg hover:shadow-xl"
                  title="Copy link"
                >
                  {copiedLink ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Anyone with this link can join the meeting directly
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
