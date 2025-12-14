'use client';

import { useState, useCallback, useEffect } from 'react';
import { useFriends, useUserSearch } from '@/hooks/useFriends';
import { Avatar } from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { Search, UserPlus, Check, Clock, Users } from 'lucide-react';

export default function AddFriend() {
  const [query, setQuery] = useState('');
  const { results, loading, search, clearResults } = useUserSearch();
  const { sendFriendRequest } = useFriends();
  const [sendingTo, setSendingTo] = useState<Set<string>>(new Set());
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        search(query);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search, clearResults]);

  const handleSendRequest = async (userId: string) => {
    setSendingTo(prev => new Set(prev).add(userId));
    const result = await sendFriendRequest(userId);
    setSendingTo(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    if (result.success) {
      setSentTo(prev => new Set(prev).add(userId));
    }
  };

  const getButtonState = (user: typeof results[0]) => {
    if (user.isFriend) {
      return { text: 'Friends', icon: Check, disabled: true, variant: 'secondary' as const };
    }
    if (user.hasPendingRequest || sentTo.has(user.userId)) {
      return { text: 'Request Sent', icon: Clock, disabled: true, variant: 'secondary' as const };
    }
    if (sendingTo.has(user.userId)) {
      return { text: 'Sending...', icon: UserPlus, disabled: true, variant: 'primary' as const };
    }
    return { text: 'Add Friend', icon: UserPlus, disabled: false, variant: 'primary' as const };
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                </div>
                <div className="w-24 h-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No users found</h3>
          <p className="text-gray-500">
            Try searching with a different name or email
          </p>
        </div>
      )}

      {!loading && query.length < 2 && results.length === 0 && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Find friends</h3>
          <p className="text-gray-500">
            Enter at least 2 characters to search
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map(user => {
            const buttonState = getButtonState(user);
            return (
              <div
                key={user.userId}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user.avatarUrl}
                      alt={user.displayName || 'User'}
                      size="sm"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {user.displayName || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    variant={buttonState.variant}
                    size="sm"
                    onClick={() => handleSendRequest(user.userId)}
                    disabled={buttonState.disabled}
                  >
                    <buttonState.icon className="w-4 h-4" />
                    {buttonState.text}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
