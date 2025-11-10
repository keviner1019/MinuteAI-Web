# MinuteAI Mobile App - API Documentation

> **Base URL (Production)**: `https://minute-ai-web.vercel.app`
>
> **Base URL (Local Dev)**: `http://localhost:3000`

## Table of Contents

- [Authentication](#authentication)
- [Audio Notes APIs](#audio-notes-apis)
- [Meetings APIs](#meetings-apis)
- [Transcription APIs](#transcription-apis)
- [User Profile APIs](#user-profile-apis)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)

---

## Authentication

MinuteAI uses **Supabase Authentication**. All API requests (except auth endpoints) require a valid JWT token.

### Headers Required

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Supabase Configuration

```typescript
const SUPABASE_URL = 'https://obbtrsrsbvqcqsfrxgvyb.supabase.co';
const SUPABASE_ANON_KEY = '<your-anon-key>';
```

### Authentication Methods

#### 1. Email/Password Signup

```typescript
// Using Supabase Client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      display_name: 'John Doe',
    },
  },
});
```

#### 2. Email/Password Login

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password',
});
```

#### 3. Google OAuth Login

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'minuteai://auth/callback',
    queryParams: {
      access_type: 'offline',
      prompt: 'select_account',
    },
  },
});
```

#### 4. Get Current Session

```typescript
const {
  data: { session },
  error,
} = await supabase.auth.getSession();
```

#### 5. Logout

```typescript
const { error } = await supabase.auth.signOut();
```

---

## Audio Notes APIs

### 1. Upload Audio File

**Step 1: Upload to Supabase Storage**

```typescript
POST / storage / v1 / object / audio - files / { userId } / { filename };

// Using Supabase Client
const { data, error } = await supabase.storage
  .from('audio-files')
  .upload(`${userId}/${fileName}`, file, {
    contentType: file.type,
    upsert: false,
  });

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from('audio-files').getPublicUrl(`${userId}/${fileName}`);
```

**Step 2: Create Note in Database**

```typescript
// Using Supabase Client
const { data, error } = await supabase
  .from('notes')
  .insert({
    user_id: userId,
    title: 'Meeting Notes',
    file_name: 'audio.m4a',
    file_size: 1048576,
    file_type: 'audio/m4a',
    storage_url: publicUrl,
    status: 'processing',
  })
  .select()
  .single();
```

**Response:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Meeting Notes",
  "file_name": "audio.m4a",
  "file_size": 1048576,
  "file_type": "audio/m4a",
  "storage_url": "https://...",
  "status": "processing",
  "created_at": "2025-10-29T10:00:00Z"
}
```

---

### 2. Start Transcription

```http
POST /api/transcribe
Content-Type: application/json
```

**Request Body:**

```json
{
  "noteId": "uuid",
  "audioUrl": "https://storage-url.com/audio.m4a"
}
```

**Response (Success):**

```json
{
  "success": true,
  "transcript": "Speaker 1: Hello, how are you?\n\nSpeaker 2: I'm doing well, thanks!",
  "duration": 120,
  "language": "en",
  "speakers": 2
}
```

**Response (Error):**

```json
{
  "error": "Transcription failed"
}
```

**Features:**

- ✅ Automatic language detection (99+ languages)
- ✅ Speaker diarization (identifies different speakers)
- ✅ Code switching (handles mixed languages)
- ✅ Universal-1 model for best accuracy

---

### 3. Analyze Transcript with AI

```http
POST /api/analyze
Content-Type: application/json
```

**Request Body:**

```json
{
  "noteId": "uuid",
  "transcript": "Full transcript text here..."
}
```

**Response (Success):**

```json
{
  "success": true,
  "summary": "This meeting discussed project timelines and budget allocation.",
  "actionItems": [
    {
      "id": "action-0",
      "text": "Review budget proposal by Friday",
      "completed": false
    },
    {
      "id": "action-1",
      "text": "Schedule follow-up meeting with stakeholders",
      "completed": false
    }
  ],
  "keyTopics": ["Project Timeline", "Budget Allocation", "Team Resources"]
}
```

**Response (Error):**

```json
{
  "error": "AI analysis failed"
}
```

---

### 4. Get All Notes

```typescript
// Using Supabase Client
const { data, error } = await supabase
  .from('notes')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

**Response:**

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Team Meeting",
    "file_name": "meeting.m4a",
    "file_size": 2097152,
    "file_type": "audio/m4a",
    "storage_url": "https://...",
    "duration": 300,
    "status": "completed",
    "transcript": "Full transcript...",
    "summary": "Meeting summary...",
    "action_items": [...],
    "key_topics": [...],
    "created_at": "2025-10-29T10:00:00Z",
    "updated_at": "2025-10-29T10:05:00Z"
  }
]
```

---

### 5. Get Single Note

```typescript
const { data, error } = await supabase.from('notes').select('*').eq('id', noteId).single();
```

---

### 6. Update Note

```typescript
const { data, error } = await supabase
  .from('notes')
  .update({ title: 'Updated Title' })
  .eq('id', noteId)
  .select()
  .single();
