# Mobile Audio Upload — MinuteAI

This document describes the recommended mobile-side audio upload workflow for the MinuteAI mobile app. It details how to record or pick audio, prepare it for upload, store it in Supabase Storage, create a `notes` record in the database, and trigger server-side transcription and AI analysis. It also covers offline behavior, progress UI, error handling, security, and testing.

---

## Summary (One-line)

Record or pick audio on-device → optionally preview → upload to Supabase Storage → create a `notes` record → call `/api/transcribe` → `/api/analyze` runs server-side → show status and results in app.

---

## Quick Architecture

- Mobile app (React Native / Expo)
  - Recorder (expo-av) or file picker
  - Upload layer (Supabase JS SDK)
  - Local queue & retry (AsyncStorage)
  - UI states and notifications
- Backend (already available)
  - `POST /api/transcribe` (start transcription for uploaded audio)
  - `POST /api/analyze` (AI analysis summarization)
  - Supabase DB: `notes` table
  - Supabase Storage: `audio-files` bucket

---

## Preconditions & Env

Environment variables (mobile uses the same project values):

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon/public key
- `API_BASE_URL` – `https://minute-ai-web.vercel.app` (for server APIs like `/api/transcribe`)

Security notes:

- Store JWT access tokens in secure storage (SecureStore / EncryptedStorage)
- Never embed service-role keys in the mobile app

---

## High-level Sequence

1. User records audio OR selects a file from device.
2. App offers preview (playback) and title input.
3. When user confirms, app uploads the audio file to Supabase Storage.
4. App creates a `notes` row via Supabase client with `status: 'processing'` and `storage_url` set to the public URL.
5. App calls `POST ${API_BASE_URL}/api/transcribe` with `{ noteId, audioUrl }` using user's JWT in Authorization header.
6. Server transcribes audio (AssemblyAI), saves transcript in DB, updates `notes.status` to `completed`, and triggers `/api/analyze` server-side for AI summary.
7. App receives updates (polling or on-demand refresh). If real-time is needed, app can listen via Pusher or poll `notes` status.

---

## React Native Implementation (Examples)

### 1) Recording with `expo-av` (Expo)

```tsx
// RecordingHook.tsx (simplified)
import { useState, useRef } from 'react';
import { Audio } from 'expo-av';

export function useRecorder() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const start = async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) throw new Error('Microphone permission denied');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
    await rec.startAsync();
    setRecording(rec);
    setIsRecording(true);
  };

  const stop = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setUri(uri ?? null);
    setRecording(null);
    setIsRecording(false);
    return uri;
  };

  return { start, stop, uri, isRecording };
}
```

Notes:

- For long recordings (> 5 minutes) test thoroughly on low-memory devices.
- Consider splitting or compressing long audio before upload.

### 2) Convert file URI to Blob for Supabase upload

React Native doesn't supply a browser `File` object. Use `fetch(uri)` to get a blob and upload.

```ts
async function uriToBlob(uri: string) {
  const res = await fetch(uri);
  const blob = await res.blob();
  return blob; // Blob is compatible with Supabase JS in RN
}
```

### 3) Upload to Supabase Storage

```ts
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function uploadAudioFile(
  blob: Blob,
  userId: string,
  filename: string,
  onProgress?: (p: number) => void
) {
  const path = `${userId}/${filename}`;

  // Supabase storage SDK currently doesn't provide progress callback in RN reliably.
  // If you need upload progress, implement a multipart upload or use a direct signed URL flow.

  const { error } = await supabase.storage
    .from('audio-files')
    .upload(path, blob, { contentType: 'audio/webm' });

  if (error) throw error;

  const { data } = supabase.storage.from('audio-files').getPublicUrl(path);
  return data.publicUrl;
}
```

Notes:

- Determine contentType carefully: `audio/webm`, `audio/m4a`, etc.
- For progress UI in RN, consider a signed PUT to Supabase bucket (presigned upload) using `fetch` and streaming Axios to get progress.

### 4) Create `notes` row

