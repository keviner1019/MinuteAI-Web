import { RTCConfig } from './config';

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private pendingMessages: string[] = [];
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private hasRemoteDescription = false;

  // Callbacks
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onDataChannelOpen?: () => void;
  onDataChannelMessage?: (message: string) => void;

  constructor() {}

  // Getter for signaling state (needed for Perfect Negotiation)
  get signalingState(): RTCSignalingState {
    return this.peerConnection?.signalingState || 'stable';
  }

  // Getter for local description (needed for Perfect Negotiation)
  get localDescription(): RTCSessionDescription | null {
    return this.peerConnection?.localDescription || null;
  }

  // Add onnegotiationneeded setter
  set onnegotiationneeded(handler: ((this: RTCPeerConnection, ev: Event) => any) | null) {
    if (this.peerConnection) {
      this.peerConnection.onnegotiationneeded = handler;
    }
  }

  async initialize() {
    console.log('🔧 Creating RTCPeerConnection with config:', JSON.stringify(RTCConfig, null, 2));
    this.peerConnection = new RTCPeerConnection(RTCConfig);
    
    // Log initial states
    console.log('📊 Initial connection state:', this.peerConnection.connectionState);
    console.log('📊 Initial ICE connection state:', this.peerConnection.iceConnectionState);
    console.log('📊 Initial ICE gathering state:', this.peerConnection.iceGatheringState);
    console.log('📊 Initial signaling state:', this.peerConnection.signalingState);
    
    this.setupEventListeners();
    this.setupDataChannel();
    
    // Start periodic state monitoring
    this.startStateMonitoring();
  }

  private setupDataChannel() {
    if (!this.peerConnection) return;

    // Create data channel (will be used by the peer who creates the offer)
    this.dataChannel = this.peerConnection.createDataChannel('presence', {
      ordered: true,
    });

    this.setupDataChannelEvents(this.dataChannel);

    // Handle incoming data channel (for the peer who receives the offer)
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannelEvents(this.dataChannel);
    };
  }

  private setupDataChannelEvents(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log('📡 Data channel opened');
      if (this.onDataChannelOpen) {
        this.onDataChannelOpen();
      }
      this.flushPendingMessages();
      // Send presence notification
      channel.send(JSON.stringify({ type: 'presence', status: 'connected' }));
    };

    channel.onmessage = (event) => {
      console.log('📨 Data channel message:', event.data);
      if (this.onDataChannelMessage) {
        this.onDataChannelMessage(event.data);
      }
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    channel.onclose = () => {
      console.log('📡 Data channel closed');
    };
  }

  private enqueueMessage(payload: string) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(payload);
    } else {
      console.warn('Data channel not ready, queueing payload');
      this.pendingMessages.push(payload);
    }
  }

  private flushPendingMessages() {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    while (this.pendingMessages.length > 0) {
      const payload = this.pendingMessages.shift();
      if (payload) {
        this.dataChannel.send(payload);
      }
    }
  }

  private stateMonitoringInterval: NodeJS.Timeout | null = null;

  private startStateMonitoring() {
    if (this.stateMonitoringInterval) {
      clearInterval(this.stateMonitoringInterval);
    }
    
    // Log connection state every 2 seconds for debugging
    let lastLoggedState = {
      connection: '',
      ice: '',
      gathering: '',
      signaling: '',
    };
    
    this.stateMonitoringInterval = setInterval(() => {
      if (!this.peerConnection) {
        clearInterval(this.stateMonitoringInterval!);
        return;
      }
      
      const currentState = {
        connection: this.peerConnection.connectionState,
        ice: this.peerConnection.iceConnectionState,
        gathering: this.peerConnection.iceGatheringState,
        signaling: this.peerConnection.signalingState,
      };
      
      // Only log if states have changed
      if (JSON.stringify(currentState) !== JSON.stringify(lastLoggedState)) {
        console.log('📊 Connection states:', JSON.stringify(currentState));
        lastLoggedState = currentState;
      }
    }, 2000);
  }

  private setupEventListeners() {
    if (!this.peerConnection) return;

    console.log('🎯 Setting up event listeners on peer connection');

    // ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 ICE candidate generated:', event.candidate.candidate.substring(0, 50) + '...');
        if (this.onIceCandidate) {
          this.onIceCandidate(event.candidate);
        }
      } else {
        console.log('🧊 All ICE candidates have been generated');
      }
    };
    
    // ICE gathering state
    this.peerConnection.onicegatheringstatechange = () => {
      if (!this.peerConnection) return;
      console.log('🧊 ICE gathering state:', this.peerConnection.iceGatheringState);
    };

    // ICE connection state - THIS IS CRITICAL FOR MEDIA FLOW
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;
      
      const state = this.peerConnection.iceConnectionState;
      console.log('🧊 ICE connection state:', state);
      
      if (this.onIceConnectionStateChange) {
        this.onIceConnectionStateChange(state);
      }

      // Log detailed ICE info for debugging
      if (state === 'connected' || state === 'completed') {
        console.log('✅ ICE connection established - media should flow');
        this.logConnectionStats();
      } else if (state === 'failed') {
        console.error('❌ ICE connection failed - media cannot flow');
        console.error('💡 Possible causes:');
        console.error('   - Firewall blocking UDP traffic');
        console.error('   - NAT traversal failed (need TURN server)');
        console.error('   - Network connectivity issues');
      } else if (state === 'disconnected') {
        console.warn('⚠️ ICE connection disconnected - attempting reconnection');
      } else if (state === 'checking') {
        console.log('🔍 ICE connection checking candidates...');
      }
    };

    // Remote track handling - ontrack fires ONCE PER TRACK!
    this.peerConnection.ontrack = (event) => {
      console.log('🎵 Audio track event received:', {
        kind: event.track.kind,
        id: event.track.id,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState,
        streams: event.streams.length,
      });

      const [stream] = event.streams;
      if (stream) {
        console.log('🎵 Stream from track event:', {
          id: stream.id,
          trackCount: stream.getTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });

        // Use the stream from the event (it will accumulate tracks)
        this.remoteStream = stream;

        // Monitor track unmute event (when media actually starts flowing)
        event.track.onunmute = () => {
          console.log('✅ Remote track unmuted - media is flowing!', event.track.kind);
        };

        event.track.onmute = () => {
          console.warn('⚠️ Remote track muted - no media flowing', event.track.kind);
        };

        // Always trigger the callback - even if it's the same stream object
        // This ensures React re-renders when new tracks are added
        if (this.onRemoteStream) {
          this.onRemoteStream(stream);
        }
      }
    };

    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection && this.onConnectionStateChange) {
        console.log('🔄 Peer connection state:', this.peerConnection.connectionState);
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };
  }

  private async logConnectionStats() {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();
      let candidatePair: any = null;
      
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          candidatePair = report;
        }
      });

      if (candidatePair) {
        console.log('📊 Active connection:', {
          localCandidateType: candidatePair.localCandidateType || 'unknown',
          remoteCandidateType: candidatePair.remoteCandidateType || 'unknown',
          bytesReceived: candidatePair.bytesReceived || 0,
          bytesSent: candidatePair.bytesSent || 0,
        });
      }
    } catch (error) {
      console.error('Failed to get connection stats:', error);
    }
  }

  async addLocalStream(stream: MediaStream) {
    this.localStream = stream;
    stream.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, stream);
    });
  }

  async addTrack(track: MediaStreamTrack, stream: MediaStream): Promise<RTCRtpSender | undefined> {
    if (!this.peerConnection) {
      console.error('Peer connection not initialized');
      return;
    }
    return this.peerConnection.addTrack(track, stream);
  }

  removeTrack(sender: RTCRtpSender) {
    if (!this.peerConnection) {
      console.error('Peer connection not initialized');
      return;
    }
    this.peerConnection.removeTrack(sender);
  }

  getSenders(): RTCRtpSender[] {
    if (!this.peerConnection) return [];
    return this.peerConnection.getSenders();
  }

  async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');

    const offer = await this.peerConnection.createOffer(options);
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async setLocalDescription(description?: RTCSessionDescriptionInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.setLocalDescription(description);
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    
    console.log('📝 Setting remote description:', description.type);
    await this.peerConnection.setRemoteDescription(description);
    this.hasRemoteDescription = true;
    
    // Flush any pending ICE candidates
    console.log('🧊 Flushing', this.pendingIceCandidates.length, 'pending ICE candidates');
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(candidate);
          console.log('✅ Added buffered ICE candidate');
        } catch (error) {
          console.error('❌ Error adding buffered ICE candidate:', error);
        }
      }
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    
    // Buffer ICE candidates until remote description is set
    if (!this.hasRemoteDescription) {
      console.log('🧊 Buffering ICE candidate (no remote description yet)');
      this.pendingIceCandidates.push(candidate);
      return;
    }
    
    console.log('🧊 Adding ICE candidate immediately');
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
      throw error;
    }
  }

  sendDataChannelMessage(message: any) {
    this.enqueueMessage(JSON.stringify(message));
  }

  // Alias for compatibility
  sendData(message: string) {
    this.enqueueMessage(message);
  }

  // Send large SDP via data channel in chunks
  sendSDP(type: 'offer' | 'answer', sdp: RTCSessionDescriptionInit) {
    this.enqueueMessage(
      JSON.stringify({
        type: `sdp-${type}`,
        sdp: sdp,
      })
    );
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      console.log(`📤 Sent ${type} via data channel`);
    }
  }

  close() {
    if (this.stateMonitoringInterval) {
      clearInterval(this.stateMonitoringInterval);
      this.stateMonitoringInterval = null;
    }
    this.dataChannel?.close();
    this.pendingMessages = [];
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
  }
}
