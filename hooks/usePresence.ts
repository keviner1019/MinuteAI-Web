import { useState, useEffect, useCallback, useRef } from 'react';
import { PresenceStatus, Friend } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Presence timeout in milliseconds (users are considered offline after this)
const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

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

interface UsePresenceReturn {
  status: PresenceStatus;
  setStatus: (status: PresenceStatus) => Promise<void>;
  isOnline: boolean;
}

// Hook for managing user's own presence
export function usePresence(): UsePresenceReturn {
  const [status, setStatusState] = useState<PresenceStatus>('online');
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityRef = useRef<boolean>(true);
  const sessionTokenRef = useRef<string | null>(null);

  // Store the session token for use in beforeunload/pagehide
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionTokenRef.current = session?.access_token || null;
    });

    // Update token when it changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      sessionTokenRef.current = session?.access_token || null;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Send heartbeat to update presence
  const sendHeartbeat = useCallback(
    async (newStatus?: PresenceStatus) => {
      try {
        const headers = await getAuthHeaders();
        await fetch('/api/presence', {
          method: 'POST',
          headers,
          body: JSON.stringify({ status: newStatus || status }),
        });
      } catch (err) {
        console.error('Error sending presence heartbeat:', err);
      }
    },
    [status]
  );

  // Set status and send update
  const setStatus = useCallback(
    async (newStatus: PresenceStatus) => {
      setStatusState(newStatus);
      await sendHeartbeat(newStatus);
    },
    [sendHeartbeat]
  );

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      visibilityRef.current = !document.hidden;
      if (document.hidden) {
        sendHeartbeat('away');
      } else {
        sendHeartbeat('online');
        setStatusState('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendHeartbeat]);

  // Set up heartbeat interval
  useEffect(() => {
    // Initial heartbeat
    sendHeartbeat('online');

    // Send heartbeat every 30 seconds
    heartbeatRef.current = setInterval(() => {
      if (visibilityRef.current) {
        sendHeartbeat();
      }
    }, 30000);

    // Clean up on unmount
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      // Set status to offline when leaving
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'offline' }),
      }).catch(console.error);
    };
  }, [sendHeartbeat]);

  // Handle page unload - use both beforeunload and pagehide for reliability
  useEffect(() => {
    const sendOfflineStatus = () => {
      // Try sendBeacon first as it's more reliable for page close
      const data = JSON.stringify({ status: 'offline' });
      const beaconSent = navigator.sendBeacon('/api/presence/beacon', data);

      // If sendBeacon fails, try fetch with keepalive
      if (!beaconSent) {
        fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const handleBeforeUnload = () => {
      sendOfflineStatus();
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      // pagehide fires when page is being hidden/unloaded
      // persisted = true means the page might be restored (bfcache)
      if (!event.persisted) {
        sendOfflineStatus();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  return {
    status,
    setStatus,
    isOnline: status !== 'offline',
  };
}

// Online friend type with presence info
interface OnlineFriend {
  friendId: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  status: PresenceStatus;
  lastSeenAt: string | null;
}

interface UseFriendsPresenceReturn {
  friends: OnlineFriend[];
  onlineFriends: OnlineFriend[];
  offlineFriends: OnlineFriend[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Hook for getting friends' presence status with real-time updates
export function useFriendsPresence(pollInterval: number = 60000): UseFriendsPresenceReturn {
  const [friends, setFriends] = useState<OnlineFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const friendIdsRef = useRef<Set<string>>(new Set());

  const fetchFriendsPresence = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/presence/friends', { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch friends presence');
      }

      const friendsList = data.friends || [];
      setFriends(friendsList);
      // Keep track of friend IDs for filtering real-time updates
      friendIdsRef.current = new Set(friendsList.map((f: OnlineFriend) => f.friendId));
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching friends presence:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    fetchFriendsPresence();

    // Subscribe to real-time presence changes
    // Use a unique channel name to avoid conflicts
    const channelName = `friends-presence-${Date.now()}`;
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'user_presence',
        },
        (payload) => {
          const updatedPresence = payload.new as {
            user_id: string;
            status: PresenceStatus;
            last_seen_at: string;
          };

          // Only update if this user is in our friends list
          if (!updatedPresence?.user_id || !friendIdsRef.current.has(updatedPresence.user_id)) {
            return;
          }

          // Update the friend's presence in state
          setFriends((prev) =>
            prev.map((friend) =>
              friend.friendId === updatedPresence.user_id
                ? {
                    ...friend,
                    status: updatedPresence.status,
                    lastSeenAt: updatedPresence.last_seen_at,
                  }
                : friend
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to presence updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to presence updates');
        }
      });

    // Fallback poll for reliability (less frequent now)
    if (pollInterval > 0) {
      pollRef.current = setInterval(fetchFriendsPresence, pollInterval);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchFriendsPresence, pollInterval]);

  // Apply timeout logic to determine actual online/offline status
  const getEffectiveStatus = (friend: OnlineFriend): PresenceStatus => {
    if (!friend.lastSeenAt) return 'offline';

    const lastSeen = new Date(friend.lastSeenAt).getTime();
    const now = Date.now();

    // If last seen more than 2 minutes ago, consider offline
    if (now - lastSeen > PRESENCE_TIMEOUT_MS) {
      return 'offline';
    }

    return friend.status;
  };

  const onlineFriends = friends.filter((f) => {
    const effectiveStatus = getEffectiveStatus(f);
    return effectiveStatus === 'online' || effectiveStatus === 'away' || effectiveStatus === 'busy';
  });

  const offlineFriends = friends.filter((f) => {
    const effectiveStatus = getEffectiveStatus(f);
    return effectiveStatus === 'offline';
  });

  // Include effective status in the friends list
  const friendsWithEffectiveStatus = friends.map((f) => ({
    ...f,
    status: getEffectiveStatus(f),
  }));

  return {
    friends: friendsWithEffectiveStatus,
    onlineFriends,
    offlineFriends,
    loading,
    error,
    refresh: fetchFriendsPresence,
  };
}
