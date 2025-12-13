import Pusher from 'pusher-js';

// Singleton Pusher instance to avoid multiple connections (React Strict Mode issue)
let pusherInstance: Pusher | null = null;

function getPusherInstance(): Pusher {
  if (!pusherInstance) {
    // Enable logging for debugging
    Pusher.logToConsole = true;

    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      // Auth endpoint for private/presence channels
      authEndpoint: '/api/pusher/auth',
      auth: {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    });

    console.log('🔌 Created new Pusher instance');
  }
  return pusherInstance;
}

export class SignalingService {
  private pusher: Pusher;
  private channel: any;
  private roomId: string;
  private myUserId: string | null = null;

  // Callback for when channel is connected
  onConnected?: () => void;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.pusher = getPusherInstance();
  }

  setMyUserId(userId: string) {
    this.myUserId = userId;
  }

  connect() {
    // Use PRIVATE channel for client events (requires authentication)
    const channelName = `private-meeting-${this.roomId}`;
    console.log('🔌 Connecting to private channel:', channelName);

    // Check if already subscribed (prevent double subscription in React Strict Mode)
    const existingChannel = this.pusher.channel(channelName);
    if (existingChannel) {
      console.log('⚠️ Already subscribed to channel, reusing...');
      this.channel = existingChannel;
      // Trigger connected callback immediately if already subscribed
      if (this.onConnected) {
        this.onConnected();
      }
      return;
    }

    this.channel = this.pusher.subscribe(channelName);

    // Log channel connection status
    this.channel.bind('pusher:subscription_succeeded', () => {
      console.log('✅ Successfully connected to signaling channel:', channelName);
      // Trigger the connected callback
      if (this.onConnected) {
        this.onConnected();
      }
    });

    this.channel.bind('pusher:subscription_error', (error: any) => {
      console.error('❌ Failed to connect to signaling channel:', error);
    });
  }

  // =====================================================
  // Multi-user targeted signaling
  // =====================================================

  // Send offer to specific user
  sendOffer(offer: RTCSessionDescriptionInit, targetUserId: string): boolean {
    console.log('📤 Sending offer to:', targetUserId);
    const payload = JSON.stringify({ offer, targetUserId, fromUserId: this.myUserId });

    if (payload.length > 9000) {
      console.warn('⚠️ Offer too large for Pusher, instructing peer to use data channel');
      this.channel.trigger('client-offer-ready', {
        useDataChannel: true,
        targetUserId,
        fromUserId: this.myUserId
      });
      return false;
    }

    this.channel.trigger('client-offer', {
      offer,
      targetUserId,
      fromUserId: this.myUserId
    });
    return true;
  }

  // Send answer to specific user
  sendAnswer(answer: RTCSessionDescriptionInit, targetUserId: string): boolean {
    console.log('📤 Sending answer to:', targetUserId);
    const payload = JSON.stringify({ answer, targetUserId, fromUserId: this.myUserId });

    if (payload.length > 9000) {
      console.warn('⚠️ Answer too large for Pusher, instructing peer to use data channel');
      this.channel.trigger('client-answer-ready', {
        useDataChannel: true,
        targetUserId,
        fromUserId: this.myUserId
      });
      return false;
    }

    this.channel.trigger('client-answer', {
      answer,
      targetUserId,
      fromUserId: this.myUserId
    });
    return true;
  }

  // Send ICE candidate to specific user
  sendIceCandidate(candidate: RTCIceCandidate, targetUserId: string) {
    console.log('📤 Sending ICE candidate to:', targetUserId);
    this.channel.trigger('client-ice-candidate', {
      candidate,
      targetUserId,
      fromUserId: this.myUserId
    });
  }

  // Listen for offer (only process if targeted to me)
  onOffer(callback: (offer: RTCSessionDescriptionInit, fromUserId: string) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind offer: channel not initialized');
      return;
    }

    this.channel.unbind('client-offer');

    this.channel.bind('client-offer', (data: any) => {
      // Only process if targeted to me
      if (data.targetUserId !== this.myUserId) {
        console.log('⏭️ Ignoring offer not meant for me');
        return;
      }
      console.log('📥 Received offer from:', data.fromUserId);
      callback(data.offer, data.fromUserId);
    });

    console.log('✅ Offer handler registered');
  }

  // Listen for answer (only process if targeted to me)
  onAnswer(callback: (answer: RTCSessionDescriptionInit, fromUserId: string) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind answer: channel not initialized');
      return;
    }

    this.channel.unbind('client-answer');

    this.channel.bind('client-answer', (data: any) => {
      // Only process if targeted to me
      if (data.targetUserId !== this.myUserId) {
        console.log('⏭️ Ignoring answer not meant for me');
        return;
      }
      console.log('📥 Received answer from:', data.fromUserId);
      callback(data.answer, data.fromUserId);
    });

    console.log('✅ Answer handler registered');
  }

  // Listen for ICE candidate (only process if targeted to me)
  onIceCandidate(callback: (candidate: RTCIceCandidateInit, fromUserId: string) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind ice-candidate: channel not initialized');
      return;
    }

    this.channel.unbind('client-ice-candidate');

    this.channel.bind('client-ice-candidate', (data: any) => {
      // Only process if targeted to me
      if (data.targetUserId !== this.myUserId) {
        return; // Silent ignore for ICE candidates
      }
      console.log('📥 Received ICE candidate from:', data.fromUserId);
      callback(data.candidate, data.fromUserId);
    });

    console.log('✅ ICE candidate handler registered');
  }

  // =====================================================
  // Participant management
  // =====================================================

  // Send user joined event with full user info
  sendUserJoined(sessionId: string, userInfo?: {
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
  }) {
    if (!this.channel) {
      console.error('❌ Cannot send user-joined: channel not initialized');
      return;
    }

    console.log('📤 Sending user joined event. Session ID:', sessionId, 'User ID:', userInfo?.userId);
    this.channel.trigger('client-user-joined', {
      sessionId,
      userId: userInfo?.userId || this.myUserId,
      displayName: userInfo?.displayName,
      avatarUrl: userInfo?.avatarUrl,
      timestamp: Date.now()
    });
  }

  // Send user left event
  sendUserLeft(sessionId: string) {
    if (!this.channel) {
      console.error('❌ Cannot send user-left: channel not initialized');
      return;
    }

    console.log('📤 Sending user left event. Session ID:', sessionId);
    this.channel.trigger('client-user-left', {
      sessionId,
      userId: this.myUserId,
      timestamp: Date.now()
    });
  }

  // Send user profile information
  sendUserProfile(profile: {
    display_name: string | null;
    avatar_url: string | null;
    userId: string;
  }) {
    if (!this.channel) {
      console.error('❌ Cannot send profile: channel not initialized');
      return;
    }

    console.log('📤 Sending user profile:', profile);
    this.channel.trigger('client-user-profile', { profile, timestamp: Date.now() });
  }

  // Listen for user joined
  onUserJoined(callback: (data: {
    sessionId: string;
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
  }) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind user-joined: channel not initialized');
      return;
    }

    this.channel.unbind('client-user-joined');

    this.channel.bind('client-user-joined', (data: any) => {
      console.log('📥 User joined event received:', data);
      callback({
        sessionId: data.sessionId,
        userId: data.userId,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
      });
    });

    console.log('✅ User joined handler registered');
  }

  // Listen for user left
  onUserLeft(callback: (data: { sessionId: string; userId: string }) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind user-left: channel not initialized');
      return;
    }

    this.channel.unbind('client-user-left');

    this.channel.bind('client-user-left', (data: any) => {
      console.log('📥 User left event received:', data);
      callback({ sessionId: data.sessionId, userId: data.userId });
    });

    console.log('✅ User left handler registered');
  }

  // Listen for user profile
  onUserProfile(
    callback: (profile: {
      display_name: string | null;
      avatar_url: string | null;
      userId: string;
    }) => void
  ) {
    if (!this.channel) {
      console.error('❌ Cannot bind user-profile: channel not initialized');
      return;
    }

    this.channel.unbind('client-user-profile');

    this.channel.bind('client-user-profile', (data: any) => {
      console.log('📥 User profile received:', data.profile);
      callback(data.profile);
    });

    console.log('✅ User profile handler registered');
  }

  // =====================================================
  // State synchronization (mute, video, recording)
  // =====================================================

  // Send mute state change
  sendMuteState(isMuted: boolean) {
    if (!this.channel) return;

    this.channel.trigger('client-mute-state', {
      userId: this.myUserId,
      isMuted,
      timestamp: Date.now(),
    });
  }

  onMuteState(callback: (data: { userId: string; isMuted: boolean }) => void) {
    if (!this.channel) return;

    this.channel.unbind('client-mute-state');
    this.channel.bind('client-mute-state', (data: any) => {
      if (data.userId !== this.myUserId) {
        callback(data);
      }
    });
  }

  // Send video state change
  sendVideoState(isVideoEnabled: boolean) {
    if (!this.channel) return;

    this.channel.trigger('client-video-state', {
      userId: this.myUserId,
      isVideoEnabled,
      timestamp: Date.now(),
    });
  }

  onVideoState(callback: (data: { userId: string; isVideoEnabled: boolean }) => void) {
    if (!this.channel) return;

    this.channel.unbind('client-video-state');
    this.channel.bind('client-video-state', (data: any) => {
      if (data.userId !== this.myUserId) {
        callback(data);
      }
    });
  }

  // Send recording state
  sendRecordingState(payload: { isRecording: boolean; userId: string }) {
    if (!this.channel) {
      console.error('❌ Cannot send recording-state: channel not initialized');
      return;
    }

    console.log('📤 Broadcasting recording state via signaling:', payload);
    this.channel.trigger('client-recording-state', payload);
  }

  onRecordingState(callback: (payload: { isRecording: boolean; userId: string }) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind recording-state: channel not initialized');
      return;
    }

    this.channel.unbind('client-recording-state');

    this.channel.bind('client-recording-state', (data: any) => {
      if (data.userId !== this.myUserId) {
        console.log('📥 Recording state event received:', data);
        callback(data);
      }
    });

    console.log('✅ Recording state handler registered');
  }

  // =====================================================
  // Meeting control
  // =====================================================

  // Notify participants that host ended the meeting
  sendMeetingEnded(sessionId: string) {
    if (!this.channel) {
      console.error('❌ Cannot send meeting-ended: channel not initialized');
      return;
    }

    console.log('📤 Broadcasting meeting ended event from session:', sessionId);
    this.channel.trigger('client-meeting-ended', {
      sessionId,
      userId: this.myUserId,
      timestamp: Date.now()
    });
  }

  // Listen for meeting ended events
  onMeetingEnded(callback: (data: { sessionId: string; userId: string }) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind meeting-ended: channel not initialized');
      return;
    }

    this.channel.unbind('client-meeting-ended');

    this.channel.bind('client-meeting-ended', (data: any) => {
      console.log('📥 Meeting ended event received:', data);
      callback({ sessionId: data.sessionId, userId: data.userId });
    });

    console.log('✅ Meeting ended handler registered');
  }

  // =====================================================
  // Data channel fallback handlers
  // =====================================================

  onOfferReady(callback: (data: { fromUserId: string }) => void) {
    if (!this.channel) return;
    this.channel.unbind('client-offer-ready');
    this.channel.bind('client-offer-ready', (data: any) => {
      if (data.targetUserId === this.myUserId) {
        callback({ fromUserId: data.fromUserId });
      }
    });
  }

  onAnswerReady(callback: (data: { fromUserId: string }) => void) {
    if (!this.channel) return;
    this.channel.unbind('client-answer-ready');
    this.channel.bind('client-answer-ready', (data: any) => {
      if (data.targetUserId === this.myUserId) {
        callback({ fromUserId: data.fromUserId });
      }
    });
  }

  // =====================================================
  // Request existing participants (for late joiners)
  // =====================================================

  requestParticipantList() {
    if (!this.channel) return;

    console.log('📤 Requesting participant list');
    this.channel.trigger('client-request-participants', {
      fromUserId: this.myUserId,
      timestamp: Date.now(),
    });
  }

  onParticipantListRequest(callback: (fromUserId: string) => void) {
    if (!this.channel) return;

    this.channel.unbind('client-request-participants');
    this.channel.bind('client-request-participants', (data: any) => {
      if (data.fromUserId !== this.myUserId) {
        callback(data.fromUserId);
      }
    });
  }

  // =====================================================
  // Cleanup
  // =====================================================

  disconnect() {
    console.log('🔌 Disconnecting from signaling channel');
    const channelName = `private-meeting-${this.roomId}`;

    // Unbind all handlers before unsubscribing
    if (this.channel) {
      this.channel.unbind_all();
    }

    // Only unsubscribe from this specific channel
    // Don't disconnect the entire Pusher instance (singleton)
    this.pusher.unsubscribe(channelName);
    this.channel = null;
  }
}