```

---

### 7. Delete Note

```typescript
const { error } = await supabase.from('notes').delete().eq('id', noteId);
```

---

## Meetings APIs

### 1. Create Meeting

```typescript
const { data, error } = await supabase
  .from('meetings')
  .insert({
    room_id: generateRoomId(), // e.g., "abc123xyz"
    meeting_code: generateMeetingCode(), // e.g., "ABC123"
    host_id: userId,
    title: 'Quick Meeting',
    status: 'scheduled',
  })
  .select()
  .single();

// Helper functions
function generateRoomId() {
  return Math.random().toString(36).substring(2, 12);
}

function generateMeetingCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
```

**Response:**

```json
{
  "id": "uuid",
  "room_id": "abc123xyz",
  "meeting_code": "ABC123",
  "host_id": "uuid",
  "guest_id": null,
  "title": "Quick Meeting",
  "status": "scheduled",
  "created_at": "2025-10-29T10:00:00Z"
}
```

---

### 2. Join Meeting by Code

```typescript
const { data, error } = await supabase
  .from('meetings')
  .select('*')
  .eq('meeting_code', meetingCode.toUpperCase())
  .maybeSingle();
```

**Response:**

```json
{
  "id": "uuid",
  "room_id": "abc123xyz",
  "meeting_code": "ABC123",
  "host_id": "uuid",
  "status": "active",
  "title": "Quick Meeting"
}
```

---

### 3. Get User's Meetings

```typescript
const { data, error } = await supabase
  .from('meetings')
  .select('*')
  .eq('host_id', userId)
  .order('created_at', { ascending: false });
```

---

### 4. Update Meeting Status

```typescript
const { data, error } = await supabase
  .from('meetings')
  .update({
    status: 'ended',
    ended_at: new Date().toISOString(),
  })
  .eq('id', meetingId)
  .select()
  .single();
```

---

### 5. Save Meeting Transcript

```http
POST /api/save-transcript
Content-Type: application/json
```

**Request Body:**

```json
{
  "meetingId": "uuid",
  "speaker": "user_12345_abc",
  "text": "Hello, can everyone hear me?",
  "confidence": 0.95,
  "timestamp": 1698580800
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "meeting_id": "uuid",
    "speaker": "user_12345_abc",
    "text": "Hello, can everyone hear me?",
    "confidence": 0.95,
    "timestamp_start": 1698580800,
    "created_at": "2025-10-29T10:00:00Z"
  }
}
```

**Note:** This endpoint also broadcasts the transcript via Pusher for real-time sync.

---

### 6. Get Meeting Transcripts

```typescript
const { data, error } = await supabase
  .from('transcripts')
  .select('*')
  .eq('meeting_id', meetingId)
  .order('created_at', { ascending: true });
