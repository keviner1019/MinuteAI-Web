'use client';

import { useFriends } from '@/hooks/useFriends';
import { useFriendsPresence } from '@/hooks/usePresence';
import FriendCard from './FriendCard';
import { Users } from 'lucide-react';

interface FriendsListProps {
  onShareNote?: (friendId: string) => void;
  onInviteToMeeting?: (friendId: string) => void;
}

export default function FriendsList({ onShareNote, onInviteToMeeting }: FriendsListProps) {
  const { friends: friendsData, loading: friendsLoading, removeFriend } = useFriends();
  const { friends: friendsWithPresence, loading: presenceLoading } = useFriendsPresence();

  const loading = friendsLoading || presenceLoading;

  // Merge friends data with presence data
  const friends = friendsData.map(friend => {
    const presence = friendsWithPresence.find(p => p.friendId === friend.friendId);
    return {
      ...friend,
      status: presence?.status || friend.status,
      lastSeenAt: presence?.lastSeenAt || friend.lastSeenAt,
    };
  });

  // Sort: online friends first, then by name
  const sortedFriends = [...friends].sort((a, b) => {
    const statusOrder = { online: 0, away: 1, busy: 2, offline: 3 };
    const aOrder = statusOrder[a.status] ?? 3;
    const bOrder = statusOrder[b.status] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });

  const handleRemove = async (friendId: string) => {
    await removeFriend(friendId);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No friends yet</h3>
        <p className="text-gray-500">
          Add friends to share notes and join meetings together
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedFriends.map(friend => (
        <FriendCard
          key={friend.friendId}
          friend={friend}
          onRemove={handleRemove}
          onShareNote={onShareNote}
          onInviteToMeeting={onInviteToMeeting}
        />
      ))}
    </div>
  );
}
