# 📱 MinuteAI - Expo React Native Mobile App Development Plan

## 📋 Executive Summary

This comprehensive development plan outlines the strategy for building a **cross-platform mobile application** (iOS & Android) for MinuteAI using Expo and React Native. The mobile app will maintain **100% design consistency** with the web version while providing native mobile experiences and leveraging the existing backend APIs.

**Status**: Planning Phase
**Target Timeline**: 8-12 weeks
**Platform**: iOS & Android (using Expo)
**Design**: Light mode minimalist (matching web version)

---

## 🎯 Project Objectives

### Primary Goals

1. ✅ **Cross-Platform**: Single codebase for iOS and Android
2. ✅ **Design Consistency**: Match web app's light, minimalist UI exactly
3. ✅ **API Reusability**: Use existing Next.js API routes (post-deployment)
4. ✅ **Native Experience**: Leverage device capabilities (mic, camera, notifications)
5. ✅ **Performance**: Fast, responsive, native-like performance
6. ✅ **Offline Support**: Cache data and sync when online

### Success Metrics

- App loads in < 2 seconds
- 60 FPS animations
- <50MB app size
- 4.5+ star rating on stores
- 95%+ crash-free sessions

---

## 🏗️ Technical Architecture

### Tech Stack

#### Core Framework
```
├── Expo SDK 51+ (Latest stable)
├── React Native 0.74+
├── TypeScript (Strict mode)
└── Expo Router (File-based navigation)
```

#### State Management
```
├── Zustand (Global state - same as web)
├── React Query / TanStack Query (Server state)
├── AsyncStorage (Local persistence)
└── Context API (Theme, Auth)
```

#### UI & Styling
```
├── NativeWind (Tailwind CSS for React Native)
├── React Native Reanimated 3 (Animations)
├── React Native Gesture Handler (Touch interactions)
├── Expo Linear Gradient (Minimal use, hero sections only)
└── React Native SVG (Icons)
```

#### Backend & APIs
```
├── Axios (HTTP client)
├── WebSocket (Real-time features)
├── Supabase JS Client (Auth, Database, Storage)
└── Next.js API Routes (via deployed web app)
```

#### Audio & Media
```
├── Expo AV (Audio playback)
├── Expo Audio (Recording)
├── Expo Document Picker (File selection)
├── Expo File System (Local file management)
└── Expo Media Library (Save to device)
```

#### Real-time Communication
```
├── Daily.co React Native SDK (Video/Audio meetings)
├── Pusher (Real-time events)
└── WebRTC (Peer-to-peer connections)
```

#### Developer Tools
```
├── ESLint + Prettier (Code quality)
├── Expo DevClient (Custom development builds)
├── EAS Build (Cloud builds)
├── EAS Update (OTA updates)
└── Expo Analytics (Usage tracking)
```

---

## 🎨 Design System (Matching Web)

### Color Palette (Exact Match)

```javascript
// theme/colors.ts
export const colors = {
  primary: {
    DEFAULT: '#3B82F6',    // Blue-500
    dark: '#2563EB',       // Blue-600
    light: '#DBEAFE',      // Blue-100
    extraLight: '#EFF6FF', // Blue-50
  },
  secondary: {
    DEFAULT: '#8B5CF6',    // Violet-500
    light: '#EDE9FE',      // Violet-100
  },
  success: '#10B981',      // Green-500
  warning: '#F59E0B',      // Amber-500
  error: '#EF4444',        // Red-500
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    400: '#9CA3AF',
    600: '#4B5563',
    900: '#111827',
  },
  white: '#FFFFFF',
  black: '#000000',
};
```

### Typography (Inter Font)

```javascript
// theme/typography.ts
export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  fontSize: {
    xs: 12,      // Small text, captions
    sm: 14,      // Body text
    base: 16,    // Subsections
    lg: 20,      // Card titles
    xl: 24,      // Section titles
    '2xl': 32,   // Page titles
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 40,
  },
};
```

### Spacing System (8px Grid)

```javascript
// theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};
```

### Border Radius

```javascript
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};
```

### Shadows (React Native)

```javascript
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
};
```

---

## 📐 Project Structure

