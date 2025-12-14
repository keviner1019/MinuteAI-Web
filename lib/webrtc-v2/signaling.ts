// Enhanced SignalingService with Retry Logic and Presence Management
// Based on MEETING_MODULE_RECONSTRUCTION_PLAN.md

import Pusher from 'pusher-js';
import type { SignalingEventType, SignalingMessage } from '@/types/meeting';

export interface SignalingServiceConfig {
  roomId: string;
  userId: string;
  sessionId: string;
  pusherKey: string;
  pusherCluster: string;
}

export class SignalingService {
  private pusher: Pusher | null = null;
  private channel: any = null;
  private roomId: string;
  private userId: string;
  private sessionId: string;
  private pusherKey: string;
  private pusherCluster: string;

  // Event handlers
  private eventHandlers: Map<SignalingEventType, Function[]> = new Map();

  // Retry configuration
  private retryAttempts = new Map<string, number>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  // Presence heartbeat
  private presenceInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds

  // Connection state
  private isConnected = false;
  private isInitialized = false;

  constructor(config: SignalingServiceConfig) {
    this.roomId = config.roomId;
    this.userId = config.userId;
    this.sessionId = config.sessionId;
    this.pusherKey = config.pusherKey;
    this.pusherCluster = config.pusherCluster;

    console.log('🔌 SignalingService created', {
      roomId: this.roomId,
      userId: this.userId,
      sessionId: this.sessionId,
    });
  }

  // ==============================================
  // INITIALIZATION
  // ==============================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('⚠️ SignalingService already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing SignalingService...');

      // Initialize Pusher
      this.pusher = new Pusher(this.pusherKey, {
        cluster: this.pusherCluster,
        authEndpoint: '/api/pusher/auth',
      });

      // Subscribe to private channel
      const channelName = `private-meeting-${this.roomId}`;
      this.channel = this.pusher.subscribe(channelName);

