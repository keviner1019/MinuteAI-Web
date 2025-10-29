// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { PeerConnectionManager } from '@/lib/webrtc/peer';
import { SignalingService } from '@/lib/webrtc/signaling';
import { mediaConstraints } from '@/lib/webrtc/config';
import { createClient } from '@/lib/supabase/client';

export function useWebRTC(roomId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteStreamVersion, setRemoteStreamVersion] = useState(0); // Force re-render on track changes
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [error, setError] = useState<string | null>(null);
  const [peerLeft, setPeerLeft] = useState(false);
  const [remoteUserProfile, setRemoteUserProfile] = useState<{
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  const peerManager = useRef<PeerConnectionManager>();
  const signaling = useRef<SignalingService>();
  const isInitiator = useRef(false);
  const meetingId = useRef<string | null>(null);
  const mySessionId = useRef<string>(Math.random().toString(36).substring(7)); // Unique session ID
  const currentUserId = useRef<string | null>(null);

  // Perfect Negotiation flags
  const makingOffer = useRef(false);
  const ignoreOffer = useRef(false);
  const isSettingRemoteAnswerPending = useRef(false);

  const supabase = createClient();

  const initializingRef = useRef(false); // Track if initialization is in progress

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializingRef.current) {
      console.log('⚠️ Initialization already in progress, skipping...');
      return;
    }

    initializeConnection();

    return () => {
      console.log('🧹 Cleanup called');
      // Notify others that we're leaving
      if (signaling.current && mySessionId.current) {
        signaling.current.sendUserLeft(mySessionId.current);
      }
      cleanup();
      initializingRef.current = false;
    };
  }, [roomId]);

  async function initializeConnection() {
    try {
      // Prevent duplicate/concurrent initialization
      if (initializingRef.current) {
        console.log('⚠️ Already initializing, skipping...');
        return;
      }
      initializingRef.current = true;

      console.log('🚀 Initializing WebRTC connection...');

      // Try to get local media (optional - user can join without camera/mic)
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        setLocalStream(stream);
        setError(null); // Clear any previous errors
        console.log('✅ Media devices obtained');
      } catch (mediaError: any) {
        console.warn('Failed to get media devices:', mediaError);

        // Provide specific error messages based on error type
        let errorMessage = 'Microphone access denied. You can still join to listen.';

        if (mediaError.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. You can still join to listen.';
        } else if (mediaError.name === 'NotFoundError') {
          errorMessage = 'No microphone found. You can still join to listen.';
        } else if (mediaError.name === 'NotReadableError') {
          errorMessage = 'Microphone is already in use by another application.';
        } else if (mediaError.name === 'OverconstrainedError') {
          errorMessage = 'Microphone constraints could not be satisfied.';
        }

        setError(errorMessage);

        // Create empty stream as fallback - user can still join
        stream = new MediaStream();
      }

      // Initialize peer connection
      peerManager.current = new PeerConnectionManager();
      await peerManager.current.initialize();
      console.log('🎧 Peer manager initialized');

      // Setup callbacks
      peerManager.current.onRemoteStream = (stream) => {
        console.log('🎵 Remote audio stream received!');
        console.log('🎵 Stream has', stream.getTracks().length, 'tracks');
        stream.getTracks().forEach((track) => {
          console.log(
            `🎵 Track: ${track.kind} - ID: ${track.id} - Enabled: ${track.enabled} - Muted: ${track.muted} - ReadyState: ${track.readyState}`
          );
        });
        setRemoteStream(stream);
        setRemoteStreamVersion((v) => {
          console.log(`🔄 Incrementing remoteStreamVersion: ${v} → ${v + 1}`);
          return v + 1;
        }); // Force re-render even if same stream object
        // Don't set isConnected here - wait for data channel
      };

      peerManager.current.onConnectionStateChange = (state) => {
        console.log('🔄 Connection state:', state);
        setConnectionState(state);
        if (state === 'connected') {
          // Connection established at ICE level, but wait for data channel
          updateMeetingStatus('active');
        } else if (state === 'failed' || state === 'disconnected') {
          setIsConnected(false);
        }
      };

      // Data channel callbacks - this confirms peer presence
      peerManager.current.onDataChannelOpen = () => {
        console.log('✅ Peer connected via data channel!');
        setIsConnected(true);
      };

      peerManager.current.onDataChannelMessage = (message) => {
        try {
          const data = JSON.parse(message);
          console.log('📨 Received message from peer:', data);
          if (data.type === 'presence') {
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      };

      // Add local stream (may be empty if user denied permission)
      if (stream && stream.getTracks().length > 0) {
        await peerManager.current.addLocalStream(stream);
      }

      // Get or create meeting in database
      const meeting = await getOrCreateMeeting(roomId);
      meetingId.current = (meeting as any).id;

      // Check if we're the first person (initiator)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUserId.current = user?.id || null;
      isInitiator.current = (meeting as any).host_id === user?.id;

      console.log('🎯 My session ID:', mySessionId.current);
      console.log('👤 My user ID:', currentUserId.current);
      console.log('🎭 Role:', isInitiator.current ? 'Host (impolite)' : 'Guest (polite)');

      // Initialize signaling
      signaling.current = new SignalingService(roomId);

      // Wait for signaling to connect, THEN setup handlers
      signaling.current.onConnected = async () => {
        console.log('✅ Signaling connected, setting up handlers...');
        setupSignalingHandlers();
        // DON'T setup negotiation handler here - wait for peer to join!

        // Small delay to ensure all handlers are properly bound
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Send our profile information to the room
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('id', currentUserId.current!)
          .single();

        if (userProfile) {
          console.log('📤 Sending my profile to the room:', userProfile);
          const profile = userProfile as any;
          signaling.current?.sendUserProfile({
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            userId: currentUserId.current!,
          });
        }

        // NOW notify others that we joined (handlers are ready to receive events)
        signaling.current?.sendUserJoined(mySessionId.current);
      };

      signaling.current.connect();
    } catch (error: any) {
      console.error('Failed to initialize connection:', error);
      setError(error.message);
    }
  }

  function setupSignalingHandlers() {
    if (!signaling.current || !peerManager.current) return;

    // Perfect Negotiation Pattern
    // The polite peer (guest/non-initiator) will rollback on collision
    const polite = !isInitiator.current;

    // Handle incoming offer - Perfect Negotiation
    signaling.current.onOffer(async (offer) => {
      if (!peerManager.current) {
        console.error('❌ Cannot handle offer: peerManager not initialized!');
        return;
      }

      console.log('🔧 Processing offer...');

      try {
        const offerCollision =
          offer.type === 'offer' &&
          (makingOffer.current || peerManager.current.signalingState !== 'stable');

        ignoreOffer.current = !polite && offerCollision;

        if (ignoreOffer.current) {
          console.log('🚫 Ignoring offer (impolite peer, collision detected)');
          return;
        }

        await peerManager.current.setRemoteDescription(offer);
        const answer = await peerManager.current.createAnswer();
        signaling.current?.sendAnswer(answer);
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    // Handle incoming answer (host receives this)
    signaling.current.onAnswer(async (answer) => {
      if (!peerManager.current) {
        console.error('❌ Cannot handle answer: peerManager not initialized!');
        return;
      }

      console.log('🔧 Processing answer...');

      try {
        await peerManager.current.setRemoteDescription(answer);
        isSettingRemoteAnswerPending.current = false;
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    // Handle ICE candidates
    signaling.current.onIceCandidate(async (candidate) => {
      if (!peerManager.current) {
        console.error('❌ Cannot handle ICE candidate: peerManager not initialized!');
        return;
      }

      console.log('🧊 Processing ICE candidate...');

      try {
        await peerManager.current.addIceCandidate(candidate);
      } catch (error) {
        // Ignore errors for candidates that arrive before remote description
        if (error instanceof Error && !error.message.includes('Unknown ufrag')) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // Send ICE candidates to peer
    peerManager.current.onIceCandidate = (candidate) => {
      signaling.current?.sendIceCandidate(candidate);
    };

    // Handle user joined
    signaling.current.onUserJoined(async (sessionId) => {
      console.log('👥 User joined with session:', sessionId);
      console.log('🎯 My session:', mySessionId.current);

      // Ignore our own join event
      if (sessionId === mySessionId.current) {
        console.log('⏭️ Ignoring own join event');
        return;
      }

      console.log('✅ Different user joined! Setting up negotiation...');

      // Send our profile to the newly joined user
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', currentUserId.current!)
        .single();

      if (userProfile) {
        console.log('📤 Sending my profile to new participant:', userProfile);
        const profile = userProfile as any;
        signaling.current?.sendUserProfile({
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          userId: currentUserId.current!,
        });
      }

      // Now that we have another peer, enable negotiation
      if (peerManager.current && !peerManager.current.onnegotiationneeded) {
        setupNegotiationHandler();
      }

      // CRITICAL: Manually trigger negotiation if we're the impolite peer (host)
      // This is needed because onnegotiationneeded won't fire if no tracks were added
      if (isInitiator.current && peerManager.current) {
        console.log('🎬 Host: Manually triggering negotiation...');
        try {
          makingOffer.current = true;
          await peerManager.current.setLocalDescription();
          signaling.current?.sendOffer(
            peerManager.current.localDescription as RTCSessionDescriptionInit
          );
        } catch (error) {
          console.error('Error during manual negotiation:', error);
        } finally {
          makingOffer.current = false;
        }
      }
    });

    // Handle user left
    signaling.current.onUserLeft((sessionId) => {
      console.log('👋 User left with session:', sessionId);

      // Ignore our own leave event
      if (sessionId === mySessionId.current) {
        console.log('⏭️ Ignoring own leave event');
        return;
      }

      console.log('😢 Peer disconnected');
      setIsConnected(false);
      setRemoteStream(null);
      setRemoteUserProfile(null);
      setPeerLeft(true);

      // Hide notification after 5 seconds
      setTimeout(() => setPeerLeft(false), 5000);
    });

    // Handle user profile received
    signaling.current.onUserProfile((profile) => {
      // Don't set our own profile as remote profile
      if (profile.userId === currentUserId.current) {
        console.log('⏭️ Ignoring own profile');
        return;
      }

      console.log('📥 Received remote user profile:', profile);
      setRemoteUserProfile({
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      });
    });
  }

  function setupNegotiationHandler() {
    if (!peerManager.current) return;

    console.log('🔧 Setting up negotiation handler...');

    // Monitor negotiation needed event - Perfect Negotiation
    peerManager.current.onnegotiationneeded = async () => {
      try {
        console.log('� Negotiation needed! Creating offer...');
        makingOffer.current = true;
        await peerManager.current?.setLocalDescription();
        signaling.current?.sendOffer(
          peerManager.current?.localDescription as RTCSessionDescriptionInit
        );
      } catch (error) {
        console.error('Error during negotiation:', error);
      } finally {
        makingOffer.current = false;
      }
    };
  }

  async function getOrCreateMeeting(roomId: string) {
    // Check if meeting exists
    const { data: existingMeeting, error: fetchError } = await supabase
      .from('meetings')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle(); // Use maybeSingle() to avoid error when no rows found

    if (existingMeeting) {
      console.log('📋 Using existing meeting:', existingMeeting.id);
      return existingMeeting;
    }

    // Create new meeting
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('🆕 Creating new meeting for room:', roomId);

    const { data: newMeeting, error } = await supabase
      .from('meetings')
      .insert({
        room_id: roomId,
        host_id: user?.id,
        title: 'Quick Meeting',
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      // If duplicate key error, try fetching again (race condition from React Strict Mode)
      if (error.code === '23505') {
        console.log('⚠️ Duplicate key detected, fetching existing meeting...');
        const { data: raceMeeting } = await supabase
          .from('meetings')
          .select('*')
          .eq('room_id', roomId)
          .single();

        if (raceMeeting) return raceMeeting;
      }
      throw error;
    }

    console.log('✅ Created new meeting:', newMeeting.id);
    return newMeeting;
  }

  async function updateMeetingStatus(status: 'scheduled' | 'active' | 'ended') {
    if (!meetingId.current) return;

    const updates: any = { status };

    if (status === 'active') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'ended') {
      updates.ended_at = new Date().toISOString();
    }

    await supabase.from('meetings').update(updates).eq('id', meetingId.current);
  }

  const toggleAudio = useCallback(() => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, [localStream]);

  const endCall = useCallback(async () => {
    await updateMeetingStatus('ended');
    cleanup();
    // Navigate to summary page
    window.location.href = `/meeting/${roomId}/summary`;
  }, [roomId]);

  function cleanup() {
    peerManager.current?.close();
    peerManager.current = null;
    signaling.current?.disconnect();
    signaling.current = null;
    localStream?.getTracks().forEach((track) => track.stop());
  }

  return {
    localStream,
    remoteStream,
    remoteStreamVersion,
    isConnected,
    isMuted,
    connectionState,
    error,
    peerLeft,
    remoteUserProfile,
    toggleAudio,
    endCall,
    meetingId: meetingId.current,
  };
}
