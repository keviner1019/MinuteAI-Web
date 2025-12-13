# MinuteAI - Project Presentation Script

---

## 1. Introduction & The Problem (1 minute)

"Hi, I'm [Your Name], and today I'll present MinuteAI - a real-time meeting platform with AI-powered transcription and analysis.

**The Problem I Wanted to Solve:**

We've all been in meetings where we're so focused on taking notes that we miss important discussions. Or worse - we leave a meeting and realize no one captured the action items. Studies show that people forget 50% of meeting content within an hour.

I asked myself: *What if meetings could document themselves?*

**My Solution:**

MinuteAI automatically transcribes conversations in real-time, identifies who said what, and uses AI to extract summaries, action items, and key topics - so participants can focus on the conversation, not their notepads."

---

## 2. Why I Built This (45 seconds)

"I chose this project for three reasons:

1. **Real-World Impact** - It solves a genuine productivity problem that affects millions of remote workers daily.

2. **Technical Challenge** - It required me to master complex technologies: WebRTC for video, streaming APIs for live transcription, and AI integration for intelligent analysis.

3. **Full-Stack Depth** - It touches every layer: real-time frontend, API design, database modeling, file storage, and third-party integrations.

This wasn't just a tutorial project - it was built to production standards with real users in mind."

---

## 3. Core Features Overview (1 minute)

| Feature | Description |
|---------|-------------|
| **Live Video Meetings** | Peer-to-peer video calls, no server relay needed |
| **Real-time Transcription** | Words appear as you speak, with speaker labels |
| **AI Summarization** | One-click meeting summary generation |
| **Action Item Extraction** | AI identifies tasks with priority and deadlines |
| **File Upload & Processing** | Support for audio, PDF, DOCX, PPTX |
| **Multi-format Export** | Download as TXT, PDF, DOCX, or SRT subtitles |

"Users can either join a live meeting OR upload a recording - both paths lead to the same AI-powered analysis."

---

## 4. Technical Architecture (1.5 minutes)

**Tech Stack:**

```
Frontend:    Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend:     Next.js API Routes + Supabase (PostgreSQL + Auth + Storage)
Real-time:   Pusher (WebRTC signaling) + AssemblyAI (streaming transcription)
AI:          Google Gemini (summarization + analysis)
```

**Architecture Diagram (verbal):**

```
User A  <--WebRTC-->  User B
   |                    |
   +-----> Pusher <-----+  (signaling only)
   |
   +--> AssemblyAI WebSocket (live transcription)
   |
   +--> Supabase (auth, database, file storage)
   |
   +--> Gemini API (AI analysis)
```

**Why These Choices:**

- **Next.js 14**: App Router provides excellent SSR, API routes eliminate need for separate backend
- **Supabase**: Provides auth, database, storage, and real-time subscriptions in one platform
- **WebRTC (peer-to-peer)**: Reduces server costs, lower latency than relay-based solutions
- **AssemblyAI**: Best-in-class accuracy with speaker diarization support

---

## 5. Technical Deep Dive: Key Challenges (2 minutes)

### Challenge 1: WebRTC Connection Reliability

**Problem:** WebRTC connections fail when users are behind strict firewalls or symmetric NATs.

**Solution:**
- Implemented ICE candidate gathering with multiple STUN servers
- Added TURN server fallback for firewall-blocked connections
- Built connection state monitoring with automatic reconnection

**Code insight:** `hooks/useWebRTC.ts` manages the entire peer connection lifecycle.

---

### Challenge 2: Live Transcription Token Management

**Problem:** AssemblyAI tokens expire after 10 minutes, but meetings can last hours.

**Solution:**
- Built a token refresh mechanism that requests new tokens before expiry
- Implemented graceful WebSocket reconnection without losing transcript context
- Added local buffering to prevent data loss during reconnection

---

### Challenge 3: Composite Recording

**Problem:** Need to record both local and remote participants into a single file.

**Solution:**
- Used **Canvas API** to composite multiple video streams into one
- Used **Web Audio API** (AudioContext + MediaStreamDestination) to mix audio tracks
- Combined into single MediaRecorder for WebM output

**This was the most complex feature** - required understanding browser media APIs deeply.

---

### Challenge 4: Real-time State Synchronization

**Problem:** When User A mutes, User B needs to know immediately.

**Solution:**
- Used WebRTC **Data Channels** for low-latency state sync
- States synced: mute status, recording status, participant names
- Fallback to Pusher if data channel fails

---

## 6. What I Learned (1.5 minutes)

### Technical Skills:

