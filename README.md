# MinuteAI - AI-Powered Meeting & Transcription Platform

A comprehensive web application for real-time video meetings, audio transcription, and AI-powered analysis. Upload audio files or conduct live meetings with automatic transcription, action item extraction, and intelligent summaries.

---

## The Problem

**Meetings are essential but inefficient.** Teams spend countless hours in meetings, yet:
- **70% of meeting content is forgotten** within 24 hours
- **Action items get lost** or unclear ownership
- **No searchable record** of what was discussed
- **Manual note-taking** distracts from active participation
- **Distributed teams** struggle with async communication

Traditional solutions either require expensive enterprise software or manual transcription services that take hours to deliver.

---

## The Challenges

Building a real-time meeting platform with AI analysis presents several technical hurdles:

| Challenge | Complexity |
|-----------|------------|
| **WebRTC Peer-to-Peer** | NAT traversal, ICE candidates, TURN/STUN servers, connection state management |
| **Real-time Transcription** | Low-latency speech-to-text, speaker diarization, streaming WebSocket connections |
| **Multi-participant Mesh** | N×(N-1)/2 peer connections, state synchronization, race conditions |
| **Composite Recording** | Mixing multiple audio/video streams, canvas composition, Web Audio API |
| **AI Analysis** | Extracting structured data (action items, key topics) from unstructured speech |
| **Security** | Row-level security, authenticated storage, temporary tokens |

---

## The Solution

MinuteAI provides an all-in-one platform that:

1. **Automates transcription** - Real-time speech-to-text with speaker identification
2. **Extracts insights** - AI-powered summaries, action items, and key topics
3. **Records everything** - Composite audio/video recording with playback
4. **Enables collaboration** - Share notes, assign action items, track progress
5. **Works anywhere** - Browser-based, no downloads required

---

## Key Features

### Live Meetings
- **WebRTC Peer-to-Peer Video Calls** - Direct audio/video connections with low latency
- **Multi-participant Support** - Mesh network topology for group meetings
- **Real-time Transcription** - Live speech-to-text during meetings
- **Video Toggle** - Enable/disable camera for face capture (640x480)
- **Composite Recording** - Records both local and remote audio/video streams
- **Recording Notifications** - All participants see recording status in real-time
- **Meeting Codes** - Easy 6-character codes for joining (e.g., "ABC123")
- **Meeting Summaries** - AI-generated summaries saved to meeting records

### Transcription & Analysis
- **Interactive Transcript Viewer** - Click timestamps to jump in audio
- **Full-Text Search** - Find and highlight specific words/phrases
- **Bilingual Export** - Export transcripts in original and translated languages
- **Export Options** - TXT, PDF, DOCX, SRT subtitle formats
- **AI Summarization** - Automatic meeting summaries with key points
- **Action Items** - Smart extraction with priority levels and deadlines
- **Key Topics** - Automatic topic identification
- **Sentiment Analysis** - Meeting tone detection (positive/neutral/negative)

### Smart Action Items
- **Priority Levels** - High, Medium, Low with color coding
- **Deadline Management** - Set due dates with overdue tracking
- **Progress Tracking** - Visual progress bars and statistics
- **Inline Editing** - Edit items without page reload
- **Real-time Notifications** - Toast alerts for action item changes
- **Change Tracking** - Track modifications and updates
- **Filter Views** - All, Pending, Completed status filters

### Document Processing
- **Multiple Formats** - Audio (MP3, WAV, M4A), PDF, Word, PowerPoint support
- **Markdown Analysis** - Structured document analysis with sections
- **Batch Processing** - Multiple file uploads with progress tracking
- **Translation** - Multi-language support with DeepL integration
- **Translation Cache** - Cached translations for faster access

### Social Features
- **Friends System** - Send/accept friend requests
- **Presence Tracking** - Online/offline/away status with heartbeat
- **Note Sharing** - Share notes with collaborators (viewer/editor roles)
- **User Profiles** - Customizable display names and avatars

### Calendar Integration
- **Calendar Events** - Manage scheduled meetings
- **Meeting Reminders** - 15min, 1hour, 1day reminder support
- **Scheduling** - Set meeting start and end times

---

## Tech Stack

### Frontend & Framework
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | App Router with Server Components |
| **React 18** | UI with TypeScript |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | State management |

### Backend & Services
| Service | Purpose |
|---------|---------|
| **Supabase** | Auth, PostgreSQL, Storage, Real-time subscriptions |
| **AssemblyAI** | Speech-to-text, real-time transcription, speaker diarization |
| **Google Gemini** | AI analysis, summarization, action item extraction |
| **Pusher** | WebRTC signaling, real-time events |
| **DeepL** | Translation API (optional) |

