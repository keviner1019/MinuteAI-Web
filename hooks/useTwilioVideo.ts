'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  connect,
  Room,
  RemoteParticipant,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteTrack,
  RemoteAudioTrack,
  RemoteVideoTrack,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from 'twilio-video';
import { createClient } from '@/lib/supabase/client';
import { Participant } from '@/types';

interface UseTwilioVideoReturn {
  // Local streams
  localStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  isVideoEnabled: boolean;
  isMuted: boolean;

  // Connection state
  isConnected: boolean;
  connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
  error: string | null;
  isHost: boolean;
  meetingId: string | null;

  // Multi-user participants Map
  participants: Map<string, Participant>;
  participantCount: number;

  // Backwards compatibility (single remote user)
  remoteStream: MediaStream | null;
  remoteStreamVersion: number;
  remoteVideoStream: MediaStream | null;
  remoteUserProfile: { id: string; display_name: string | null; avatar_url: string | null } | null;
  isRemoteMuted: boolean;
  isRemoteRecording: boolean;

  // Control methods
  toggleAudio: () => void;
  toggleVideo: () => Promise<void>;
  sendRecordingState: (isRecording: boolean) => void;
  endCall: () => Promise<void>;
  getPeerConnection: () => RTCPeerConnection | null;
  peerLeft: boolean;
}