```
minuteai-mobile/
├── app/                          # Expo Router (File-based routing)
│   ├── (auth)/                   # Auth routes group
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main tabs group
│   │   ├── index.tsx             # Dashboard
│   │   ├── meetings.tsx          # Meetings list
│   │   ├── notes.tsx             # Notes list
│   │   ├── profile.tsx           # Profile settings
│   │   └── _layout.tsx           # Tab navigator
│   ├── meeting/
│   │   ├── [roomId].tsx          # Live meeting room
│   │   └── [roomId]/summary.tsx  # Meeting summary
│   ├── note/
│   │   └── [id].tsx              # Note detail view
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx
│   │   └── AuthForm.tsx
│   ├── meeting/
│   │   ├── AudioCall.tsx
│   │   ├── VideoGrid.tsx
│   │   ├── Controls.tsx
│   │   ├── TranscriptPanel.tsx
│   │   └── ParticipantAvatar.tsx
│   ├── notes/
│   │   ├── NoteCard.tsx
│   │   ├── NotesList.tsx
│   │   ├── UploadButton.tsx
│   │   └── AudioPlayer.tsx
│   ├── ui/
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   ├── Input.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   └── Toast.tsx
│   └── shared/
│       ├── BottomSheet.tsx
│       ├── ActionSheet.tsx
│       └── SwipeableRow.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useNotes.ts
│   ├── useMeetings.ts
│   ├── useTranscription.ts
│   ├── useAudioRecorder.ts
│   ├── useWebRTC.ts
│   ├── useUserProfile.ts
│   └── useTheme.ts
├── services/
│   ├── api/
│   │   ├── client.ts             # Axios configuration
│   │   ├── auth.ts               # Auth endpoints
│   │   ├── notes.ts              # Notes endpoints
│   │   ├── meetings.ts           # Meetings endpoints
│   │   ├── transcription.ts      # Transcription endpoints
│   │   └── profile.ts            # Profile endpoints
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── storage.ts
│   │   └── database.ts
│   ├── audio/
│   │   ├── recorder.ts
│   │   ├── player.ts
│   │   └── analyzer.ts
│   └── notifications/
│       ├── push.ts
│       └── local.ts
├── store/
│   ├── authStore.ts              # Zustand auth store
│   ├── notesStore.ts             # Notes state
│   ├── meetingStore.ts           # Meeting state
│   └── settingsStore.ts          # App settings
├── constants/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   └── config.ts
├── utils/
│   ├── helpers.ts
│   ├── formatters.ts
│   ├── validators.ts
│   └── storage.ts
├── types/
│   ├── index.ts                  # Shared types (from web)
│   ├── navigation.ts
│   └── api.ts
├── assets/
│   ├── fonts/
│   ├── images/
│   └── icons/
├── app.json                      # Expo configuration
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── tailwind.config.js            # NativeWind config
├── eas.json                      # EAS Build config
├── package.json
└── README.md
```

---

## 🚀 Features Implementation Plan

### Phase 1: Foundation (Week 1-2)

#### 1.1 Project Setup
- [x] Initialize Expo project with TypeScript
- [x] Install and configure dependencies
- [x] Set up NativeWind (Tailwind CSS)
- [x] Configure Expo Router
- [x] Set up ESLint and Prettier
- [x] Configure environment variables

```bash
# Commands to run
npx create-expo-app minuteai-mobile --template
cd minuteai-mobile
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npm install nativewind tailwindcss
npm install zustand @tanstack/react-query axios
npm install @supabase/supabase-js
npm install @expo/vector-icons lucide-react-native
npm install react-native-reanimated react-native-gesture-handler
```

#### 1.2 Design System Setup
- [ ] Create theme configuration files
- [ ] Set up color constants (matching web)
- [ ] Configure Inter font family
- [ ] Create reusable UI components
- [ ] Set up NativeWind utilities
- [ ] Create component documentation

#### 1.3 Navigation Setup
- [ ] Configure Expo Router
- [ ] Set up authentication flow
- [ ] Create tab navigator
- [ ] Set up stack navigators
- [ ] Configure deep linking
- [ ] Add navigation guards

### Phase 2: Authentication (Week 2-3)

#### 2.1 UI Components
- [ ] Login screen (matching web design)
- [ ] Signup screen
- [ ] Password reset screen
- [ ] Social login buttons (Google, Apple)
- [ ] Form validation
- [ ] Loading states

#### 2.2 Backend Integration
- [ ] Supabase auth setup
- [ ] Email/password authentication
- [ ] OAuth integration (Google, Apple)
- [ ] Token storage (AsyncStorage)
- [ ] Auto-refresh tokens
- [ ] Logout functionality

