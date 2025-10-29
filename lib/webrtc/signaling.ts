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

  // Callback for when channel is connected
  onConnected?: () => void;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.pusher = getPusherInstance();
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
  } // Send offer to peer
  sendOffer(offer: RTCSessionDescriptionInit) {
    console.log('📤 Sending offer...');
    this.channel.trigger('client-offer', { offer });
  }

  // Send answer to peer
  sendAnswer(answer: RTCSessionDescriptionInit) {
    console.log('📤 Sending answer...');
    this.channel.trigger('client-answer', { answer });
  }

  // Send ICE candidate
  sendIceCandidate(candidate: RTCIceCandidate) {
    console.log('📤 Sending ICE candidate...');
    this.channel.trigger('client-ice-candidate', { candidate });
  }

  // Listen for offer
  onOffer(callback: (offer: RTCSessionDescriptionInit) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind offer: channel not initialized');
      return;
    }

    // Unbind first to prevent duplicate handlers
    this.channel.unbind('client-offer');

    this.channel.bind('client-offer', (data: any) => {
      console.log('📥 Received offer');
      callback(data.offer);
    });

    console.log('✅ Offer handler registered');
  }

  // Listen for answer
  onAnswer(callback: (answer: RTCSessionDescriptionInit) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind answer: channel not initialized');
      return;
    }

    // Unbind first to prevent duplicate handlers
    this.channel.unbind('client-answer');

    this.channel.bind('client-answer', (data: any) => {
      console.log('📥 Received answer');
      callback(data.answer);
    });

    console.log('✅ Answer handler registered');
  }

  // Listen for ICE candidate
  onIceCandidate(callback: (candidate: RTCIceCandidateInit) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind ice-candidate: channel not initialized');
      return;
    }

    // Unbind first to prevent duplicate handlers
    this.channel.unbind('client-ice-candidate');

    this.channel.bind('client-ice-candidate', (data: any) => {
      console.log('📥 Received ICE candidate');
      callback(data.candidate);
    });

    console.log('✅ ICE candidate handler registered');
  }

  // Send user joined event
  sendUserJoined(sessionId: string) {
    if (!this.channel) {
      console.error('❌ Cannot send user-joined: channel not initialized');
      return;
    }

    console.log('📤 Sending user joined event. Session ID:', sessionId);
    this.channel.trigger('client-user-joined', { sessionId, timestamp: Date.now() });
  }

  // Send user left event
  sendUserLeft(sessionId: string) {
    if (!this.channel) {
      console.error('❌ Cannot send user-left: channel not initialized');
      return;
    }

    console.log('📤 Sending user left event. Session ID:', sessionId);
    this.channel.trigger('client-user-left', { sessionId, timestamp: Date.now() });
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
  onUserJoined(callback: (sessionId: string) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind user-joined: channel not initialized');
      return;
    }

    // Unbind first to prevent duplicate handlers
    this.channel.unbind('client-user-joined');

    this.channel.bind('client-user-joined', (data: any) => {
      console.log('📥 User joined event received:', data);
      callback(data.sessionId);
    });

    console.log('✅ User joined handler registered');
  }

  // Listen for user left
  onUserLeft(callback: (sessionId: string) => void) {
    if (!this.channel) {
      console.error('❌ Cannot bind user-left: channel not initialized');
      return;
    }

    // Unbind first to prevent duplicate handlers
    this.channel.unbind('client-user-left');

    this.channel.bind('client-user-left', (data: any) => {
      console.log('📥 User left event received:', data);
      callback(data.sessionId);
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

    // Unbind first to prevent duplicate handlers
    this.channel.unbind('client-user-profile');

    this.channel.bind('client-user-profile', (data: any) => {
      console.log('📥 User profile received:', data.profile);
      callback(data.profile);
    });

    console.log('✅ User profile handler registered');
  }

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