      // Wait for subscription to succeed
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Pusher subscription timeout'));
        }, 10000);

        this.channel.bind('pusher:subscription_succeeded', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.isInitialized = true;
          console.log('✅ Pusher subscription succeeded');
          resolve();
        });

        this.channel.bind('pusher:subscription_error', (error: any) => {
          clearTimeout(timeout);
          console.error('❌ Pusher subscription error:', error);
          reject(error);
        });
      });

      // Set up event listeners
      this.setupEventListeners();

      // Start presence heartbeat
      this.startPresenceHeartbeat();

      console.log('✅ SignalingService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SignalingService:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  // ==============================================
  // EVENT HANDLING
  // ==============================================

  private setupEventListeners(): void {
    if (!this.channel) return;

    const events: SignalingEventType[] = [
      'user-joined',
      'user-left',
      'user-profile',
      'offer',
      'answer',
      'ice-candidate',
      'media-state-change',
      'meeting-ended',
      'presence-ping',
      'presence-pong',
    ];

    events.forEach((eventType) => {
      this.channel.bind(eventType, (data: any) => {
        // Don't process our own events
        if (data.from === this.userId && data.sessionId === this.sessionId) {
          return;
        }

        console.log(`📨 Received ${eventType}:`, data);

        // Emit to registered handlers
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in ${eventType} handler:`, error);
            }
          });
        }
      });
    });

    console.log('✅ Event listeners set up');
  }

  /**
   * Register an event handler
   */
  on<T>(event: SignalingEventType, handler: (data: T) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    console.log(`📌 Handler registered for ${event}`);
  }

  /**
   * Unregister an event handler
   */
  off(event: SignalingEventType, handler: Function): void {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        console.log(`📌 Handler unregistered for ${event}`);
      }
    }
  }

  /**
   * Emit an event (send to all participants)
   */
  emit<T>(event: SignalingEventType, data: T): void {
    if (!this.isConnected || !this.channel) {
      console.warn('⚠️ Cannot emit, not connected');
      return;
    }

    const message: SignalingMessage<T> = {
      type: event,
      from: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      data,
    };

    this.channel.trigger(`client-${event}`, message);
    console.log(`📤 Emitted ${event}:`, message);
  }

  // ==============================================
  // SIGNALING WITH RETRY
  // ==============================================

  /**
   * Send offer with automatic retry
   */
  async sendOfferWithRetry(
    targetUserId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    return this.sendWithRetry('offer', targetUserId, { description: offer });
  }

  /**
   * Send answer with automatic retry
   */
  async sendAnswerWithRetry(
    targetUserId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    return this.sendWithRetry('answer', targetUserId, { description: answer });
  }

  /**
   * Send ICE candidate with automatic retry
   */
  async sendIceCandidateWithRetry(
    targetUserId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    return this.sendWithRetry('ice-candidate', targetUserId, { candidate });
  }

  /**
   * Generic send with retry logic
   */
  private async sendWithRetry(
    event: SignalingEventType,
    targetUserId: string,
    data: any
  ): Promise<void> {
    const retryKey = `${event}-${targetUserId}-${Date.now()}`;
    let attempts = 0;

    while (attempts < this.MAX_RETRIES) {
      try {
        const message: SignalingMessage = {
          type: event,
          from: this.userId,
          to: targetUserId,
          sessionId: this.sessionId,
          timestamp: Date.now(),
          data,
        };

        this.channel.trigger(`client-${event}`, message);
        console.log(`📤 Sent ${event} to ${targetUserId} (attempt ${attempts + 1})`);

        // Success
        this.retryAttempts.delete(retryKey);
        return;
      } catch (error) {
        attempts++;
        console.error(`❌ Failed to send ${event} (attempt ${attempts}/${this.MAX_RETRIES}):`, error);

        if (attempts >= this.MAX_RETRIES) {
          throw new Error(`Failed to send ${event} after ${this.MAX_RETRIES} attempts`);
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY * attempts));
      }
    }
  }

  // ==============================================
  // PARTICIPANT MANAGEMENT
  // ==============================================

  /**
   * Broadcast that user joined the room
   */
  sendJoinRoom(userData: {
    displayName: string;
    avatarUrl: string | null;
    role: string;
  }): void {
    this.emit('user-joined', {
      userId: this.userId,
      sessionId: this.sessionId,
      ...userData,
    });
  }

  /**
   * Broadcast that user left the room
   */
  sendLeaveRoom(): void {
    this.emit('user-left', {
      userId: this.userId,
      sessionId: this.sessionId,
    });
  }

  /**
   * Send user profile to a specific peer
   */
  sendUserProfile(targetUserId: string, profile: any): void {
    const message: SignalingMessage = {
      type: 'user-profile',
      from: this.userId,
      to: targetUserId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      data: profile,
    };

    this.channel.trigger('client-user-profile', message);
    console.log(`📤 Sent user profile to ${targetUserId}`);
  }

  /**
   * Broadcast media state change
   */
  broadcastMediaState(mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    audioMuted: boolean;
    screenShareEnabled: boolean;
  }): void {
    this.emit('media-state-change', mediaState);
  }

  /**
   * Broadcast meeting ended
   */
  broadcastMeetingEnded(): void {
    this.emit('meeting-ended', {
      userId: this.userId,
      timestamp: Date.now(),
    });
  }

  // ==============================================
  // PRESENCE HEARTBEAT
  // ==============================================

  private startPresenceHeartbeat(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }

    this.presenceInterval = setInterval(() => {
      this.sendPresencePing();
    }, this.HEARTBEAT_INTERVAL);

    console.log('💓 Presence heartbeat started');
  }

  private sendPresencePing(): void {
    if (!this.isConnected) return;

    this.emit('presence-ping', {
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Respond to presence ping
   */
  respondToPresencePing(fromUserId: string): void {
    const message: SignalingMessage = {
      type: 'presence-pong',
      from: this.userId,
      to: fromUserId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      data: {
        userId: this.userId,
        sessionId: this.sessionId,
      },
    };

    this.channel.trigger('client-presence-pong', message);
  }

  // ==============================================
  // ROOM STATE
  // ==============================================

  /**
   * Request current room state from host
   */
  async requestRoomState(): Promise<void> {
    console.log('📥 Requesting room state...');
    // This would be implemented with a special event that the host responds to
    // For now, participants will discover each other through user-joined events
  }

  /**
   * Broadcast room update (host only)
   */
  broadcastRoomUpdate(update: any): void {
    this.emit('user-joined', update); // Reuse user-joined for room updates
  }

  // ==============================================
  // CONNECTION STATE
  // ==============================================

  isReady(): boolean {
    return this.isInitialized && this.isConnected;
  }

  getConnectionState(): 'disconnected' | 'connecting' | 'connected' {
    if (!this.isInitialized) return 'disconnected';
    if (!this.isConnected) return 'connecting';
    return 'connected';
  }

  // ==============================================
  // CLEANUP
  // ==============================================

  destroy(): void {
    console.log('🗑️ Destroying SignalingService...');

    // Stop heartbeat
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }

    // Send leave event
    if (this.isConnected) {
      this.sendLeaveRoom();
    }

    // Unsubscribe from channel
    if (this.channel) {
      this.channel.unbind_all();
      this.pusher?.unsubscribe(`private-meeting-${this.roomId}`);
      this.channel = null;
    }

    // Disconnect Pusher
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }

    // Clear handlers
    this.eventHandlers.clear();
    this.retryAttempts.clear();

    this.isConnected = false;
    this.isInitialized = false;

    console.log('✅ SignalingService destroyed');
  }
}