#### 2.3 Auth State Management
- [ ] Create auth Zustand store
- [ ] Persist auth state
- [ ] Protected route wrapper
- [ ] Auth context provider
- [ ] Session management

### Phase 3: Core Features - Notes (Week 3-5)

#### 3.1 Dashboard Screen
- [ ] Welcome section
- [ ] Stats cards (notes count, meetings count)
- [ ] Recent notes list
- [ ] Tab navigation (Notes/Meetings)
- [ ] Pull-to-refresh
- [ ] Empty state

#### 3.2 Notes List
- [ ] Note cards (matching web design)
- [ ] Filter options
- [ ] Sort options
- [ ] Search functionality
- [ ] Swipe actions (delete, share)
- [ ] Pagination/infinite scroll

#### 3.3 Upload Audio
- [ ] Upload button (FAB)
- [ ] File picker (device files)
- [ ] Audio recording (native)
- [ ] File validation
- [ ] Upload progress indicator
- [ ] Background upload

#### 3.4 Note Detail View
- [ ] Note header with metadata
- [ ] Audio player with controls
- [ ] Tabs (Transcript, Summary, Actions, Topics)
- [ ] Transcript view with speaker labels
- [ ] Action items list (checkboxes)
- [ ] Key topics chips
- [ ] Share functionality
- [ ] Download transcript

#### 3.5 API Integration
- [ ] Upload audio to Supabase Storage
- [ ] Trigger transcription API
- [ ] Poll for processing status
- [ ] Fetch note details
- [ ] Update note (mark actions complete)
- [ ] Delete note

### Phase 4: Live Meetings (Week 5-7)

#### 4.1 Meeting List
- [ ] Upcoming meetings
- [ ] Past meetings
- [ ] Meeting cards
- [ ] Join meeting button
- [ ] Create meeting button
- [ ] Meeting code input

#### 4.2 Meeting Room UI
- [ ] Video grid layout
- [ ] Participant avatars with speaking animation
- [ ] Local video preview
- [ ] Control buttons (mic, camera, end)
- [ ] Participant list
- [ ] Real-time transcript panel
- [ ] Meeting timer

#### 4.3 WebRTC Integration
- [ ] Daily.co SDK integration
- [ ] Join/create room
- [ ] Audio/video streams
- [ ] Screen sharing (receive only on mobile)
- [ ] Participant events
- [ ] Network quality indicator

#### 4.4 Real-time Transcription
- [ ] Live transcript display
- [ ] Speaker diarization
- [ ] Auto-scroll transcript
- [ ] Save transcript
- [ ] Download transcript

#### 4.5 Meeting Summary
- [ ] Post-meeting summary screen
- [ ] Key points
- [ ] Action items
- [ ] Participants list
- [ ] Share summary
- [ ] Save to notes

### Phase 5: Profile & Settings (Week 7-8)

#### 5.1 Profile Screen
- [ ] Avatar upload (camera/gallery)
- [ ] Display name input
- [ ] Email (read-only)
- [ ] Account info section
- [ ] Save changes button
- [ ] Loading states

#### 5.2 Settings
- [ ] Notifications preferences
- [ ] Audio quality settings
- [ ] Storage management
- [ ] Clear cache
- [ ] About section
- [ ] Logout button

#### 5.3 Avatar Component
- [ ] Avatar display with fallback
- [ ] Speaking animation (green ring)
- [ ] Size variants (sm, md, lg, xl)
- [ ] Upload modal
- [ ] Image cropping
- [ ] Compression

### Phase 6: Polish & Optimization (Week 8-9)

#### 6.1 Animations
- [ ] Screen transitions
- [ ] Card hover/press effects
- [ ] Button press animations
- [ ] Loading animations
- [ ] Skeleton screens
- [ ] Success animations

#### 6.2 Offline Support
- [ ] Cache notes locally
- [ ] Cache user profile
- [ ] Queue uploads when offline
- [ ] Sync when online
- [ ] Offline indicator

#### 6.3 Performance
- [ ] Image optimization
- [ ] Lazy loading
- [ ] Memoization
- [ ] Virtual lists
- [ ] Bundle size optimization
- [ ] Reduce re-renders

