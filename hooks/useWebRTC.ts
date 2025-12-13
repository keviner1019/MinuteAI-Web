// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { PeerConnectionManager } from '@/lib/webrtc/peer';
import { SignalingService } from '@/lib/webrtc/signaling';
import { mediaConstraints } from '@/lib/webrtc/config';
import { createClient } from '@/lib/supabase/client';
import { Participant } from '@/types';

const MAX_PARTICIPANTS = 6;

export function useWebRTC(roomId: string) {
  // Local streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Multi-user state
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [meetingIdState, setMeetingIdState] = useState<string | null>(null);

  // Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, PeerConnectionManager>>(new Map());
  const signaling = useRef<SignalingService | null>(null);
  const meetingId = useRef<string | null>(null);
  const mySessionId = useRef<string>(Math.random().toString(36).substring(7));
  const currentUserId = useRef<string | null>(null);
  const myProfile = useRef<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const initializingRef = useRef(false);

  const supabase = createClient();

  // Sync refs with state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    localVideoStreamRef.current = localVideoStream;
  }, [localVideoStream]);

  // =====================================================
  // Utility functions
  // =====================================================

  const stopStreamTracks = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (err) {
        console.warn('Error stopping track', err);
      }
    });
  };

  const updateParticipant = useCallback((userId: string, updates: Partial<Participant>) => {
    setParticipants((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(userId);
      if (existing) {
        newMap.set(userId, { ...existing, ...updates });
      } else {
        // Create participant if it doesn't exist (handles race condition)
        console.log(`📝 Creating participant on update: ${userId}`);
        newMap.set(userId, {
          userId,
          sessionId: '',
          displayName: null,
          avatarUrl: null,
          isMuted: false,
          isVideoEnabled: false,
          isSpeaking: false,
          isRecording: false,
          connectionState: 'new',
          stream: null,
          videoStream: null,
          ...updates,
        });
      }
      return newMap;
    });
  }, []);

  const removeParticipant = useCallback((userId: string) => {
    setParticipants((prev) => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  }, []);

  const getActiveParticipantCount = useCallback(() => {
    return participants.size;
  }, [participants]);

  // =====================================================
  // Peer Connection Management
  // =====================================================

  const createPeerConnection = useCallback(async (remoteUserId: string): Promise<PeerConnectionManager | null> => {
    if (peerConnections.current.has(remoteUserId)) {
      console.log(`⚠️ Peer connection already exists for ${remoteUserId}`);
      return peerConnections.current.get(remoteUserId)!;
    }

    if (getActiveParticipantCount() >= MAX_PARTICIPANTS - 1) {
      console.warn('⚠️ Maximum participants reached');
      return null;
    }

    console.log(`🔧 Creating peer connection for ${remoteUserId}`);
    const peerManager = new PeerConnectionManager();
    await peerManager.initialize();

    // Add local stream
    if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
      await peerManager.addLocalStream(localStreamRef.current);
    }

    // Add local video if enabled
    if (localVideoStreamRef.current) {
      localVideoStreamRef.current.getVideoTracks().forEach((track) => {
        peerManager.addTrack(track, localVideoStreamRef.current!);
      });
    }

    // Setup event handlers
    peerManager.onRemoteStream = (stream) => {
      console.log(`🎵 Remote stream received from ${remoteUserId}:`, {
        id: stream.id,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      // Get all tracks from the stream
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();

      // Create or update audio stream
      let audioStream: MediaStream | null = null;
      if (audioTracks.length > 0) {
        audioStream = new MediaStream(audioTracks);
        // Listen for track state changes
        audioTracks.forEach(track => {
          track.onunmute = () => {
            console.log(`🔊 Audio track unmuted from ${remoteUserId}`);
            // Force re-render by updating participant
            updateParticipant(remoteUserId, { connectionState: 'connected' });
          };
          track.onended = () => {
            console.log(`🔇 Audio track ended from ${remoteUserId}`);
          };
        });
      }

      // Create or update video stream
      let videoStream: MediaStream | null = null;
      if (videoTracks.length > 0) {
        videoStream = new MediaStream(videoTracks);
        // Listen for track state changes
        videoTracks.forEach(track => {
          track.onunmute = () => {
            console.log(`📹 Video track unmuted from ${remoteUserId}`);
            updateParticipant(remoteUserId, { isVideoEnabled: true });
          };
          track.onended = () => {
            console.log(`📹 Video track ended from ${remoteUserId}`);
            updateParticipant(remoteUserId, { videoStream: null, isVideoEnabled: false });
          };
        });
      }

      console.log(`📊 Updating participant ${remoteUserId}: audio=${!!audioStream}, video=${!!videoStream}`);

      updateParticipant(remoteUserId, {
        stream: audioStream,
        videoStream: videoStream,
        connectionState: 'connected',
        isVideoEnabled: videoTracks.length > 0,
      });
    };

    peerManager.onConnectionStateChange = (state) => {
      console.log(`🔄 Connection state for ${remoteUserId}:`, state);
      updateParticipant(remoteUserId, { connectionState: state });

      if (state === 'connected') {
        setIsConnected(true);
        setConnectionState('connected');
      } else if (state === 'failed') {
        // Only clear streams on failed (not disconnected, as it might recover)
        console.log(`⚠️ Connection failed with ${remoteUserId}, clearing streams`);
        updateParticipant(remoteUserId, {
          stream: null,
          videoStream: null,
        });
      } else if (state === 'disconnected') {
        // Don't clear streams yet - connection might recover
        console.log(`⚠️ Connection disconnected with ${remoteUserId}, waiting for recovery...`);
      }
    };

    peerManager.onIceConnectionStateChange = (state) => {
      console.log(`🧊 ICE state for ${remoteUserId}:`, state);

      if (state === 'failed') {
        console.error(`❌ ICE failed for ${remoteUserId}`);
        // Attempt to reconnect
        setTimeout(() => {
          const pm = peerConnections.current.get(remoteUserId);
          if (pm) {
            negotiateWithPeer(remoteUserId, { iceRestart: true });
          }
        }, 2000);
      }
    };

    peerManager.onIceCandidate = (candidate) => {
      signaling.current?.sendIceCandidate(candidate, remoteUserId);
    };

    peerManager.onDataChannelOpen = () => {
      console.log(`✅ Data channel opened with ${remoteUserId}`);
    };

    peerManager.onDataChannelMessage = (message) => {
      try {
        const data = JSON.parse(message);
        handleDataChannelMessage(remoteUserId, data);
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };

    peerConnections.current.set(remoteUserId, peerManager);

    // Flush any buffered ICE candidates for this user
    const bufferedCandidates = pendingIceCandidates.current.get(remoteUserId);
    if (bufferedCandidates && bufferedCandidates.length > 0) {
      console.log(`🧊 Flushing ${bufferedCandidates.length} buffered ICE candidates for ${remoteUserId}`);
      for (const candidate of bufferedCandidates) {
        try {
          await peerManager.addIceCandidate(candidate);
        } catch (error) {
          console.error(`Error adding buffered ICE candidate:`, error);
        }
      }
      pendingIceCandidates.current.delete(remoteUserId);
    }

    return peerManager;
  }, [getActiveParticipantCount, updateParticipant]);

  const removePeerConnection = useCallback((userId: string) => {
    const peerManager = peerConnections.current.get(userId);
    if (peerManager) {
      peerManager.close();
      peerConnections.current.delete(userId);
    }
    removeParticipant(userId);
    console.log(`🧹 Removed peer connection for ${userId}`);
  }, [removeParticipant]);

  // =====================================================
  // Negotiation
  // =====================================================

  const negotiateWithPeer = useCallback(async (targetUserId: string, options?: RTCOfferOptions) => {
    const peerManager = peerConnections.current.get(targetUserId);
    if (!peerManager || !signaling.current) return;

    try {
      console.log(`🤝 Negotiating with ${targetUserId}`, options?.iceRestart ? '(ICE restart)' : '');
      const offer = await peerManager.createOffer(options);
      if (offer) {
        const sent = signaling.current.sendOffer(offer, targetUserId);
        if (!sent) {
          peerManager.sendSDP('offer', offer);
        }
      }
    } catch (error) {
      console.error(`Error negotiating with ${targetUserId}:`, error);
    }
  }, []);

  // =====================================================
  // Data Channel Message Handling
  // =====================================================

  const handleDataChannelMessage = useCallback((fromUserId: string, data: any) => {
    switch (data.type) {
      case 'presence':
        updateParticipant(fromUserId, { connectionState: 'connected' });
        break;
      case 'mute-state':
        updateParticipant(fromUserId, { isMuted: data.isMuted });
        break;
      case 'video-state':
        if (!data.isVideoEnabled) {
          updateParticipant(fromUserId, { videoStream: null, isVideoEnabled: false });
        } else {
          updateParticipant(fromUserId, { isVideoEnabled: true });
        }
        break;
      case 'recording-state':
        updateParticipant(fromUserId, { isRecording: data.isRecording });
        break;
      case 'meeting-ended':
        handleRemoteMeetingEnded();
        break;
      case 'sdp-offer':
        handleOfferFromPeer(data.sdp, fromUserId);
        break;
      case 'sdp-answer':
        handleAnswerFromPeer(data.sdp, fromUserId);
        break;
      default:
        console.log('Unknown data channel message:', data);
    }
  }, [updateParticipant]);

  const handleRemoteMeetingEnded = useCallback(() => {
    cleanup();
    window.location.href = `/meeting/${roomId}/summary`;
  }, [roomId]);

  // =====================================================
  // Signaling Handlers
  // =====================================================

  const handleOfferFromPeer = useCallback(async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    let peerManager = peerConnections.current.get(fromUserId);

    if (!peerManager) {
      peerManager = await createPeerConnection(fromUserId);
    }

    if (!peerManager) return;

    try {
      await peerManager.setRemoteDescription(offer);
      const answer = await peerManager.createAnswer();
      const sent = signaling.current?.sendAnswer(answer, fromUserId);
      if (!sent) {
        peerManager.sendSDP('answer', answer);
      }
    } catch (error) {
      console.error(`Error handling offer from ${fromUserId}:`, error);
    }
  }, [createPeerConnection]);

  const handleAnswerFromPeer = useCallback(async (answer: RTCSessionDescriptionInit, fromUserId: string) => {
    const peerManager = peerConnections.current.get(fromUserId);
    if (!peerManager) return;

    try {
      await peerManager.setRemoteDescription(answer);
    } catch (error) {
      console.error(`Error handling answer from ${fromUserId}:`, error);
    }
  }, []);

  // Buffer for ICE candidates that arrive before peer connection is ready
  const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const handleIceCandidateFromPeer = useCallback(async (candidate: RTCIceCandidateInit, fromUserId: string) => {
    const peerManager = peerConnections.current.get(fromUserId);
    if (!peerManager) {
      // Buffer the candidate for later
      console.log(`🧊 Buffering ICE candidate for ${fromUserId} (no peer connection yet)`);
      const pending = pendingIceCandidates.current.get(fromUserId) || [];
      pending.push(candidate);
      pendingIceCandidates.current.set(fromUserId, pending);
      return;
    }

    try {
      await peerManager.addIceCandidate(candidate);
    } catch (error) {
      console.error(`Error adding ICE candidate from ${fromUserId}:`, error);
    }
  }, []);

  // =====================================================
  // User Join/Leave Handling
  // =====================================================

  const handleUserJoined = useCallback(async (data: {
    sessionId: string;
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
  }) => {
    // Ignore own join event
    if (data.sessionId === mySessionId.current || data.userId === currentUserId.current) {
      console.log('⏭️ Ignoring own join event');
      return;
    }

    console.log(`👥 User joined: ${data.displayName || data.userId}`);

    // Add participant to state
    const newParticipant: Participant = {
      userId: data.userId,
      sessionId: data.sessionId,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      isMuted: false,
      isVideoEnabled: false,
      isSpeaking: false,
      isRecording: false,
      connectionState: 'new',
      stream: null,
      videoStream: null,
    };

    setParticipants((prev) => {
      const newMap = new Map(prev);
      newMap.set(data.userId, newParticipant);
      return newMap;
    });

    // Create peer connection and initiate offer
    // Use deterministic offer-making: user with "lower" ID makes the offer
    const shouldMakeOffer = currentUserId.current! < data.userId;

    const peerManager = await createPeerConnection(data.userId);
    if (peerManager && shouldMakeOffer) {
      console.log(`🎬 I will make offer to ${data.userId}`);
      await negotiateWithPeer(data.userId);
    } else {
      console.log(`⏳ Waiting for offer from ${data.userId}`);
    }

    // Send my profile back
    signaling.current?.sendUserProfile({
      display_name: myProfile.current?.display_name || null,
      avatar_url: myProfile.current?.avatar_url || null,
      userId: currentUserId.current!,
    });
  }, [createPeerConnection, negotiateWithPeer]);

  const handleUserLeft = useCallback((data: { sessionId: string; userId: string }) => {
    if (data.userId === currentUserId.current) return;

    console.log(`👋 User left: ${data.userId}`);
    removePeerConnection(data.userId);

    // Update connection state
    if (peerConnections.current.size === 0) {
      setIsConnected(false);
      setConnectionState('new');
    }
  }, [removePeerConnection]);

  // =====================================================
  // Initialization
  // =====================================================

  const cleanup = useCallback(() => {
    // Close all peer connections
    peerConnections.current.forEach((pm) => pm.close());
    peerConnections.current.clear();

    signaling.current?.disconnect();
    signaling.current = null;

    stopStreamTracks(localStreamRef.current);
    stopStreamTracks(localVideoStreamRef.current);
    localStreamRef.current = null;
    localVideoStreamRef.current = null;

    setLocalStream(null);
    setLocalVideoStream(null);
    setIsVideoEnabled(false);
    setIsConnected(false);
    setParticipants(new Map());
    setIsHost(false);
    setMeetingIdState(null);
    meetingId.current = null;
    initializingRef.current = false;
  }, []);

  async function initializeConnection() {
    if (initializingRef.current) {
      console.log('⚠️ Already initializing, skipping...');
      return;
    }
    initializingRef.current = true;

    console.log('🚀 Initializing multi-user WebRTC connection...');

    try {
      // Get local media
      let stream: MediaStream | null = null;
      try {
        // Check if mediaDevices is available (requires HTTPS or localhost)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices API not available. Use HTTPS or localhost.');
        }
        stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        setLocalStream(stream);
        localStreamRef.current = stream;
        setError(null);
        console.log('✅ Media devices obtained');
      } catch (mediaError: any) {
        console.warn('Failed to get media devices:', mediaError);
        let errorMessage = 'Microphone access denied. You can still join to listen.';
        if (mediaError.name === 'NotFoundError') {
          errorMessage = 'No microphone found. You can still join to listen.';
        } else if (mediaError.message?.includes('MediaDevices') || mediaError.message?.includes('HTTPS')) {
          errorMessage = 'Media access requires HTTPS. Use localhost or enable HTTPS.';
        }
        setError(errorMessage);
        stream = new MediaStream();
        localStreamRef.current = stream;
        setLocalStream(stream);
      }

      // Get current user
      console.log('📋 Step 1: Getting current user...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Failed to get user:', userError);
      }
      currentUserId.current = user?.id || null;
      console.log('✅ Current user:', user?.id || 'Not logged in');

      // Get user profile
      if (user) {
        console.log('📋 Step 2: Getting user profile...');
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        if (profileError) {
          console.warn('⚠️ Profile error (non-fatal):', profileError);
        }
        myProfile.current = profile;
        console.log('✅ Profile loaded:', profile?.display_name);
      }

      // Get or create meeting
      console.log('📋 Step 3: Getting or creating meeting...');
      const meeting = await getOrCreateMeeting(roomId);
      meetingId.current = meeting.id;
      setMeetingIdState(meeting.id);
      setIsHost(meeting.host_id === user?.id);
      console.log('✅ Meeting ready:', meeting.id, 'Host:', meeting.host_id === user?.id);

      // Register as participant
      console.log('📋 Step 4: Registering as participant...');
      await registerAsParticipant(meeting.id, user?.id);
      console.log('✅ Registered as participant');

      console.log('🎯 My session ID:', mySessionId.current);
      console.log('👤 My user ID:', currentUserId.current);
      console.log('🎭 Role:', meeting.host_id === user?.id ? 'Host' : 'Participant');

      // Initialize signaling
      console.log('📋 Step 5: Initializing signaling...');
      signaling.current = new SignalingService(roomId);
      signaling.current.setMyUserId(currentUserId.current!);

      signaling.current.onConnected = async () => {
        console.log('✅ Signaling connected');
        setupSignalingHandlers();

        // Announce our presence
        console.log('📤 Announcing presence...');
        signaling.current?.sendUserJoined(mySessionId.current, {
          userId: currentUserId.current!,
          displayName: myProfile.current?.display_name || null,
          avatarUrl: myProfile.current?.avatar_url || null,
        });

        // Request existing participants
        console.log('📤 Requesting participant list...');
        signaling.current?.requestParticipantList();
      };

      console.log('🔌 Connecting to signaling channel...');
      signaling.current.connect();
      console.log('✅ Initialization complete (waiting for signaling connection...)');
    } catch (error: any) {
      console.error('Failed to initialize connection:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      setError(error?.message || 'Connection failed. Please try again.');
    }
  }

  function setupSignalingHandlers() {
    if (!signaling.current) return;

    // Offer/Answer/ICE handlers
    signaling.current.onOffer((offer, fromUserId) => {
      handleOfferFromPeer(offer, fromUserId);
    });

    signaling.current.onAnswer((answer, fromUserId) => {
      handleAnswerFromPeer(answer, fromUserId);
    });

    signaling.current.onIceCandidate((candidate, fromUserId) => {
      handleIceCandidateFromPeer(candidate, fromUserId);
    });

    // User join/leave
    signaling.current.onUserJoined(handleUserJoined);
    signaling.current.onUserLeft(handleUserLeft);

    // User profile updates - also handle creating participant if not exists
    signaling.current.onUserProfile((profile) => {
      if (profile.userId === currentUserId.current) return;

      setParticipants((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(profile.userId);
        if (existing) {
          // Update existing
          newMap.set(profile.userId, {
            ...existing,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
          });
        } else {
          // Create new participant
          console.log(`📥 Creating participant from profile: ${profile.display_name || profile.userId}`);
          newMap.set(profile.userId, {
            userId: profile.userId,
            sessionId: '',
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            isMuted: false,
            isVideoEnabled: false,
            isSpeaking: false,
            isRecording: false,
            connectionState: 'new',
            stream: null,
            videoStream: null,
          });
        }
        return newMap;
      });
    });

    // State sync
    signaling.current.onMuteState((data) => {
      updateParticipant(data.userId, { isMuted: data.isMuted });
    });

    signaling.current.onVideoState((data) => {
      updateParticipant(data.userId, { isVideoEnabled: data.isVideoEnabled });
    });

    signaling.current.onRecordingState((data) => {
      updateParticipant(data.userId, { isRecording: data.isRecording });
    });

    signaling.current.onMeetingEnded(() => {
      handleRemoteMeetingEnded();
    });

    // Respond to participant list requests - send join event so new joiner can create peer connection
    signaling.current.onParticipantListRequest((fromUserId) => {
      console.log(`📤 Responding to participant list request from ${fromUserId}`);
      // Send our join event so the new joiner can create peer connection
      signaling.current?.sendUserJoined(mySessionId.current, {
        userId: currentUserId.current!,
        displayName: myProfile.current?.display_name || null,
        avatarUrl: myProfile.current?.avatar_url || null,
      });
    });
  }

  async function getOrCreateMeeting(roomId: string) {
    const { data: existing } = await supabase
      .from('meetings')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle();

    if (existing) {
      console.log('📋 Using existing meeting:', existing.id);
      return existing;
    }

    const { data: { user } } = await supabase.auth.getUser();

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
      if (error.code === '23505') {
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

  async function registerAsParticipant(meetingId: string, userId: string | undefined) {
    if (!userId) return;

    try {
      const { data: existing, error: selectError } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('user_id', userId)
        .maybeSingle();

      // If table doesn't exist, skip participant tracking (migration not applied)
      if (selectError?.code === '42P01') {
        console.warn('⚠️ meeting_participants table not found. Please run the migration.');
        return;
      }

      if (existing) {
        // Update to active
        await supabase
          .from('meeting_participants')
          .update({ is_active: true, left_at: null })
          .eq('id', existing.id);
        return;
      }

      // Check if meeting is full
      const { data: meeting } = await supabase
        .from('meetings')
        .select('host_id, max_participants')
        .eq('id', meetingId)
        .single();

      const role = meeting?.host_id === userId ? 'host' : 'participant';

      const { error: insertError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meetingId,
          user_id: userId,
          role,
          is_active: true,
        });

      if (insertError) {
        console.error('Error registering participant:', insertError);
      }
    } catch (error) {
      console.error('Error in registerAsParticipant:', error);
    }
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

  // =====================================================
  // Media Controls
  // =====================================================

  const toggleAudio = useCallback(() => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);

      // Notify all peers
      peerConnections.current.forEach((pm) => {
        pm.sendData(JSON.stringify({ type: 'mute-state', isMuted: !audioTrack.enabled }));
      });
      signaling.current?.sendMuteState(!audioTrack.enabled);
    }
  }, [localStream]);

  const toggleVideo = useCallback(async () => {
    if (isVideoEnabled && localVideoStream) {
      // Stop video
      localVideoStream.getTracks().forEach((track) => track.stop());
      setLocalVideoStream(null);
      localVideoStreamRef.current = null;
      setIsVideoEnabled(false);

      // Remove video tracks from all peer connections
      peerConnections.current.forEach((pm) => {
        const senders = pm.getSenders();
        senders.forEach((sender) => {
          if (sender.track?.kind === 'video') {
            pm.removeTrack(sender);
          }
        });
        pm.sendData(JSON.stringify({ type: 'video-state', isVideoEnabled: false }));
      });
      signaling.current?.sendVideoState(false);

      // Renegotiate with all peers
      for (const [userId] of peerConnections.current) {
        await negotiateWithPeer(userId);
      }
    } else {
      // Start video
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });

        setLocalVideoStream(videoStream);
        localVideoStreamRef.current = videoStream;
        setIsVideoEnabled(true);

        // Add video tracks to all peer connections
        for (const [userId, pm] of peerConnections.current) {
          for (const track of videoStream.getVideoTracks()) {
            await pm.addTrack(track, videoStream);
          }
          pm.sendData(JSON.stringify({ type: 'video-state', isVideoEnabled: true }));
          await negotiateWithPeer(userId);
        }
        signaling.current?.sendVideoState(true);
      } catch (error) {
        console.error('Failed to start video:', error);
      }
    }
  }, [isVideoEnabled, localVideoStream, negotiateWithPeer]);

  const sendRecordingState = useCallback((isRecording: boolean) => {
    peerConnections.current.forEach((pm) => {
      pm.sendData(JSON.stringify({ type: 'recording-state', isRecording }));
    });
    if (signaling.current && currentUserId.current) {
      signaling.current.sendRecordingState({ isRecording, userId: currentUserId.current });
    }
  }, []);

  const endCall = useCallback(async () => {
    if (isHost) {
      console.log('👋 Host ending meeting');
      peerConnections.current.forEach((pm) => {
        pm.sendData(JSON.stringify({ type: 'meeting-ended' }));
      });
      signaling.current?.sendMeetingEnded(mySessionId.current);
      await updateMeetingStatus('ended');

      // Mark all participants as left (gracefully handle if table doesn't exist)
      if (meetingId.current) {
        try {
          await supabase
            .from('meeting_participants')
            .update({ is_active: false, left_at: new Date().toISOString() })
            .eq('meeting_id', meetingId.current);
        } catch (err) {
          console.warn('Could not update meeting_participants:', err);
        }
      }

      cleanup();
      window.location.href = `/meeting/${roomId}/summary`;
    } else {
      console.log('👋 Participant leaving meeting');
      signaling.current?.sendUserLeft(mySessionId.current);

      // Mark self as left (gracefully handle if table doesn't exist)
      if (meetingId.current && currentUserId.current) {
        try {
          await supabase
            .from('meeting_participants')
            .update({ is_active: false, left_at: new Date().toISOString() })
            .eq('meeting_id', meetingId.current)
            .eq('user_id', currentUserId.current);
        } catch (err) {
          console.warn('Could not update meeting_participants:', err);
        }
      }

      cleanup();
      window.location.href = '/dashboard';
    }
  }, [isHost, cleanup, roomId]);

  // =====================================================
  // Lifecycle
  // =====================================================

  useEffect(() => {
    if (initializingRef.current) {
      return;
    }

    initializeConnection();

    return () => {
      console.log('🧹 Cleanup called');
      signaling.current?.sendUserLeft(mySessionId.current);
      cleanup();
    };
  }, [roomId]);

  // =====================================================
  // Computed values for backwards compatibility
  // =====================================================

  // Get first remote participant for backwards compatibility
  const firstParticipant = Array.from(participants.values())[0] || null;
  const remoteStream = firstParticipant?.stream || null;
  const remoteVideoStream = firstParticipant?.videoStream || null;
  const remoteUserProfile = firstParticipant ? {
    display_name: firstParticipant.displayName,
    avatar_url: firstParticipant.avatarUrl,
  } : null;
  const isRemoteMuted = firstParticipant?.isMuted || false;
  const isRemoteRecording = Array.from(participants.values()).some((p) => p.isRecording);
  const peerLeft = false; // Deprecated - use participants map

  return {
    // Local state
    localStream,
    localVideoStream,
    isVideoEnabled,
    isMuted,
    isConnected,
    connectionState,
    error,
    isHost,
    meetingId: meetingIdState,

    // Multi-user state
    participants,
    participantCount: participants.size,

    // Backwards compatibility (single remote user)
    remoteStream,
    remoteStreamVersion: 0,
    remoteVideoStream,
    remoteUserProfile,
    isRemoteMuted,
    isRemoteRecording,
    peerLeft,

    // Actions
    toggleAudio,
    toggleVideo,
    sendRecordingState,
    endCall,

    // For diagnostics
    getPeerConnection: () => peerConnections.current.values().next().value?.['peerConnection'] || null,
  };
}