1. **WebRTC Protocol** - Understood the full lifecycle: ICE gathering, STUN/TURN servers, offer/answer exchange, data channels

2. **Streaming Architecture** - Learned to work with WebSocket connections, handle reconnection gracefully, and buffer real-time data

3. **AI Integration** - Prompt engineering for consistent JSON outputs, handling API rate limits, chunking large texts

4. **Database Design** - Designed normalized schema for meetings, transcripts, action items with proper relationships

### Soft Skills:

1. **Problem Decomposition** - Breaking complex features (like composite recording) into smaller, testable pieces

2. **Debugging Distributed Systems** - Learned to trace issues across client, signaling server, and peer connections

3. **Documentation** - Maintained clear code structure and docs for future maintainability

### What I Would Do Differently:

- Start with **TypeScript strict mode** from day one (had to fix many type issues later)
- Add **end-to-end tests** earlier, especially for WebRTC flows
- Consider **WebSocket** over Pusher for more control over signaling

---

## 7. Future Improvements (30 seconds)

"If I continue developing this, I would add:

1. **End-to-end encryption** for sensitive meeting content
2. **Mobile app** using React Native (already planned architecture in `/mobile-specs`)
3. **Team workspaces** with shared meeting history
4. **Calendar integration** (Google Calendar, Outlook)
5. **Custom AI prompts** for industry-specific summaries"

---

## 8. Live Demo Flow (if applicable)

1. Show dashboard with existing notes
2. Create new meeting room → copy invite link
3. Join meeting, enable camera/mic
4. Start recording → show live transcription appearing
5. Stop recording → trigger AI summarization
6. Show generated summary and action items
7. Export transcript to PDF
8. Show uploaded audio file processing flow

---

## 9. Closing Statement (30 seconds)

"MinuteAI represents my ability to:

- **Identify real problems** and design solutions
- **Master complex technologies** like WebRTC and streaming APIs
- **Integrate multiple services** into a cohesive product
- **Build production-ready code** with proper architecture

I'm excited to bring this same problem-solving mindset to your team. Happy to dive deeper into any technical aspect or answer questions."

---

## 10. Anticipated Interview Questions

### About the Project:

**Q: Why did you choose this project?**
> "I wanted to build something that solves a real problem I've experienced. Meeting fatigue is real, and manual note-taking is inefficient. Plus, it let me work with technologies I was curious about - WebRTC and AI APIs."

**Q: What was the hardest part?**
> "Composite recording. Merging multiple video streams required understanding Canvas API and Web Audio API at a deep level. I spent a week just on this feature, reading browser documentation and experimenting."

**Q: How long did this take?**
> "The core functionality took about [X weeks/months]. I'm still iterating on improvements based on testing."

---

### Technical Questions:

**Q: Why WebRTC instead of a service like Twilio/Agora?**
> "I wanted to understand the underlying technology, not just use an abstraction. Also, peer-to-peer is more cost-effective at scale since there's no media relay server."

**Q: How do you handle security?**
> "Supabase Row-Level Security policies ensure users only access their own data. API routes verify authentication. Sensitive operations use temporary tokens with short expiry."

**Q: What happens if the transcription API fails mid-meeting?**
> "I implemented automatic reconnection with exponential backoff. Transcripts are saved to the database in segments, so partial progress is never lost."

**Q: How would you scale this to 1000 concurrent meetings?**
> "The peer-to-peer architecture means video doesn't go through my servers. For signaling, Pusher handles the scale. Database-wise, Supabase can scale horizontally. The bottleneck would be AI API rate limits - I'd implement queuing."

---

### Behavioral Questions:

**Q: Describe a bug that was difficult to solve.**
> "WebRTC connections were failing randomly. After hours of debugging, I discovered it was ICE candidate race conditions - candidates were being sent before the peer connection was ready. I fixed it by queuing candidates and flushing them after connection setup."

**Q: How do you approach learning new technologies?**
> "I read official documentation first, then build a minimal prototype. For WebRTC, I started with a simple 1-to-1 call before adding features. I keep notes on what I learn for future reference."

**Q: What would you do if requirements changed mid-project?**
> "This happened! Originally it was just transcription, then I added action items extraction. My modular architecture made it easy - I added a new hook (`useActionItems.ts`) and component without touching existing code."

---

## Quick Stats to Mention

- **Lines of Code:** ~[X]k lines of TypeScript
- **API Routes:** 10+ endpoints
- **Database Tables:** 6 main tables with migrations
- **Third-party Integrations:** 4 (Supabase, AssemblyAI, Gemini, Pusher)
- **Export Formats:** 4 (TXT, PDF, DOCX, SRT)