#### 6.4 Accessibility
- [ ] Screen reader support
- [ ] Font scaling
- [ ] High contrast mode
- [ ] Touch target sizes (44px minimum)
- [ ] Focus indicators
- [ ] Semantic labels

#### 6.5 Error Handling
- [ ] Error boundaries
- [ ] Retry mechanisms
- [ ] User-friendly error messages
- [ ] Crash reporting (Sentry)
- [ ] Network error handling

### Phase 7: Testing & QA (Week 9-10)

#### 7.1 Testing Setup
- [ ] Unit tests (Jest)
- [ ] Component tests (React Native Testing Library)
- [ ] E2E tests (Detox)
- [ ] API mocking
- [ ] Test coverage (>80%)

#### 7.2 Manual Testing
- [ ] iOS testing (multiple devices)
- [ ] Android testing (multiple devices)
- [ ] Dark mode testing (future)
- [ ] Tablet testing
- [ ] Real device testing

#### 7.3 Beta Testing
- [ ] TestFlight setup (iOS)
- [ ] Internal testing track (Android)
- [ ] Beta user feedback
- [ ] Bug fixes
- [ ] Performance monitoring

### Phase 8: Deployment (Week 10-12)

#### 8.1 App Store Preparation
- [ ] App icons (all sizes)
- [ ] Splash screens
- [ ] App screenshots
- [ ] App descriptions
- [ ] Privacy policy
- [ ] Terms of service

#### 8.2 Build & Submit
- [ ] EAS Build configuration
- [ ] iOS production build
- [ ] Android production build
- [ ] App Store submission
- [ ] Google Play submission
- [ ] Review process

#### 8.3 Post-Launch
- [ ] Monitor crash reports
- [ ] Monitor analytics
- [ ] User feedback
- [ ] Bug fixes
- [ ] OTA updates (EAS Update)

---

## 📱 Screen Designs (Matching Web)

### 1. Login Screen

```
┌──────────────────────────────────┐
│                                   │
│         MinuteAI Logo             │
│                                   │
│   Welcome Back                    │
│   Sign in to continue             │
│                                   │
│   Email                           │
│   [___________________]           │
│                                   │
│   Password                        │
│   [___________________] 👁        │
│                                   │
│   [ Sign In ]                     │
│                                   │
│   ─────── or ───────              │
│                                   │
│   [ 🔵 Continue with Google ]    │
│   [ 🍎 Continue with Apple ]     │
│                                   │
│   Don't have an account? Sign up  │
│                                   │
└──────────────────────────────────┘
```

**Styling:**
- Background: White
- Primary button: Blue-500
- Font: Inter
- Input fields: Border gray-300, rounded-lg
- Spacing: 24px between sections

### 2. Dashboard Screen

```
┌──────────────────────────────────┐
│  ☰  MinuteAI       🔔  👤        │ Header (64px)
├──────────────────────────────────┤
│  Welcome back, John! 👋           │
│  12 notes · 5 meetings            │
├──────────────────────────────────┤
│  [Notes] [Meetings]  🔍 ⚙️       │ Tabs
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 🎵 Team Meeting            │  │
│  │ Jan 15 · 2:34 · Completed  │  │
│  │ Summary preview text...    │  │
│  │ #topic1 #topic2 +2         │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ 🎙️ Interview Notes         │  │
│  │ Jan 14 · 5:12 · Processing │  │
│  │ Transcribing audio...      │  │
│  └────────────────────────────┘  │
│                                   │
└──────────────────────────────────┘
     [  +  ]  ← FAB (Floating Action Button)
```

### 3. Note Detail Screen

```
┌──────────────────────────────────┐
│  ←  Team Meeting         ⋮       │
├──────────────────────────────────┤
│  🎵 audio_file.mp3                │
│  Jan 15, 2025 · 2:34 min          │
│  ┌─────────────────────────────┐ │
│  │ ▶️  ━━━━━━○────  1:23/2:34 │ │ Audio Player
│  └─────────────────────────────┘ │
├──────────────────────────────────┤
│  [Transcript] [Summary] [Actions] │ Tabs
├──────────────────────────────────┤
│  Speaker 1 (0:00)                 │
│  "Let's discuss the quarterly..." │
│                                   │
│  Speaker 2 (0:15)                 │
│  "I agree, we should focus on..." │
│                                   │
│  (Scrollable content)             │
│                                   │
└──────────────────────────────────┘
```

### 4. Meeting Room Screen