### Real-time Communication
| Technology | Purpose |
|------------|---------|
| **WebRTC** | Peer-to-peer audio/video |
| **simple-peer** | WebRTC wrapper library |
| **Web Audio API** | Audio stream mixing |
| **Canvas API** | Video composition |
| **MediaRecorder** | Recording streams |

### Key Libraries
| Library | Purpose |
|---------|---------|
| **jspdf** | PDF export |
| **docx** | Word document export |
| **react-dropzone** | File upload UI |
| **lucide-react** | Icon library |
| **date-fns** | Date formatting |

## Project Structure

```
MinuteAI-Web/
├── app/                          # Next.js App Router
│   ├── api/                     # API routes
│   │   ├── transcribe/         # Audio transcription
│   │   ├── transcription/      # Real-time transcription
│   │   ├── analyze/            # AI analysis
│   │   ├── meetings/           # Meeting management
│   │   └── translate/          # Translation services
│   ├── dashboard/              # User dashboard
│   ├── meeting/[roomId]/       # Live meeting room
│   ├── notes/[id]/             # Note viewer with transcripts
│   ├── login/                  # Authentication pages
│   └── signup/
├── components/                  # React components
│   ├── auth/                   # Auth components
│   ├── meeting/                # Meeting-specific components
│   │   ├── AudioCall.tsx       # Audio visualization
│   │   ├── VideoDisplay.tsx    # Video rendering
│   │   ├── Controls.tsx        # Meeting controls
│   │   ├── TranscriptViewer.tsx # Interactive transcript
│   │   ├── ActionItemsList.tsx  # Action items manager
│   │   └── RecordingCountdown.tsx
│   └── ui/                     # Reusable UI components
├── hooks/                       # Custom React hooks
│   ├── useWebRTC.ts            # WebRTC connection management
│   ├── useTranscription.ts     # Real-time transcription
│   ├── useCompositeRecorder.ts # Audio/video recording
│   ├── useActionItems.ts       # Action items CRUD
│   ├── useTranscriptSync.ts    # Audio-transcript sync
│   └── useTranscriptSearch.ts  # Search functionality
├── lib/                         # Library configurations
│   ├── supabase/               # Supabase client & helpers
│   ├── assemblyai/             # AssemblyAI integration
│   ├── gemini/                 # Google Gemini AI
│   └── webrtc/                 # WebRTC utilities
│       ├── peer.ts             # Peer connection manager
│       ├── signaling.ts        # Pusher signaling
│       └── config.ts           # WebRTC configuration
├── utils/                       # Utility functions
│   ├── transcriptExporter.ts   # Export TXT/PDF/DOCX/SRT
│   ├── timeFormatter.ts        # Time formatting
│   └── helpers.ts              # General utilities
├── types/                       # TypeScript definitions
│   ├── index.ts                # Core types
│   └── supabase.ts             # Database types
├── supabase/                    # Database & migrations
│   ├── schema.sql              # Main schema
│   └── migrations/             # Database migrations
└── public/                      # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- AssemblyAI API key
- Google Gemini API key

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd MinuteAI-Web
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Copy `env.template` to `.env.local`:

   ```bash
   cp env.template .env.local
   ```

   Fill in your API keys and configuration:

   - **Supabase**: Get URL and Anon Key from Supabase Dashboard → Project Settings → API
   - **AssemblyAI**: Get API key from [AssemblyAI Dashboard](https://www.assemblyai.com/dashboard)
   - **Google Gemini**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `env.template` for all required environment variables:

### Supabase (Required)

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

### AI Services (Required)

- `ASSEMBLYAI_API_KEY` - Speech-to-Text transcription
- `GOOGLE_GEMINI_API_KEY` - AI summarization and analysis

### Real-time Services (Required for Meetings)

- `NEXT_PUBLIC_PUSHER_APP_KEY` - Pusher app key for WebRTC signaling
- `NEXT_PUBLIC_PUSHER_CLUSTER` - Pusher cluster (e.g., 'us2')
- `PUSHER_APP_ID` - Pusher app ID (server-side)
- `PUSHER_SECRET` - Pusher secret key (server-side)

### Translation (Optional)

- `DEEPL_API_KEY` - DeepL translation API key

## Supabase Setup

### Database Setup

1. Create a new Supabase project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Run the base schema: `supabase/schema.sql` in SQL Editor
3. Run migrations from `supabase/migrations/` folder in chronological order
4. Copy Project URL and Anon Key from Project Settings → API

See `DATABASE_SCHEMA.md` for complete schema documentation (14 tables, RLS policies, functions).

### Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `audio-files` | Public | Uploaded audio/documents |
| `meeting-audio` | Public | Meeting recordings |
| `meeting-recordings` | Private | Video recordings (500MB limit) |
| `avatars` | Public | User profile pictures |

### Authentication

1. Enable Email/Password authentication
2. Optional: Enable Google OAuth for social login
3. Disable email confirmation for development (recommended)

### Row Level Security (RLS)

All tables use RLS policies:
- Users access their own data only
- Meeting participants share meeting data
- Collaborators access shared notes
- Friends see each other's presence

## Features Status

### ✅ Implemented & Production Ready

#### Authentication & User Management
- ✅ Email/Password authentication
- ✅ Google OAuth social login
- ✅ User profiles with avatars
- ✅ Protected routes with middleware
- ✅ Session management
- ✅ Revamped signup with branding and benefits

#### Live Meetings
- ✅ WebRTC peer-to-peer video calls
- ✅ Multi-participant mesh network (2+ users)
- ✅ Audio/Video toggle controls
- ✅ Real-time transcription during calls
- ✅ Composite audio + video recording
- ✅ Recording notifications (visible to all participants)
- ✅ Participant join/leave notifications
- ✅ Meeting room management with codes
- ✅ Meeting summary saving
- ✅ Meeting reactivation for recently ended meetings

#### Transcription & Documents
- ✅ Audio file upload with drag-and-drop
- ✅ Speech-to-text with AssemblyAI
- ✅ Interactive transcript viewer with timestamps
- ✅ Click-to-seek audio synchronization
- ✅ Full-text search with highlighting
- ✅ Export to TXT, PDF, DOCX, SRT formats
- ✅ Bilingual export support
- ✅ Multi-format document upload (PDF, DOCX, PPTX)
- ✅ Markdown document analysis

#### AI Analysis
- ✅ AI-powered meeting summaries
- ✅ Automatic action item extraction
- ✅ Key topic identification
- ✅ Sentiment analysis
- ✅ Real-time translation support with caching

#### Action Items Management
- ✅ Priority levels (High/Medium/Low)
- ✅ Deadline tracking with overdue alerts
- ✅ Mark complete/incomplete
- ✅ Inline editing (add/edit/delete)
- ✅ Filter by status (All/Pending/Completed)
- ✅ Progress tracking & statistics
- ✅ Overdue item highlighting
- ✅ Real-time notifications with toast alerts
- ✅ Change tracking for modifications

#### Social & Collaboration
- ✅ Friends system (send/accept requests)
- ✅ Friend notifications
- ✅ User presence (online/offline/away)
- ✅ Heartbeat-based presence tracking
- ✅ Note sharing with collaborators
- ✅ Viewer/Editor role permissions

#### User Experience
- ✅ Responsive mobile-first design
- ✅ Dark mode support
- ✅ Real-time updates via Supabase Realtime
- ✅ Optimistic UI updates
- ✅ Loading states and skeletons
- ✅ Error handling with toast notifications
- ✅ Custom Logo component with branding

### 🚧 Future Enhancements
- [ ] Screen sharing during meetings
- [ ] 10+ participant support (SFU architecture)
- [ ] Email notifications for reminders
- [ ] Speaker diarization improvements
- [ ] Custom AI model selection
- [ ] Export to calendar (ICS)
- [ ] Keyboard shortcuts
- [ ] Meeting templates
- [ ] Mobile app (Expo React Native)

## Development Commands

```bash
npm run dev         # Start development server at localhost:3000
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
npm run test:config # Test API configurations (scripts/test-apis.js)
```

## Quick Start Guide

### For Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp env.template .env.local
   # Edit .env.local with your API keys
   ```

