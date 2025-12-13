# MinuteAI - AI-Powered Meeting & Transcription Platform

A comprehensive web application for real-time video meetings, audio transcription, and AI-powered analysis. Upload audio files or conduct live meetings with automatic transcription, action item extraction, and intelligent summaries.

## ✨ Key Features

### 🎥 Live Meetings

- **WebRTC Peer-to-Peer Video Calls** - Direct audio/video connections
- **Real-time Transcription** - Live speech-to-text during meetings
- **Video Toggle** - Enable/disable camera for face capture (640x480)
- **Composite Recording** - Records both audio and video streams
- **Recording Notifications** - Both participants see recording status
- **Participant Management** - Real-time join/leave notifications

### 📝 Transcription & Analysis

- **Interactive Transcript Viewer** - Click timestamps to jump in audio
- **Full-Text Search** - Find and highlight specific words/phrases
- **Export Options** - TXT, PDF, DOCX, SRT subtitle formats
- **AI Summarization** - Automatic meeting summaries
- **Action Items** - Smart extraction with priority levels
- **Key Topics** - Automatic topic identification

### ✅ Smart Action Items

- **Priority Levels** - High, Medium, Low with color coding
- **Deadline Management** - Set due dates with overdue tracking
- **Progress Tracking** - Visual progress bars and statistics
- **Inline Editing** - Edit items without page reload
- **Filter Views** - All, Pending, Completed status filters

### 📄 Document Processing

- **Multiple Formats** - Audio, PDF, Word, PowerPoint support
- **Markdown Analysis** - Structured document analysis
- **Batch Processing** - Multiple file uploads
- **Translation Cache** - Multi-language support

## Tech Stack

### Frontend & Framework

- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **WebRTC** for peer-to-peer connections

### Backend & Services

- **Supabase** (Authentication, PostgreSQL, Storage, Real-time)
- **AssemblyAI** (Speech-to-Text, Real-time Transcription)
- **Google Gemini** (AI Analysis, Summarization)
- **Pusher** (Real-time signaling for WebRTC)

### Key Libraries

- **simple-peer** - WebRTC wrapper
- **jspdf** & **docx** - Document export
- **react-dropzone** - File uploads
- **lucide-react** - Icons

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
3. Run migrations from `supabase/migrations/` folder in order:
   - `20251110_add_enhanced_features.sql` - Action items & transcript segments
   - `20251114_storage_policies_simplified.sql` - Recording storage setup
4. Copy Project URL and Anon Key from Project Settings → API

### Storage Buckets

Create these storage buckets in Supabase Storage:

1. **audio-files** - For uploaded audio/documents (Public)
2. **meeting-audio** - For meeting recordings (Public)
3. **avatars** - For user profile pictures (Public)

### Authentication

1. Enable Email/Password authentication
2. Disable email confirmation for development
3. Optional: Enable Google OAuth for social login

### Row Level Security (RLS)

The schema includes RLS policies for:

- User can only access their own data
- Meeting participants can access shared meeting data
- Secure storage access with authentication

See `STORAGE_SETUP_MANUAL.md` for detailed storage configuration.

## Features Status

### ✅ Implemented & Production Ready

#### Authentication & User Management

- ✅ Email/Password authentication
- ✅ User profiles with avatars
- ✅ Protected routes
- ✅ Session management

#### Live Meetings

- ✅ WebRTC peer-to-peer video calls
- ✅ Audio/Video toggle controls
- ✅ Real-time transcription during calls
- ✅ Composite audio + video recording
- ✅ Recording notifications (visible to all participants)
- ✅ Participant join/leave notifications
- ✅ Meeting room management

#### Transcription & Documents

- ✅ Audio file upload with drag-and-drop
- ✅ Speech-to-text with AssemblyAI
- ✅ Interactive transcript viewer with timestamps
- ✅ Click-to-seek audio synchronization
- ✅ Full-text search with highlighting
- ✅ Export to TXT, PDF, DOCX, SRT formats
- ✅ Multi-format document upload (PDF, DOCX, PPTX)
- ✅ Markdown document analysis