```
┌──────────────────────────────────┐
│  Daily Standup      ⏱️ 05:23     │
├──────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐      │
│  │  👤      │  │  👤      │      │ Video Grid
│  │  Alice   │  │  Bob     │      │
│  └──────────┘  └──────────┘      │
│  ┌──────────┐  ┌──────────┐      │
│  │  👤      │  │  👤 (You) │     │
│  │  Carol   │  │  Dave    │      │
│  └──────────┘  └──────────┘      │
├──────────────────────────────────┤
│  Live Transcript ▼                │
│  Alice: "Good morning everyone"   │
│  Bob: "Let's start with updates"  │
├──────────────────────────────────┤
│     🎤      📹      👥      ❌    │ Controls
└──────────────────────────────────┘
```

### 5. Profile Screen

```
┌──────────────────────────────────┐
│  ←  Profile                       │
├──────────────────────────────────┤
│          ┌─────────┐              │
│          │  👤📷  │              │ Avatar
│          └─────────┘              │
│                                   │
│   Display Name                    │
│   [John Doe_______________]       │
│                                   │
│   Email                           │
│   john@example.com (read-only)    │
│                                   │
│   Member since                    │
│   January 2025                    │
│                                   │
│   [ Save Changes ]                │
│                                   │
│   Settings                        │
│   Notifications          >        │
│   Storage                >        │
│   About                  >        │
│                                   │
│   [ Log Out ]                     │
│                                   │
└──────────────────────────────────┘
```

---

## 🔌 API Integration Strategy

### Backend Architecture

Since the mobile app will use the **deployed Next.js API**, we need to:

1. **API Base URL Configuration**
   ```typescript
   // constants/config.ts
   export const API_CONFIG = {
     baseURL: __DEV__ 
       ? 'http://localhost:3000' // Development
       : 'https://minuteai.vercel.app', // Production
     timeout: 30000,
   };
   ```

2. **Axios Client Setup**
   ```typescript
   // services/api/client.ts
   import axios from 'axios';
   import AsyncStorage from '@react-native-async-storage/async-storage';
   import { API_CONFIG } from '@/constants/config';
   
   const apiClient = axios.create({
     baseURL: API_CONFIG.baseURL,
     timeout: API_CONFIG.timeout,
     headers: {
       'Content-Type': 'application/json',
     },
   });
   
   // Request interceptor (add auth token)
   apiClient.interceptors.request.use(async (config) => {
     const token = await AsyncStorage.getItem('auth_token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   
   // Response interceptor (handle errors)
   apiClient.interceptors.response.use(
     (response) => response,
     async (error) => {
       if (error.response?.status === 401) {
         // Handle token expiration
         await AsyncStorage.removeItem('auth_token');
         // Redirect to login
       }
       return Promise.reject(error);
     }
   );
   
   export default apiClient;
   ```

### API Endpoints Mapping

| Feature | Web API Route | Mobile Usage |
|---------|---------------|--------------|
| **Transcription** | `/api/transcribe` | Upload audio file |
| **Save Transcript** | `/api/save-transcript` | Save transcription result |
| **Get Meetings** | `/api/meetings/transcript` | Fetch meetings list |
| **Summarize** | `/api/meetings/[id]/summarize` | Get meeting summary |
| **Analysis** | `/api/analyze` | Get AI analysis |
| **Pusher Auth** | `/api/pusher/auth` | Real-time auth |
| **Transcription Token** | `/api/transcription/token` | Get AssemblyAI token |

### Example API Service

```typescript
// services/api/notes.ts
import apiClient from './client';
import { Note, Transcription, Analysis } from '@/types';

export const notesAPI = {
  // Upload audio and start transcription
  async uploadAudio(file: File): Promise<{ jobId: string }> {
    const formData = new FormData();
    formData.append('audio', file);
    
    const { data } = await apiClient.post('/api/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return data;
  },
  
  // Get note by ID
  async getNote(id: string): Promise<Note> {
    const { data } = await apiClient.get(`/api/notes/${id}`);
    return data;
  },
  
  // Get all user notes
  async getNotes(): Promise<Note[]> {
    const { data } = await apiClient.get('/api/notes');
    return data;
  },
  
  // Delete note
  async deleteNote(id: string): Promise<void> {
    await apiClient.delete(`/api/notes/${id}`);
  },
  
  // Get transcription
  async getTranscription(noteId: string): Promise<Transcription> {
    const { data } = await apiClient.get(`/api/transcription/${noteId}`);
    return data;
  },
  
  // Get AI analysis
  async getAnalysis(noteId: string): Promise<Analysis> {
    const { data } = await apiClient.get(`/api/analyze?noteId=${noteId}`);
    return data;
  },
};
```

