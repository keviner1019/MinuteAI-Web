import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/contexts/ToastContext';

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

// Hook that listens for friend request notifications in real-time
export function useFriendNotifications() {
  const { showFriendRequestToast, showFriendAcceptedToast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const channelIdRef = useRef<string>(
    `friend-notifications-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // Fetch user profile by ID
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const setupNotifications = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      userIdRef.current = session.user.id;

      // Subscribe to friendship changes for notifications
      channelRef.current = supabase
        .channel(channelIdRef.current)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friendships',
          },
          async (payload) => {
            const newFriendship = payload.new as {
              id: string;
              requester_id: string;
              addressee_id: string;
              status: string;
            };

            // Create unique event key to avoid duplicates
            const eventKey = `insert-${newFriendship.id}`;
            if (processedEventsRef.current.has(eventKey)) return;
            processedEventsRef.current.add(eventKey);

            // Only show notification for new pending requests where we're the addressee
            if (
              newFriendship.status === 'pending' &&
              newFriendship.addressee_id === userIdRef.current
            ) {
              // Fetch sender's profile
              const senderProfile = await fetchUserProfile(newFriendship.requester_id);
              const senderName = senderProfile?.display_name || senderProfile?.email || 'Someone';

              showFriendRequestToast(senderName, senderProfile?.avatar_url);
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
          async (payload) => {
            const updatedFriendship = payload.new as {
              id: string;
              requester_id: string;
              addressee_id: string;
              status: string;
            };

            // Create unique event key to avoid duplicates
            const eventKey = `update-${updatedFriendship.id}-${updatedFriendship.status}`;
            if (processedEventsRef.current.has(eventKey)) return;
            processedEventsRef.current.add(eventKey);

            // Show notification when our friend request is accepted
            // (we were the requester and status changed to accepted)
            if (
              updatedFriendship.status === 'accepted' &&
              updatedFriendship.requester_id === userIdRef.current
            ) {
              // Fetch accepter's profile
              const accepterProfile = await fetchUserProfile(updatedFriendship.addressee_id);
              const accepterName =
                accepterProfile?.display_name || accepterProfile?.email || 'Someone';

              showFriendAcceptedToast(accepterName, accepterProfile?.avatar_url);
            }
          }
        )
        .subscribe();

      // Clean up old processed events periodically (prevent memory leak)
      const cleanupInterval = setInterval(() => {
        if (processedEventsRef.current.size > 100) {
          processedEventsRef.current.clear();
        }
      }, 60000);

      return () => clearInterval(cleanupInterval);
    };

    setupNotifications();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchUserProfile, showFriendRequestToast, showFriendAcceptedToast]);
}
