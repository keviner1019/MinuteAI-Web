// Main orchestration hook for meeting room
// Connects store, PeerManager, and SignalingService
// Based on MEETING_MODULE_RECONSTRUCTION_PLAN.md

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMeetingStore } from '@/lib/store/meeting-store';
import { PeerManager } from '@/lib/webrtc-v2/peer-manager';
import { SignalingService } from '@/lib/webrtc-v2/signaling';
import type { Participant, ConnectionState, MeetingRoom } from '@/types/meeting';

export interface UseMeetingRoomOptions {
  roomId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  autoJoin?: boolean;
}

export interface UseMeetingRoomReturn {
  // State
  room: MeetingRoom | null;
  participants: Participant[];
  localUser: Participant | null;
  isJoining: boolean;
  isJoined: boolean;
  error: string | null;

  // Actions
  joinRoom: () => Promise<void>;
  leaveRoom: () => void;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;

  // Utilities
  getParticipant: (participantId: string) => Participant | undefined;
  getConnectionState: (participantId: string) => ConnectionState;
}

export function useMeetingRoom(options: UseMeetingRoomOptions): UseMeetingRoomReturn {
  const {
    roomId,
    userId,
    displayName,
    avatarUrl,
    autoJoin = false,
  } = options;

  // Store state
  const store = useMeetingStore();
  const { room, participants: participantsMap, localUser } = store;
  const {
    joinRoom: storeJoinRoom,
    leaveRoom: storeLeaveRoom,
    addParticipant,
    updateParticipant,
    removeParticipant,
    toggleAudio: storeToggleAudio,
    toggleVideo: storeToggleVideo,
    toggleScreenShare: storeToggleScreenShare,
    createPeerConnection: storeCreatePeerConnection,
    closePeerConnection,
  } = store.actions;
  
  // Convert Map to Array
  const participants = Array.from(participantsMap.values());

  // Services
  const peerManagerRef = useRef<PeerManager | null>(null);
  const signalingServiceRef = useRef<SignalingService | null>(null);

  // Local state
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Session ID for this browser tab/connection
  const sessionIdRef = useRef<string>(
    `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // ==============================================
  // JOIN ROOM
  // ==============================================

  const joinRoom = useCallback(async () => {
    if (isJoined || isJoining) {
      console.warn('⚠️ Already joined or joining');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      console.log('🚪 Joining room...', { roomId, userId, displayName });

      // 1. Initialize store
      await storeJoinRoom(roomId, {
        userId,
        sessionId: sessionIdRef.current,
        displayName,
        avatarUrl,
        role: 'participant',
      });

      // 2. Initialize SignalingService
      const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY!;
      const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER!;

      const signalingService = new SignalingService({
        roomId,
        userId,
        sessionId: sessionIdRef.current,
        pusherKey,
        pusherCluster,
      });

      await signalingService.initialize();
      signalingServiceRef.current = signalingService;

      // 3. Initialize PeerManager
      const peerManager = new PeerManager({
        localUserId: userId,
        onSignal: (signal: any) => {
          // Signals will be sent through SignalingService
          console.log('📤 PeerManager signal:', signal);
        },
      });

      peerManagerRef.current = peerManager;

      // 4. Set up signaling event handlers
      setupSignalingHandlers(signalingService, peerManager);

      // 5. Set up peer event handlers
      setupPeerHandlers(peerManager);

      // 6. Broadcast join
      signalingService.sendJoinRoom({
        displayName,
        avatarUrl,
        role: 'participant',
      });

      setIsJoined(true);
      setIsJoining(false);

      console.log('✅ Successfully joined room');
    } catch (err) {
      console.error('❌ Failed to join room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setIsJoining(false);
      setIsJoined(false);

      // Cleanup on error
      cleanup();
    }
  }, [
    roomId,
    userId,
    displayName,
    avatarUrl,
    isJoined,
    isJoining,
    storeJoinRoom,
  ]);

  // ==============================================
  // SIGNALING HANDLERS
  // ==============================================

  const setupSignalingHandlers = useCallback(
    (signaling: SignalingService, peerManager: PeerManager) => {
      // User joined
      signaling.on('user-joined', async (data: any) => {
        console.log('👤 User joined:', data);

        const participant: Participant = {
          id: data.userId,
          userId: data.userId,
          sessionId: data.sessionId,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          role: data.role || 'participant',
          permissions: {
            can_speak: true,
            can_share_screen: true,
            can_record: false,
            can_invite: false,
            can_kick: false,
          },
          connectionState: 'connecting',
          connectionQuality: 0,
          isActive: true,
          lastSeenAt: new Date(),
          audioEnabled: false,
          videoEnabled: false,
          screenShareEnabled: false,
          audioMuted: false,
          audioStream: null,
          videoStream: null,
          joinedAt: new Date(),
          leftAt: null,
        };

        addParticipant(participant);

        // Create peer connection
        const isPolite = userId.localeCompare(data.userId) > 0;
        const peerConnection = await peerManager.createConnection(
          data.userId,
          isPolite
        );

        storeCreatePeerConnection(data.userId, isPolite);

        // Send our profile back
        signaling.sendUserProfile(data.userId, {
          displayName,
          avatarUrl,
          role: 'participant',
        });
      });

      // User left
      signaling.on('user-left', (data: any) => {
        console.log('👋 User left:', data);
        
        removeParticipant(data.userId);
        peerManager.closeConnection(data.userId);
        closePeerConnection(data.userId);
      });

      // Offer
      signaling.on('offer', async (data: any) => {
        console.log('📨 Received offer from:', data.from);

        const peer = peerManager.getConnection(data.from);
        if (peer) {
          await peer.handleOffer(data.data.description);
        }
      });

      // Answer
      signaling.on('answer', async (data: any) => {
        console.log('📨 Received answer from:', data.from);

        const peer = peerManager.getConnection(data.from);
        if (peer) {
          await peer.handleAnswer(data.data.description);
        }
      });

      // ICE candidate
      signaling.on('ice-candidate', async (data: any) => {
        console.log('📨 Received ICE candidate from:', data.from);

        const peer = peerManager.getConnection(data.from);
        if (peer) {
          await peer.handleIceCandidate(data.data.candidate);
        }
      });

      // Media state change
      signaling.on('media-state-change', (data: any) => {
        console.log('📨 Media state changed:', data);

        updateParticipant(data.from, {
          audioEnabled: data.data.audioEnabled,
          videoEnabled: data.data.videoEnabled,
          audioMuted: data.data.audioMuted,
          screenShareEnabled: data.data.screenShareEnabled,
        });
      });

      // Meeting ended
      signaling.on('meeting-ended', (data: any) => {
        console.log('🔚 Meeting ended by:', data.userId);
        leaveRoom();
      });

      // Presence ping
      signaling.on('presence-ping', (data: any) => {
        signaling.respondToPresencePing(data.from);
      });

      console.log('✅ Signaling handlers set up');
    },
    [userId, displayName, avatarUrl, addParticipant, updateParticipant, removeParticipant, storeCreatePeerConnection, closePeerConnection]
  );

  // ==============================================
  // PEER HANDLERS
  // ==============================================

  const setupPeerHandlers = useCallback(
    (peerManager: PeerManager) => {
      peerManager.on('offer', (event: any) => {
        signalingServiceRef.current?.sendOfferWithRetry(
          event.peerId,
          event.offer
        );
      });

      peerManager.on('answer', (event: any) => {
        signalingServiceRef.current?.sendAnswerWithRetry(
          event.peerId,
          event.answer
        );
      });

      peerManager.on('icecandidate', (event: any) => {
        signalingServiceRef.current?.sendIceCandidateWithRetry(
          event.peerId,
          event.candidate
        );
      });

      peerManager.on('connectionstatechange', (event: any) => {
        console.log('🔌 Connection state changed:', event);
        
        updateParticipant(event.peerId, {
          connectionState: event.state,
        });
      });

      peerManager.on('track', (event: any) => {
        console.log('🎵 Received track:', event);
        // Track will be handled by useParticipants hook
      });

      console.log('✅ Peer handlers set up');
    },
    [updateParticipant]
  );

  // ==============================================
  // LEAVE ROOM
  // ==============================================

  const leaveRoom = useCallback(() => {
    console.log('🚪 Leaving room...');

    cleanup();
    setIsJoined(false);
    setError(null);

    console.log('✅ Left room');
  }, []);

  const cleanup = useCallback(() => {
    if (signalingServiceRef.current) {
      signalingServiceRef.current.destroy();
      signalingServiceRef.current = null;
    }

    if (peerManagerRef.current) {
      peerManagerRef.current.closeAllConnections();
      peerManagerRef.current = null;
    }

    // Note: Store reset is handled by leaveRoom action
  }, []);

  // ==============================================
  // MEDIA CONTROLS
  // ==============================================

  const toggleAudio = useCallback(async () => {
    if (!localUser) return;

    await storeToggleAudio();

    // Broadcast state change
    signalingServiceRef.current?.broadcastMediaState({
      audioEnabled: !localUser.audioEnabled,
      videoEnabled: localUser.videoEnabled,
      audioMuted: localUser.audioMuted,
      screenShareEnabled: localUser.screenShareEnabled,
    });

    console.log('🎤 Audio toggled:', !localUser.audioEnabled);
  }, [localUser, storeToggleAudio]);

  const toggleVideo = useCallback(async () => {
    if (!localUser) return;

    await storeToggleVideo();

    // Broadcast state change
    signalingServiceRef.current?.broadcastMediaState({
      audioEnabled: localUser.audioEnabled,
      videoEnabled: !localUser.videoEnabled,
      audioMuted: localUser.audioMuted,
      screenShareEnabled: localUser.screenShareEnabled,
    });

    console.log('📹 Video toggled:', !localUser.videoEnabled);
  }, [localUser, storeToggleVideo]);

  const toggleScreenShare = useCallback(async () => {
    if (!localUser) return;

    await storeToggleScreenShare();

    // Broadcast state change
    signalingServiceRef.current?.broadcastMediaState({
      audioEnabled: localUser.audioEnabled,
      videoEnabled: localUser.videoEnabled,
      audioMuted: localUser.audioMuted,
      screenShareEnabled: !localUser.screenShareEnabled,
    });

    console.log('🖥️ Screen share toggled:', !localUser.screenShareEnabled);
  }, [localUser, storeToggleScreenShare]);

  // ==============================================
  // UTILITIES
  // ==============================================

  const getParticipant = useCallback(
    (participantId: string): Participant | undefined => {
      return participants.find((p) => p.id === participantId);
    },
    [participants]
  );

  const getConnectionState = useCallback(
    (participantId: string): ConnectionState => {
      const participant = getParticipant(participantId);
      return participant?.connectionState || 'disconnected';
    },
    [getParticipant]
  );

  // ==============================================
  // LIFECYCLE
  // ==============================================

  // Auto-join on mount if enabled
  useEffect(() => {
    if (autoJoin && !isJoined && !isJoining) {
      joinRoom();
    }
  }, [autoJoin, isJoined, isJoining, joinRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isJoined) {
        leaveRoom();
      }
    };
  }, [isJoined, leaveRoom]);

  // ==============================================
  // RETURN
  // ==============================================

  return {
    // State
    room,
    participants,
    localUser,
    isJoining,
    isJoined,
    error,

    // Actions
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,

    // Utilities
    getParticipant,
    getConnectionState,
  };
}
