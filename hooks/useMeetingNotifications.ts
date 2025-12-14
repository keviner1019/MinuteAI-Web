'use client';

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

interface Meeting {
  id: string;
  title: string;
  room_id: string;
  host_id: string;
  status: string;
}

/**
 * Hook that listens for meeting-related notifications in real-time
 * - Meeting invitations
 * - Meeting started/ended
 */
export function useMeetingNotifications() {
  const { showMeetingInviteToast, showMeetingStartedToast, showMeetingEndedToast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const meetingChannelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const userEmailRef = useRef<string | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const channelIdRef = useRef<string>(
    `meeting-notifications-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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

  // Fetch meeting by ID
  const fetchMeeting = useCallback(async (meetingId: string): Promise<Meeting | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('meetings')
        .select('id, title, room_id, host_id, status')
        .eq('id', meetingId)
        .single();

      if (error) {
        console.error('Error fetching meeting:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error fetching meeting:', err);
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
      userEmailRef.current = session.user.email || null;

      // Subscribe to meeting invitation changes
      channelRef.current = supabase
        .channel(channelIdRef.current)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'meeting_invitations',
          },
          async (payload) => {
            const invitation = payload.new as {
              id: string;
              meeting_id: string;
              inviter_id: string;
              invitee_email: string;
              status: string;
            };

            // Only notify if invitation is for current user
            if (invitation.invitee_email !== userEmailRef.current) return;

            // Create unique event key to avoid duplicates
            const eventKey = `invite-${invitation.id}`;
            if (processedEventsRef.current.has(eventKey)) return;
            processedEventsRef.current.add(eventKey);

            // Fetch meeting and inviter details
            const [meeting, inviter] = await Promise.all([
              fetchMeeting(invitation.meeting_id),
              fetchUserProfile(invitation.inviter_id),
            ]);

            if (meeting && inviter) {
              const inviterName = inviter.display_name || inviter.email || 'Someone';
              showMeetingInviteToast(inviterName, meeting.title, meeting.room_id, inviter.avatar_url);
            }
          }
        )
        .subscribe();

      // Subscribe to meeting status changes (started/ended)
      meetingChannelRef.current = supabase
        .channel(`meeting-status-${channelIdRef.current}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'meetings',
          },
          async (payload) => {
            const oldMeeting = payload.old as { status?: string };
            const newMeeting = payload.new as Meeting;

            // Create unique event key
            const eventKey = `meeting-${newMeeting.id}-${newMeeting.status}`;
            if (processedEventsRef.current.has(eventKey)) return;
            processedEventsRef.current.add(eventKey);

            // Check if user is a participant
            const { data: participant } = await supabase
              .from('meeting_participants')
              .select('id')
              .eq('meeting_id', newMeeting.id)
              .eq('user_id', userIdRef.current!)
              .single();

            // Also check invitations
            const { data: invitation } = await supabase
              .from('meeting_invitations')
              .select('id')
              .eq('meeting_id', newMeeting.id)
              .eq('invitee_email', userEmailRef.current!)
              .single();

            const isInvolved = participant || invitation || newMeeting.host_id === userIdRef.current;
            if (!isInvolved) return;

            // Meeting started
            if (oldMeeting.status !== 'active' && newMeeting.status === 'active') {
              showMeetingStartedToast(newMeeting.title, newMeeting.room_id);
            }

            // Meeting ended
            if (oldMeeting.status === 'active' && newMeeting.status === 'ended') {
              showMeetingEndedToast(newMeeting.title);
            }
          }
        )
        .subscribe();

      // Clean up old processed events periodically
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
      if (meetingChannelRef.current) {
        supabase.removeChannel(meetingChannelRef.current);
      }
    };
  }, [fetchUserProfile, fetchMeeting, showMeetingInviteToast, showMeetingStartedToast, showMeetingEndedToast]);
}

/**
 * Hook for participant join/leave notifications within a meeting room
 * Use this inside the meeting room component
 */
export function useParticipantNotifications(roomId: string | null) {
  const { showParticipantJoinedToast, showParticipantLeftToast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Fetch user profile by ID
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email')
        .eq('id', userId)
        .single();

      if (error) return null;
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();

    const setupNotifications = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      userIdRef.current = session.user.id;

      // Get meeting ID from room ID
      const { data: meeting } = await supabase
        .from('meetings')
        .select('id')
        .eq('room_id', roomId)
        .single();

      if (!meeting) return;
      const meetingId = (meeting as { id: string }).id;

      // Subscribe to participant changes
      channelRef.current = supabase
        .channel(`participants-${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'meeting_participants',
            filter: `meeting_id=eq.${meetingId}`,
          },
          async (payload) => {
            const participant = payload.new as {
              id: string;
              user_id: string;
              meeting_id: string;
            };

            // Don't notify about ourselves
            if (participant.user_id === userIdRef.current) return;

            const eventKey = `join-${participant.id}`;
            if (processedEventsRef.current.has(eventKey)) return;
            processedEventsRef.current.add(eventKey);

            const profile = await fetchUserProfile(participant.user_id);
            const name = profile?.display_name || profile?.email || 'Someone';
            showParticipantJoinedToast(name, profile?.avatar_url);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'meeting_participants',
            filter: `meeting_id=eq.${meetingId}`,
          },
          async (payload) => {
            const participant = payload.old as {
              id: string;
              user_id: string;
            };

            // Don't notify about ourselves
            if (participant.user_id === userIdRef.current) return;

            const eventKey = `leave-${participant.id}`;
            if (processedEventsRef.current.has(eventKey)) return;
            processedEventsRef.current.add(eventKey);

            const profile = await fetchUserProfile(participant.user_id);
            const name = profile?.display_name || profile?.email || 'Someone';
            showParticipantLeftToast(name);
          }
        )
        .subscribe();
    };

    setupNotifications();

    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, fetchUserProfile, showParticipantJoinedToast, showParticipantLeftToast]);
}
