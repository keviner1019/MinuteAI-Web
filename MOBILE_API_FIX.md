# Mobile API Configuration Fix

## Problem

Your mobile app is failing with `Network request failed` when trying to call `/api/transcribe` because:

1. **Missing API configuration file** - `lib/api.ts` doesn't exist
2. **No API base URL configured** - App doesn't know where your backend is
3. **Missing environment variable** - `EXPO_PUBLIC_API_URL` not set

## Solution

### Step 1: Create API Configuration File

Create **`lib/api.ts`** in your mobile project:

```typescript
// lib/api.ts
/**
 * API Client for MinuteAI Backend
 * Connects mobile app to deployed Next.js API at https://minute-ai-web.vercel.app
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://minute-ai-web.vercel.app';

export const transcriptionApi = {
  /**
   * Trigger server-side transcription for uploaded audio
   * Backend will use AssemblyAI to transcribe and Google Gemini to analyze
   */
  async transcribe(noteId: string, audioUrl: string): Promise<{ transcript: string }> {
    const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ noteId, audioUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get AI analysis for a note
   */
  async analyze(noteId: string, transcript: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ noteId, transcript }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },
};

export default transcriptionApi;
```

### Step 2: Create `.env` File

Create **`.env`** in your mobile project root:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://obbtsrsbvqcqsfrxgvyb.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Backend API (Vercel Deployment)
EXPO_PUBLIC_API_URL=https://minute-ai-web.vercel.app

# Optional: Pusher (for real-time features)
EXPO_PUBLIC_PUSHER_KEY=your-pusher-key
EXPO_PUBLIC_PUSHER_CLUSTER=mt1
```

**Important**: Replace `your-supabase-anon-key-here` with your actual Supabase anon key from the web project.

### Step 3: Install Required Dependencies

```bash
# If using Expo
npx expo install @supabase/supabase-js

# If using React Native CLI
npm install @supabase/supabase-js
```

### Step 4: Verify Your Import

In your `NotesService.ts`, make sure the import is correct:

```typescript
import { transcriptionApi } from '@/lib/api'; // ✅ Correct
// OR
import { transcriptionApi } from '../lib/api'; // ✅ Also works

// NOT like this:
import { transcriptionApi } from '@/lib/supabase'; // ❌ Wrong path
```

### Step 5: Test the Fix

After creating the files above, restart your Expo dev server:

```bash
# Stop the current server (Ctrl+C)
# Clear cache and restart
npx expo start -c
```

## Expected Behavior After Fix

You should see these logs:

```
✅ [NotesService] Starting upload for: download.mp3
✅ [NotesService] File size: 0.33 MB
✅ [NotesService] Converted file to ArrayBuffer
✅ [NotesService] Uploaded to storage: https://...
✅ [NotesService] Created note record: 7f95b2cb-...
✅ [NotesService] Triggering transcription for note: 7f95b2cb-...
✅ [NotesService] Transcription triggered successfully
✅ [NotesService] Upload complete, processing started
```

**Server-side (automatic):**

1. ✅ AssemblyAI transcribes audio (Universal-1 model, 99+ languages)
2. ✅ Updates note.status to `'processing'`
3. ✅ Triggers AI analysis automatically (Google Gemini 2.5 Flash)
4. ✅ Generates summary, action items, key topics
5. ✅ Updates note.status to `'completed'`

**Mobile app should poll or listen to note.status:**

- `'processing'` → Show "Analyzing..." spinner
- `'completed'` → Show transcript, summary, action items
- `'failed'` → Show error with retry button

## Troubleshooting

### Still Getting "Network request failed"?

**Check 1: Verify API_BASE_URL**

```typescript
// Add this to NotesService.ts temporarily
console.log('API Base URL:', process.env.EXPO_PUBLIC_API_URL);
```

**Check 2: Test backend connectivity**

```typescript
// Test if backend is reachable
fetch('https://minute-ai-web.vercel.app/api/health')
  .then((res) => console.log('Backend reachable:', res.status))
  .catch((err) => console.error('Backend NOT reachable:', err));
```

**Check 3: Verify .env is loaded**

```bash
# Restart Expo with cache clear
npx expo start --clear
```

### Error: "API key not configured"

This means your Vercel backend is missing `ASSEMBLYAI_API_KEY`. Check:

1. Go to https://vercel.com → Your Project → Settings → Environment Variables
2. Verify `ASSEMBLYAI_API_KEY` is set
3. Redeploy if you just added it

### Error: "CORS policy"

If you see CORS errors, add this to your Next.js API routes:

```typescript
// In app/api/transcribe/route.ts
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

## File Structure (Mobile App)

After this fix, your mobile app structure should be:

```
mobile-app/
├── .env                          # ← CREATE THIS
├── lib/
│   ├── api.ts                    # ← CREATE THIS
│   └── supabase.ts               # Already exists
├── services/
│   └── notes.service.ts          # Your NotesService
└── types/
    └── database.ts
```

## Why This Happened

The web version works because:

- Web code runs **on the server** (Next.js)
- API routes are **local** (`/api/transcribe`)
- No HTTP request needed - it's a function call

Mobile app needs:

- **HTTP client** to call remote APIs
- **Base URL** to know where backend is
- **Network connectivity** to reach Vercel

## Next Steps

1. ✅ Create `lib/api.ts`
2. ✅ Create `.env` with `EXPO_PUBLIC_API_URL`
3. ✅ Restart Expo server with `npx expo start -c`
4. ✅ Test audio upload again
5. ✅ Check logs for successful transcription

---

**Production URL**: https://minute-ai-web.vercel.app
**Supabase URL**: https://obbtsrsbvqcqsfrxgvyb.supabase.co

If you still have issues after this, share:

1. The exact error message
2. Your `lib/api.ts` file content
3. Your `.env` file (without sensitive keys)