```ts
async function createNoteOnServer(
  userId: string,
  title: string,
  fileName: string,
  fileSize: number,
  publicUrl: string
) {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      title,
      file_name: fileName,
      file_size: fileSize,
      file_type: 'audio/webm',
      storage_url: publicUrl,
      status: 'processing',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 5) Trigger transcription (server-side)

Call your existing server endpoint which performs transcription using AssemblyAI:

```ts
async function triggerTranscription(noteId: string, audioUrl: string, jwt: string) {
  const res = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ noteId, audioUrl }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Transcription failed');
  }

  return res.json();
}
```

This endpoint will run AssemblyAI transcription and update the database (via supabaseAdmin) so the mobile app only needs to refresh the `notes` row.

---

## UX: UI States & Flows

Design each upload flow with these states and messages:

- Idle: "Record or pick audio"
- Recording: red dot, duration timer, "Stop" button
- Preview: Play/pause controls, re-record, Confirm (Upload) button
- Uploading: progress spinner (if available) or progress indicator, "Cancel" option
- Processing: show as "Processing" with spinner; instruct user that transcription happens on server
- Complete: success message, show transcript and summary
- Failed: show error message with retry button

UX tips:

- Keep the user on a simple modal for recording/preview then return to note creation screen
- Show expected processing time (approx) and push notification when done
- If network unavailable, show offline queue message

---

## Offline Strategy & Retry Queue

Store pending uploads in a local queue persisted in AsyncStorage (or MMKV). Structure:

```ts
interface PendingUpload {
  id: string; // uuid
  userId: string;
  uri: string; // local file uri
  filename: string;
  filesize: number;
  title: string;
  attempts: number;
  lastError?: string;
  createdAt: number;
}
```

Queue flow:

1. When user taps Upload, save item to pending queue and immediately attempt upload.
2. If upload fails due to network, keep item in queue with attempts++.
3. Background sync (when connectivity restored) processes queue items with exponential backoff (e.g., 2^attempts \* 5s).
4. If attempts > 5, mark as failed and surface to user for manual retry.

Implementation tips:

- Use `@react-native-community/netinfo` to monitor connectivity and automatically resume.
- Use a background task library (Expo TaskManager + BackgroundFetch for Expo, or Headless JS on Android) to retry when app is backgrounded.

---

## Progress & Notifications

- In-app toast when upload starts/finishes/fails
- Local push notification when transcription completes (if user enabled notifications). The server can send push via FCM/APNs using user's push token stored in DB.

---

## Error Handling & Common Failures

- Microphone permission denied → show instructions to enable.
- Large files / memory errors → recommend limiting recordings or compressing.
- Storage upload fails (403/401) → check Supabase anon key and CORS for presigned flows.
- Transcription server error → server will update note `status: 'failed'`; surface message and allow re-trigger.

Retry rules:

- Transient HTTP errors (5xx, network) → retry with backoff
- Auth errors (401) → require user to re-login, refresh tokens
- Validation errors (400) → show message and do not retry automatically

---

## Testing & QA Checklist

- [ ] Record audio, preview and upload successfully on iOS
- [ ] Record audio, preview and upload successfully on Android
- [ ] Upload a file picked from filesystem and confirm transcription runs
- [ ] Simulate offline (airplane mode) → ensure queue persists and resumes after reconnection
- [ ] Verify note appears in `notes` table with `status` updates
- [ ] Confirm `/api/transcribe` returns success and `transcript` saved
- [ ] Confirm `/api/analyze` produces `summary` and `action_items`
- [ ] Confirm push notification or in-app notification when processing completes
- [ ] Test large file sizes and long recordings for performance/timeout

Automated tests suggestions:

- Unit tests for `uriToBlob` and `uploadAudioFile` helpers
- Integration test to mock Supabase storage and ensure `createNote` call is made after upload

---

## Performance & Limits

- Recommend chunking or limiting recording to 60 minutes per file
- Aim to compress audio on mobile to reasonable bitrate (e.g., 64–128 kbps) to reduce upload time
- For extremely large files, consider server-side direct ingestion (signed uploads + server triggers)

---

## Example Full Flow (component pseudocode)

```tsx
// 1. Record / pick
const { start, stop, uri } = useRecorder();

// 2. Preview and confirm
// 3. Upload
const blob = await uriToBlob(uri);
const publicUrl = await uploadAudioFile(blob, userId, filename);
// 4. Create note
const note = await createNoteOnServer(userId, title, filename, filesize, publicUrl);
// 5. Trigger transcription
await triggerTranscription(note.id, publicUrl, session.access_token);
// 6. Refresh notes list
await refreshNotes();
```

---

## Security & Privacy Notes

- Use secure storage for user tokens (do not use plain AsyncStorage for JWT refresh tokens).
- Provide a clear privacy policy describing how audio is stored, processed and retained.
- Allow users to delete audio and transcripts and remove them from Supabase storage + DB.

---

## Next Steps for Implementation

1. Implement `useRecorder` and `uriToBlob` helpers.
2. Implement `uploadAudioFile` with progress support (or signed PUT flow for progress).
3. Implement persistent queue + NetInfo monitoring.
4. Wire UI states and add unit tests.
5. Test on iOS/Android real devices.

---

## References

- Supabase Storage docs: https://supabase.com/docs
- AssemblyAI streaming/transcription docs
- Expo `Audio` docs: https://docs.expo.dev/versions/latest/sdk/audio/
- React Native file handling (Blob via fetch)

---

_File created: MOBILE_AUDIO_UPLOAD.md_
