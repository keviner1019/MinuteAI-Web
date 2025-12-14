'use client';

import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';

interface PresenceContextType {
  isTracking: boolean;
}

const PresenceContext = createContext<PresenceContextType>({ isTracking: false });

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

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityRef = useRef<boolean>(true);
  const isInitializedRef = useRef<boolean>(false);

  // Send heartbeat to update presence
  const sendHeartbeat = async (status: string = 'online') => {
    if (!user) return;

    try {
      const headers = await getAuthHeaders();
      await fetch('/api/presence', {
        method: 'POST',
        headers,
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error('Error sending presence heartbeat:', err);
    }
  };

  // Handle visibility change
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      visibilityRef.current = !document.hidden;
      if (document.hidden) {
        sendHeartbeat('away');
      } else {
        sendHeartbeat('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Set up heartbeat interval when user is authenticated
  useEffect(() => {
    if (!user) {
      // Clear interval if user logs out
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      isInitializedRef.current = false;
      return;
    }

    // Prevent double initialization
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Initial heartbeat - mark user as online
    sendHeartbeat('online');

    // Send heartbeat every 30 seconds
    heartbeatRef.current = setInterval(() => {
      if (visibilityRef.current) {
        sendHeartbeat('online');
      }
    }, 30000);

    // Clean up on unmount
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [user]);

  // Handle page unload - use both beforeunload and pagehide for reliability
  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  return (
    <PresenceContext.Provider value={{ isTracking: !!user }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  return useContext(PresenceContext);
}