3. **Setup Supabase database**

   - Run `supabase/schema.sql` in Supabase SQL Editor
   - Run migrations from `supabase/migrations/`
   - Create storage buckets (audio-files, meeting-audio, avatars)

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Test the setup**
   ```bash
   npm run test:config
   ```

### For Testing Live Meetings

1. **Create an account** at `/signup`
2. **Start a meeting** from dashboard
3. **Share room ID** with another participant
4. **Join meeting** at `/meeting/[roomId]`

### For Testing Transcription

1. **Upload audio file** on dashboard
2. **Wait for processing** (AssemblyAI)
3. **View transcript** - Click on note to see results
4. **Search & Export** - Use search and export buttons

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│   React UI  │   WebRTC    │  Recorder   │ Transcribe  │  State  │
│  Components │   Hooks     │   Hooks     │   Hooks     │  Zustand│
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       ▼             ▼             ▼             ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                           │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  /meetings  │ /transcribe │  /analyze   │ /translate  │ /pusher │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       ▼             ▼             ▼             ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐
│  Supabase │ │ AssemblyAI│ │  Gemini   │ │   DeepL   │ │ Pusher  │
│  (DB/Auth)│ │  (S2T)    │ │   (AI)    │ │  (Trans)  │ │(Signal) │
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └─────────┘
```

### WebRTC Implementation

```
User A                    Pusher                    User B
  │                         │                         │
  │──── sendOffer ─────────►│                         │
  │                         │──── receiveOffer ──────►│
  │                         │                         │
  │                         │◄──── sendAnswer ────────│
  │◄─── receiveAnswer ──────│                         │
  │                         │                         │
  │◄───── ICE Candidates exchanged ─────────────────►│
  │                         │                         │
  │◄═══════════ Direct P2P Connection ═════════════►│
