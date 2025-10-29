import { RTCConfig } from './config';

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;

  // Callbacks
  onRemoteStream?: (stream: MediaStream) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
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
    this.peerConnection = new RTCPeerConnection(RTCConfig);
    this.setupEventListeners();
    this.setupDataChannel();
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

  private setupEventListeners() {
    if (!this.peerConnection) return;

    // ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
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
        streams: event.streams.length
      });
      
      const [stream] = event.streams;
      if (stream) {
        console.log('🎵 Stream from track event:', {
          id: stream.id,
          trackCount: stream.getTracks().length,
          audioTracks: stream.getAudioTracks().length
        });
        
        // Use the stream from the event (it will accumulate tracks)
        this.remoteStream = stream;
        
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
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };
  }

  async addLocalStream(stream: MediaStream) {
    this.localStream = stream;
    stream.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, stream);
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');

    const offer = await this.peerConnection.createOffer();
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
    await this.peerConnection.setRemoteDescription(description);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.addIceCandidate(candidate);
  }

  sendDataChannelMessage(message: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  close() {
    this.dataChannel?.close();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
  }
}
