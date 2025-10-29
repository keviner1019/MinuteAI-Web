# MinuteAI - AI-Powered Audio Transcription & Summarization

A web application that allows users to upload audio files, which are then processed by AI to generate summaries, action items, key topics, and full transcripts.

## Tech Stack

### Frontend & Framework
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS** for styling

### Backend & Services
- **Supabase** (Authentication, PostgreSQL Database, File Storage)
- **AssemblyAI** (Speech-to-Text & Speaker Diarization)
- **Google Gemini** (AI Summarization, Action Items, Topic Extraction)

### UI Components & Libraries
- **lucide-react** (Icons)
- **react-dropzone** (File Upload)

## Project Structure

```
MinuteAI-Web/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── auth/             # Authentication components
│   └── ui/               # UI components
├── lib/                   # Library configurations
│   ├── supabase/         # Supabase config
│   │   ├── config.ts     # Client-side config
│   │   ├── storage.ts    # Storage helper functions
│   │   └── database.ts   # Database helper functions
│   ├── assemblyai/       # AssemblyAI config
│   └── gemini/           # Google Gemini config
├── types/                 # TypeScript type definitions
│   └── index.ts          # Main types
├── public/               # Static assets
└── env.template          # Environment variables template
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

See `env.template` for all required environment variables. Key variables include:

### Supabase (Required)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

### AI Services (Required)
- `ASSEMBLYAI_API_KEY` - Speech-to-Text transcription
- `GOOGLE_GEMINI_API_KEY` - AI summarization and analysis

## Supabase Setup

1. Create a new Supabase project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Run the database schema from `supabase/schema.sql` in the SQL Editor
3. Create a storage bucket named `audio-files` (make it public for simplicity)
4. Enable Email authentication and **disable email confirmation** for development
5. Copy your Project URL and Anon Key from Project Settings → API

See `SUPABASE_MIGRATION_GUIDE.md` for detailed setup instructions.

## Features (Planned)

- 🔐 User authentication (Email/Password & Google OAuth)
- 📁 Audio file upload with drag-and-drop
- 🎙️ Speech-to-text transcription with speaker diarization
- 🤖 AI-powered summarization
- ✅ Automatic action item extraction
- 🏷️ Key topic identification
- 💾 Save and manage transcriptions
- 📱 Responsive design

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## TypeScript Types

All TypeScript types are defined in `types/index.ts`, including:
- User
- AudioFile
- Transcription
- Analysis
- ActionItem
- ProcessingJob

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@minuteai.com or open an issue in the repository.