```

- **Peer Connection**: Direct browser-to-browser using simple-peer
- **Signaling**: Pusher channels for offer/answer/ICE candidate exchange
- **Mesh Network**: Each participant connects to all others (N×(N-1)/2 connections)
- **ICE Candidate Buffering**: Handles candidates arriving before peer connection ready
- **Data Channel**: Syncs mute state, recording state across participants

### Real-time Transcription

- **AssemblyAI Streaming API**: WebSocket connection for live transcription
- **Temporary tokens**: Browser-safe tokens with 10-minute expiry
- **Speaker detection**: Identifies different speakers in real-time
- **Auto-save**: Transcripts saved to database periodically

### Recording System

- **Composite Recording**: Combines local + remote audio/video into single stream
- **Canvas API**: Video composition with side-by-side layout
- **Web Audio API**: Mixes multiple audio streams with AudioContext
- **MediaRecorder**: Records composite stream as WebM (VP9 + Opus)
- **Storage**: Uploads to Supabase Storage (500MB limit per recording)

### TypeScript Types

Comprehensive types in `types/`:
- `Database` - Auto-generated Supabase schema types
- `ActionItem` - Priority, deadline, completion status
- `TranscriptSegment` - Timestamped text with speaker
- `Meeting` - Room, participants, status, recording
- `UserProfile` - Display name, avatar, presence

### Performance Optimizations

| Technique | Purpose |
|-----------|---------|
| `React.memo` | Prevent re-renders of transcript segments |
| Debounced search | Reduce search operations during typing |
| Optimistic UI | Immediate feedback before server response |
| Lazy loading | Load components on demand |
| `requestAnimationFrame` | Smooth canvas video composition |
| ICE candidate buffering | Reliable WebRTC connection establishment |

## Browser Compatibility

### Recommended Browsers

- ✅ Chrome/Edge 90+ (Best performance)
- ✅ Firefox 88+
- ✅ Safari 15+ (macOS/iOS)
- ⚠️ Opera 76+

### Required Browser Features

- WebRTC (for video meetings)
- MediaRecorder API (for recording)
- Web Audio API (for audio mixing)
- WebSocket (for real-time transcription)
- IndexedDB (for offline caching)

### Mobile Support

- ✅ iOS Safari 15+ (iPhone/iPad)
- ✅ Chrome Mobile (Android)
- ⚠️ Limited video on older devices

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables for Production

Ensure these are set in your deployment platform:

- All API keys from .env.local
- Database connection strings
- Storage bucket URLs

### Post-Deployment Checklist

- [ ] Run database migrations on production Supabase
- [ ] Create storage buckets
- [ ] Configure CORS for storage
- [ ] Test authentication flow
- [ ] Test file upload
- [ ] Test WebRTC connections
- [ ] Verify API rate limits

## Documentation

### Additional Guides

| Document | Description |
|----------|-------------|
| `DATABASE_SCHEMA.md` | Complete database schema with RLS policies |
| `CLAUDE.md` | AI assistant context and coding guidelines |

## Troubleshooting

### Common Issues

**"Connection failed" in meetings**

- Check firewall/network settings
- Verify Pusher credentials
- Test on different network

**"Recording failed"**

- Grant microphone/camera permissions
- Check browser compatibility
- Verify storage bucket permissions

**"Transcription not working"**

- Verify AssemblyAI API key
- Check audio file format (WAV, MP3, M4A supported)
- Ensure file size < 100MB

**Build errors**

- Clear `.next` folder: `rm -rf .next`
- Delete node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run build`

## Performance Metrics

### Tested Limits

- ✅ Meetings: 2 participants (WebRTC peer-to-peer)
- ✅ Recording: Up to 2 hours continuous
- ✅ Transcripts: 10,000+ words
- ✅ Action Items: 100+ items per note
- ✅ File Upload: Up to 100MB

### Response Times (Average)

- Page Load: < 2s
- Transcript Search: < 50ms
- Export PDF: 1-3s (50 pages)
- Real-time Transcription: < 500ms delay

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Add comments for complex logic
- Test on multiple browsers
- Update documentation
- Run linter before committing

## Acknowledgments

| Service | Contribution |
|---------|--------------|
| **AssemblyAI** | Speech-to-Text, real-time transcription |
| **Google Gemini** | AI analysis, summarization |
| **Supabase** | Database, auth, storage, real-time |
| **Pusher** | WebRTC signaling |
| **Vercel** | Hosting and deployment |

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

**Built for better meetings and productivity**
