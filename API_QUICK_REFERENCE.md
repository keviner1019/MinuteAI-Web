# MinuteAI API - Quick Reference Guide

> **Production**: `https://minute-ai-web.vercel.app`

## 🔐 Authentication

```typescript
// Supabase Config
const SUPABASE_URL = 'https://obbtrsrsbvqcqsfrxgvyb.supabase.co';
const SUPABASE_ANON_KEY = '<key>';

// Login
await supabase.auth.signInWithPassword({ email, password });

// Google OAuth
await supabase.auth.signInWithOAuth({ provider: 'google' });

// Get Session
await supabase.auth.getSession();

// Logout
await supabase.auth.signOut();
```

---

## 📝 Audio Notes

### Upload Flow

```
1. Upload file → Supabase Storage
2. Create note → Database
3. Transcribe → POST /api/transcribe
4. Analyze → POST /api/analyze
```

### Quick Code

```typescript
// 1. Upload
const { data } = await supabase.storage.from('audio-files').upload(`${userId}/${fileName}`, file);

// 2. Create Note
const { data: note } = await supabase
  .from('notes')
  .insert({ user_id, title, file_name, file_size, file_type, storage_url, status: 'processing' })
  .select()
  .single();

// 3. Transcribe
await fetch('/api/transcribe', {
  method: 'POST',
  body: JSON.stringify({ noteId: note.id, audioUrl: publicUrl }),
});

// 4. Analyze
await fetch('/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ noteId: note.id, transcript }),
});

// 5. Get Notes
await supabase.from('notes').select('*').eq('user_id', userId);
```

---

## 🎥 Meetings

### Create Meeting

```typescript
const { data } = await supabase
  .from('meetings')
  .insert({
    room_id: Math.random().toString(36).substring(2, 12),
    meeting_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
    host_id: userId,
    title: 'Quick Meeting',
    status: 'scheduled',
  })
  .select()
  .single();
```

### Join Meeting

```typescript
const { data } = await supabase
  .from('meetings')
  .select('*')
  .eq('meeting_code', code.toUpperCase())
  .maybeSingle();
```

### Save Transcript

```typescript
POST /api/save-transcript
{
  "meetingId": "uuid",
  "speaker": "user_id",
  "text": "transcript text",
  "confidence": 0.95,
  "timestamp": 1234567890
}
```

### Generate Summary

```typescript
POST / api / meetings / { meetingId } / summarize;
GET / api / meetings / { meetingId } / summarize;
```

---

## 🎤 Real-time Transcription

```typescript
// Get token
const res = await fetch('/api/transcription/token');
const { token } = await res.json();

// Stream audio
import { AssemblyAI } from 'assemblyai';

const rt = new AssemblyAI({ apiKey: '' }).streaming.transcriber({
  token,
  sampleRate: 16_000,
  speechModel: 'universal-streaming-multilingual',
});

rt.on('turn', (turn) => console.log(turn.transcript));
await rt.connect();
rt.sendAudio(audioBuffer);
```

---

## 👤 User Profile

```typescript
// Get Profile
await supabase.from('user_profiles').select('*').eq('id', userId).single();

// Update Profile
await supabase.from('user_profiles').update({ display_name, avatar_url }).eq('id', userId);

// Upload Avatar
await supabase.storage.from('avatars').upload(`${userId}/avatar.jpg`, file, { upsert: true });
```

---

## 🔴 Real-time (Pusher)

```typescript
import Pusher from 'pusher-js';

const pusher = new Pusher('KEY', {
  cluster: 'CLUSTER',
  authEndpoint: '/api/pusher/auth',
});

const channel = pusher.subscribe(`private-meeting-${meetingId}`);
channel.bind('new-transcript', (data) => {
  console.log(data.transcript);
});
```

---

## 📊 Database Tables

### notes

```typescript
{
  id, user_id, title, file_name, file_size, file_type,
  storage_url, duration, status, transcript, summary,
  action_items[], key_topics[], created_at, updated_at
}
```

### meetings

```typescript
{
  id,
    room_id,
    meeting_code,
    host_id,
    guest_id,
    title,
    status,
    scheduled_at,
    started_at,
    ended_at,
    duration,
    created_at,
    updated_at;
}
```

### transcripts

```typescript
{
  id, meeting_id, speaker, text, confidence, timestamp_start, timestamp_end, created_at;
}
```

### meeting_summaries

```typescript
{
  id, meeting_id, summary, key_points[],
  action_items[], sentiment, created_at
}
```

---

## ⚠️ Error Handling

```typescript
try {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
} catch (error) {
  console.error('API Error:', error.message);
}
```

---

## 🚀 Status Codes

| Code | Meaning      |
| ---- | ------------ |
| 200  | Success      |
| 400  | Bad Request  |
| 401  | Unauthorized |
| 403  | Forbidden    |
| 404  | Not Found    |
| 500  | Server Error |

---

## 📱 Complete Example: Audio Upload

```typescript
async function uploadAudio(file: File, title: string) {
  // 1. Auth
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session.user.id;
  const token = session.access_token;

  // 2. Upload
  const fileName = `${Date.now()}_${file.name}`;
  await supabase.storage.from('audio-files').upload(`${userId}/${fileName}`, file);
  const {
    data: { publicUrl },
  } = supabase.storage.from('audio-files').getPublicUrl(`${userId}/${fileName}`);

  // 3. Create Note
  const { data: note } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      title,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_url: publicUrl,
      status: 'processing',
    })
    .select()
    .single();

  // 4. Transcribe
  const transcribeRes = await fetch('https://minute-ai-web.vercel.app/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ noteId: note.id, audioUrl: publicUrl }),
  });
  const { transcript } = await transcribeRes.json();

  // 5. Analyze
  await fetch('https://minute-ai-web.vercel.app/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ noteId: note.id, transcript }),
  });

  // 6. Get Updated Note
  return await supabase.from('notes').select('*').eq('id', note.id).single();
}
```

---

## 🎯 Testing Checklist

- [ ] User can sign up/login
- [ ] User can upload audio
- [ ] Transcription works
- [ ] AI analysis generates summary
- [ ] User can create meeting
- [ ] User can join by code
- [ ] Real-time transcription works
- [ ] Meeting summary generates
- [ ] Profile updates work
- [ ] Avatar upload works

---

For full documentation, see [MOBILE_API_DOCUMENTATION.md](./MOBILE_API_DOCUMENTATION.md)
