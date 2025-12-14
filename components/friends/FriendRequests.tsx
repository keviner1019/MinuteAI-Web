'use client';

import { useState } from 'react';
import { useFriends, useFriendRequests } from '@/hooks/useFriends';
import { Avatar } from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { Check, X, Clock, UserPlus } from 'lucide-react';

export default function FriendRequests() {
  const { incoming, outgoing, loading } = useFriendRequests();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (friendshipId: string) => {
    setProcessingIds(prev => new Set(prev).add(friendshipId));
    await acceptFriendRequest(friendshipId);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(friendshipId);
      return next;
    });
  };

  const handleDecline = async (friendshipId: string) => {
    setProcessingIds(prev => new Set(prev).add(friendshipId));
    await declineFriendRequest(friendshipId);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(friendshipId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="w-20 h-8 bg-gray-200 rounded" />
                <div className="w-20 h-8 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasRequests = incoming.length > 0 || outgoing.length > 0;

  if (!hasRequests) {
    return (
      <div className="text-center py-12">
        <UserPlus className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No pending requests</h3>
        <p className="text-gray-500">
          When you receive friend requests, they&apos;ll appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">
            Incoming Requests ({incoming.length})
          </h3>
          <div className="space-y-3">
            {incoming.map(request => {
              const isProcessing = processingIds.has(request.friendshipId);
              return (
                <div
                  key={request.friendshipId}
                  className={`bg-white rounded-xl border border-gray-200 p-4 ${isProcessing ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={request.avatarUrl}
                        alt={request.displayName || 'User'}
                        size="sm"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {request.displayName || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-500">{request.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAccept(request.friendshipId)}
                        disabled={isProcessing}
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDecline(request.friendshipId)}
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">
            Sent Requests ({outgoing.length})
          </h3>
          <div className="space-y-3">
            {outgoing.map(request => (
              <div
                key={request.friendshipId}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={request.avatarUrl}
                      alt={request.displayName || 'User'}
                      size="sm"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {request.displayName || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-500">{request.email}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5" />
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
