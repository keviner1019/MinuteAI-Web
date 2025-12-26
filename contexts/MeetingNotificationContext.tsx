'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Pusher, { Channel } from 'pusher-js';
import MeetingCountdownModal from '@/components/meeting/MeetingCountdownModal';

// Types
interface MeetingInvitation {
  id: string;
  meetingId: string;
  roomId: string;
  meetingTitle: string;
  scheduledAt: string | null;
  invitedBy: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  isInstant: boolean;
  timestamp: string;
}

interface UpcomingMeeting {
  id: string;
  roomId: string;
  title: string;
  scheduledAt: string;
  host: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  participantCount?: number;
}

interface OngoingMeeting {
  id: string;
  roomId: string;
  title: string;
  host: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  startedAt: string;
}

interface MeetingNotificationContextType {
  // Invitation modals
  pendingInvitations: MeetingInvitation[];
  currentInvitation: MeetingInvitation | null;
  acceptInvitation: (invitation: MeetingInvitation) => Promise<void>;
  declineInvitation: (invitation: MeetingInvitation) => Promise<void>;
  dismissInvitation: () => void;

  // Countdown modals
  upcomingMeetings: UpcomingMeeting[];
  currentCountdown: UpcomingMeeting | null;
  dismissCountdown: (meeting: UpcomingMeeting) => void;
  snoozeCountdown: (meeting: UpcomingMeeting, minutes: number) => void;
  dismissCountdownPermanently: (meeting: UpcomingMeeting) => void;

  // Ongoing meetings
  ongoingMeetings: OngoingMeeting[];
  currentOngoing: OngoingMeeting | null;
  dismissOngoing: (meeting: OngoingMeeting) => void;
}

const MeetingNotificationContext = createContext<MeetingNotificationContextType | undefined>(undefined);

export function useMeetingNotification() {
  const context = useContext(MeetingNotificationContext);
  if (!context) {
    throw new Error('useMeetingNotification must be used within a MeetingNotificationProvider');
  }
  return context;
}

// Singleton Pusher instance
let pusherInstance: Pusher | null = null;

function getPusherInstance(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    });
  }
  return pusherInstance;
}

// Reminder intervals in minutes - reduced to be less annoying
// Only remind at 5 minutes and when meeting starts
const REMINDER_INTERVALS = [5];