#### AI Analysis

- ✅ AI-powered meeting summaries
- ✅ Automatic action item extraction
- ✅ Key topic identification
- ✅ Sentiment analysis
- ✅ Real-time translation support

#### Action Items Management

- ✅ Priority levels (High/Medium/Low)
- ✅ Deadline tracking with overdue alerts
- ✅ Mark complete/incomplete
- ✅ Inline editing (add/edit/delete)
- ✅ Filter by status (All/Pending/Completed)
- ✅ Progress tracking & statistics
- ✅ Overdue item highlighting

#### User Experience

- ✅ Responsive mobile-first design
- ✅ Dark mode support
- ✅ Real-time updates
- ✅ Optimistic UI
- ✅ Loading states
- ✅ Error handling

### 🚧 Future Enhancements

- [ ] Screen sharing during meetings
- [ ] Meeting recording with video (currently audio only)
- [ ] Multiple participants (3+ people)
- [ ] Calendar integration
- [ ] Email notifications
- [ ] Speaker diarization improvements
- [ ] Custom AI models
- [ ] Export to calendar (ICS)
- [ ] Keyboard shortcuts
- [ ] Meeting templates

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

## Architecture & Technical Details

### WebRTC Implementation

- **Peer Connection**: Direct browser-to-browser using simple-peer
- **Signaling**: Pusher for WebRTC offer/answer/ICE candidate exchange
- **Audio/Video Streams**: Separate tracks for flexibility
- **Data Channel**: Used for mute state, recording state sync
- **Perfect Negotiation**: Handles connection establishment gracefully

### Real-time Transcription

- **AssemblyAI Streaming API**: WebSocket connection for live transcription
- **Temporary tokens**: Browser-safe tokens with 10-minute expiry
- **Speaker detection**: Identifies different speakers in real-time
- **Auto-save**: Transcripts saved to database every few seconds

### Recording System

- **Composite Recording**: Combines local + remote audio/video
- **Canvas API**: Used for video composition
- **Web Audio API**: Mixes multiple audio streams
- **Storage**: Uploads to Supabase Storage as WebM files
- **Database**: Metadata stored in meeting_audio table

### TypeScript Types

Comprehensive types in `types/`:

- `Database` - Supabase schema types
- `ActionItem` - Action item with priority/deadline
- `TranscriptSegment` - Timestamped transcript chunk
- `Meeting` - Meeting metadata
- `UserProfile` - User information

### Performance Optimizations

- React.memo for transcript segments
- Debounced search input
- Optimistic UI updates
- Lazy loading of components
- Efficient WebRTC track management
- Canvas animation using requestAnimationFrame

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

- `DATABASE_SETUP.md` - Database schema documentation
- `STORAGE_SETUP_MANUAL.md` - Storage bucket configuration
- `TESTING_VIDEO_RECORDING.md` - Video features testing guide
- `IMPLEMENTATION_COMPLETE.md` - Feature implementation details
- `VERCEL_DEPLOYMENT_GUIDE.md` - Deployment instructions

### API Documentation

- `API_QUICK_REFERENCE.md` - API endpoints reference
- `MOBILE_API_DOCUMENTATION.md` - Mobile API specifics

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

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Acknowledgments

- **AssemblyAI** - Speech-to-Text API
- **Google Gemini** - AI Analysis
- **Supabase** - Backend infrastructure
- **Pusher** - Real-time signaling
- **Vercel** - Hosting platform

## Support & Contact

- 📧 Email: support@minuteai.com
- 🐛 Issues: [GitHub Issues](https://github.com/keviner1019/MinuteAI-Web/issues)
- 📖 Docs: See documentation folder

---

**Built with ❤️ for better meetings and productivity**