### Supabase Direct Integration

For **faster reads** and **real-time subscriptions**, use Supabase client directly:

```typescript
// services/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Usage example
export const subscribeToNotes = (userId: string, callback: (note: Note) => void) => {
  return supabase
    .channel('notes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notes',
      filter: `user_id=eq.${userId}`,
    }, callback)
    .subscribe();
};
```

---

## 🎨 Component Examples (Design Consistency)

### Button Component

```typescript
// components/ui/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';

const StyledTouchable = styled(TouchableOpacity);
const StyledText = styled(Text);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
}) => {
  const variantStyles = {
    primary: 'bg-blue-500 active:bg-blue-600',
    secondary: 'bg-white border border-gray-300 active:bg-gray-50',
    ghost: 'bg-transparent active:bg-gray-100',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3',
  };
  
  const textVariants = {
    primary: 'text-white',
    secondary: 'text-gray-700',
    ghost: 'text-gray-600',
  };
  
  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };
  
  return (
    <StyledTouchable
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        rounded-lg flex-row items-center justify-center
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabled ? 'opacity-50' : 'opacity-100'}
      `}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#3B82F6'} />
      ) : (
        <>
          {icon}
          <StyledText className={`font-semibold ${textVariants[variant]} ${textSizes[size]}`}>
            {title}
          </StyledText>
        </>
      )}
    </StyledTouchable>
  );
};
```

### Note Card Component

```typescript
// components/notes/NoteCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Music, Clock } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { Note } from '@/types';
import { formatDuration, formatFileSize } from '@/utils/formatters';

const Card = styled(View);
const Title = styled(Text);
const Meta = styled(Text);
const Summary = styled(Text);
const Topics = styled(View);
const Topic = styled(Text);

interface NoteCardProps {
  note: Note;
  onPress: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <Music size={16} color="#3B82F6" />
            <Title className="text-base font-semibold text-gray-900 ml-2 flex-1" numberOfLines={1}>
              {note.title}
            </Title>
          </View>
          <Badge status={note.status} />
        </View>
        
        {/* Metadata */}
        <Meta className="text-xs text-gray-600 mb-3">
          {new Date(note.createdAt).toLocaleDateString()} · {formatDuration(note.duration)} · {formatFileSize(note.fileSize)}
        </Meta>
        
        {/* Summary Preview */}
        {note.summary && (
          <Summary className="text-sm text-gray-600 mb-3" numberOfLines={2}>
            {note.summary}
          </Summary>
        )}
        
        {/* Topics */}
        {note.keyTopics && note.keyTopics.length > 0 && (
          <Topics className="flex-row flex-wrap gap-2">
            {note.keyTopics.slice(0, 3).map((topic, index) => (
              <Topic key={index} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                #{topic}
              </Topic>
            ))}
            {note.keyTopics.length > 3 && (
              <Topic className="text-gray-500 text-xs px-2 py-1">
                +{note.keyTopics.length - 3}
              </Topic>
            )}
          </Topics>
        )}
        
