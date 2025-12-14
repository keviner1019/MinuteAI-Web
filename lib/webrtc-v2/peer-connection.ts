// PeerConnection Class with Perfect Negotiation Pattern
// Based on MEETING_MODULE_WEBRTC_ARCHITECTURE.md

import { EventEmitter } from 'events';
import { RTCConfig, CONNECTION_TIMEOUT, MAX_RECONNECTION_ATTEMPTS } from './config';

export interface PeerConnectionConfig {
  remoteUserId: string;
  isPolite: boolean;
  onSignal: (signal: any) => void;
}

export class PeerConnection extends EventEmitter {
  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;
  private remoteUserId: string;
  private isPolite: boolean;
  private onSignal: (signal: any) => void;

  // Perfect Negotiation state
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;

  // Track management
  private senders: Map<string, RTCRtpSender> = new Map();
  private remoteStream: MediaStream | null = null;

  // Reconnection
  private reconnectionAttempts = 0;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private connectedAt: Date | null = null;

  // ICE candidate queue
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(config: PeerConnectionConfig) {
    super();

    this.remoteUserId = config.remoteUserId;
    this.isPolite = config.isPolite;
    this.onSignal = config.onSignal;

    // Create peer connection
    this.pc = new RTCPeerConnection(RTCConfig);

    this.setupEventListeners();
    this.setupDataChannel();
    this.setupPerfectNegotiation();

    console.log(
      `✅ PeerConnection created for ${this.remoteUserId} (${this.isPolite ? 'polite' : 'impolite'})`
    );
  }

