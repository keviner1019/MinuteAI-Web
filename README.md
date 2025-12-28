# MinuteAI - AI-Powered Meeting & Transcription Platform

A comprehensive real-time meeting platform that combines WebRTC video conferencing, live speech-to-text transcription, and AI-powered analysis to transform how teams capture, understand, and act on meeting content.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Problem](#the-problem)
3. [The Technical Challenges](#the-technical-challenges)
4. [The Solution](#the-solution)
5. [System Architecture](#system-architecture)
6. [Technology Stack](#technology-stack)
7. [Core Features](#core-features)
8. [Database Schema](#database-schema)
9. [API Reference](#api-reference)
10. [Hooks & State Management](#hooks--state-management)
11. [Component Library](#component-library)
12. [Real-time Systems](#real-time-systems)
13. [Security Model](#security-model)
14. [Getting Started](#getting-started)
15. [Environment Configuration](#environment-configuration)
16. [Deployment](#deployment)
17. [Browser Compatibility](#browser-compatibility)
18. [Troubleshooting](#troubleshooting)
19. [Contributing](#contributing)

---

## Executive Summary

MinuteAI is a Next.js 14 application that provides:

- **Real-time WebRTC Video Meetings** - Peer-to-peer mesh network supporting 2-6 participants
- **Live Transcription** - AssemblyAI streaming API with multilingual support
- **AI Analysis** - Google Gemini for summaries, action items, and key topic extraction
- **Composite Recording** - Canvas-based video composition with Web Audio API mixing
- **Social Features** - Friends system, presence tracking, note sharing
- **Multi-format Export** - TXT, PDF, DOCX, SRT subtitle export with bilingual support

---

## The Problem

**Meetings are essential but inefficient.** Organizations face critical challenges:

| Problem | Impact |
|---------|--------|
| **70% of meeting content forgotten** | Within 24 hours, most insights are lost |
| **Action items get lost** | No clear ownership or follow-up |
| **No searchable record** | Finding past discussions is nearly impossible |
| **Manual note-taking** | Distracts from active participation |
| **Distributed teams** | Async communication suffers without meeting records |

Traditional solutions require expensive enterprise software or manual transcription services with multi-hour delivery times.

---

## The Technical Challenges

Building a real-time meeting platform with AI analysis presents complex engineering challenges:

### WebRTC Peer-to-Peer Communication
- **NAT Traversal**: Establishing connections through firewalls and NATs using STUN/TURN servers
- **ICE Candidate Handling**: Buffering ICE candidates that arrive before peer connections are ready
- **Mesh Network Topology**: Managing N×(N-1)/2 peer connections for multi-participant meetings
- **Connection State Management**: Handling disconnections, reconnections, and failed states gracefully

### Real-time Transcription
- **Low-latency Streaming**: WebSocket connections with sub-500ms transcription delay
- **Audio Resampling**: Converting browser audio (44.1kHz/48kHz) to 16kHz for AssemblyAI
- **Speaker Detection**: Identifying different speakers in real-time
- **Multilingual Support**: Automatic language detection and transcription

### Composite Recording
- **Multi-stream Composition**: Combining multiple video streams into single recording
- **Canvas-based Rendering**: requestAnimationFrame loop for video composition
- **Web Audio API Mixing**: AudioContext-based mixing of multiple audio streams
- **Dynamic Layouts**: Grid, spotlight, and speaker-view layouts

### AI Analysis
- **Structured Extraction**: Converting unstructured speech to action items with priorities
- **Topic Identification**: Automatic key topic extraction
- **Sentiment Analysis**: Meeting tone detection
- **Context Understanding**: Understanding meeting context for accurate summaries

---

## The Solution

MinuteAI addresses these challenges through a comprehensive platform:

### 1. Automated Transcription
Real-time speech-to-text with speaker identification using AssemblyAI's streaming API with the `universal-streaming-multilingual` model that supports English, Spanish, French, German, Italian, and Portuguese.

### 2. AI-Powered Insights
Google Gemini analyzes transcripts to extract:
- Concise meeting summaries
- Action items with priorities and deadlines
- Key discussion topics
- Sentiment analysis (positive/neutral/negative)

### 3. Composite Recording
Single-file recordings that capture:
- All participant video streams in configurable layouts
- Mixed audio from all participants
- Recording indicator and duration overlay
- Participant name labels and avatars

### 4. Collaboration Tools
- Share notes with collaborators (viewer/editor roles)
- Friends system for quick meeting invites
- Real-time presence tracking (online/away/offline)

### 5. Universal Access
- Browser-based, no downloads required
- Works on desktop and mobile devices
- Export to multiple formats for offline access

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (BROWSER)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   React     │  │   WebRTC    │  │  Recording  │  │   Transcription     │ │
│  │ Components  │  │   Hooks     │  │    Hooks    │  │       Hooks         │ │
│  │             │  │             │  │             │  │                     │ │
│  │ VideoCall   │  │ useWebRTC   │  │useComposite │  │ useTranscription    │ │
│  │ VideoGrid   │  │             │  │  Recorder   │  │                     │ │
│  │ Controls    │  │ Peer mgmt   │  │             │  │ AssemblyAI stream   │ │
│  │ Transcript  │  │ ICE buffer  │  │ Canvas API  │  │ Audio processing    │ │
│  │ ActionItems │  │ Signaling   │  │ AudioMixer  │  │ Real-time save      │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │            │
│  ┌──────┴────────────────┴────────────────┴─────────────────────┴──────────┐ │
│  │                         STATE MANAGEMENT                                 │ │
│  │                                                                          │ │
│  │   AuthContext    PresenceContext    ToastContext    Zustand Stores      │ │
│  └───────────────────────────────────┬──────────────────────────────────────┘ │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NEXT.JS API ROUTES                                  │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│  /meetings  │ /transcribe │  /analyze   │ /translate  │     /pusher         │
│  /calendar  │   /token    │             │             │                     │
│  /friends   │ /save-trans │ /summarize  │ /cache      │     /auth           │
│  /presence  │             │             │             │                     │
│  /notes     │             │             │             │                     │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────────┬──────────┘
       │             │             │             │                 │
       ▼             ▼             ▼             ▼                 ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    ┌───────────┐
│ Supabase  │ │AssemblyAI │ │  Gemini   │ │   DeepL   │    │  Pusher   │
│           │ │           │ │           │ │           │    │           │
│ PostgreSQL│ │Streaming  │ │  gemini-  │ │Translation│    │ WebSocket │
│ Auth      │ │   API     │ │  1.5-flash│ │    API    │    │ Signaling │
│ Storage   │ │           │ │           │ │           │    │           │
│ Realtime  │ │  S2T      │ │ Analysis  │ │   i18n    │    │   P2P     │
└───────────┘ └───────────┘ └───────────┘ └───────────┘    └───────────┘
```

### WebRTC Signaling Flow

```
    Participant A                   Pusher Channel                 Participant B
         │                               │                               │
         │───── client-user-joined ─────►│                               │
         │                               │───── client-user-joined ──────►│
         │                               │                               │
         │                               │◄─── client-user-joined ───────│
         │◄──── client-user-joined ──────│                               │
         │                               │                               │
         │     [Deterministic offer: lower userId makes offer]           │
         │                               │                               │
         │────── client-offer ──────────►│                               │
         │                               │────── client-offer ───────────►│
         │                               │                               │
         │                               │◄───── client-answer ──────────│
         │◄───── client-answer ──────────│                               │
         │                               │                               │
         │◄─────── client-ice-candidate (bidirectional) ────────────────►│
         │                               │                               │
         │◄════════════ Direct P2P Connection Established ══════════════►│
         │                               │                               │
         │              [Data channel for mute/video/recording state]    │
         │                               │                               │
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.x | App Router, Server Components, API Routes |
| **React** | 18.x | UI Library with Concurrent Features |
| **TypeScript** | 5.x | Type Safety |
| **Tailwind CSS** | 3.x | Utility-first Styling |
| **Zustand** | 4.x | Lightweight State Management |

### Backend Services

| Service | Purpose | Key Features |
|---------|---------|--------------|
| **Supabase** | Database, Auth, Storage | PostgreSQL, RLS, Real-time subscriptions, OAuth |
| **AssemblyAI** | Speech-to-Text | Streaming API, Multilingual, Temporary tokens |
| **Google Gemini** | AI Analysis | gemini-1.5-flash model, Structured output |
| **Pusher** | Real-time Messaging | WebRTC signaling, Presence channels |
| **DeepL** | Translation | Optional API for transcript translation |

### WebRTC Stack

| Component | Purpose |
|-----------|---------|
| **simple-peer** | WebRTC wrapper library |
| **RTCPeerConnection** | Browser WebRTC API |
| **MediaStream** | Audio/Video stream handling |
| **MediaRecorder** | Recording API |
| **Web Audio API** | Audio mixing via AudioContext |
| **Canvas API** | Video composition |

### Key Libraries

| Library | Purpose |
|---------|---------|
| **jspdf** | PDF document generation |
| **docx** | Word document generation |
| **file-saver** | Client-side file downloads |
| **lucide-react** | Icon library |
| **date-fns** | Date manipulation |
| **pusher-js** | Pusher client library |

---

## Core Features

### Live Meetings

#### WebRTC Video Calling
The meeting system uses a mesh network topology where each participant maintains direct peer-to-peer connections with all other participants.

**Key Implementation Details** (`hooks/useWebRTC.ts`):

```typescript
// Core state management
const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
const peerConnections = useRef<Map<string, PeerConnectionManager>>(new Map());

// Deterministic offer-making to avoid collision
const shouldMakeOffer = currentUserId.current! < data.userId;

// ICE candidate buffering for candidates arriving before peer connection
const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
```

**Participant Type**:
```typescript
interface Participant {
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
```

#### Composite Recording
The recording system (`hooks/useCompositeRecorder.ts`) creates a single video file containing all participants:

1. **Canvas Composition**: Creates an off-screen canvas for video rendering
2. **Grid Layout Calculation**: Dynamically arranges participants based on count
3. **Audio Mixing**: Uses AudioContext to mix all audio streams
4. **Layout Modes**: Grid, Spotlight (pinned user), Speaker (active speaker)

```typescript
// Layout calculation for grid mode
const calculateGridLayout = (participantCount: number, canvasWidth: number, canvasHeight: number) => {
  const cols = Math.min(maxPerRow, Math.ceil(Math.sqrt(participantCount)));
  const rows = Math.ceil(participantCount / cols);
  const tileWidth = (canvasWidth - (cols + 1) * 10) / cols;
  const tileHeight = (canvasHeight - 80 - (rows + 1) * 10) / rows;
  return { cols, rows, tileWidth, tileHeight };
};
```

### Real-time Transcription

The transcription system (`hooks/useTranscription.ts`) connects to AssemblyAI's streaming API:

1. **Token Acquisition**: Fetches temporary token from `/api/transcription/token`
2. **Audio Processing**: Captures audio via Web Audio API, resamples to 16kHz
3. **WebSocket Streaming**: Sends audio data to AssemblyAI in real-time
4. **Transcript Handling**: Receives transcripts via Pusher for all participants

```typescript
// Streaming transcriber configuration
const rt = new AssemblyAI({ apiKey: '' }).streaming.transcriber({
  token: token,
  sampleRate: 16_000,
  formatTurns: true,
  speechModel: 'universal-streaming-multilingual',
});

// Audio resampling for AssemblyAI
function resampleAudio(audioData: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
  const sampleRateRatio = fromSampleRate / toSampleRate;
  const newLength = Math.round(audioData.length / sampleRateRatio);
  // Linear interpolation for smooth resampling
}
```

### AI Analysis

The analysis system uses Google Gemini to extract structured insights:

**Action Items** (`types/index.ts`):
```typescript
interface ActionItem {
  id: string;
  text: string;
  priority?: 'high' | 'medium' | 'low';
  completed: boolean;
  deadline?: string; // ISO date string
  createdAt?: string;
  updatedAt?: string;
}
```

**Transcript Segments**:
```typescript
interface TranscriptSegment {
  id: string;
  text: string;
  start: number; // seconds
  end: number;   // seconds
  speaker?: string;
  confidence?: number;
}
```

### Document Export

The export system (`utils/transcriptExporter.ts`) supports multiple formats:

| Format | Features |
|--------|----------|
| **TXT** | Plain text with timestamps, bilingual support |
| **PDF** | Formatted with jsPDF, page breaks, styling |
| **DOCX** | Word document with headings, colored text |
| **SRT** | Subtitle format for video players |

All formats support bilingual export (original + translated text).

### Social Features

#### Friends System
- Send/accept friend requests
- Real-time friend request notifications
- View friends list with presence status

#### Presence Tracking (`contexts/PresenceContext.tsx`)
- Heartbeat-based status updates every 30 seconds
- Visibility change detection (tab focus)
- Reliable offline detection using `sendBeacon` API
- Status types: `online`, `away`, `busy`, `offline`

```typescript
// Heartbeat interval
heartbeatRef.current = setInterval(() => {
  if (visibilityRef.current) {
    sendHeartbeat('online');
  }
}, 30000);

// Page unload handling with sendBeacon
const sendOfflineStatus = () => {
  const data = JSON.stringify({ status: 'offline' });
  navigator.sendBeacon('/api/presence/beacon', data);
};
```

---

## Database Schema

The Supabase PostgreSQL database contains 14 tables:

### Core Tables

| Table | Description |
|-------|-------------|
| `user_profiles` | Extended user profile information |
| `notes` | Uploaded audio/documents with AI analysis |
| `meetings` | Video meeting rooms |
| `meeting_participants` | Multi-user meeting participants |
| `meeting_audio` | Recorded meeting media files |
| `meeting_summaries` | AI-generated meeting summaries |
| `transcripts` | Real-time meeting transcription segments |

### Social Tables

| Table | Description |
|-------|-------------|
| `friendships` | Friend connections between users |
| `user_presence` | Online/offline status tracking |
| `note_collaborators` | Shared note permissions |

### Utility Tables

| Table | Description |
|-------|-------------|
| `meeting_invitations` | Email invitations with tokens |
| `translations_cache` | Cached transcript translations |
| `peer_connections` | WebRTC connection debugging |
| `participant_events` | Meeting analytics/audit log |

### Key Schema Details

**Notes Table**:
```sql
CREATE TABLE public.notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    duration INTEGER,  -- seconds
    status TEXT NOT NULL DEFAULT 'processing',
    transcript TEXT,
    transcript_segments JSONB,  -- Array of segments with timestamps
    summary TEXT,
    action_items JSONB DEFAULT '[]'::jsonb,
    key_topics TEXT[] DEFAULT ARRAY[]::text[],
    markdown_analysis TEXT,  -- For document analysis
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Meeting Participants Table**:
```sql
CREATE TABLE public.meeting_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT DEFAULT 'participant'
        CHECK (role IN ('host', 'moderator', 'participant', 'observer')),
    permissions JSONB DEFAULT '{
        "can_speak": true,
        "can_share_screen": true,
        "can_record": false,
        "can_invite": false,
        "can_kick": false
    }'::jsonb,
    connection_state TEXT DEFAULT 'connecting',
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(meeting_id, user_id, session_id)
);
```

### Storage Buckets

| Bucket | Access | Size Limit | Purpose |
|--------|--------|------------|---------|
| `audio-files` | Public | None | Uploaded audio files |
| `meeting-audio` | Public | None | Meeting recordings |
| `meeting-recordings` | Private | 500MB | Video recordings |
| `avatars` | Public | None | User profile pictures |

### Key Database Functions

```sql
-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Maintain participant count
CREATE OR REPLACE FUNCTION update_meeting_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.meetings
        SET participant_count = participant_count + 1
        WHERE id = NEW.meeting_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
        UPDATE public.meetings
        SET participant_count = GREATEST(participant_count - 1, 0)
        WHERE id = NEW.meeting_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## API Reference

### Meeting APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/meetings` | GET/POST | List/create meetings |
| `/api/meetings/[id]` | GET/PATCH/DELETE | Manage specific meeting |
| `/api/meetings/[id]/invite` | POST | Send meeting invitation |
| `/api/meetings/[id]/summarize` | POST | Generate AI summary |
| `/api/meetings/notify-start` | POST | Notify meeting start |

### Transcription APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transcription/token` | GET | Get AssemblyAI temporary token |
| `/api/transcribe` | POST | Transcribe uploaded audio file |
| `/api/save-transcript` | POST | Save real-time transcript segment |

### Analysis APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | AI analysis of transcript |
| `/api/translate` | POST | Translate text with DeepL |
| `/api/translations-cache` | GET/POST | Manage translation cache |
| `/api/process-document` | POST | Process non-audio documents |

### Social APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/friends` | GET/POST | List/add friends |
| `/api/friends/[id]` | DELETE | Remove friend |
| `/api/friends/requests` | GET | List pending requests |
| `/api/friends/search` | GET | Search users |
| `/api/presence` | POST | Update presence status |
| `/api/presence/beacon` | POST | Beacon-based offline update |
| `/api/presence/friends` | GET | Get friends presence |

### Notes APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notes/[id]/collaborators` | GET/POST/DELETE | Manage note sharing |
| `/api/notes/[id]/action-items` | GET/POST | Manage action items |
| `/api/notes/[id]/action-items/[itemId]` | PATCH/DELETE | Update/delete item |

### Real-time APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pusher/auth` | POST | Authenticate Pusher channels |

---

## Hooks & State Management

### Core Hooks

#### `useWebRTC(roomId: string)`
Manages all WebRTC peer connections and signaling.

**Returns**:
```typescript
{
  localStream: MediaStream | null,
  localVideoStream: MediaStream | null,
  isVideoEnabled: boolean,
  isMuted: boolean,
  isConnected: boolean,
  connectionState: RTCPeerConnectionState,
  participants: Map<string, Participant>,
  participantCount: number,
  isHost: boolean,
  meetingId: string | null,

  // Actions
  toggleAudio: () => void,
  toggleVideo: () => Promise<void>,
  sendRecordingState: (isRecording: boolean) => void,
  endCall: () => Promise<void>,
}
```

#### `useTranscription(audioStream, meetingId)`
Handles real-time transcription via AssemblyAI.

**Returns**:
```typescript
{
  transcripts: Transcript[],
  isTranscribing: boolean,
  startTranscription: () => Promise<void>,
  stopTranscription: () => Promise<void>,
}
```

#### `useCompositeRecorder(meetingId)`
Creates composite recordings of all participants.

**Returns**:
```typescript
{
  isRecording: boolean,
  isSaving: boolean,
  recordingDuration: number,
  error: string | null,
  startRecording: (localVideo, remoteVideo, audio, localProfile, remoteProfile, participants?) => Promise<void>,
  stopRecording: () => Promise<void>,
  addParticipant: (participant) => void,
  removeParticipant: (userId) => void,
  setLayoutMode: (mode: 'grid' | 'spotlight' | 'speaker') => void,
}
```

#### `useActionItems({ initialItems, noteId, onUpdate })`
Manages action items with filtering and statistics.

**Returns**:
```typescript
{
  items: ActionItem[],
  filteredItems: ActionItem[],
  filter: 'all' | 'pending' | 'completed',
  setFilter: (filter) => void,
  addItem: (text, priority?, deadline?) => Promise<void>,
  updateItem: (id, updates) => Promise<void>,
  deleteItem: (id) => Promise<void>,
  toggleComplete: (id) => Promise<void>,
  stats: { total, completed, pending, highPriority, overdue },
}
```

### Other Important Hooks

| Hook | Purpose |
|------|---------|
| `useFriends` | Friends list and friend request management |
| `usePresence` | Current user presence tracking |
| `useNotes` | Notes CRUD operations |
| `useNoteCollaborators` | Note sharing management |
| `useTranscriptSync` | Audio-transcript synchronization |
| `useTranscriptSearch` | Search within transcripts |
| `useCalendarEvents` | Calendar event management |
| `useUserProfile` | User profile management |
| `useRecordingNotification` | Recording state notifications |

### Context Providers

#### `AuthContext`
Manages authentication state with Supabase Auth.

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}
```

#### `PresenceContext`
Automatic presence tracking with heartbeat.

- Sends heartbeat every 30 seconds
- Detects tab visibility changes
- Uses `sendBeacon` for reliable offline status

#### `ToastContext`
Toast notification system for user feedback.

#### `UploadContext`
File upload progress tracking.

#### `MeetingNotificationContext`
Real-time meeting notifications.

---

## Component Library

### Meeting Components

| Component | File | Description |
|-----------|------|-------------|
| `VideoCall` | `components/meeting/VideoCall.tsx` | Main video call interface |
| `VideoGrid` | `components/meeting/VideoGrid.tsx` | Participant video grid layout |
| `VideoTile` | `components/meeting/VideoTile.tsx` | Individual participant video |
| `VideoDisplay` | `components/meeting/VideoDisplay.tsx` | Video element wrapper |
| `Controls` | `components/meeting/Controls.tsx` | Meeting control buttons |
| `AudioCall` | `components/meeting/AudioCall.tsx` | Audio-only mode |
| `TranscriptViewer` | `components/meeting/TranscriptViewer.tsx` | Interactive transcript display |
| `TranscriptPanel` | `components/meeting/TranscriptPanel.tsx` | Transcript side panel |
| `TranscriptSegment` | `components/meeting/TranscriptSegment.tsx` | Single transcript segment |
| `TranscriptSearch` | `components/meeting/TranscriptSearch.tsx` | Transcript search UI |
| `TranscriptExport` | `components/meeting/TranscriptExport.tsx` | Export format selector |
| `TranscriptTranslator` | `components/meeting/TranscriptTranslator.tsx` | Translation controls |
| `ActionItemsList` | `components/meeting/ActionItemsList.tsx` | Action items management |
| `ActionItemCard` | `components/meeting/ActionItemCard.tsx` | Individual action item |
| `RecordingCountdown` | `components/meeting/RecordingCountdown.tsx` | Recording start countdown |
| `RecordingNotificationBanner` | `components/meeting/RecordingNotificationBanner.tsx` | Recording indicator |
| `ParticipantCount` | `components/meeting/ParticipantCount.tsx` | Participant counter |
| `InviteModal` | `components/meeting/InviteModal.tsx` | Meeting invite UI |
| `CreateMeetingModal` | `components/meeting/CreateMeetingModal.tsx` | New meeting form |
| `ConnectionDiagnostics` | `components/meeting/ConnectionDiagnostics.tsx` | WebRTC debugging |

### Friends Components

| Component | File | Description |
|-----------|------|-------------|
| `FriendsList` | `components/friends/FriendsList.tsx` | Friends list display |
| `FriendCard` | `components/friends/FriendCard.tsx` | Friend info card |
| `FriendRequests` | `components/friends/FriendRequests.tsx` | Pending requests |
| `AddFriend` | `components/friends/AddFriend.tsx` | Friend search/add UI |
| `PresenceIndicator` | `components/friends/PresenceIndicator.tsx` | Online status dot |

### Calendar Components

| Component | File | Description |
|-----------|------|-------------|
| `CalendarHeader` | `components/calendar/CalendarHeader.tsx` | Month navigation |
| `CalendarGrid` | `components/calendar/CalendarGrid.tsx` | Calendar grid layout |
| `CalendarDay` | `components/calendar/CalendarDay.tsx` | Single day cell |
| `EventPill` | `components/calendar/EventPill.tsx` | Event indicator |
| `SelectedDatePanel` | `components/calendar/SelectedDatePanel.tsx` | Day detail panel |

### UI Components

| Component | File | Description |
|-----------|------|-------------|
| `Button` | `components/ui/Button.tsx` | Styled button component |
| `Input` | `components/ui/Input.tsx` | Form input component |
| `Card` | `components/ui/Card.tsx` | Card container |
| `Badge` | `components/ui/Badge.tsx` | Status badge |
| `Avatar` | `components/ui/Avatar.tsx` | User avatar |
| `Header` | `components/ui/Header.tsx` | App header |
| `Logo` | `components/ui/Logo.tsx` | Application logo |
| `NoteCard` | `components/ui/NoteCard.tsx` | Note list item |
| `MeetingCard` | `components/ui/MeetingCard.tsx` | Meeting list item |
| `ConfirmModal` | `components/ui/ConfirmModal.tsx` | Confirmation dialog |
| `UploadModal` | `components/ui/UploadModal.tsx` | File upload dialog |
| `UploadTasksPanel` | `components/ui/UploadTasksPanel.tsx` | Upload progress |
| `MeetingLinkModal` | `components/ui/MeetingLinkModal.tsx` | Share meeting link |

---

## Real-time Systems

### Pusher Signaling

The signaling service (`lib/webrtc/signaling.ts`) uses Pusher private channels for WebRTC signaling:

**Channel Naming**: `private-meeting-{roomId}`

**Client Events**:
| Event | Direction | Purpose |
|-------|-----------|---------|
| `client-user-joined` | Broadcast | Announce new participant |
| `client-user-left` | Broadcast | Announce participant departure |
| `client-user-profile` | Broadcast | Share user profile info |
| `client-offer` | Targeted | WebRTC SDP offer |
| `client-answer` | Targeted | WebRTC SDP answer |
| `client-ice-candidate` | Targeted | ICE candidate |
| `client-mute-state` | Broadcast | Audio mute state |
| `client-video-state` | Broadcast | Video enable state |
| `client-recording-state` | Broadcast | Recording state |
| `client-meeting-ended` | Broadcast | Host ended meeting |
| `client-request-participants` | Broadcast | Request existing participants |

### Supabase Realtime

Tables with realtime enabled:
- `user_presence` - Online status updates
- `meeting_participants` - Join/leave notifications
- `friendships` - Friend request notifications
- `transcripts` - Live transcript updates

### Data Channel Messages

WebRTC data channels sync state between peers:

```typescript
// Message types sent via data channel
type DataChannelMessage =
  | { type: 'presence' }
  | { type: 'mute-state', isMuted: boolean }
  | { type: 'video-state', isVideoEnabled: boolean }
  | { type: 'recording-state', isRecording: boolean }
  | { type: 'meeting-ended' }
  | { type: 'sdp-offer', sdp: RTCSessionDescriptionInit }
  | { type: 'sdp-answer', sdp: RTCSessionDescriptionInit };
```

---

## Security Model

### Row Level Security (RLS)

All tables use RLS policies to ensure data isolation:

```sql
-- Example: Users can only view their own notes
CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

-- Example: Meeting participants can view meeting data
CREATE POLICY "Participants can view meeting audio" ON public.meeting_audio
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meeting_participants
            WHERE meeting_id = meeting_audio.meeting_id
            AND user_id = auth.uid()
        )
    );
```

### Authentication

- **Email/Password**: Standard Supabase auth
- **Google OAuth**: Social login with consent screen
- **Session Management**: JWT tokens with auto-refresh

### API Security

- Server-side API routes validate authentication
- Temporary tokens for browser-side streaming (10-minute expiry)
- Service role key used only server-side

### Storage Security

- Private buckets for sensitive recordings
- File size limits (500MB for recordings)
- MIME type restrictions

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Supabase account
- AssemblyAI API key
- Google Gemini API key
- Pusher account

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd MinuteAI-Web

# Install dependencies
npm install

# Copy environment template
cp env.template .env.local

# Configure environment variables (see next section)

# Run development server
npm run dev
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in SQL Editor
3. Run migrations from `supabase/migrations/` in order
4. Create storage buckets:
   - `audio-files` (public)
   - `meeting-audio` (public)
   - `meeting-recordings` (private)
   - `avatars` (public)
5. Enable Realtime for: `user_presence`, `meeting_participants`, `friendships`, `transcripts`

---

## Environment Configuration

Create `.env.local` with the following variables:

### Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Services
ASSEMBLYAI_API_KEY=your-assemblyai-key
GOOGLE_GEMINI_API_KEY=your-gemini-key

# Real-time (Pusher)
NEXT_PUBLIC_PUSHER_APP_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-cluster
PUSHER_APP_ID=your-app-id
PUSHER_SECRET=your-secret
```

### Optional

```bash
# Translation
DEEPL_API_KEY=your-deepl-key

# Email notifications
RESEND_API_KEY=your-resend-key
```

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Post-Deployment Checklist

- [ ] Run database migrations on production
- [ ] Create storage buckets
- [ ] Configure CORS for storage
- [ ] Enable Realtime on required tables
- [ ] Test authentication flow
- [ ] Test WebRTC connections
- [ ] Verify API rate limits

---

## Browser Compatibility

### Supported Browsers

| Browser | Version | Support |
|---------|---------|---------|
| Chrome/Edge | 90+ | Full |
| Firefox | 88+ | Full |
| Safari | 15+ | Full |
| Opera | 76+ | Partial |

### Required Browser APIs

- WebRTC (RTCPeerConnection)
- MediaRecorder
- Web Audio API (AudioContext)
- WebSocket
- Canvas API
- IndexedDB

### Mobile Support

- iOS Safari 15+
- Chrome Mobile (Android)
- Limited video on older devices

---

## Troubleshooting

### WebRTC Connection Issues

**"Connection failed" error**:
1. Check firewall settings
2. Verify Pusher credentials
3. Test on different network
4. Check browser console for ICE failures

**No audio/video**:
1. Grant microphone/camera permissions
2. Check device selection
3. Verify HTTPS (required for media access)

### Transcription Issues

**"Transcription not working"**:
1. Verify AssemblyAI API key
2. Check audio format (WAV, MP3, M4A)
3. Ensure file size < 100MB
4. Check browser console for errors

### Recording Issues

**"Recording failed"**:
1. Check storage bucket permissions
2. Verify MediaRecorder support
3. Check browser console for errors
4. Ensure sufficient storage space

### Build Errors

```bash
# Clear build cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules && npm install

# Check TypeScript errors
npm run build
```

---

## Development Commands

```bash
npm run dev         # Start development server (localhost:3000)
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
npm run test:config # Test API configurations
```

---

## Performance Optimizations

| Technique | Implementation |
|-----------|---------------|
| React.memo | Prevent re-renders of transcript segments |
| Debounced search | Reduce search operations during typing |
| Optimistic UI | Immediate feedback before server response |
| Lazy loading | Load components on demand |
| requestAnimationFrame | Smooth canvas video composition |
| ICE candidate buffering | Reliable WebRTC connection establishment |
| Connection pooling | Singleton Pusher instance |

---

## Tested Limits

| Feature | Tested Limit |
|---------|--------------|
| Participants | 6 (mesh network) |
| Recording duration | 2+ hours |
| Transcript length | 10,000+ words |
| Action items | 100+ per note |
| File upload | 100MB |

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TypeScript strict mode
4. Add comments for complex logic
5. Test on multiple browsers
6. Update documentation
7. Run linter before committing
8. Create Pull Request

---

## License

MIT License - see LICENSE file for details.

---

**Built for better meetings and productivity.**