        {/* Footer */}
        {note.actionItems && note.actionItems.length > 0 && (
          <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
            <Text className="text-xs text-gray-600">
              📋 {note.actionItems.length} action items
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};
```

---

## 📦 Environment Variables

```env
# .env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Base URL
EXPO_PUBLIC_API_URL=https://minuteai.vercel.app

# Daily.co
EXPO_PUBLIC_DAILY_API_KEY=your-daily-key

# Pusher
EXPO_PUBLIC_PUSHER_APP_KEY=your-pusher-key
EXPO_PUBLIC_PUSHER_CLUSTER=mt1

# Analytics (Optional)
EXPO_PUBLIC_ANALYTICS_ID=your-analytics-id

# Sentry (Optional)
SENTRY_DSN=your-sentry-dsn
```

---

## 🧪 Testing Strategy

### Unit Tests (Jest)

```typescript
// __tests__/components/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button title="Click me" onPress={() => {}} />);
    expect(getByText('Click me')).toBeTruthy();
  });
  
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Click me" onPress={onPress} />);
    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  
  it('shows loading state', () => {
    const { getByTestId } = render(<Button title="Click me" onPress={() => {}} loading />);
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });
});
```

### E2E Tests (Detox)

```typescript
// e2e/login.test.ts
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });
  
  it('should show login screen', async () => {
    await expect(element(by.text('Welcome Back'))).toBeVisible();
  });
  
  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    await expect(element(by.text('Dashboard'))).toBeVisible();
  });
});
```

---

## 🚀 Deployment Configuration

### EAS Build Configuration

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "bundleIdentifier": "com.minuteai.app"
      },
      "android": {
        "buildType": "app-bundle",
        "package": "com.minuteai.app"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "123456789",
        "appleTeamId": "ABCD123456"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### App Configuration

```json
// app.json
{
  "expo": {
    "name": "MinuteAI",
    "slug": "minuteai-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#3B82F6"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.minuteai.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "MinuteAI needs access to your microphone to record audio and enable voice features during meetings.",
        "NSCameraUsageDescription": "MinuteAI needs access to your camera for video meetings and profile pictures.",
        "NSPhotoLibraryUsageDescription": "MinuteAI needs access to your photo library to upload audio files and profile pictures."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#3B82F6"
      },
      "package": "com.minuteai.app",
      "versionCode": 1,
      "permissions": [
        "RECORD_AUDIO",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-av",
        {
          "microphonePermission": "Allow MinuteAI to access your microphone for audio recording."
        }
      ],
      [
        "expo-media-library",
        {
          "photosPermission": "Allow MinuteAI to access your photos to upload audio files.",
          "savePhotosPermission": "Allow MinuteAI to save audio files to your device."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

---

## 📊 Performance Benchmarks

### Target Metrics

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| **App Launch** | < 2s | Code splitting, lazy loading |
| **Screen Transition** | 60 FPS | React Native Reanimated |
| **API Response** | < 1s | Caching, optimistic updates |
| **Audio Upload** | < 5s for 10MB | Compression, background upload |
| **Bundle Size** | < 50MB | Tree shaking, image optimization |
| **Memory Usage** | < 200MB | Proper cleanup, image caching |
| **Battery Drain** | < 5%/hour | Efficient polling, background tasks |

### Optimization Techniques

1. **Code Splitting**
   ```typescript
   const NoteDetail = React.lazy(() => import('./screens/NoteDetail'));
   ```

2. **Image Optimization**
   ```typescript
   <Image 
     source={{ uri: note.imageUrl }}
     resizeMode="cover"
     defaultSource={require('./placeholder.png')}
   />
   ```

3. **List Virtualization**
   ```typescript
   <FlashList
     data={notes}
     renderItem={({ item }) => <NoteCard note={item} />}
     estimatedItemSize={150}
   />
   ```

4. **Memoization**
   ```typescript
   const MemoizedNoteCard = React.memo(NoteCard);
   ```

---

## 🔐 Security Considerations

### Best Practices

1. **Secure Storage**
   ```typescript
   import * as SecureStore from 'expo-secure-store';
   
   // Store sensitive data
   await SecureStore.setItemAsync('auth_token', token);
   ```

2. **API Key Protection**
   - Never commit `.env` files
   - Use EAS Secrets for production keys
   - Rotate keys regularly

3. **SSL Pinning** (Optional, advanced)
   ```typescript
   import { setCustomPinning } from 'react-native-ssl-pinning';
   
   setCustomPinning({
     'api.minuteai.com': 'sha256/AAAA...',
   });
   ```

4. **Input Validation**
   ```typescript
   import * as yup from 'yup';
   
   const loginSchema = yup.object({
     email: yup.string().email().required(),
     password: yup.string().min(8).required(),
   });
   ```

5. **Prevent Screenshots** (for sensitive screens)
   ```typescript
   import { preventScreenCapture } from 'expo-screen-capture';
   
   useEffect(() => {
     preventScreenCapture();
     return () => allowScreenCapture();
   }, []);
   ```

---

## 📈 Analytics & Monitoring

### Event Tracking

```typescript
// utils/analytics.ts
import * as Analytics from 'expo-analytics';

export const trackEvent = (eventName: string, properties?: object) => {
  Analytics.logEvent(eventName, properties);
};

// Usage
trackEvent('note_uploaded', { fileSize: 1024, duration: 120 });
trackEvent('meeting_joined', { participantCount: 5 });
trackEvent('profile_updated', { field: 'display_name' });
```

### Crash Reporting (Sentry)

```typescript
// app/_layout.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  enableAutoSessionTracking: true,
});

export default Sentry.wrap(RootLayout);
```

---

## 🎯 Success Criteria

### MVP (Minimum Viable Product)

- [x] User authentication (email/password)
- [x] Upload audio files
- [x] View transcriptions
- [x] View AI summaries
- [x] Join live meetings
- [x] Profile management
- [x] Consistent design with web

### V1.0 Features

- [ ] Push notifications
- [ ] Offline mode
- [ ] Share functionality
- [ ] Dark mode toggle
- [ ] Multi-language support
- [ ] Voice commands

### V2.0 Features

- [ ] Apple Watch app
- [ ] Android Wear app
- [ ] Widget support
- [ ] Siri shortcuts
- [ ] Background recording
- [ ] AI assistant chat

---

## 📚 Documentation & Resources

### For Developers

- [ ] Setup guide (README.md)
- [ ] Component library docs
- [ ] API integration guide
- [ ] Testing guide
- [ ] Deployment guide
- [ ] Troubleshooting guide

### For Users

- [ ] User manual
- [ ] Video tutorials
- [ ] FAQ section
- [ ] Support chat
- [ ] Feedback form

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Type check
npm run type-check

# Build for production (iOS)
eas build --platform ios --profile production

# Build for production (Android)
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android

# Create OTA update
eas update --branch production --message "Bug fixes"
```

---

## 📅 Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Foundation** | Week 1-2 | Project setup, design system, navigation |
| **Phase 2: Authentication** | Week 2-3 | Login, signup, OAuth integration |
| **Phase 3: Notes** | Week 3-5 | Dashboard, notes list, upload, detail view |
| **Phase 4: Meetings** | Week 5-7 | Meeting list, room UI, WebRTC, transcription |
| **Phase 5: Profile** | Week 7-8 | Profile screen, settings, avatar |
| **Phase 6: Polish** | Week 8-9 | Animations, offline, performance, accessibility |
| **Phase 7: Testing** | Week 9-10 | Unit tests, E2E tests, beta testing |
| **Phase 8: Deployment** | Week 10-12 | App Store submission, launch |

**Total Estimated Time**: 8-12 weeks (depends on team size and complexity)

---

## 💡 Key Takeaways

### Design Consistency

✅ Use exact same color palette (`#3B82F6`, `#8B5CF6`, etc.)
✅ Use Inter font family (matching web)
✅ Follow 8px spacing grid
✅ Use same border radius (8px, 12px, 16px)
✅ Match component designs (buttons, cards, inputs)
✅ Keep light mode as default (consistent with web)

### API Integration

✅ Use deployed Next.js API endpoints
✅ Direct Supabase client for real-time features
✅ Implement proper auth token management
✅ Add offline support with AsyncStorage
✅ Handle errors gracefully

### Performance

✅ Target 60 FPS animations
✅ Optimize bundle size (<50MB)
✅ Use virtualized lists (FlashList)
✅ Implement lazy loading
✅ Cache aggressively

### Developer Experience

✅ TypeScript for type safety
✅ ESLint + Prettier for code quality
✅ Comprehensive testing
✅ Clear documentation
✅ Easy onboarding

---

## 🚀 Next Steps

1. **Initialize Expo Project**
   ```bash
   npx create-expo-app minuteai-mobile --template
   cd minuteai-mobile
   ```

2. **Install Dependencies**
   ```bash
   # Follow installation commands in Phase 1.1
   ```

3. **Set Up Design System**
   - Create `constants/colors.ts`
   - Create `constants/typography.ts`
   - Configure NativeWind

4. **Build First Screen**
   - Start with Login screen
   - Match web design exactly
   - Test on iOS and Android

5. **Iterate & Deploy**
   - Follow phased approach
   - Get user feedback early
   - Deploy to TestFlight/Play Store

---

## 📞 Support & Feedback

For questions or suggestions:
- **Email**: dev@minuteai.com
- **GitHub**: [github.com/minuteai/mobile](https://github.com/minuteai/mobile)
- **Slack**: #mobile-app

---

**Document Version**: 1.0
**Last Updated**: October 29, 2025
**Status**: Ready for Implementation 🚀

---

**End of Expo React Native App Development Plan**