export function useTwilioVideo(roomId: string): UseTwilioVideoReturn {
  // Use singleton Supabase client to avoid multiple GoTrueClient instances
  const supabase = useMemo(() => createClient(), []);

  // Room and tracks
  const roomRef = useRef<Room | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null);

  // Local state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'>('new');
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);

  // Participants
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [peerLeft, setPeerLeft] = useState(false);

  // Remote streams for backwards compatibility
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteStreamVersion, setRemoteStreamVersion] = useState(0);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [remoteUserProfile, setRemoteUserProfile] = useState<{ id: string; display_name: string | null; avatar_url: string | null } | null>(null);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteRecording, setIsRemoteRecording] = useState(false);

  // Helper to get participant count
  const participantCount = participants.size;

  // Type for meeting record
  interface MeetingRecord {
    id: string;
    room_id: string;
    host_id: string | null;
    guest_id: string | null;
    title: string | null;
    status: 'scheduled' | 'active' | 'ended' | null;
    started_at: string | null;
    ended_at: string | null;
    created_at: string;
    updated_at: string;
    meeting_code: string | null;
  }

  // Get or create meeting
  const getOrCreateMeeting = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return null;
      }

      // Try to get existing meeting (use maybeSingle to avoid 406 error)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingMeeting, error: fetchError } = await (supabase as any)
        .from('meetings')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle() as { data: MeetingRecord | null; error: { message: string } | null };

      if (fetchError) {
        console.error('Error fetching meeting:', fetchError);
      }

      let meeting: MeetingRecord | null = existingMeeting;

      if (!meeting) {
        // Create new meeting
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newMeeting, error: createError } = await (supabase as any)
          .from('meetings')
          .insert({
            room_id: roomId,
            host_id: user.id,
            title: `Meeting ${roomId}`,
            status: 'scheduled',
          })
          .select()
          .single() as { data: MeetingRecord | null; error: { code?: string; message: string } | null };

        if (createError) {
          // Handle race condition - another user may have created the meeting
          if (createError.code === '23505') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: raceMeeting } = await (supabase as any)
              .from('meetings')
              .select('*')
              .eq('room_id', roomId)
              .maybeSingle() as { data: MeetingRecord | null };
            if (raceMeeting) {
              meeting = raceMeeting;
            } else {
              console.error('Error creating meeting:', createError);
              setError('Failed to create meeting');
              return null;
            }
          } else {
            console.error('Error creating meeting:', createError);
            setError('Failed to create meeting');
            return null;
          }
        } else {
          meeting = newMeeting;
        }
      }

      if (!meeting) {
        setError('Failed to create or find meeting');
        return null;
      }

      setMeetingId(meeting.id);
      setIsHost(meeting.host_id === user.id);

      // Update meeting status to active if not already
      if (meeting.status !== 'active') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('meetings')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', meeting.id);
      }

      // Register as participant - check if exists first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingParticipant } = await (supabase as any)
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meeting.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingParticipant) {
        // Update existing participant
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('meeting_participants')
          .update({ is_active: true, left_at: null })
          .eq('id', existingParticipant.id);
      } else {
        // Insert new participant
        const role = meeting.host_id === user.id ? 'host' : 'participant';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('meeting_participants')
          .insert({
            meeting_id: meeting.id,
            user_id: user.id,
            role,
            is_active: true,
            joined_at: new Date().toISOString(),
          });
      }

      return { meeting, user };
    } catch (err) {
      console.error('Error in getOrCreateMeeting:', err);
      setError('Failed to setup meeting');
      return null;
    }
  }, [roomId, supabase]);

  // Fetch Twilio token
  const fetchToken = useCallback(async (identity: string) => {
    try {
      const response = await fetch('/api/twilio/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomId,
          identity,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to get token');
      }

      const data = await response.json();
      return data.token;
    } catch (err) {
      console.error('Error fetching Twilio token:', err);
      throw err;
    }
  }, [roomId]);

  // Handle remote participant tracks
  const handleTrackSubscribed = useCallback((track: RemoteTrack, participant: RemoteParticipant) => {
    console.log(`Track subscribed: ${track.kind} from ${participant.identity}`);

    // Parse identity to get user info for creating participant if doesn't exist
    const [userId, displayName] = participant.identity.split(':');

    setParticipants(prev => {
      const updated = new Map(prev);
      let existing = updated.get(participant.identity);

      // Create participant if doesn't exist (track can arrive before participantConnected event)
      if (!existing) {
        existing = {
          userId,
          sessionId: participant.sid,
          displayName: displayName || null,
          avatarUrl: null,
          isMuted: true,
          isVideoEnabled: false,
          isSpeaking: false,
          isRecording: false,
          connectionState: 'connected',
          stream: null,
          videoStream: null,
        };
        updated.set(participant.identity, existing);
        console.log(`Created participant from track subscription: ${participant.identity}`);
      }

      if (track.kind === 'audio') {
        const audioTrack = track as RemoteAudioTrack;
        const audioStream = new MediaStream([audioTrack.mediaStreamTrack]);

        existing.stream = audioStream;
        existing.isMuted = !audioTrack.isEnabled;

        // Update backwards compat remote stream
        setRemoteStream(audioStream);
        setRemoteStreamVersion(v => v + 1);
        setIsRemoteMuted(!audioTrack.isEnabled);

        // Listen for enabled/disabled
        audioTrack.on('enabled', () => {
          setParticipants(p => {
            const u = new Map(p);
            const e = u.get(participant.identity);
            if (e) e.isMuted = false;
            return u;
          });
          setIsRemoteMuted(false);
        });
        audioTrack.on('disabled', () => {
          setParticipants(p => {
            const u = new Map(p);
            const e = u.get(participant.identity);
            if (e) e.isMuted = true;
            return u;
          });
          setIsRemoteMuted(true);
        });
      }

      if (track.kind === 'video') {
        const videoTrack = track as RemoteVideoTrack;
        const videoStream = new MediaStream([videoTrack.mediaStreamTrack]);

        existing.videoStream = videoStream;
        existing.isVideoEnabled = videoTrack.isEnabled;

        // Update backwards compat remote video stream
        setRemoteVideoStream(videoStream);

        // Listen for enabled/disabled
        videoTrack.on('enabled', () => {
          setParticipants(p => {
            const u = new Map(p);
            const e = u.get(participant.identity);
            if (e) e.isVideoEnabled = true;
            return u;
          });
        });
        videoTrack.on('disabled', () => {
          setParticipants(p => {
            const u = new Map(p);
            const e = u.get(participant.identity);
            if (e) e.isVideoEnabled = false;
            return u;
          });
        });
      }

      return updated;
    });
  }, []);

  // Handle remote participant track unsubscribed
  const handleTrackUnsubscribed = useCallback((track: RemoteTrack, participant: RemoteParticipant) => {
    console.log(`Track unsubscribed: ${track.kind} from ${participant.identity}`);

    setParticipants(prev => {
      const updated = new Map(prev);
      const existing = updated.get(participant.identity);

      if (existing) {
        if (track.kind === 'audio') {
          existing.stream = null;
        }
        if (track.kind === 'video') {
          existing.videoStream = null;
          existing.isVideoEnabled = false;
        }
      }

      return updated;
    });

    if (track.kind === 'video') {
      setRemoteVideoStream(null);
    }
  }, []);

  // Handle remote participant connected
  const handleParticipantConnected = useCallback(async (participant: RemoteParticipant) => {
    console.log(`Participant connected: ${participant.identity}`);

    // Parse identity to get user info (identity format: "userId:displayName")
    const [userId, displayName] = participant.identity.split(':');

    // Try to get user profile from Supabase
    let profile = { id: userId, display_name: displayName || null, avatar_url: null as string | null };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .eq('id', userId)
        .single() as { data: { id: string; display_name: string | null; avatar_url: string | null } | null };
      if (data) {
        profile = data;
      }
    } catch (e) {
      console.log('Could not fetch profile for participant:', e);
    }

    setParticipants(prev => {
      const updated = new Map(prev);
      const existing = updated.get(participant.identity);

      if (existing) {
        // Update existing participant with profile data
        existing.displayName = profile.display_name;
        existing.avatarUrl = profile.avatar_url;
        existing.sessionId = participant.sid;
        existing.connectionState = 'connected';
        console.log(`Updated existing participant with profile: ${participant.identity}`);
      } else {
        // Create new participant
        const newParticipant: Participant = {
          userId,
          sessionId: participant.sid,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          isMuted: true,
          isVideoEnabled: false,
          isSpeaking: false,
          isRecording: false,
          connectionState: 'connected',
          stream: null,
          videoStream: null,
        };
        updated.set(participant.identity, newParticipant);
        console.log(`Created new participant: ${participant.identity}`);
      }

      return updated;
    });

    setRemoteUserProfile(profile);

    // Subscribe to existing tracks
    participant.tracks.forEach(publication => {
      if (publication.isSubscribed && publication.track) {
        handleTrackSubscribed(publication.track, participant);
      }
    });

    // Listen for future track subscriptions
    participant.on('trackSubscribed', track => handleTrackSubscribed(track, participant));
    participant.on('trackUnsubscribed', track => handleTrackUnsubscribed(track, participant));
  }, [supabase, handleTrackSubscribed, handleTrackUnsubscribed]);

  // Handle remote participant disconnected
  const handleParticipantDisconnected = useCallback((participant: RemoteParticipant) => {
    console.log(`Participant disconnected: ${participant.identity}`);

    setParticipants(prev => {
      const updated = new Map(prev);
      updated.delete(participant.identity);

      // Clear backwards compat streams if this was the only remote
      // We check the updated map size, not the current state
      if (updated.size === 0) {
        setRemoteStream(null);
        setRemoteVideoStream(null);
        setRemoteUserProfile(null);
      }

      return updated;
    });

    setPeerLeft(true);
    setTimeout(() => setPeerLeft(false), 100);
  }, []);

  // Connect to Twilio room
  const connectToRoom = useCallback(async () => {
    try {
      setConnectionState('connecting');
      setError(null);

      // Get or create meeting and user
      const result = await getOrCreateMeeting();
      if (!result) return;

      const { user } = result;

      // Get user profile for display name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('user_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single() as { data: { display_name: string | null } | null };

      const displayName = profile?.display_name || user.email || 'Anonymous';
      const identity = `${user.id}:${displayName}`;

      // Fetch Twilio token
      const token = await fetchToken(identity);

      // Create local audio track
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      localAudioTrackRef.current = audioTrack;
      const audioStream = new MediaStream([audioTrack.mediaStreamTrack]);
      setLocalStream(audioStream);

      // Connect to room with audio track
      const room = await connect(token, {
        name: roomId,
        tracks: [audioTrack],
        dominantSpeaker: true,
      });

      roomRef.current = room;
      setIsConnected(true);
      setConnectionState('connected');

      console.log(`Connected to room: ${room.name}`);

      // Handle existing participants
      room.participants.forEach(handleParticipantConnected);

      // Listen for new participants
      room.on('participantConnected', handleParticipantConnected);
      room.on('participantDisconnected', handleParticipantDisconnected);

      // Handle room disconnection
      room.on('disconnected', (_room, disconnectError) => {
        console.log('Disconnected from room', disconnectError?.message || 'No error');
        setIsConnected(false);
        setConnectionState('disconnected');

        // Cleanup tracks
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current = null;
        }
        if (localVideoTrackRef.current) {
          localVideoTrackRef.current.stop();
          localVideoTrackRef.current = null;
        }

        // Clear participants
        setParticipants(new Map());
        setRemoteStream(null);
        setRemoteVideoStream(null);

        if (disconnectError) {
          setError(`Disconnected: ${disconnectError.message}`);
        }
      });

      // Handle reconnection events
      room.on('reconnecting', (error) => {
        console.log('Reconnecting to room...', error?.message);
        setConnectionState('connecting');
      });

      room.on('reconnected', () => {
        console.log('Reconnected to room');
        setConnectionState('connected');
        setError(null);
      });

      // Handle dominant speaker changes for speaking indicator
      room.on('dominantSpeakerChanged', (dominantParticipant) => {
        setParticipants(prev => {
          const updated = new Map(prev);
          updated.forEach((p) => {
            p.isSpeaking = dominantParticipant ? p.sessionId === dominantParticipant.sid : false;
          });
          return updated;
        });
      });

    } catch (err) {
      console.error('Error connecting to Twilio room:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnectionState('failed');
    }
  }, [roomId, getOrCreateMeeting, fetchToken, supabase, handleParticipantConnected, handleParticipantDisconnected]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const audioTrack = localAudioTrackRef.current;
    if (audioTrack) {
      if (audioTrack.isEnabled) {
        audioTrack.disable();
        setIsMuted(true);
      } else {
        audioTrack.enable();
        setIsMuted(false);
      }
    }
  }, []);

  // Track video toggle state to prevent double operations
  const isTogglingVideoRef = useRef(false);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    // Prevent double-toggle while operation is in progress
    if (isTogglingVideoRef.current) {
      console.log('Video toggle already in progress, skipping...');
      return;
    }

    isTogglingVideoRef.current = true;

    const existingVideoTrack = localVideoTrackRef.current;

    try {
      if (existingVideoTrack) {
        // Disable and unpublish video
        existingVideoTrack.stop();
        try {
          room.localParticipant.unpublishTrack(existingVideoTrack);
        } catch (unpublishErr) {
          console.warn('Error unpublishing video track:', unpublishErr);
        }
        localVideoTrackRef.current = null;
        setLocalVideoStream(null);
        setIsVideoEnabled(false);
      } else {
        // Enable video
        const videoTrack = await createLocalVideoTrack({
          facingMode: 'user',
          width: 640,
          height: 480,
        });

        localVideoTrackRef.current = videoTrack;

        try {
          await room.localParticipant.publishTrack(videoTrack);
        } catch (publishErr) {
          console.error('Error publishing video track:', publishErr);
          // Clean up the track if publishing failed
          videoTrack.stop();
          localVideoTrackRef.current = null;
          setError('Failed to publish video');
          return;
        }

        const videoStream = new MediaStream([videoTrack.mediaStreamTrack]);
        setLocalVideoStream(videoStream);
        setIsVideoEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling video:', err);
      setError('Failed to toggle camera');
    } finally {
      isTogglingVideoRef.current = false;
    }
  }, []);

  // Send recording state (via data track would be ideal, but for now we'll store in DB)
  const sendRecordingState = useCallback((recording: boolean) => {
    // Could implement via Twilio DataTrack for real-time sync
    console.log('Recording state:', recording);
  }, []);

  // End call
  const endCall = useCallback(async () => {
    const room = roomRef.current;

    if (room) {
      // Disconnect from room
      room.disconnect();
      roomRef.current = null;
    }

    // Stop all local tracks
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current = null;
    }
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current = null;
    }

    // Reset state
    setLocalStream(null);
    setLocalVideoStream(null);
    setIsConnected(false);
    setConnectionState('closed');
    setParticipants(new Map());
    setRemoteStream(null);
    setRemoteVideoStream(null);

    // Update meeting status if host
    if (isHost && meetingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('meetings')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', meetingId);
    }

    // Navigate back to dashboard
    window.location.href = '/dashboard';
  }, [isHost, meetingId, supabase]);

  // Track if already connected to prevent reconnection loops
  const hasConnectedRef = useRef(false);

  // Connect on mount - only run once
  useEffect(() => {
    // Prevent reconnection if already connected or connecting
    if (hasConnectedRef.current) {
      return;
    }
    hasConnectedRef.current = true;

    connectToRoom();

    return () => {
      // Cleanup on unmount
      const room = roomRef.current;
      if (room) {
        room.disconnect();
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
      }
      // Reset connection flag on unmount so component can reconnect if remounted
      hasConnectedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Only depend on roomId, not connectToRoom

  // Dummy getPeerConnection for backwards compat
  const getPeerConnection = useCallback(() => null, []);

  return {
    localStream,
    localVideoStream,
    isVideoEnabled,
    isMuted,
    isConnected,
    connectionState,
    error,
    isHost,
    meetingId,
    participants,
    participantCount,
    remoteStream,
    remoteStreamVersion,
    remoteVideoStream,
    remoteUserProfile,
    isRemoteMuted,
    isRemoteRecording,
    toggleAudio,
    toggleVideo,
    sendRecordingState,
    endCall,
    getPeerConnection,
    peerLeft,
  };
}
