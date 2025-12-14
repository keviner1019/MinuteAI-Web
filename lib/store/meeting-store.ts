import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { MeetingStore, Participant, PeerConnectionState } from '@/types/meeting';

export const useMeetingStore = create<MeetingStore>()(
  immer((set, get) => ({
    // Initial state
    room: null,
    localUser: null,
    participants: new Map(),
    peerConnections: new Map(),
    localAudioStream: null,
    localVideoStream: null,
    localScreenStream: null,
    audioEnabled: true,
    videoEnabled: false,
    audioMuted: false,
    screenShareEnabled: false,
    isRecording: false,
    isTranscribing: false,
    layout: 'grid',
    showTranscript: true,
    showParticipants: true,
    showSettings: false,
    error: null,

    // Actions
    actions: {
      // ==============================================
      // ROOM ACTIONS
      // ==============================================

      joinRoom: async (roomId, userData) => {
        try {
          console.log('🚪 Joining room:', roomId, userData);

          // TODO: Implement database call to create/join meeting
          // For now, just set local state

          set((state) => {
            state.room = {
              id: roomId, // Will be replaced with DB UUID
              roomId,
              title: 'Quick Meeting',
              hostId: userData.userId,
              status: 'connecting',
              maxParticipants: 10,
              participantCount: 1,
              requiresApproval: false,
              recordAutomatically: false,
              scheduledAt: null,
              startedAt: new Date(),
              endedAt: null,
            };

            state.localUser = {
              id: userData.userId,
              userId: userData.userId,
              sessionId: userData.sessionId,
              displayName: userData.displayName,
              avatarUrl: userData.avatarUrl,
              role: userData.role,
              permissions: {
                can_speak: true,
                can_share_screen: true,
                can_record: userData.role === 'host',
                can_invite: userData.role === 'host',
                can_kick: userData.role === 'host',
              },
              connectionState: 'connected',
              connectionQuality: 100,
              isActive: true,
              lastSeenAt: new Date(),
              audioEnabled: state.audioEnabled,
              audioMuted: state.audioMuted,
              videoEnabled: state.videoEnabled,
              screenShareEnabled: false,
              audioStream: state.localAudioStream,
              videoStream: state.localVideoStream,
              joinedAt: new Date(),
              leftAt: null,
            };

            // Add self to participants
            state.participants.set(userData.userId, state.localUser);
          });
        } catch (error) {
          console.error('Failed to join room:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to join room' });
        }
      },

      leaveRoom: async () => {
        console.log('👋 Leaving room');

        // Close all peer connections
        const { peerConnections } = get();
        peerConnections.forEach((_, userId) => {
          get().actions.closePeerConnection(userId);
        });

        // Stop all local streams
        const { localAudioStream, localVideoStream, localScreenStream } = get();
        localAudioStream?.getTracks().forEach((track) => track.stop());
        localVideoStream?.getTracks().forEach((track) => track.stop());
        localScreenStream?.getTracks().forEach((track) => track.stop());

        // Reset state
        set({
          room: null,
          localUser: null,
          participants: new Map(),
          peerConnections: new Map(),
          localAudioStream: null,
          localVideoStream: null,
          localScreenStream: null,
          audioEnabled: true,
          videoEnabled: false,
          audioMuted: false,
          screenShareEnabled: false,
          isRecording: false,
          error: null,
        });
      },

      // ==============================================
      // PARTICIPANT ACTIONS
      // ==============================================

      addParticipant: (participant) => {
        set((state) => {
          state.participants.set(participant.userId, participant);
          if (state.room) {
            state.room.participantCount = state.participants.size;
          }
        });
        console.log('👤 Added participant:', participant.displayName);
      },

      removeParticipant: (userId) => {
        set((state) => {
          const participant = state.participants.get(userId);
          if (participant) {
            participant.isActive = false;
            participant.leftAt = new Date();
            state.participants.delete(userId);
            if (state.room) {
              state.room.participantCount = state.participants.size;
            }
          }
        });
        console.log('👤 Removed participant:', userId);
      },

      updateParticipant: (userId, updates) => {
        set((state) => {
          const participant = state.participants.get(userId);
          if (participant) {
            Object.assign(participant, updates);
            state.participants.set(userId, participant);
          }
        });
      },

      getParticipant: (userId) => {
        return get().participants.get(userId);
      },

      // ==============================================
      // MEDIA ACTIONS
      // ==============================================

      setLocalAudioStream: (stream) => {
        set({ localAudioStream: stream });

        // Update local user's audio stream
        const { localUser, participants } = get();
        if (localUser) {
          get().actions.updateParticipant(localUser.userId, { audioStream: stream });
        }
      },

      setLocalVideoStream: (stream) => {
        set({ localVideoStream: stream });

        // Update local user's video stream
        const { localUser } = get();
        if (localUser) {
          get().actions.updateParticipant(localUser.userId, { videoStream: stream });
        }
      },

      toggleAudio: () => {
        set((state) => {
          state.audioEnabled = !state.audioEnabled;

          // Update audio track
          if (state.localAudioStream) {
            state.localAudioStream.getAudioTracks().forEach((track) => {
              track.enabled = state.audioEnabled;
            });
          }

          // Update local user
          if (state.localUser) {
            state.localUser.audioEnabled = state.audioEnabled;
          }
        });

        console.log('🎤 Audio toggled:', get().audioEnabled);

        // TODO: Broadcast media state change to peers
      },

      toggleVideo: async () => {
        const { videoEnabled } = get();

        if (videoEnabled) {
          // Stop video
          const { localVideoStream } = get();
          localVideoStream?.getTracks().forEach((track) => track.stop());

          set((state) => {
            state.videoEnabled = false;
            state.localVideoStream = null;
            if (state.localUser) {
              state.localUser.videoEnabled = false;
              state.localUser.videoStream = null;
            }
          });

          // TODO: Remove video tracks from all peer connections
        } else {
          // Start video
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user',
              },
            });

            set((state) => {
              state.videoEnabled = true;
              state.localVideoStream = videoStream;
              if (state.localUser) {
                state.localUser.videoEnabled = true;
                state.localUser.videoStream = videoStream;
              }
            });

            // TODO: Add video tracks to all peer connections

            console.log('📹 Video started');
          } catch (error) {
            console.error('Failed to start video:', error);
            set({ error: 'Failed to access camera' });
          }
        }

        // TODO: Broadcast media state change to peers
      },

      toggleMute: () => {
        set((state) => {
          state.audioMuted = !state.audioMuted;

          // Note: Mute doesn't disable the track, just stops sending audio
          // This is different from toggleAudio which disables the track

          if (state.localUser) {
            state.localUser.audioMuted = state.audioMuted;
          }
        });

        console.log('🔇 Mute toggled:', get().audioMuted);

        // TODO: Broadcast media state change to peers
      },

      toggleScreenShare: async () => {
        // TODO: Implement screen sharing
        console.log('🖥️ Screen share not yet implemented');
      },

      // ==============================================
      // PEER CONNECTION ACTIONS
      // ==============================================

      createPeerConnection: (userId, isPolite) => {
        console.log(
          `🔗 Creating peer connection with ${userId} (${isPolite ? 'polite' : 'impolite'})`
        );

        set((state) => {
          state.peerConnections.set(userId, {
            userId,
            peerConnection: null, // Will be set by WebRTC manager
            dataChannel: null,
            connectionState: 'new',
            iceConnectionState: 'new',
            signalingState: 'stable',
            isPolite,
            makingOffer: false,
            ignoreOffer: false,
            isSettingRemoteAnswerPending: false,
            remoteStream: null,
            connectedAt: null,
            disconnectedAt: null,
            reconnectionAttempts: 0,
          });
        });
      },

      updatePeerConnection: (userId, updates) => {
        set((state) => {
          const peerState = state.peerConnections.get(userId);
          if (peerState) {
            Object.assign(peerState, updates);
            state.peerConnections.set(userId, peerState);
          }
        });
      },

      closePeerConnection: (userId) => {
        console.log(`🔌 Closing peer connection with ${userId}`);

        const peerState = get().peerConnections.get(userId);
        if (peerState) {
          peerState.peerConnection?.close();
          peerState.dataChannel?.close();

          set((state) => {
            state.peerConnections.delete(userId);
          });
        }
      },

      // ==============================================
      // SIGNALING ACTIONS (placeholder)
      // ==============================================

      handleOffer: async (userId, offer) => {
        console.log(`📥 Handling offer from ${userId}`);
        // TODO: Implement in WebRTC manager
      },

      handleAnswer: async (userId, answer) => {
        console.log(`📥 Handling answer from ${userId}`);
        // TODO: Implement in WebRTC manager
      },

      handleIceCandidate: async (userId, candidate) => {
        console.log(`🧊 Handling ICE candidate from ${userId}`);
        // TODO: Implement in WebRTC manager
      },

      // ==============================================
      // RECORDING ACTIONS (placeholder)
      // ==============================================

      startRecording: async () => {
        console.log('🔴 Starting recording');
        set({ isRecording: true });
        // TODO: Implement recording
      },

      stopRecording: async () => {
        console.log('⏹️ Stopping recording');
        set({ isRecording: false });
        // TODO: Implement recording stop
      },

      // ==============================================
      // UI ACTIONS
      // ==============================================

      setLayout: (layout) => {
        set({ layout });
      },

      toggleTranscript: () => {
        set((state) => {
          state.showTranscript = !state.showTranscript;
        });
      },

      toggleParticipants: () => {
        set((state) => {
          state.showParticipants = !state.showParticipants;
        });
      },

      // ==============================================
      // ERROR HANDLING
      // ==============================================

      setError: (error) => {
        set({ error });

        // Auto-clear error after 5 seconds
        if (error) {
          setTimeout(() => {
            if (get().error === error) {
              set({ error: null });
            }
          }, 5000);
        }
      },
    },
  }))
);

// Convenience selectors
export const useMeetingRoom = () => useMeetingStore((state) => state.room);
export const useLocalUser = () => useMeetingStore((state) => state.localUser);
export const useParticipants = () =>
  useMeetingStore((state) => Array.from(state.participants.values()));
export const usePeerConnections = () => useMeetingStore((state) => state.peerConnections);
export const useMediaState = () =>
  useMeetingStore((state) => ({
    audioEnabled: state.audioEnabled,
    videoEnabled: state.videoEnabled,
    audioMuted: state.audioMuted,
    screenShareEnabled: state.screenShareEnabled,
  }));
export const useMeetingActions = () => useMeetingStore((state) => state.actions);
