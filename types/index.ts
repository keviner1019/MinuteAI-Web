// User types
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// User Profile types
export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Note types (combined audio file + analysis)
export interface Note {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageUrl: string;
  duration?: number; // in seconds
  // Removed: status field - no longer tracking processing status
  transcript?: string;
  transcriptSegments?: TranscriptSegment[]; // Segments with timestamps (if available)
  summary?: string;
  markdownAnalysis?: string; // Markdown formatted analysis for documents
  actionItems?: ActionItem[];
  keyTopics?: string[];
  // Support multiple attachments for notes (optional)
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
    storageUrl: string;
  }>;
  // Optional list of audio files related to this note
  audioFiles?: AudioFile[];
  createdAt: Date;
  updatedAt: Date;
}

// Audio file types
export interface AudioFile {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageUrl: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// Transcription types
export interface Transcription {
  id: string;
  audioFileId: string;
  userId: string;
  fullTranscript: string;
  diarization?: Speaker[];
  confidence: number;
  duration: number; // in seconds
  createdAt: Date;
}

export interface Speaker {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

// AI Analysis types
export interface Analysis {
  id: string;
  audioFileId: string;
  userId: string;
  summary: string;
  actionItems: ActionItem[];
  keyTopics: string[];
  createdAt: Date;
}

export interface ActionItem {
  id: string;
  text: string;
  priority?: 'high' | 'medium' | 'low'; // Optional - only shown if explicitly set
  completed: boolean;
  deadline?: string; // ISO date string
  createdAt?: string;
  updatedAt?: string;
}

// Transcript segment types (for interactive transcript)
export interface TranscriptSegment {
  id: string;
  text: string;
  start: number; // seconds
  end: number; // seconds
  speaker?: string; // Speaker A, Speaker B, etc.
  confidence?: number;
}

// Extended Note type with transcript segments
export interface NoteWithSegments extends Note {
  transcriptSegments?: TranscriptSegment[];
}

// Processing job types
export interface ProcessingJob {
  id: string;
  audioFileId: string;
  userId: string;
  status: 'queued' | 'transcribing' | 'analyzing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Participant type for WebRTC meetings (matches useWebRTC hook)
export interface Participant {
  userId: string;
  sessionId: string;
  displayName: string | null;
  avatarUrl: string | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
  isRecording: boolean;
  connectionState: RTCPeerConnectionState | 'new';
  stream: MediaStream | null;
  videoStream: MediaStream | null;
}

// Re-export other meeting types
export type { ParticipantRole, ConnectionState, ParticipantPermissions, MeetingRoom, MeetingStatus } from './meeting';

// Presence types
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

// Friend types
export interface Friend {
  friendId: string;
  friendshipId: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  status: PresenceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface FriendRequest {
  friendshipId: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  createdAt: string;
}

export interface UserSearchResult {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  isFriend: boolean;
  hasPendingRequest: boolean;
}