```

---

### 7. Generate Meeting Summary

```http
POST /api/meetings/{meetingId}/summarize
Content-Type: application/json
```

**Response:**

```json
{
  "summary": {
    "id": "uuid",
    "meeting_id": "uuid",
    "summary": "This meeting covered project updates and next steps.",
    "key_points": [
      "Project is on schedule",
      "Budget approved for Q4",
      "New team member joining next month"
    ],
    "action_items": ["Send project timeline to stakeholders", "Schedule onboarding session"],
    "sentiment": "positive",
    "created_at": "2025-10-29T10:00:00Z"
  }
}
```

---

### 8. Get Meeting Summary

```http
GET /api/meetings/{meetingId}/summarize
```

**Response:**

```json
{
  "summary": {
    "id": "uuid",
    "meeting_id": "uuid",
    "summary": "Meeting summary text",
    "key_points": [...],
    "action_items": [...],
    "sentiment": "positive"
  }
}
```

---

## Transcription APIs

### 1. Get Temporary Streaming Token

```http
GET /api/transcription/token
```

**Response:**

```json
{
  "token": "temporary-token-here"
}
```

**Usage:**
This token is used for browser-based real-time transcription with AssemblyAI streaming API. Valid for 10 minutes.

**Example (React Native):**

```typescript
// Get token
const response = await fetch('https://minute-ai-web.vercel.app/api/transcription/token');
const { token } = await response.json();

// Use with AssemblyAI streaming
import { AssemblyAI } from 'assemblyai';

const rt = new AssemblyAI({ apiKey: '' }).streaming.transcriber({
  token: token,
  sampleRate: 16_000,
  speechModel: 'universal-streaming-multilingual',
});

rt.on('turn', (turn) => {
  console.log('Transcript:', turn.transcript);
});

await rt.connect();
rt.sendAudio(audioBuffer);
```

---

## User Profile APIs

### 1. Get User Profile

```typescript
const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
```

**Response:**

```json
{
  "id": "uuid",
  "display_name": "John Doe",
  "avatar_url": "https://...",
  "created_at": "2025-10-29T10:00:00Z",
  "updated_at": "2025-10-29T10:00:00Z"
}
```

---

### 2. Update User Profile

```typescript
const { data, error } = await supabase
  .from('user_profiles')
  .update({
    display_name: 'Jane Doe',
    avatar_url: 'https://...',
  })
  .eq('id', userId)
  .select()
  .single();
```

---

### 3. Upload Avatar

**Step 1: Upload to Storage**

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, {
    contentType: 'image/jpeg',
    upsert: true,
  });

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar.jpg`);
```

**Step 2: Update Profile**

```typescript
await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('id', userId);
```

---

## Real-time Features (Pusher)

### Configuration

```typescript
import Pusher from 'pusher-js';

const pusher = new Pusher('YOUR_PUSHER_KEY', {
  cluster: 'YOUR_CLUSTER',
  authEndpoint: 'https://minute-ai-web.vercel.app/api/pusher/auth',
});
```

### Subscribe to Meeting Channel

```typescript
const channel = pusher.subscribe(`private-meeting-${meetingId}`);

channel.bind('new-transcript', (data) => {
  console.log('New transcript:', data.transcript);
  // Update UI with new transcript
});