  private setupEventListeners() {
    // Connection state
    this.pc.onconnectionstatechange = () => {
      this.handleConnectionStateChange(this.pc.connectionState);
    };

    // ICE connection state
    this.pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state (${this.remoteUserId}): ${this.pc.iceConnectionState}`);
      this.emit('ice-connection-state-change', this.pc.iceConnectionState);
    };

    // Signaling state
    this.pc.onsignalingstatechange = () => {
      console.log(`📡 Signaling state (${this.remoteUserId}): ${this.pc.signalingState}`);
      this.emit('signaling-state-change', this.pc.signalingState);  
    };    // ICE candidates (Trickle ICE)
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: this.remoteUserId,
        });
      }
    };

    // Remote tracks
    this.pc.ontrack = (event) => {
      const track = event.track;
      const stream = event.streams[0];

      console.log(`🎵 Received ${track.kind} track from ${this.remoteUserId}`, {
        trackId: track.id,
        streamId: stream.id,
        enabled: track.enabled,
        readyState: track.readyState,
      });

      // Store or update remote stream
      if (!this.remoteStream || this.remoteStream.id !== stream.id) {
        this.remoteStream = stream;
      }

      this.emit('track', { track, stream });
    };
  }

  private setupDataChannel() {
    // Create data channel (only if we're the offerer - impolite peer)
    if (!this.isPolite) {
      this.dataChannel = this.pc.createDataChannel('signaling', {
        ordered: true,
        maxRetransmits: 3,
      });
      this.setupDataChannelEvents(this.dataChannel);
      console.log(`📡 Data channel created for ${this.remoteUserId}`);
    }

    // Handle incoming data channel (polite peer)
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannelEvents(this.dataChannel);
      console.log(`📡 Data channel received from ${this.remoteUserId}`);
    };
  }

  private setupDataChannelEvents(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log(`📡 Data channel with ${this.remoteUserId} opened`);
      this.emit('data-channel-open');

      // Send initial presence
      this.sendData({ type: 'presence', status: 'online', timestamp: Date.now() });
    };

    channel.onclose = () => {
      console.log(`📡 Data channel with ${this.remoteUserId} closed`);
      this.emit('data-channel-close');
    };

    channel.onerror = (error) => {
      console.error(`📡 Data channel error with ${this.remoteUserId}:`, error);
      this.emit('data-channel-error', error);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📨 Data message from ${this.remoteUserId}:`, data);
        this.emit('data-message', data);
      } catch (error) {
        console.error('Failed to parse data message:', error);
      }
    };
  }

  private setupPerfectNegotiation() {
    // Perfect Negotiation: Automatically create offers when needed
    this.pc.onnegotiationneeded = async () => {
      try {
        console.log(`🔄 Negotiation needed with ${this.remoteUserId}`);
        this.makingOffer = true;

        // Create offer (automatically determined by browser)
        await this.pc.setLocalDescription();

        console.log(`📤 Sending offer to ${this.remoteUserId}`);
        this.onSignal({
          type: 'offer',
          description: this.pc.localDescription!,
          to: this.remoteUserId,
        });
      } catch (error) {
        console.error(`Error during negotiation with ${this.remoteUserId}:`, error);
        this.emit('negotiation-error', error);
      } finally {
        this.makingOffer = false;
      }
    };
  }

  // ==============================================
  // PUBLIC API: Signaling Methods
  // ==============================================

  async handleOffer(description: RTCSessionDescriptionInit) {
    console.log(`📥 Handling offer from ${this.remoteUserId}`);

    // Perfect Negotiation: Check for collision
    const offerCollision =
      description.type === 'offer' && (this.makingOffer || this.pc.signalingState !== 'stable');

    // Ignore offer if we're the impolite peer and there's a collision
    this.ignoreOffer = !this.isPolite && offerCollision;

    if (this.ignoreOffer) {
      console.log(`🚫 Ignoring offer from ${this.remoteUserId} (collision, impolite peer)`);
      return;
    }

    // Polite peer: Rollback if necessary
    if (offerCollision && this.isPolite) {
      console.log(`🔄 Rolling back offer (polite peer) for ${this.remoteUserId}`);
      await this.pc.setLocalDescription({ type: 'rollback' });
    }

    // Set remote description
    await this.pc.setRemoteDescription(description);
    console.log(`✅ Set remote description from ${this.remoteUserId}`);

    // Create and send answer
    await this.pc.setLocalDescription(); // Automatically creates answer
    console.log(`📤 Sending answer to ${this.remoteUserId}`);

    this.onSignal({
      type: 'answer',
      description: this.pc.localDescription!,
      to: this.remoteUserId,
    });

    // Process queued ICE candidates
    await this.processQueuedCandidates();
  }

  async handleAnswer(description: RTCSessionDescriptionInit) {
    console.log(`📥 Handling answer from ${this.remoteUserId}`);

    if (this.pc.signalingState !== 'have-local-offer') {
      console.warn(
        `Received answer in wrong state: ${this.pc.signalingState} from ${this.remoteUserId}`
      );
      return;
    }

    await this.pc.setRemoteDescription(description);
    console.log(`✅ Set remote answer from ${this.remoteUserId}`);

    // Process queued ICE candidates
    await this.processQueuedCandidates();
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    // Queue candidates until remote description is set
    if (!this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate);
      console.log(
        `🧊 Queued ICE candidate from ${this.remoteUserId} (${this.pendingCandidates.length} queued)`
      );
      return;
    }

    try {
      await this.pc.addIceCandidate(candidate);
      console.log(`✅ Added ICE candidate from ${this.remoteUserId}`);
    } catch (error) {
      console.error(`Error adding ICE candidate from ${this.remoteUserId}:`, error);
    }
  }

  private async processQueuedCandidates() {
    if (this.pendingCandidates.length === 0) return;

    console.log(
      `🧊 Processing ${this.pendingCandidates.length} queued ICE candidates for ${this.remoteUserId}`
    );

    for (const candidate of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error adding queued candidate:', error);
      }
    }

    this.pendingCandidates = [];
  }

  // ==============================================
  // PUBLIC API: Media Management
  // ==============================================

  addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender {
    const sender = this.pc.addTrack(track, stream);
    this.senders.set(track.id, sender);
    console.log(`➕ Added ${track.kind} track to ${this.remoteUserId}`);
    return sender;
  }

  removeTrack(trackId: string) {
    const sender = this.senders.get(trackId);
    if (sender) {
      this.pc.removeTrack(sender);
      this.senders.delete(trackId);
      console.log(`➖ Removed track ${trackId} from ${this.remoteUserId}`);
    }
  }

  async replaceTrack(oldTrackId: string, newTrack: MediaStreamTrack) {
    const sender = this.senders.get(oldTrackId);
    if (sender) {
      await sender.replaceTrack(newTrack);
      this.senders.delete(oldTrackId);
      this.senders.set(newTrack.id, sender);
      console.log(`🔄 Replaced track ${oldTrackId} with ${newTrack.id} for ${this.remoteUserId}`);
    }
  }

  // ==============================================
  // PUBLIC API: Data Channel
  // ==============================================

  sendData(data: any): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn(`Data channel not ready for ${this.remoteUserId}`);
      return false;
    }

    try {
      this.dataChannel.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Failed to send data to ${this.remoteUserId}:`, error);
      return false;
    }
  }

  // ==============================================
  // CONNECTION MANAGEMENT
  // ==============================================

  private handleConnectionStateChange(state: RTCPeerConnectionState) {
    console.log(`🔌 Connection state (${this.remoteUserId}): ${state}`);
    this.emit('connection-state-change', state);

    switch (state) {
      case 'connected':
        this.connectedAt = new Date();
        this.reconnectionAttempts = 0;
        if (this.reconnectionTimer) {
          clearTimeout(this.reconnectionTimer);
          this.reconnectionTimer = null;
        }
        this.emit('connected');
        break;

      case 'disconnected':
        this.emit('disconnected');
        this.startReconnectionTimer();
        break;

      case 'failed':
        this.emit('failed');
        this.attemptIceRestart();
        break;

      case 'closed':
        this.emit('closed');
        break;
    }
  }

  private startReconnectionTimer() {
    console.log(`⏱️ Starting reconnection timer for ${this.remoteUserId}`);

    this.reconnectionTimer = setTimeout(() => {
      if (this.pc.connectionState === 'disconnected') {
        console.log(`⏰ Reconnection timeout - attempting ICE restart for ${this.remoteUserId}`);
        this.attemptIceRestart();
      }
    }, 10000); // 10 seconds
  }

  private async attemptIceRestart() {
    if (this.reconnectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
      console.error(
        `❌ Max reconnection attempts reached for ${this.remoteUserId} (${this.reconnectionAttempts}/${MAX_RECONNECTION_ATTEMPTS})`
      );
      this.emit('reconnection-failed');
      return;
    }

    this.reconnectionAttempts++;
    console.log(
      `🔄 Attempting ICE restart for ${this.remoteUserId} (${this.reconnectionAttempts}/${MAX_RECONNECTION_ATTEMPTS})`
    );

    try {
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);

      this.onSignal({
        type: 'offer',
        description: this.pc.localDescription!,
        to: this.remoteUserId,
        isRestart: true,
      });

      console.log(`📤 ICE restart offer sent to ${this.remoteUserId}`);
    } catch (error) {
      console.error(`Failed to restart ICE for ${this.remoteUserId}:`, error);

      // Retry after delay
      setTimeout(() => this.attemptIceRestart(), 5000);
    }
  }

  // ==============================================
  // CLEANUP
  // ==============================================

  close() {
    console.log(`🔌 Closing peer connection with ${this.remoteUserId}`);

    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
    }

    this.dataChannel?.close();
    this.pc.close();
    this.removeAllListeners();
  }

  // ==============================================
  // GETTERS
  // ==============================================

  get connectionState() {
    return this.pc.connectionState;
  }

  get iceConnectionState() {
    return this.pc.iceConnectionState;
  }

  get signalingState() {
    return this.pc.signalingState;
  }

  get remoteStreamValue() {
    return this.remoteStream;
  }

  get isDataChannelOpen() {
    return this.dataChannel?.readyState === 'open';
  }

  get stats() {
    return this.pc.getStats();
  }
}
