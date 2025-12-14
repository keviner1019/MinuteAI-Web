import { useState, useEffect, useCallback, useRef } from 'react';
import { Friend, FriendRequest, UserSearchResult } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

interface UseFriendsReturn {
  friends: Friend[];
  loading: boolean;
  error: string | null;
  refreshFriends: () => Promise<void>;
  sendFriendRequest: (emailOrUserId: string) => Promise<{ success: boolean; message: string }>;
  acceptFriendRequest: (friendshipId: string) => Promise<boolean>;
  declineFriendRequest: (friendshipId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
}

export function useFriends(): UseFriendsReturn {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const channelIdRef = useRef<string>(
    `friends-list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch('/api/friends', { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch friends');
      }

      setFriends(data.friends || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      userIdRef.current = session.user.id;

      // Initial fetch
      fetchFriends();

      // Subscribe to friendship status changes (accepted/removed)
      channelRef.current = supabase
        .channel(channelIdRef.current)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friendships',
          },
          (payload) => {
            const updated = payload.new as {
              requester_id: string;
              addressee_id: string;
              status: string;
            };

            // Refresh when friendship is accepted and we're involved
            if (
              updated.status === 'accepted' &&
              (updated.addressee_id === userIdRef.current ||
                updated.requester_id === userIdRef.current)
            ) {
              fetchFriends();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'friendships',
          },
          (payload) => {
            const deleted = payload.old as {
              requester_id: string;
              addressee_id: string;
            };

            // Refresh when a friend is removed and we're involved
            if (
              deleted.addressee_id === userIdRef.current ||
              deleted.requester_id === userIdRef.current
            ) {
              fetchFriends();
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchFriends]);

  const sendFriendRequest = useCallback(
    async (emailOrUserId: string) => {
      try {
        const isEmail = emailOrUserId.includes('@');
        const body = isEmail ? { email: emailOrUserId } : { userId: emailOrUserId };
        const headers = await getAuthHeaders();

        const response = await fetch('/api/friends', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, message: data.error || 'Failed to send request' };
        }

        // If auto-accepted, refresh friends list
        if (data.friendship?.status === 'accepted') {
          await fetchFriends();
        }

        return { success: true, message: data.message };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [fetchFriends]
  );

  const acceptFriendRequest = useCallback(
    async (friendshipId: string) => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/friends/${friendshipId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ action: 'accept' }),
        });

        if (response.ok) {
          await fetchFriends();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error accepting friend request:', err);
        return false;
      }
    },
    [fetchFriends]
  );

  const declineFriendRequest = useCallback(async (friendshipId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action: 'decline' }),
      });

      return response.ok;
    } catch (err) {
      console.error('Error declining friend request:', err);
      return false;
    }
  }, []);

  const removeFriend = useCallback(async (friendId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        setFriends((prev) => prev.filter((f) => f.friendId !== friendId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error removing friend:', err);
      return false;
    }
  }, []);

  return {
    friends,
    loading,
    error,
    refreshFriends: fetchFriends,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
  };
}

// Hook for friend requests with real-time updates
interface UseFriendRequestsReturn {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFriendRequests(): UseFriendRequestsReturn {
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const channelIdRef = useRef<string>(
    `friend-requests-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch('/api/friends/requests', { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch requests');
      }

      setIncoming(data.incoming || []);
      setOutgoing(data.outgoing || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching friend requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get current user ID for filtering
    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      userIdRef.current = session.user.id;

      // Initial fetch
      fetchRequests();

      // Subscribe to real-time friendship changes
      channelRef.current = supabase
        .channel(channelIdRef.current)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friendships',
          },
          (payload) => {
            // New friend request - refresh if we're involved
            const newRequest = payload.new as {
              requester_id: string;
              addressee_id: string;
              status: string;
            };

            if (
              newRequest.status === 'pending' &&
              (newRequest.addressee_id === userIdRef.current ||
                newRequest.requester_id === userIdRef.current)
            ) {
              fetchRequests();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friendships',
          },
          (payload) => {
            // Friend request accepted/declined - refresh if we're involved
            const updated = payload.new as {
              requester_id: string;
              addressee_id: string;
              status: string;
            };

            if (
              updated.addressee_id === userIdRef.current ||
              updated.requester_id === userIdRef.current
            ) {
              fetchRequests();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'friendships',
          },
          (payload) => {
            // Friendship deleted - refresh if we're involved
            const deleted = payload.old as {
              requester_id: string;
              addressee_id: string;
            };

            if (
              deleted.addressee_id === userIdRef.current ||
              deleted.requester_id === userIdRef.current
            ) {
              fetchRequests();
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchRequests]);

  return {
    incoming,
    outgoing,
    total: incoming.length + outgoing.length,
    loading,
    error,
    refresh: fetchRequests,
  };
}

// Hook for searching users
interface UseUserSearchReturn {
  results: UserSearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useUserSearch(): UseUserSearchReturn {
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const headers = await getAuthHeaders();
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, {
        headers,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.users || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  };
}