channel.bind('pusher:subscription_succeeded', () => {
  console.log('Successfully subscribed');
});
```

---

## Error Handling

All API responses follow this error format:

```json
{
  "error": "Error message here",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common HTTP Status Codes

| Status | Meaning                                      |
| ------ | -------------------------------------------- |
| 200    | Success                                      |
| 400    | Bad Request - Invalid input                  |
| 401    | Unauthorized - Missing or invalid auth token |
| 403    | Forbidden - User doesn't have permission     |
| 404    | Not Found - Resource doesn't exist           |
| 500    | Internal Server Error                        |

### Example Error Handling

```typescript
try {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ noteId, audioUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Handle error in UI
}
```

---

## Rate Limits

### AssemblyAI Limits

- **Concurrent transcriptions**: 32 concurrent requests
- **Audio file size**: 5GB max per file
- **Streaming duration**: No limit

### Supabase Limits (Free Tier)

- **Storage**: 1GB
- **Database**: 500MB
- **Bandwidth**: 2GB/month
- **API requests**: No hard limit, but subject to fair use

### Recommended Practices

1. **Debounce** real-time transcription saves (e.g., save every 3 seconds instead of every word)
2. **Batch operations** when possible
3. **Cache** frequently accessed data locally
4. **Compress** audio files before upload
5. **Clean up** old storage files periodically

---

## Database Schema Reference

### Notes Table

```typescript
interface Note {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_url: string;
  duration: number | null;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  transcript: string | null;
  summary: string | null;
  action_items: ActionItem[];
  key_topics: string[];
  created_at: string;
  updated_at: string;
}

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}
```

### Meetings Table

```typescript
interface Meeting {
  id: string;
  room_id: string;
  meeting_code: string;
  host_id: string;
  guest_id: string | null;
  title: string;
  status: 'scheduled' | 'active' | 'ended';
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
}
```

### Transcripts Table

```typescript
interface Transcript {
  id: string;
  meeting_id: string;
  speaker: string;
  text: string;
  confidence: number | null;
  timestamp_start: number;
  timestamp_end: number | null;
  created_at: string;
}
```

### Meeting Summaries Table

```typescript
interface MeetingSummary {
  id: string;
  meeting_id: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  created_at: string;
}
```

---

## Complete Workflow Examples

### Audio Note Upload & Processing

```typescript
async function uploadAndProcessAudio(audioFile: File, title: string) {
  // 1. Get user session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const userId = session.user.id;
  const fileName = `${Date.now()}_${audioFile.name}`;

  // 2. Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('audio-files')
    .upload(`${userId}/${fileName}`, audioFile);

  if (uploadError) throw uploadError;

  // 3. Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('audio-files').getPublicUrl(`${userId}/${fileName}`);

  // 4. Create note
  const { data: note, error: noteError } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      title,
      file_name: audioFile.name,
      file_size: audioFile.size,
      file_type: audioFile.type,
      storage_url: publicUrl,
      status: 'processing',
    })
    .select()
    .single();

  if (noteError) throw noteError;

  // 5. Start transcription
  const transcribeRes = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      noteId: note.id,
      audioUrl: publicUrl,
    }),
  });

  const transcribeData = await transcribeRes.json();

  // 6. Analyze with AI
  const analyzeRes = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      noteId: note.id,
      transcript: transcribeData.transcript,
    }),
  });

  const analyzeData = await analyzeRes.json();

  return { note, transcript: transcribeData, analysis: analyzeData };
}
```

---

### Create & Join Meeting

```typescript
async function createMeeting(title: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const roomId = Math.random().toString(36).substring(2, 12);
  const meetingCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      room_id: roomId,
      meeting_code: meetingCode,
      host_id: session.user.id,
      title,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) throw error;

  return meeting;
}

async function joinMeetingByCode(code: string) {
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('meeting_code', code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!meeting) throw new Error('Invalid meeting code');
  if (meeting.status === 'ended') throw new Error('Meeting has ended');

  return meeting;
}
```

---

## Environment Variables (for reference)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://obbtrsrsbvqcqsfrxgvyb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AssemblyAI
ASSEMBLYAI_API_KEY=your-assemblyai-key

# Google Gemini
GOOGLE_GEMINI_API_KEY=your-gemini-key

# Pusher (Real-time)
NEXT_PUBLIC_PUSHER_APP_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-cluster
PUSHER_APP_ID=your-app-id
PUSHER_SECRET=your-secret

# Daily.co (WebRTC)
NEXT_PUBLIC_DAILY_API_KEY=your-daily-key
```

---

## Support & Contact

- **Web App**: https://minute-ai-web.vercel.app
- **GitHub**: https://github.com/keviner1019/MinuteAI-Web
- **Issues**: Report bugs via GitHub Issues

---

## Changelog

### Version 1.0.0 (2025-10-29)

- ✅ Audio upload & transcription
- ✅ AI-powered analysis (summary, action items, topics)
- ✅ Real-time meetings with WebRTC
- ✅ Live transcription streaming
- ✅ Meeting summaries
- ✅ User profiles with avatars
- ✅ Google OAuth integration
- ✅ Multi-language support (99+ languages)
- ✅ Speaker diarization