export function MeetingNotificationProvider({ children }: { children: ReactNode }) {
  // Get current pathname to check if user is in a meeting
  const pathname = usePathname();

  // State for invitations
  const [pendingInvitations, setPendingInvitations] = useState<MeetingInvitation[]>([]);
  const [currentInvitation, setCurrentInvitation] = useState<MeetingInvitation | null>(null);

  // State for countdown reminders
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [currentCountdown, setCurrentCountdown] = useState<UpcomingMeeting | null>(null);
  const [snoozedMeetings, setSnoozedMeetings] = useState<Map<string, number>>(new Map());
  const [shownReminders, setShownReminders] = useState<Set<string>>(new Set());
  const [dismissedMeetings, setDismissedMeetings] = useState<Set<string>>(new Set()); // Permanently dismissed for this session

  // State for ongoing meetings
  const [ongoingMeetings, setOngoingMeetings] = useState<OngoingMeeting[]>([]);
  const [currentOngoing, setCurrentOngoing] = useState<OngoingMeeting | null>(null);
  const [dismissedOngoing, setDismissedOngoing] = useState<Set<string>>(new Set());

  // Refs
  const channelRef = useRef<Channel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const userEmailRef = useRef<string | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to check if user is currently in a specific meeting room
  const isInMeetingRoom = useCallback((roomId: string): boolean => {
    if (!pathname) return false;
    // Check if the pathname matches /meeting/{roomId}
    return pathname === `/meeting/${roomId}`;
  }, [pathname]);

  // Accept invitation
  const acceptInvitation = useCallback(async (invitation: MeetingInvitation) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.email) {
        // Update invitation status via API
        await fetch('/api/meetings/invitations/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            meetingId: invitation.meetingId,
            response: 'accepted',
          }),
        });
      }

      // Remove from pending
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
      setCurrentInvitation(null);
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  }, []);

  // Decline invitation
  const declineInvitation = useCallback(async (invitation: MeetingInvitation) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.email) {
        // Update invitation status via API
        await fetch('/api/meetings/invitations/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            meetingId: invitation.meetingId,
            response: 'declined',
          }),
        });
      }

      // Remove from pending
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
      setCurrentInvitation(null);
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  }, []);

  // Dismiss current invitation modal
  const dismissInvitation = useCallback(() => {
    setCurrentInvitation(null);
  }, []);

  // Dismiss countdown modal
  const dismissCountdown = useCallback((meeting: UpcomingMeeting) => {
    setCurrentCountdown(null);
    // Mark as shown for this interval
    const key = `${meeting.id}-shown`;
    setShownReminders((prev) => new Set(prev).add(key));
  }, []);

  // Snooze countdown
  const snoozeCountdown = useCallback((meeting: UpcomingMeeting, minutes: number) => {
    const snoozeUntil = Date.now() + minutes * 60 * 1000;
    setSnoozedMeetings((prev) => new Map(prev).set(meeting.id, snoozeUntil));
    setCurrentCountdown(null);
  }, []);

  // Permanently dismiss countdown for this session (don't remind again)
  const dismissCountdownPermanently = useCallback((meeting: UpcomingMeeting) => {
    setDismissedMeetings((prev) => new Set(prev).add(meeting.id));
    setCurrentCountdown(null);
  }, []);

  // Dismiss ongoing meeting notification
  const dismissOngoing = useCallback((meeting: OngoingMeeting) => {
    setDismissedOngoing((prev) => new Set(prev).add(meeting.id));
    setCurrentOngoing(null);
  }, []);

  // Handle incoming meeting invitation via Pusher
  const handleMeetingInvite = useCallback((payload: {
    type: string;
    meetingId: string;
    roomId: string;
    meetingTitle: string;
    scheduledAt?: string | null;
    invitedBy: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };
    timestamp: string;
  }) => {
    // Skip if from current user
    if (payload.invitedBy.id === userIdRef.current) return;

    // Create unique event key
    const eventKey = `invite-${payload.meetingId}-${payload.timestamp}`;
    if (processedEventsRef.current.has(eventKey)) return;
    processedEventsRef.current.add(eventKey);

    const isInstant = !payload.scheduledAt;

    const invitation: MeetingInvitation = {
      id: eventKey,
      meetingId: payload.meetingId,
      roomId: payload.roomId,
      meetingTitle: payload.meetingTitle,
      scheduledAt: payload.scheduledAt || null,
      invitedBy: payload.invitedBy,
      isInstant,
      timestamp: payload.timestamp,
    };

    // For instant meetings, show modal immediately
    if (isInstant) {
      setCurrentInvitation(invitation);
    }

    // Add to pending list
    setPendingInvitations((prev) => [...prev, invitation]);
  }, []);

  // Check for upcoming meetings and show countdown
  const checkUpcomingMeetings = useCallback(async () => {
    if (!userIdRef.current) return;

    try {
      const supabase = createClient();
      const now = Date.now();

      // Get meetings scheduled within next 15 minutes
      const fifteenMinutesFromNow = new Date(now + 15 * 60 * 1000);

      // Get user's scheduled meetings (as host, participant, or invitee)
      const { data: hostedMeetings } = await supabase
        .from('meetings')
        .select('id, room_id, title, scheduled_at, host_id, status')
        .eq('host_id', userIdRef.current)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .lte('scheduled_at', fifteenMinutesFromNow.toISOString());

      const { data: participantData } = await supabase
        .from('meeting_participants')
        .select('meeting_id')
        .eq('user_id', userIdRef.current);

      const participantMeetingIds = participantData?.map((p: { meeting_id: string }) => p.meeting_id) || [];

      let participantMeetings: any[] = [];
      if (participantMeetingIds.length > 0) {
        const { data } = await supabase
          .from('meetings')
          .select('id, room_id, title, scheduled_at, host_id, status')
          .in('id', participantMeetingIds)
          .eq('status', 'scheduled')
          .gte('scheduled_at', new Date().toISOString())
          .lte('scheduled_at', fifteenMinutesFromNow.toISOString());
        participantMeetings = data || [];
      }

      // Get invited meetings
      let invitedMeetings: any[] = [];
      if (userEmailRef.current) {
        const { data: invitations } = await supabase
          .from('meeting_invitations')
          .select('meeting_id')
          .eq('invitee_email', userEmailRef.current.toLowerCase())
          .in('status', ['pending', 'accepted']);

        const invitedIds = invitations?.map((i: { meeting_id: string }) => i.meeting_id) || [];

        if (invitedIds.length > 0) {
          const { data } = await supabase
            .from('meetings')
            .select('id, room_id, title, scheduled_at, host_id, status')
            .in('id', invitedIds)
            .eq('status', 'scheduled')
            .gte('scheduled_at', new Date().toISOString())
            .lte('scheduled_at', fifteenMinutesFromNow.toISOString());
          invitedMeetings = data || [];
        }
      }

      // Combine and dedupe
      const allMeetings = [...(hostedMeetings || []), ...participantMeetings, ...invitedMeetings];
      const uniqueMeetings = Array.from(new Map(allMeetings.map((m) => [m.id, m])).values());

      // Process each meeting
      for (const meeting of uniqueMeetings) {
        // Skip if permanently dismissed
        if (dismissedMeetings.has(meeting.id)) continue;

        const scheduledTime = new Date(meeting.scheduled_at).getTime();
        const minutesUntil = Math.floor((scheduledTime - now) / 60000);

        // Check if snoozed
        const snoozeUntil = snoozedMeetings.get(meeting.id);
        if (snoozeUntil && now < snoozeUntil) continue;

        // Check which reminder interval we should show
        for (const interval of REMINDER_INTERVALS) {
          if (minutesUntil <= interval && minutesUntil > interval - 1) {
            const reminderKey = `${meeting.id}-${interval}`;
            if (shownReminders.has(reminderKey)) continue;

            // Get host profile
            const { data: hostProfile } = await supabase
              .from('user_profiles')
              .select('id, display_name, avatar_url')
              .eq('id', meeting.host_id)
              .single();

            const upcomingMeeting: UpcomingMeeting = {
              id: meeting.id,
              roomId: meeting.room_id,
              title: meeting.title,
              scheduledAt: meeting.scheduled_at,
              host: {
                id: meeting.host_id,
                displayName: (hostProfile as any)?.display_name || 'Unknown',
                avatarUrl: (hostProfile as any)?.avatar_url || null,
              },
            };

            // Show countdown modal
            setCurrentCountdown(upcomingMeeting);
            setShownReminders((prev) => new Set(prev).add(reminderKey));

            // Update upcoming meetings list
            setUpcomingMeetings((prev) => {
              const exists = prev.some((m) => m.id === meeting.id);
              if (exists) return prev;
              return [...prev, upcomingMeeting];
            });

            break; // Only show one reminder per meeting per check
          }
        }
      }
    } catch (error) {
      console.error('Error checking upcoming meetings:', error);
    }
  }, [snoozedMeetings, shownReminders, dismissedMeetings]);

  // Check for ongoing meetings user should be in
  const checkOngoingMeetings = useCallback(async () => {
    if (!userIdRef.current) return;

    try {
      const supabase = createClient();

      // Get active meetings where user is invited but not participating
      const { data: invitations } = await supabase
        .from('meeting_invitations')
        .select('meeting_id')
        .eq('invitee_email', userEmailRef.current?.toLowerCase() || '')
        .eq('status', 'accepted');

      const invitedIds = invitations?.map((i: { meeting_id: string }) => i.meeting_id) || [];

      if (invitedIds.length === 0) return;

      // Get active meetings
      const { data: activeMeetings } = await supabase
        .from('meetings')
        .select('id, room_id, title, host_id, started_at, status')
        .in('id', invitedIds)
        .eq('status', 'active');

      if (!activeMeetings || activeMeetings.length === 0) return;

      type ActiveMeetingRow = {
        id: string;
        room_id: string;
        title: string;
        host_id: string;
        started_at: string | null;
        status: string;
      };

      // Check if user has ever participated in this meeting
      for (const meeting of activeMeetings as ActiveMeetingRow[]) {
        // Skip if already dismissed
        if (dismissedOngoing.has(meeting.id)) continue;

        // Check if user has ANY participation record (active or not)
        // This prevents showing notifications for meetings the user already joined and left
        const { data: participation } = await supabase
          .from('meeting_participants')
          .select('id')
          .eq('meeting_id', meeting.id)
          .eq('user_id', userIdRef.current!)
          .single();

        // If user has participated before (even if they left), don't show notification
        // Only notify if they've never joined at all
        if (!participation) {
          const { data: hostProfile } = await supabase
            .from('user_profiles')
            .select('id, display_name, avatar_url')
            .eq('id', meeting.host_id)
            .single();

          const ongoing: OngoingMeeting = {
            id: meeting.id,
            roomId: meeting.room_id,
            title: meeting.title,
            host: {
              id: meeting.host_id,
              displayName: (hostProfile as any)?.display_name || 'Unknown',
              avatarUrl: (hostProfile as any)?.avatar_url || null,
            },
            startedAt: meeting.started_at || new Date().toISOString(),
          };

          setCurrentOngoing(ongoing);
          setOngoingMeetings((prev) => {
            const exists = prev.some((m) => m.id === meeting.id);
            if (exists) return prev;
            return [...prev, ongoing];
          });
        }
      }
    } catch (error) {
      console.error('Error checking ongoing meetings:', error);
    }
  }, [dismissedOngoing]);

  // Setup Pusher subscription and periodic checks
  useEffect(() => {
    const supabase = createClient();
    const pusher = getPusherInstance();

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      userIdRef.current = session.user.id;
      userEmailRef.current = session.user.email || null;

      // Subscribe to personal notification channel
      const channelName = `private-user-${session.user.id}`;
      channelRef.current = pusher.subscribe(channelName);

      // Listen for meeting invitations
      channelRef.current.bind('meeting-invite', handleMeetingInvite);

      // Initial checks
      checkUpcomingMeetings();
      checkOngoingMeetings();

      // Set up periodic checks (every minute)
      checkIntervalRef.current = setInterval(() => {
        checkUpcomingMeetings();
        checkOngoingMeetings();
      }, 60 * 1000);

      // Clean up old processed events periodically
      const cleanupInterval = setInterval(() => {
        if (processedEventsRef.current.size > 100) {
          processedEventsRef.current.clear();
        }
      }, 60000);

      return () => clearInterval(cleanupInterval);
    };

    setup();

    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelRef.current.name);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [handleMeetingInvite, checkUpcomingMeetings, checkOngoingMeetings]);

  // Show next invitation from queue when current one is dismissed
  useEffect(() => {
    if (!currentInvitation && pendingInvitations.length > 0) {
      // Find instant invitations first (they're more urgent)
      const instantInvite = pendingInvitations.find((inv) => inv.isInstant);
      if (instantInvite) {
        setCurrentInvitation(instantInvite);
      }
    }
  }, [currentInvitation, pendingInvitations]);

  return (
    <MeetingNotificationContext.Provider
      value={{
        pendingInvitations,
        currentInvitation,
        acceptInvitation,
        declineInvitation,
        dismissInvitation,
        upcomingMeetings,
        currentCountdown,
        dismissCountdown,
        snoozeCountdown,
        dismissCountdownPermanently,
        ongoingMeetings,
        currentOngoing,
        dismissOngoing,
      }}
    >
      {children}

      {/* Invitation Modal - Using green MeetingCountdownModal for consistency */}
      {currentInvitation && !isInMeetingRoom(currentInvitation.roomId) && (
        <MeetingCountdownModal
          meeting={{
            id: currentInvitation.meetingId,
            roomId: currentInvitation.roomId,
            title: currentInvitation.meetingTitle,
            scheduledAt: currentInvitation.scheduledAt || new Date().toISOString(), // Use now for instant meetings
            host: currentInvitation.invitedBy,
          }}
          onJoin={() => {
            acceptInvitation(currentInvitation);
          }}
          onDismiss={() => {
            declineInvitation(currentInvitation);
          }}
          onClose={dismissInvitation}
          isInvitation={true}
          isInstantMeeting={currentInvitation.isInstant}
        />
      )}

      {/* Countdown Modal - Don't show if user is already in the meeting room */}
      {currentCountdown && !currentInvitation && !isInMeetingRoom(currentCountdown.roomId) && (
        <MeetingCountdownModal
          meeting={currentCountdown}
          onJoin={(meeting) => {
            dismissCountdown(meeting);
          }}
          onDismiss={dismissCountdown}
          onDismissPermanently={dismissCountdownPermanently}
          onClose={() => setCurrentCountdown(null)}
        />
      )}

      {/* Ongoing Meeting Modal - Don't show if user is already in the meeting room */}
      {currentOngoing && !currentInvitation && !currentCountdown && !isInMeetingRoom(currentOngoing.roomId) && (
        <MeetingCountdownModal
          meeting={{
            ...currentOngoing,
            scheduledAt: currentOngoing.startedAt, // Use startedAt as scheduledAt so it shows as "started"
          }}
          onJoin={(meeting) => {
            dismissOngoing(currentOngoing);
          }}
          onDismiss={() => dismissOngoing(currentOngoing)}
          onClose={() => setCurrentOngoing(null)}
        />
      )}
    </MeetingNotificationContext.Provider>
  );
}
