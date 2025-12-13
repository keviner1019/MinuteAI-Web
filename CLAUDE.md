# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start development server at localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test:config  # Test API configurations (scripts/test-apis.js)
```

## Architecture Overview

MinuteAI is a Next.js 14 App Router application for real-time video meetings, audio transcription, and AI-powered analysis.

### Core Services Integration

- **Supabase**: Authentication, PostgreSQL database, file storage, real-time subscriptions
- **AssemblyAI**: Speech-to-text (both uploaded files and real-time streaming during meetings)
- **Google Gemini**: AI summarization, action item extraction, topic identification
- **Pusher**: WebRTC signaling for peer-to-peer video meetings

### Key Architectural Patterns

**WebRTC Flow** (`lib/webrtc/`, `hooks/useWebRTC.ts`):
- Uses simple-peer for peer connections
- Pusher handles signaling (offer/answer/ICE candidates)
- Data channels sync mute/recording state between participants
- Canvas API composites video, Web Audio API mixes audio streams

**Real-time Transcription** (`hooks/useTranscription.ts`, `app/api/transcription/`):
- AssemblyAI streaming WebSocket with temporary tokens (10-min expiry)
- Speaker diarization identifies different speakers
- Auto-saves transcript segments to database

**Recording System** (`hooks/useCompositeRecorder.ts`):
- Combines local + remote audio/video streams
- Uses MediaRecorder API to create WebM files
- Uploads to Supabase Storage `meeting-audio` bucket

### Database Schema

Main tables in `supabase/schema.sql`:
- `notes` - Uploaded audio/documents with transcripts
- `meetings` - Live meeting rooms
- `meeting_audio` - Recording metadata
- `action_items` - Extracted action items with priority/deadline
- `transcript_segments` - Timestamped transcript chunks

Migrations in `supabase/migrations/` add features like action items, storage policies.

### API Routes Structure

- `/api/transcribe` - Process uploaded audio files via AssemblyAI
- `/api/transcription/token` - Get temporary AssemblyAI streaming tokens
- `/api/analyze` - AI analysis with Gemini
- `/api/meetings/[id]/summarize` - Generate meeting summaries
- `/api/process-document` - Handle PDF, DOCX, PPTX uploads

### State Management

- Zustand for global state (`contexts/UploadContext.tsx`)
- Custom hooks encapsulate complex logic (WebRTC, transcription, action items)
- Optimistic UI updates for better UX

### Export System (`utils/transcriptExporter.ts`)

Supports TXT, PDF (jspdf), DOCX (docx library), and SRT subtitle formats.

## Environment Setup

Copy `env.template` to `.env.local` and configure:
- Supabase URL/Key
- AssemblyAI API key
- Google Gemini API key
- Pusher credentials (app key, cluster, app ID, secret)

## Key Files for Common Tasks

- Meeting room UI: `app/meeting/[roomId]/page.tsx`
- WebRTC connection: `hooks/useWebRTC.ts`, `lib/webrtc/peer.ts`
- Transcript viewer: `components/meeting/TranscriptViewer.tsx`
- Action items: `hooks/useActionItems.ts`, `components/meeting/ActionItemsList.tsx`
- File upload: `components/ui/UploadModal.tsx`, `contexts/UploadContext.tsx`
- AI analysis: `lib/gemini/config.ts`, `app/api/analyze/route.ts`
