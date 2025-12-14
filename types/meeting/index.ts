// ============================================================
// PARTICIPANT TYPES
// ============================================================

export type ParticipantRole = 'host' | 'moderator' | 'participant' | 'observer';

export type ConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'failed'
  | 'closed';

export interface ParticipantPermissions {
  can_speak: boolean;
  can_share_screen: boolean;
  can_record: boolean;
  can_invite: boolean;
  can_kick: boolean;
}

export interface Participant {
  id: string; // UUID from database
  userId: string; // Supabase auth user ID
  sessionId: string; // Unique per browser tab/connection
  displayName: string;
  avatarUrl: string | null;
  role: ParticipantRole;
  permissions: ParticipantPermissions;

  // Connection state
  connectionState: ConnectionState;
  connectionQuality: number; // 0-100
  isActive: boolean;
  lastSeenAt: Date;

  // Media state
  audioEnabled: boolean;
  audioMuted: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;

  // Audio stream
  audioStream: MediaStream | null;
  videoStream: MediaStream | null;

  // Timing
  joinedAt: Date;
  leftAt: Date | null;
}

// ============================================================
// MEETING TYPES
// ============================================================

export type MeetingStatus = 'idle' | 'connecting' | 'connected' | 'ended' | 'error';

export interface MeetingRoom {
  id: string; // UUID from database
  roomId: string; // Short human-readable ID
  title: string;
  hostId: string;
  status: MeetingStatus;
  maxParticipants: number;
  participantCount: number;
  requiresApproval: boolean;
  recordAutomatically: boolean;

  // Timing
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
}

// ============================================================
// WEBRTC TYPES
// ============================================================

export interface PeerConnectionState {
  userId: string;
  peerConnection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;

  // Perfect Negotiation state
  isPolite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;

  // Streams
  remoteStream: MediaStream | null;

  // Timing
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  reconnectionAttempts: number;
}

// ============================================================
// SIGNALING TYPES
// ============================================================

export type SignalingEventType =
  | 'user-joined'
  | 'user-left'
  | 'user-profile'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'media-state-change'
  | 'meeting-ended'
  | 'presence-ping'
  | 'presence-pong';

export interface SignalingMessage<T = any> {
  type: SignalingEventType;
  from: string; // sender's userId
  to?: string; // recipient's userId (optional, for direct messages)
  sessionId: string; // sender's sessionId
  timestamp: number;
  data: T;
}

export interface UserJoinedData {
  userId: string;
  sessionId: string;
  displayName: string;
  avatarUrl: string | null;
  role: ParticipantRole;
}

export interface MediaStateChangeData {
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioMuted: boolean;
  screenShareEnabled: boolean;
}

// ============================================================
// STORE TYPES
// ============================================================

export interface MeetingStore {
  // Room state
  room: MeetingRoom | null;

  // Local user
  localUser: Participant | null;

  // Participants (Map for O(1) lookup)
  participants: Map<string, Participant>;

  // Peer connections (Map for O(1) lookup)
  peerConnections: Map<string, PeerConnectionState>;

  // Local media
  localAudioStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  localScreenStream: MediaStream | null;

  // Media state
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioMuted: boolean;
  screenShareEnabled: boolean;

  // Recording & transcription
  isRecording: boolean;
  isTranscribing: boolean;

  // UI state
  layout: 'grid' | 'speaker' | 'sidebar';
  showTranscript: boolean;
  showParticipants: boolean;
  showSettings: boolean;

  // Error state
  error: string | null;

  // Actions (to be defined in store implementation)
  actions: MeetingStoreActions;
}

export interface MeetingStoreActions {
  // Room actions
  joinRoom: (roomId: string, userData: UserJoinedData) => Promise<void>;
  leaveRoom: () => Promise<void>;

  // Participant actions
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  getParticipant: (userId: string) => Participant | undefined;

  // Media actions
  setLocalAudioStream: (stream: MediaStream | null) => void;
  setLocalVideoStream: (stream: MediaStream | null) => void;
  toggleAudio: () => void;
  toggleVideo: () => Promise<void>;
  toggleMute: () => void;
  toggleScreenShare: () => Promise<void>;

  // Peer connection actions
  createPeerConnection: (userId: string, isPolite: boolean) => void;
  updatePeerConnection: (userId: string, updates: Partial<PeerConnectionState>) => void;
  closePeerConnection: (userId: string) => void;

  // Signaling actions
  handleOffer: (userId: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  handleAnswer: (userId: string, answer: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (userId: string, candidate: RTCIceCandidateInit) => Promise<void>;

  // Recording actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;

  // UI actions
  setLayout: (layout: 'grid' | 'speaker' | 'sidebar') => void;
  toggleTranscript: () => void;
  toggleParticipants: () => void;

  // Error handling
  setError: (error: string | null) => void;
}
