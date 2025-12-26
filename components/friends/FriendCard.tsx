'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, UserMinus, Share2, Video, User } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import PresenceIndicator from './PresenceIndicator';
import { Friend } from '@/types';

interface FriendCardProps {
  friend: Friend;
  onRemove: (friendId: string) => void;
  onShareNote?: (friendId: string) => void;
  onInviteToMeeting?: (friendId: string) => void;
}

export default function FriendCard({
  friend,
  onRemove,
  onShareNote,
  onInviteToMeeting,
}: FriendCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRemove = async () => {
    setIsRemoving(true);
    setShowMenu(false);
    await onRemove(friend.friendId);
    setIsRemoving(false);
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow ${isRemoving ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            src={friend.avatarUrl}
            alt={friend.displayName || 'Friend'}
            size="sm"
          />
          <div>
            <h3 className="font-medium text-gray-900">
              {friend.displayName || 'Unknown User'}
            </h3>
            <p className="text-sm text-gray-500">{friend.email}</p>
            <PresenceIndicator
              status={friend.status}
              lastSeenAt={friend.lastSeenAt}
              showText
              size="sm"
            />
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isRemoving}
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              {onShareNote && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onShareNote(friend.friendId);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Share2 className="w-4 h-4" />
                  Share Note
                </button>
              )}
              {onInviteToMeeting && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onInviteToMeeting(friend.friendId);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Video className="w-4 h-4" />
                  Invite to Meeting
                </button>
              )}
              <button
                onClick={handleRemove}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <UserMinus className="w-4 h-4" />
                Remove Friend
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
