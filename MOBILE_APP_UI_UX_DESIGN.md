# MinuteAI Mobile App - Complete UI/UX Design Specification

> **Version:** 1.0
> **Design Philosophy:** Premium, Intelligent, Effortless
> **Target Platforms:** iOS 16+ / Android 13+
> **Design Language:** Glassmorphism + Soft Neumorphism Hybrid with 2024/2025 Modern Aesthetics

---

## Table of Contents

1. [Design Philosophy & Principles](#1-design-philosophy--principles)
2. [Design System Foundation](#2-design-system-foundation)
3. [App Architecture & Navigation](#3-app-architecture--navigation)
4. [Onboarding Experience](#4-onboarding-experience)
5. [Authentication Screens](#5-authentication-screens)
6. [Dashboard (Home) Screen](#6-dashboard-home-screen)
7. [Notes & Transcripts](#7-notes--transcripts)
8. [Meeting Experience](#8-meeting-experience)
9. [Todo Management](#9-todo-management)
10. [Profile & Settings](#10-profile--settings)
11. [Upload Flow](#11-upload-flow)
12. [Micro-interactions & Animations](#12-micro-interactions--animations)
13. [Dark Mode Implementation](#13-dark-mode-implementation)
14. [Accessibility Guidelines](#14-accessibility-guidelines)
15. [Component Library](#15-component-library)
16. [Gesture System](#16-gesture-system)
17. [Haptic Feedback System](#17-haptic-feedback-system)
18. [Loading & Empty States](#18-loading--empty-states)
19. [Error Handling UX](#19-error-handling-ux)
20. [Performance Optimization](#20-performance-optimization)

---

## 1. Design Philosophy & Principles

### 1.1 Core Design Vision

**"Intelligent Simplicity"** - Every interaction should feel like the app anticipates the user's needs. The design combines:

- **Glassmorphism** for floating elements, modals, and cards (frosted glass effect)
- **Soft Neumorphism** for interactive controls (buttons, toggles, sliders)
- **Bold Typography** for hierarchy and scanning
- **AI-Native Design** that surfaces insights proactively

### 1.2 Design Principles

| Principle                   | Description                                          | Implementation                                      |
| --------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| **Instant Gratification**   | Users should achieve their goal within 2-3 taps      | One-tap recording, quick upload FAB                 |
| **Progressive Disclosure**  | Show only what's needed, reveal complexity gradually | Collapsible sections, expandable cards              |
| **Contextual Intelligence** | AI features surface naturally, not forced            | Smart suggestions, auto-categorization              |
| **Delightful Details**      | Micro-interactions that spark joy                    | Animated icons, haptic feedback, smooth transitions |
| **Zero Friction**           | Remove every possible barrier                        | Auto-save, offline mode, background processing      |

### 1.3 Reference Apps for Inspiration

| App                     | What to Learn                                           |
| ----------------------- | ------------------------------------------------------- |
| **Otter.ai**            | Transcript visualization, speaker labels, playback sync |
| **Notion**              | Clean card layouts, collapsible blocks, organization    |
| **Linear**              | Keyboard shortcuts, speed-first UX, status indicators   |
| **Craft**               | Beautiful document rendering, export options            |
| **Voice Memos (Apple)** | Waveform visualization, instant recording               |
| **Slack**               | Meeting integration, threading, @mentions               |
| **Superhuman**          | Speed, keyboard navigation, AI assistance               |
| **Arc Browser**         | Split views, spaces, innovative navigation              |

---

## 2. Design System Foundation

### 2.1 Color Palette

#### Primary Colors (Light Mode)

```
Primary Blue:
  - 50:  #EFF6FF (Background tint)
  - 100: #DBEAFE (Light fill)
  - 200: #BFDBFE (Border highlight)
  - 300: #93C5FD (Inactive state)
  - 400: #60A5FA (Hover state)
  - 500: #3B82F6 (Primary action) ★
  - 600: #2563EB (Pressed state)
  - 700: #1D4ED8 (Dark accent)
  - 800: #1E40AF
  - 900: #1E3A8A

Accent Purple:
  - 400: #A78BFA
  - 500: #8B5CF6 ★
  - 600: #7C3AED

Success Green:
  - 400: #34D399
  - 500: #10B981 ★
  - 600: #059669

Warning Amber:
  - 400: #FBBF24
  - 500: #F59E0B ★
  - 600: #D97706

Error Red:
  - 400: #F87171
  - 500: #EF4444 ★
  - 600: #DC2626
```

#### Neutral Colors

```
Light Mode:
  - Background:     #FAFBFC
  - Surface:        #FFFFFF
  - Surface-2:      #F8FAFC
  - Border:         #E2E8F0
  - Border-subtle:  #F1F5F9
  - Text-primary:   #0F172A
  - Text-secondary: #475569
  - Text-muted:     #94A3B8

Dark Mode:
  - Background:     #0A0A0B
  - Surface:        #141416
  - Surface-2:      #1C1C1F
  - Border:         #27272A
  - Border-subtle:  #1F1F23
  - Text-primary:   #FAFAFA
  - Text-secondary: #A1A1AA
  - Text-muted:     #71717A
```

#### Glassmorphism Colors

```
Glass Background (Light):
  - rgba(255, 255, 255, 0.72)
  - backdrop-blur: 20px
  - border: 1px solid rgba(255, 255, 255, 0.18)

Glass Background (Dark):
  - rgba(20, 20, 22, 0.75)
  - backdrop-blur: 20px
  - border: 1px solid rgba(255, 255, 255, 0.08)

Frosted Overlay:
  - rgba(255, 255, 255, 0.05)
  - blur: 40px
```

### 2.2 Typography

#### Font Stack

```
Primary: SF Pro Display (iOS) / Inter (Android)
Monospace: SF Mono (iOS) / JetBrains Mono (Android)
```

#### Type Scale

| Style   | Size | Weight         | Line Height | Letter Spacing | Usage              |
| ------- | ---- | -------------- | ----------- | -------------- | ------------------ |
| Display | 34px | Bold (700)     | 41px        | -0.4px         | Hero titles        |
| H1      | 28px | Bold (700)     | 34px        | -0.3px         | Page titles        |
| H2      | 22px | Semibold (600) | 28px        | -0.2px         | Section headers    |
| H3      | 18px | Semibold (600) | 24px        | -0.1px         | Card titles        |
| Body-L  | 17px | Regular (400)  | 24px        | 0px            | Primary content    |
| Body    | 15px | Regular (400)  | 22px        | 0px            | Secondary content  |
| Body-S  | 13px | Regular (400)  | 18px        | 0.1px          | Captions, labels   |
| Caption | 11px | Medium (500)   | 14px        | 0.2px          | Timestamps, badges |
| Button  | 16px | Semibold (600) | 20px        | 0.3px          | Button text        |

### 2.3 Spacing System

```
4px grid system:

xs:   4px   (micro-spacing)
sm:   8px   (tight)
md:   16px  (standard)
lg:   24px  (relaxed)
xl:   32px  (section gaps)
2xl:  48px  (major sections)
3xl:  64px  (screen padding top)
4xl:  80px  (hero spacing)
```

### 2.4 Border Radius

```
xs:    4px   (badges, chips)
sm:    8px   (inputs, small buttons)
md:    12px  (cards, medium buttons)
lg:    16px  (modals, large cards)
xl:    20px  (bottom sheets)
2xl:   24px  (full cards)
full:  9999px (pills, avatars, FAB)
```

### 2.5 Shadows & Elevation

```
Elevation 1 (Subtle):
  - Light: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)
  - Dark: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)

Elevation 2 (Card):
  - Light: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.04)
  - Dark: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.3)

Elevation 3 (Floating):
  - Light: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)
  - Dark: 0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -2px rgba(0,0,0,0.4)

Elevation 4 (Modal):
  - Light: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)
  - Dark: 0 20px 25px -5px rgba(0,0,0,0.6), 0 10px 10px -5px rgba(0,0,0,0.5)

Glow (Primary Button):
  - 0 0 20px rgba(59, 130, 246, 0.4)

Glow (Recording):
  - 0 0 30px rgba(239, 68, 68, 0.5)
```

---

## 3. App Architecture & Navigation

### 3.1 Information Architecture

```
MinuteAI Mobile
├── Onboarding (first launch only)
│   ├── Welcome
│   ├── Feature Highlights (3 screens)
│   ├── Permissions Request
│   └── Account Setup
│
├── Authentication
│   ├── Login (Email/Password)
│   ├── Signup (Name, Email, Password)
│   ├── OAuth (Google)
│   └── Join Meeting (Code Entry)
│
├── Main App (Tab Navigation)
│   │
│   ├── 🏠 Home (Dashboard)
│   │   ├── Statistics Cards (Total/Completed/Pending Notes, Action Items)
│   │   ├── Quick Actions (Upload, New Meeting, Join Meeting, All Todos)
│   │   ├── Search & Filter
│   │   ├── Notes Tab (with count badge)
│   │   └── Meetings Tab (with count badge)
│   │
│   ├── 📝 Notes
│   │   ├── All Notes (List/Grid toggle)
│   │   ├── Search & Filters
│   │   ├── Note Detail
│   │   │   ├── Audio Player
│   │   │   ├── Transcript View
│   │   │   ├── Summary Tab
│   │   │   ├── Action Items Tab
│   │   │   └── Export Options
│   │   └── Note Actions (Edit, Delete, Share)
│   │
│   ├── ➕ Quick Action (FAB - Center)
│   │   ├── Upload File
│   │   ├── Start Meeting
│   │   └── Join Meeting
│   │
│   ├── 📋 Todos
│   │   ├── All Todos
│   │   ├── Filter by Status/Priority/Note
│   │   ├── Smart Categories
│   │   └── Inline Edit/Complete
│   │
│   └── 👤 Profile
│       ├── Avatar Management
│       ├── Display Name (editable)
│       ├── Email (read-only)
│       └── Sign Out
│
├── Meeting Room (Full Screen)
│   ├── Video Display
│   ├── Live Transcript Overlay
│   ├── Controls Bar
│   └── Participant List
│
└── Meeting Summary (Post-Meeting)
    ├── Recording Playback
    ├── Full Transcript
    ├── AI Summary
    └── Extracted Action Items
```

### 3.2 Navigation System

#### Floating Bottom Navigation Bar

**Design Specifications:**

```
Container:
  - Height: 64px (iOS) / 60px (Android)
  - Background: Glass effect (see glassmorphism colors)
  - Margin: 16px horizontal, 24px from bottom
  - Border-radius: 24px (pill shape)
  - Shadow: Elevation 3

Tab Items: 5 total
  - Home (House icon)
  - Notes (Document icon)
  - Quick Action (+ icon, larger, center)
  - Todos (Checklist icon)
  - Profile (User icon)

Item Specifications:
  - Icon size: 24px (28px for center FAB)
  - Touch target: 48px minimum
  - Active indicator: Filled icon + subtle background pill
  - Animation: Scale + color transition on tap

Center FAB (Quick Action):
  - Size: 56px diameter
  - Background: Primary gradient (blue to purple)
  - Icon: Plus sign (white)
  - Position: Elevated 8px above nav bar
  - Shadow: Glow effect
  - Animation: Rotation on open (45° to become X)
```

**Navigation Animation Flow:**

```
Tab Switch Animation:
  1. Current tab content fades out (150ms)
  2. New tab content slides in from direction (250ms, spring easing)
  3. Icon morphs to filled variant (200ms)
  4. Subtle haptic feedback (light impact)

FAB Expansion Animation:
  1. FAB rotates 45° (becomes X)
  2. Background dims (50% opacity black overlay)
  3. Menu items fan out in arc pattern
  4. Each item staggers by 50ms
  5. Glass backdrop appears behind menu
```

#### Quick Action Menu (FAB Expansion)

```
Layout: Arc above FAB

Menu Items (3 options):
  ┌─────────────────────────────────────┐
  │                                     │
  │    [📁 Upload]    [🎥 Start]        │
  │                                     │
  │         [🔗 Join]                   │
  │                                     │
  │              [❌ FAB]               │
  └─────────────────────────────────────┘

Item Design:
  - Size: 48px icon button + 12px gap + label
  - Background: Glass effect
  - Border-radius: 16px
  - Animation: Scale up + fade in (staggered)

Actions:
  - Upload: Opens file picker modal
  - Start Meeting: Creates new meeting instantly
  - Join Meeting: Shows code input screen
```

### 3.3 Screen Transitions

| Transition Type       | Use Case              | Animation                            |
| --------------------- | --------------------- | ------------------------------------ |
| **Push (Horizontal)** | Drill-down navigation | Slide from right (300ms, ease-out)   |
| **Modal (Vertical)**  | New context/flow      | Slide up from bottom (350ms, spring) |
| **Shared Element**    | Note card → Detail    | Card expands to full screen (400ms)  |
| **Fade**              | Tab switches          | Cross-fade (200ms, ease-in-out)      |
| **Scale**             | Quick actions         | Scale from center (250ms, spring)    |
| **Bottom Sheet**      | Options/filters       | Slide up with rubber-band (300ms)    |

---

## 4. Onboarding Experience

### 4.1 Flow Overview

```
Total Screens: 5
Skip Option: Available after screen 1
Progress Indicator: Animated dots
Duration: ~45 seconds optimal
```

### 4.2 Screen 1: Welcome

**Visual:**

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│        ┌─────────────────┐          │
│        │                 │          │
│        │   [App Logo]    │          │
│        │   Animated      │          │
│        │                 │          │
│        └─────────────────┘          │
│                                     │
│                                     │
│         MinuteAI                    │
│                                     │
│    "Your intelligent meeting        │
│         companion"                  │
│                                     │
│                                     │
│                                     │
│   ┌─────────────────────────────┐   │
│   │      Get Started →          │   │
│   └─────────────────────────────┘   │
│                                     │
│        Already have an account?     │
│            [Sign In]                │
│                                     │
│           ○ ○ ○ ○ ○                 │
│                                     │
└─────────────────────────────────────┘
```

**Logo Animation:**

- 3D audio waveform that morphs into brain/lightbulb
- Floating particles around logo
- Subtle gradient shift (blue → purple)
- Duration: 3 seconds, loops

### 4.3 Screen 2: Feature - Transcription

**Visual:**

```
┌─────────────────────────────────────┐
│                                     │
│  [Skip]                             │
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │    [3D Animated Scene]      │   │
│   │    - Audio waveform         │   │
│   │    - Text appearing         │   │
│   │    - Speaker labels         │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│    🎤 Instant Transcription         │
│                                     │
│    "Upload audio files or record    │
│     meetings. AI transcribes with   │
│     high accuracy automatically."   │
│                                     │
│                                     │
│   ┌───────────────────────────┐     │
│   │     Continue →            │     │
│   └───────────────────────────┘     │
│                                     │
│           ● ○ ○ ○ ○                 │
│                                     │
└─────────────────────────────────────┘
```

**Animation:**

- Waveform pulses as text appears word by word
- Different colors for different speakers
- Text types out character by character
- Floating time stamps appear

### 4.4 Screen 3: Feature - AI Analysis

**Visual:**

```
┌─────────────────────────────────────┐
│                                     │
│  [Skip]                             │
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │    [3D Animated Scene]      │   │
│   │    - Document with text     │   │
│   │    - AI sparkles effect     │   │
│   │    - Summary cards appear   │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│    ✨ AI-Powered Insights           │
│                                     │
│    "Get instant summaries,          │
│     action items, and key           │
│     topics automatically."          │
│                                     │
│                                     │
│   ┌───────────────────────────┐     │
│   │     Continue →            │     │
│   └───────────────────────────┘     │
│                                     │
│           ○ ● ○ ○ ○                 │
│                                     │
└─────────────────────────────────────┘
```

**Animation:**

- Document appears
- AI particles swirl around document
- Summary, action items, topics cards pop out
- Checkmarks appear on action items

### 4.5 Screen 4: Feature - Meetings

**Visual:**

```
┌─────────────────────────────────────┐
│                                     │
│  [Skip]                             │
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │    [3D Animated Scene]      │   │
│   │    - Video call grid        │   │
│   │    - Live transcript        │   │
│   │    - Recording indicator    │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│    📹 Real-Time Meetings            │
│                                     │
│    "Host video calls with live      │
│     transcription and automatic     │
│     recording."                     │
│                                     │
│                                     │
│   ┌───────────────────────────┐     │
│   │     Continue →            │     │
│   └───────────────────────────┘     │
│                                     │
│           ○ ○ ● ○ ○                 │
│                                     │
└─────────────────────────────────────┘
```

**Animation:**

- Video tiles animate in
- Faces have speaking indicators
- Transcript scrolls at bottom
- Recording dot pulses

### 4.6 Screen 5: Permissions & Setup

**Visual:**

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│    🎯 Almost Ready!                 │
│                                     │
│    "Enable these permissions        │
│     for the best experience"        │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 🎤 Microphone               │   │
│   │    Record meetings & audio  │   │
│   │              [Toggle] ●○    │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 📷 Camera                   │   │
│   │    Video calls              │   │
│   │              [Toggle] ●○    │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌───────────────────────────┐     │
│   │     Let's Go! →           │     │
│   └───────────────────────────┘     │
│                                     │
│           ○ ○ ○ ○ ●                 │
│                                     │
└─────────────────────────────────────┘
```

**Interaction:**

- Each permission card animates when tapped
- Toggle has satisfying haptic + animation
- Success checkmark appears after granting
- Can skip individual permissions
- Microphone required for core functionality (recording/transcription)
- Camera optional (only needed for video meetings)

---

## 5. Authentication Screens

### 5.1 Login Screen

**Visual Layout:**

```
┌─────────────────────────────────────┐
│                                     │
│  ← Back                             │
│                                     │
│                                     │
│         [Logo Animation]            │
│                                     │
│         Welcome Back                │
│    "Sign in to continue"            │
│                                     │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 📧  Email                   │   │
│   │ ─────────────────────────── │   │
│   │ user@example.com            │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 🔒  Password                │   │
│   │ ─────────────────────────── │   │
│   │ ••••••••          [👁]     │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │         Sign In             │   │
│   └─────────────────────────────┘   │
│                                     │
│            ─── or ───               │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ [G] Continue with Google    │   │
│   └─────────────────────────────┘   │
│                                     │
│                                     │
│     Don't have an account?          │
│         [Sign Up]                   │
│                                     │
└─────────────────────────────────────┘
```

**Design Details:**

```
Input Fields:
  - Style: Glassmorphism container
  - Height: 56px
  - Border-radius: 12px
  - Focus state: Blue glow + elevated shadow
  - Error state: Red border + shake animation
  - Icon: 20px, muted color, left-aligned
  - Label: Floating label animation

Sign In Button:
  - Style: Primary gradient (blue to purple)
  - Height: 52px
  - Border-radius: 14px
  - Shadow: Elevation 2 + subtle glow
  - Loading: Spinner replaces text
  - Success: Checkmark + confetti burst

Google Button:
  - Style: Outline/ghost variant
  - Google G logo: Multi-color
  - Height: 52px
```

**Animations:**

- Input focus: Label floats up, border glows
- Password toggle: Eye icon morphs (open ↔ closed)
- Sign in loading: Button becomes circular, spinner appears
- Success: Button expands, checkmark animates, screen transitions
- Error: Inputs shake, red highlight, error message slides down

### 5.2 Signup Screen

**Visual Layout:**

```
┌─────────────────────────────────────┐
│                                     │
│  ← Back                             │
│                                     │
│         Create Account              │
│    "Join thousands of users"        │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 👤  Full Name               │   │
│   │ ─────────────────────────── │   │
│   │ John Smith                  │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 📧  Email                   │   │
│   │ ─────────────────────────── │   │
│   │ john@example.com            │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 🔒  Password                │   │
│   │ ─────────────────────────── │   │
│   │ ••••••••          [👁]     │   │
│   └─────────────────────────────┘   │
│                                     │
│   Password Strength: ████░░ Good    │
│                                     │
│   ┌─────────────────────────────┐   │
│   │       Create Account        │   │
│   └─────────────────────────────┘   │
│                                     │
│            ─── or ───               │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ [G] Sign up with Google     │   │
│   └─────────────────────────────┘   │
│                                     │
│     Already have an account?        │
│         [Sign In]                   │
│                                     │
└─────────────────────────────────────┘
```

**Password Strength Indicator:**

```
States:
  - Weak (< 6 chars): Red, 1 bar
  - Fair (6+ chars): Orange, 2 bars
  - Good (8+ chars, mixed): Yellow, 3 bars
  - Strong (12+ chars, all types): Green, 4 bars

Animation: Bars fill with spring animation
```

---

## 6. Dashboard (Home) Screen

### 6.1 Overall Layout

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░ Status Bar ░░░░░░░░░░░░ │
├─────────────────────────────────────┤
│                                     │
│  Good morning, John 👋              │
│  Tuesday, December 10               │
│                                     │
│  Statistics                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │  12  │ │  8   │ │  4   │ │  15  ││
│  │Total │ │Done  │ │Pend. │ │Tasks ││
│  │Notes │ │Notes │ │Notes │ │      ││
│  └──────┘ └──────┘ └──────┘ └──────┘│
│                                     │
│  Quick Actions                      │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 📋  │ │ 🔗  │ │ 📁  │ │ 🎥  │   │
│  │Todos│ │Join │ │Upload│ │New  │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔍 Search notes, meetings... │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Notes (12)]  [Meetings (3)]       │
│  ════════════                       │
│                                     │
│  Filter: [All ▼] [Newest ▼]         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  📄 Team Standup            │    │
│  │  Today, 9:30 AM • 12m       │    │
│  │  "Discussed sprint goals..."│    │
│  │  ████████░░ 3/5 tasks       │    │
│  │  #sprint #planning          │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │  📄 Client Call             │    │
│  │  Yesterday • 45m            │    │
│  │  "Product roadmap review"   │    │
│  │  ██████████ 5/5 tasks ✓     │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│   [🏠]  [📝]  [➕]  [📋]  [👤]    │
└─────────────────────────────────────┘
```

### 6.2 Component Breakdown

#### Header Section

```
Design:
  - Greeting: Dynamic based on time
    - Morning (5-12): "Good morning"
    - Afternoon (12-17): "Good afternoon"
    - Evening (17-21): "Good evening"
    - Night (21-5): "Working late?"
  - Name: User's first name + wave emoji
  - Date: Full date, secondary color
  - Background: Subtle gradient blob (animated)
```

#### Statistics Cards

```
Layout:
  - Horizontal row of 4 cards
  - Equal width, responsive
  - Gap: 8px

Card Design:
  - Background: Glass effect
  - Border-radius: 12px
  - Padding: 12px
  - Number: Large, bold
  - Label: Caption, muted

Statistics (matching web):
  1. Total Notes - count of all notes
  2. Completed Notes - fully processed
  3. Pending Notes - still processing
  4. Action Items - total todos count
```

#### Quick Action Chips

```
Layout:
  - Horizontal scroll container
  - 4 chips visible
  - Gap: 12px

Chip Design:
  - Size: 72px x 80px
  - Icon: 24px, centered
  - Label: Caption text below
  - Background: Glass effect
  - Border-radius: 16px
  - Active state: Scale 0.95 + shadow

Available Actions (matching web):
  1. All Todos - Navigate to todos page
  2. Join Meeting - Enter meeting code
  3. Upload - Open upload modal
  4. New Meeting - Create meeting instantly
```

#### Search Bar

```
Design:
  - Height: 48px
  - Background: Surface-2
  - Border-radius: 12px
  - Placeholder: "Search notes, meetings..."
  - Left icon: Search (muted)

Interaction:
  - Tap: Focus and show keyboard
  - Real-time filtering as user types
  - Searches note title, transcript, summary, key topics
  - Clear button appears when text entered

Filter Controls:
  - Status filter: All / Completed / Pending
  - Sort: Newest First / Oldest First / Title (A-Z)
```

#### Note Card (Compact)

```
Design:
  - Height: ~100px
  - Background: Glass effect
  - Border-radius: 16px
  - Padding: 16px
  - Shadow: Elevation 1

Content:
  - Left: Document icon (color-coded by type)
  - Title: H3, single line, truncate
  - Meta: Date + duration, caption style
  - Summary: 2 lines max, muted color
  - Progress: Task completion bar
  - Right: Chevron indicator

Interaction:
  - Tap: Navigate to note detail
  - Long press: Quick actions menu
  - Swipe right: Archive
  - Swipe left: Delete (with undo)
```

#### Meeting Card

```
Design:
  - Similar to note card
  - Accent color strip on left (status-based)
  - Participant avatars (stacked, max 3)
  - "Join Now" button for active meetings

Status Colors:
  - Scheduled: Blue
  - Starting soon (< 30min): Yellow pulse
  - Active/Live: Green pulse
  - Ended: Gray
```

#### Tabbed Interface

```
Design:
  - Two tabs: Notes / Meetings
  - Badge showing count on each tab
  - Active tab: Underline indicator
  - Tap to switch, content animates

Notes Tab Content:
  - Masonry-style grid layout
  - Note cards with:
    - Title (2-line clamp)
    - Timestamp
    - Duration/size
    - Summary preview (3-line clamp)
    - Key topics tags
    - Action items progress bar
    - Processing status badge (if pending)

Meetings Tab Content:
  - List of hosted meetings
  - Meeting cards with:
    - Title and status badge
    - Creation date/time
    - Duration (if available)
    - Meeting code (copiable)
    - Meeting link (copiable)
    - Join/View Summary buttons
```

### 6.3 Pull-to-Refresh

```
Animation:
  - Pull indicator: Rotating logo
  - Threshold: 80px pull distance
  - Haptic: Medium impact at threshold
  - Loading: Logo spins continuously
  - Success: Checkmark briefly shown
  - Content: Smooth scroll back

Visual:
  - Custom indicator replaces default
  - Matches app branding
  - Shows "Syncing..." text
```

### 6.4 Empty States

```
No Notes:
  ┌─────────────────────────────┐
  │                             │
  │      [Illustration]         │
  │     📝 + floating notes     │
  │                             │
  │    No notes yet             │
  │                             │
  │    Upload an audio file     │
  │    or start a meeting       │
  │    to get started           │
  │                             │
  │   [📁 Upload File]          │
  │                             │
  └─────────────────────────────┘

No Meetings:
  ┌─────────────────────────────┐
  │                             │
  │      [Illustration]         │
  │     📅 Calendar empty       │
  │                             │
  │    No meetings yet          │
  │                             │
  │    Start a meeting or       │
  │    share your meeting link  │
  │                             │
  │   [🎥 Start Meeting]        │
  │                             │
  └─────────────────────────────┘
```

---

## 7. Notes & Transcripts

### 7.1 Notes List Screen

**Layout:**

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░ Status Bar ░░░░░░░░░░░░ │
├─────────────────────────────────────┤
│                                     │
│  Notes                    [⊞] [≡]   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔍 Search notes...          │    │
│  └─────────────────────────────┘    │
│                                     │
│  [All] [Audio] [Documents] [Video]  │
│  ─────                              │
│                                     │
│  Today                              │
│  ┌─────────────────────────────┐    │
│  │  📄 Team Standup            │    │
│  │  9:30 AM • 12 min           │    │
│  │  ████████░░ 3/5 tasks       │    │
│  └─────────────────────────────┘    │
│                                     │
│  Yesterday                          │
│  ┌─────────────────────────────┐    │
│  │  📄 Client Call             │    │
│  │  2:00 PM • 45 min           │    │
│  │  ██████████ Completed ✓     │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │  📑 Q4 Planning Doc         │    │
│  │  11:00 AM • PDF             │    │
│  │  No action items            │    │
│  └─────────────────────────────┘    │
│                                     │
│  This Week                          │
│  ┌─────────────────────────────┐    │
│  │  ...                        │    │
│  └─────────────────────────────┘    │
│                                     │
│                                     │
├─────────────────────────────────────┤
│   [🏠]  [📝]  [➕]  [📋]  [👤]    │
└─────────────────────────────────────┘
```

**Filter Chips:**

```
Design:
  - Horizontal scroll
  - Pill shape (full border-radius)
  - Height: 32px
  - Gap: 8px

States:
  - Inactive: Ghost style, border only
  - Active: Primary fill, white text
  - Tap: Scale down briefly

Categories:
  - All (default)
  - Audio 🎤
  - Documents 📑
  - Video 🎥
  - Meetings 🎥
```

**View Toggle:**

```
Options:
  - Grid view (⊞): 2 columns
  - List view (≡): Single column (default)

Animation:
  - Cards morph between layouts
  - Staggered appearance
  - 250ms transition
```

**Date Grouping:**

- Today
- Yesterday
- This Week
- Last Week
- This Month
- Older (by month)

### 7.2 Note Detail Screen

**Full Layout:**

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░ Status Bar ░░░░░░░░░░░░ │
├─────────────────────────────────────┤
│ ←  Team Standup          [⋮] [↗]   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │    [Audio Waveform]         │    │
│  │    ═══════════●════════     │    │
│  │    3:24 / 12:45             │    │
│  │                             │    │
│  │   [⏮] [⏪] [▶️/⏸] [⏩] [⏭]   │    │
│  │          1x                 │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Transcript] [Summary] [Tasks]     │
│  ═══════════                        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Speaker 1           0:00    │    │
│  │ "Let's start with the       │    │
│  │ sprint goals for this       │    │
│  │ week..."                    │    │
│  ├─────────────────────────────┤    │
│  │ Speaker 2           0:45    │    │
│  │ "I'll be focusing on the    │    │
│  │ API integration..."         │    │
│  ├─────────────────────────────┤    │
│  │ Speaker 1           1:30    │    │
│  │ "Great. Make sure to        │    │
│  │ coordinate with the         │    │
│  │ frontend team."             │    │
│  ├─────────────────────────────┤    │
│  │ ...                         │    │
│  └─────────────────────────────┘    │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [📤 Export]                       │
└─────────────────────────────────────┘
```

### 7.3 Audio Player Component

**Design Specifications:**

```
Container:
  - Background: Glass effect
  - Border-radius: 20px
  - Padding: 20px
  - Shadow: Elevation 2

Waveform:
  - Height: 60px
  - Style: Bars or continuous wave
  - Colors:
    - Played: Primary blue
    - Unplayed: Muted gray
    - Scrubber: White circle with shadow
  - Animation: Bars pulse during playback

Time Display:
  - Current / Total
  - Font: Monospace
  - Size: Body-S

Controls:
  - Size: 44px touch targets
  - Icons: SF Symbols style
  - Center play/pause: 56px, primary color
  - Skip: 15 seconds forward/back

Playback Speed:
  - Options: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
  - Tap to cycle
  - Badge shows current speed
```

**Waveform Interaction:**

```
Gestures:
  - Tap: Seek to position
  - Drag: Scrub with preview
  - Long press: Fine scrubbing mode

Preview:
  - Tooltip shows timestamp
  - Haptic feedback at markers
  - Audio preview while scrubbing
```

### 7.4 Transcript View

**Segment Design:**

```
Container:
  - Full width
  - Separator lines between speakers
  - Left accent bar (speaker color-coded)

Content:
  - Speaker label: Bold, with color dot
  - Timestamp: Right-aligned, muted
  - Text: Body style, full width
  - Clickable words for seeking

Speaker Colors (auto-assigned):
  - Speaker 1: Blue
  - Speaker 2: Purple
  - Speaker 3: Green
  - Speaker 4: Orange
  - Speaker 5+: Gray

Active Segment:
  - Background highlight (subtle blue)
  - Auto-scroll to keep in view
  - Current word underlined
```

**Transcript Interactions:**

```
Word Tap:
  - Seek audio to word timestamp
  - Word highlights briefly
  - Haptic feedback

Long Press on Segment:
  - Copy text option
  - Share segment option
  - Highlight/bookmark option

Search Within:
  - Floating search bar appears
  - Matches highlighted in yellow
  - Navigation arrows for matches
  - Count shown: "3 of 12 matches"
```

### 7.5 Summary Tab

```
┌─────────────────────────────────────┐
│                                     │
│  📋 Summary                         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ The team discussed sprint   │    │
│  │ goals including API         │    │
│  │ integration and frontend    │    │
│  │ coordination. Key decisions │    │
│  │ were made about timeline... │    │
│  └─────────────────────────────┘    │
│                                     │
│  🏷️ Key Topics                      │
│                                     │
│  [Sprint Planning] [API] [Frontend] │
│  [Timeline] [Testing]               │
│                                     │
│  📊 Meeting Stats                   │
│                                     │
│  Duration     │ 12 min 45 sec       │
│  Speakers     │ 3                   │
│  Talk Time    │ S1: 45% S2: 35%...  │
│  Action Items │ 5                   │
│                                     │
└─────────────────────────────────────┘
```

### 7.6 Action Items Tab

```
┌─────────────────────────────────────┐
│                                     │
│  Tasks (3/5 complete)               │
│  ████████████░░░░░░ 60%             │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ☑️ Set up API endpoints      │    │
│  │    Due: Dec 12 • High       │    │
│  │    ✓ Completed              │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ⬜ Review frontend mockups   │    │
│  │    Due: Dec 15 • Medium     │    │
│  │    Overdue!                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ⬜ Schedule testing session  │    │
│  │    No due date • Low        │    │
│  └─────────────────────────────┘    │
│                                     │
│  [+ Add Task]                       │
│                                     │
└─────────────────────────────────────┘
```

### 7.7 Export Options (Bottom Sheet)

```
┌─────────────────────────────────────┐
│  ─────                              │
│                                     │
│  Export Transcript                  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📄 Plain Text (.txt)        │    │
│  │    Simple text format       │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📕 PDF Document (.pdf)      │    │
│  │    Formatted with speakers  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📘 Word Document (.docx)    │    │
│  │    Editable format          │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🎬 Subtitles (.srt)         │    │
│  │    For video editing        │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Cancel]                           │
│                                     │
└─────────────────────────────────────┘
```

---

## 8. Meeting Experience

### 8.1 Pre-Meeting Screen (Start Meeting)

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░ Status Bar ░░░░░░░░░░░░ │
├─────────────────────────────────────┤
│ ←                           [Skip]  │
│                                     │
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │    [Camera Preview]         │   │
│   │                             │   │
│   │    Your video will          │   │
│   │    appear here              │   │
│   │                             │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│         Ready to join?              │
│                                     │
│   ┌───────┐   ┌───────┐             │
│   │ 🎤 On │   │ 📷 On │             │
│   └───────┘   └───────┘             │
│                                     │
│   Meeting Title:                    │
│   ┌─────────────────────────────┐   │
│   │ Team Standup                │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │      Start Meeting          │   │
│   └─────────────────────────────┘   │
│                                     │
│   Your meeting code:                │
│   ┌─────────────────────────────┐   │
│   │   ABC-123         [Copy]    │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### 8.2 Join Meeting Screen

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░ Status Bar ░░░░░░░░░░░░ │
├─────────────────────────────────────┤
│ ← Join Meeting                      │
│                                     │
│                                     │
│                                     │
│     ┌───────────────────────┐       │
│     │                       │       │
│     │   [Illustration]      │       │
│     │   Meeting joining     │       │
│     │                       │       │
│     └───────────────────────┘       │
│                                     │
│                                     │
│   Enter meeting code:               │
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │    [ A ] [ B ] [ C ]        │   │
│   │                             │   │
│   │    [ 1 ] [ 2 ] [ 3 ]        │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │        Join                 │   │
│   └─────────────────────────────┘   │
│                                     │
│   [📋 Paste from clipboard]         │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Code Input Design:**

```
- 6 character boxes
- Auto-advance on input
- Format: XXX-XXX (3 letters, dash, 3 numbers)
- Auto-capitalize letters
- Haptic on each character
- Error shake if invalid
- Auto-paste detection from clipboard
```

### 8.3 Meeting Room (Main Screen)

**Portrait Layout:**

```
┌─────────────────────────────────────┐
│ ░░ 12:34 ░░░░░░░░░░░░░░░░░░░░░░░░ │
├─────────────────────────────────────┤
│  Team Standup    🔴 REC    [End]   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │                             │    │
│  │    [Remote Participant      │    │
│  │         Video]              │    │
│  │                             │    │
│  │         John Smith          │    │
│  │           🎤                │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│       ┌───────────┐                 │
│       │ [Your     │                 │
│       │  Video]   │                 │
│       │    You    │                 │
│       └───────────┘                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 💬 Live Transcript          │    │
│  │ ─────────────────────────── │    │
│  │ John: "Let's review the..." │    │
│  │ You: "Sounds good, I'll..." │    │
│  │ John: "Great, and then..."  │    │
│  │ ▼ Scroll to see more        │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [🎤]   [📷]   [💬]   [⏺]   [📤]   │
│  Mute   Video  Chat  Record Share   │
│                                     │
└─────────────────────────────────────┘
```

**Landscape Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Team Standup           🔴 REC 3:45           [End]     │
├───────────────────────────────────┬─────────────────────┤
│                                   │                     │
│                                   │ 💬 Transcript       │
│    [Remote Participant            │ ─────────────────── │
│           Video]                  │ John: "Let's..."    │
│                                   │ You: "I think..."   │
│         John Smith 🎤             │ John: "Agreed..."   │
│                                   │ You: "So next..."   │
│                                   │                     │
│              ┌──────────┐         │                     │
│              │[Your Vid]│         │                     │
│              │   You    │         │                     │
│              └──────────┘         │                     │
│                                   │                     │
├───────────────────────────────────┴─────────────────────┤
│      [🎤]     [📷]     [💬]     [⏺]     [📤]           │
└─────────────────────────────────────────────────────────┘
```

### 8.4 Video Display Component

**Design Specifications:**

```
Remote Video (Primary):
  - Fills available space
  - Border-radius: 20px (when not full screen)
  - Overlay: Name + mute indicator at bottom
  - Speaking indicator: Animated border glow (green)

Local Video (PiP):
  - Size: 100px x 140px (portrait)
  - Position: Bottom-right, draggable
  - Border-radius: 16px
  - Border: 2px white
  - Shadow: Elevation 3
  - Double-tap: Swap with remote video

No Video State:
  - Avatar in center
  - Animated speaking ring when talking
  - Gradient background
```

**Video Switching Animation:**

```
Swap Transition:
  - Duration: 400ms
  - Both videos scale down
  - Cross-fade
  - Scale back up in new positions
  - Haptic feedback
```

### 8.5 Meeting Controls Bar

**Design:**

```
Container:
  - Background: Glass effect (dark)
  - Height: 80px
  - Border-radius: 28px (top corners)
  - Safe area padding on bottom
  - Shadow: Elevation 4

Buttons:
  - Size: 52px
  - Background: Semi-transparent
  - Active state: Colored background
  - Spacing: Evenly distributed

Button States:
  🎤 Mute:
    - Off: White icon, transparent bg
    - On: Red icon, red/transparent bg
    - Animation: Icon crosses out

  📷 Video:
    - Off: White icon, transparent bg
    - On: Red icon with slash, red/transparent bg

  💬 Transcript:
    - Toggle: Shows/hides transcript panel
    - Active: Blue background

  ⏺ Record:
    - Not recording: White icon
    - Recording: Red pulsing dot, red bg
    - Animation: Dot pulses continuously

  📤 Share/Invite:
    - Opens share sheet
    - Meeting code + link options
```

### 8.6 Live Transcript Panel

**Design:**

```
Container:
  - Height: 200px (collapsible)
  - Background: Glass effect (dark)
  - Border-radius: 20px top
  - Drag handle at top

Content:
  - Auto-scroll to latest
  - Speaker labels with colors
  - Current speaker highlighted
  - Timestamps on hover/long press

Gestures:
  - Drag up: Expand to half screen
  - Drag down: Collapse to mini mode
  - Double tap: Toggle expand/collapse
  - Scroll: Browse history (auto-scroll pauses)

Mini Mode (Collapsed):
  - Shows only current speaker line
  - Height: 60px
  - Tap to expand
```

### 8.7 Recording Countdown Overlay

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│         ┌───────────────┐           │
│         │               │           │
│         │      3        │           │
│         │               │           │
│         │  Recording    │           │
│         │  starting...  │           │
│         │               │           │
│         └───────────────┘           │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Animation:**

- Full screen dark overlay (80% opacity)
- Large number in center (3, 2, 1)
- Number scales up and fades
- Progress ring animates around number
- Haptic on each count
- Red flash when recording starts

### 8.8 End Meeting Flow

```
End Meeting Confirmation:
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │   End this meeting?         │    │
│  │                             │    │
│  │   Meeting duration: 45:23   │    │
│  │   Recording: Yes (saved)    │    │
│  │                             │    │
│  │   ┌─────────────────────┐   │    │
│  │   │    End Meeting      │   │    │
│  │   └─────────────────────┘   │    │
│  │                             │    │
│  │   [Cancel]                  │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘

Post-Meeting Processing:
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         [Processing Animation]      │
│                                     │
│         Meeting ended               │
│                                     │
│    ✓ Transcript saved               │
│    ⏳ Generating summary...         │
│    ⏳ Extracting action items...    │
│                                     │
│    [View Summary →]                 │
│                                     │
│    (Auto-redirect in 3s)            │
│                                     │
└─────────────────────────────────────┘
```

### 8.9 Meeting Summary Screen

```
┌─────────────────────────────────────┐
│ ← Meeting Summary           [Share] │
├─────────────────────────────────────┤
│                                     │
│  Team Standup                       │
│  Dec 10, 2024 • 45 min              │
│  3 participants                     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ [Recording Thumbnail]       │    │
│  │      ▶️ Play Recording       │    │
│  │      45:23                  │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Summary] [Transcript] [Tasks]     │
│  ═════════                          │
│                                     │
│  📋 Summary                         │
│  ┌─────────────────────────────┐    │
│  │ The team discussed Q4       │    │
│  │ priorities including the    │    │
│  │ new API integration and     │    │
│  │ upcoming client demo...     │    │
│  └─────────────────────────────┘    │
│                                     │
│  🎯 Key Decisions                   │
│  • API v2 launch pushed to Jan     │
│  • New hire starts Monday          │
│  • Demo scheduled for Dec 15       │
│                                     │
│  ✅ Action Items (5)                │
│  ┌─────────────────────────────┐    │
│  │ ⬜ Prepare demo materials    │    │
│  │    @John • Due: Dec 14      │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ ⬜ Review API documentation  │    │
│  │    @Sarah • Due: Dec 13     │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│   [🏠]  [📝]  [➕]  [📋]  [👤]    │
└─────────────────────────────────────┘
```

---

## 9. Todo Management

### 9.1 Todos Main Screen

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░ Status Bar ░░░░░░░░░░░░ │
├─────────────────────────────────────┤
│                                     │
│  Todos                    [+ Add]   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔍 Search todos...          │    │
│  └─────────────────────────────┘    │
│                                     │
│  [All] [Pending] [Completed]        │
│  ═════                              │
│                                     │
│  Status      Priority     Sort ▼    │
│  [All ▼]     [All ▼]      [Date]   │
│                                     │
│  ═══════════════════════════════    │
│                                     │
│  Overdue (2)                   [▼]  │
│  ┌─────────────────────────────┐    │
│  │ ⬜ Review frontend mockups   │    │
│  │    📄 Team Standup           │    │
│  │    🔴 High • Due: Dec 8     │    │
│  │    ⚠️ 2 days overdue        │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ ⬜ Send meeting notes        │    │
│  │    📄 Client Call            │    │
│  │    🟡 Medium • Due: Dec 9   │    │
│  │    ⚠️ 1 day overdue         │    │
│  └─────────────────────────────┘    │
│                                     │
│  Today (3)                     [▼]  │
│  ┌─────────────────────────────┐    │
│  │ ⬜ Set up API endpoints      │    │
│  │    📄 Team Standup           │    │
│  │    🔴 High • Due: Today     │    │
│  └─────────────────────────────┘    │
│  ...                                │
│                                     │
│  This Week (5)                 [▼]  │
│  ...                                │
│                                     │
│  No Due Date (8)               [▼]  │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│   [🏠]  [📝]  [➕]  [📋]  [👤]    │
└─────────────────────────────────────┘
```

### 9.2 Todo Item Design

**Card Layout:**

```
┌────────────────────────────────────────┐
│ [☐/☑]  Task title goes here and can   │
│         wrap to multiple lines         │
│                                        │
│   📄 Source note name                  │
│   🔴 High  •  Due: Dec 10              │
│                                        │
└────────────────────────────────────────┘

Specifications:
  - Checkbox: 24px, left aligned
  - Title: H3 (completed = strikethrough + muted)
  - Source note: Caption, with icon, tappable
  - Priority badge: Colored dot + text
  - Due date: Relative or absolute

Priority Colors:
  - 🔴 High: Red-500
  - 🟡 Medium: Amber-500
  - 🟢 Low: Green-500
  - ⚪ None: Gray-400

Overdue Styling:
  - Red background tint
  - Warning icon
  - "X days overdue" text
```

### 9.3 Todo Interactions

**Swipe Gestures:**

```
Swipe Right (Complete):
  - Green background reveals
  - Checkmark icon appears
  - Release: Mark as complete
  - Animation: Item slides out, checkmark burst
  - Haptic: Success

Swipe Left (Delete):
  - Red background reveals
  - Trash icon appears
  - Release: Delete with undo toast
  - Animation: Item slides out, shrinks
  - Haptic: Warning

Swipe Thresholds:
  - 30%: Action preview (dim)
  - 50%: Action committed (vibrant)
  - Release at >50%: Execute action
```

**Tap Interactions:**

```
Tap Checkbox:
  - Toggle completion
  - Checkmark draws on animation
  - Item moves to completed section
  - Haptic: Light

Tap Card:
  - Expand inline for editing
  - Or navigate to edit modal

Long Press:
  - Quick actions menu
  - Options: Edit, Delete, Change Priority, Set Deadline
```

### 9.4 Add/Edit Todo Modal

```
┌─────────────────────────────────────┐
│  ─────                              │
│                                     │
│  New Task              [Save]       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Task description...         │    │
│  │                             │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Priority                           │
│  (●) High  (○) Medium  (○) Low     │
│                                     │
│  Due Date                           │
│  ┌─────────────────────────────┐    │
│  │ 📅  No due date        [▼] │    │
│  └─────────────────────────────┘    │
│                                     │
│  Linked Note                        │
│  ┌─────────────────────────────┐    │
│  │ 📄  Select note...     [▼] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │        Create Task          │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Cancel]                           │
│                                     │
└─────────────────────────────────────┘
```

### 9.5 Filter & Sort Options

**Filter Bottom Sheet:**

```
┌─────────────────────────────────────┐
│  ─────                              │
│                                     │
│  Filter Todos                       │
│                                     │
│  Status                             │
│  [All] [Pending] [Completed]        │
│                                     │
│  Priority                           │
│  [All] [🔴 High] [🟡 Med] [🟢 Low]   │
│                                     │
│  Source                             │
│  [All Notes ▼]                      │
│                                     │
│  Due Date                           │
│  [Any Time ▼]                       │
│  - Overdue                          │
│  - Today                            │
│  - This Week                        │
│  - This Month                       │
│  - No Due Date                      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      Apply Filters          │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Reset All]                        │
│                                     │
└─────────────────────────────────────┘
```

**Sort Options:**

- Due Date (default)
- Priority
- Date Created
- Note Title
- Alphabetical

---

## 10. Profile & Settings

### 10.1 Profile Screen

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░ Status Bar ░░░░░░░░░░░░ │
├─────────────────────────────────────┤
│                                     │
│  Profile                            │
│                                     │
│         ┌───────────────┐           │
│         │               │           │
│         │   [Avatar]    │           │
│         │      JS       │           │
│         │    [📷]       │           │
│         │               │           │
│         └───────────────┘           │
│                                     │
│         John Smith                  │
│         john@example.com            │
│         Member since Dec 2024       │
│                                     │
│  ═══════════════════════════════    │
│                                     │
│  Account                            │
│  ┌─────────────────────────────┐    │
│  │ 👤 Display Name          →  │    │
│  │     John Smith               │    │
│  ├─────────────────────────────┤    │
│  │ 📧 Email (read-only)        │    │
│  │     john@example.com         │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🚪 Sign Out                 │    │
│  └─────────────────────────────┘    │
│                                     │
│         Version 1.0.0               │
│                                     │
├─────────────────────────────────────┤
│   [🏠]  [📝]  [➕]  [📋]  [👤]    │
└─────────────────────────────────────┘
```

**Profile Features (matching web):**

```
Avatar Management:
  - Display user avatar (from OAuth or uploaded)
  - Camera icon button to upload new avatar
  - Max file size: 5MB
  - Supported formats: JPG, PNG, GIF
  - Replaces previous avatar on upload

Profile Fields:
  - Display name: Editable text field
  - Email: Read-only (from authentication)
  - Account creation date: Display only

Actions:
  - Save changes (auto-save or manual)
  - Success/error feedback messages
  - Sign out button
```

---

## 11. Upload Flow

### 11.1 Upload Initiation (From FAB)

**Quick Action Selection:**

```
After tapping center FAB (+):

┌─────────────────────────────────────┐
│                                     │
│                                     │
│    ┌───────┐    ┌───────┐          │
│    │ 📁    │    │ 🎥    │          │
│    │Upload │    │Start  │          │
│    └───────┘    │Meeting│          │
│                 └───────┘          │
│    ┌───────┐                       │
│    │ 🔗    │                       │
│    │Join   │                       │
│    │Meeting│                       │
│    └───────┘                       │
│                                     │
│                 [ × ]               │
│                                     │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                     │
│   [🏠]  [📝]  [➕]  [📋]  [👤]    │
└─────────────────────────────────────┘
```

**Quick Actions (matching web):**

```
Available Options:
  1. Upload - Open file picker for audio/video/documents
  2. Start Meeting - Create new meeting room instantly
  3. Join Meeting - Enter meeting code to join

Note: Recording is only available within meetings (not standalone).
Audio files can be uploaded via the Upload option.
```

### 11.2 File Upload Flow

**File Selection:**

```
┌─────────────────────────────────────┐
│  ─────                              │
│                                     │
│  Upload File                        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │     [Drag & Drop Area]      │    │
│  │                             │    │
│  │      📁 Tap to browse       │    │
│  │      or drag files here     │    │
│  │                             │    │
│  │     Supports: Audio, Video, │    │
│  │     PDF, DOCX, TXT          │    │
│  │     Max: 100MB              │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Quick Access                       │
│  ┌─────────┐ ┌─────────┐           │
│  │ 📷      │ │ 📁      │           │
│  │ Camera  │ │ Files   │           │
│  │ Roll    │ │ App     │           │
│  └─────────┘ └─────────┘           │
│                                     │
│  Recent Files                       │
│  ┌─────────────────────────────┐    │
│  │ 🎵 meeting_audio.mp3        │    │
│  │    Yesterday • 15 MB        │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 📄 document.pdf             │    │
│  │    2 days ago • 2 MB        │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### 11.4 Upload Confirmation

```
┌─────────────────────────────────────┐
│ ← Upload                   [Upload] │
├─────────────────────────────────────┤
│                                     │
│  Selected Files                     │
│  ┌─────────────────────────────┐    │
│  │  🎵 meeting_recording.mp3   │    │
│  │     45 MB • Audio           │    │
│  │                     [×]     │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │  📄 notes.pdf               │    │
│  │     2 MB • Document         │    │
│  │                     [×]     │    │
│  └─────────────────────────────┘    │
│                                     │
│  Note Title                         │
│  ┌─────────────────────────────┐    │
│  │ Weekly Team Meeting         │    │
│  └─────────────────────────────┘    │
│  (Auto-generated from first file)   │
│                                     │
│  Options                            │
│  ┌─────────────────────────────┐    │
│  │ ✅ Generate Action Items    │    │
│  │    (Todos)            [●○]  │    │
│  │                             │    │
│  │    AI will analyze and      │    │
│  │    extract actionable tasks │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     Upload (2 files)        │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Upload Rules (matching web):**

```
File Constraints:
  - Maximum 100MB per file
  - One audio/video file per note (enforced)
  - Unlimited document files per note

Supported Formats:
  - Audio: MP3, WAV, M4A, FLAC, OGG, WEBM
  - Video: MP4, WEBM
  - Documents: PDF, DOCX, DOC, TXT

Auto-Features:
  - Title auto-generated from first file name
  - Transcription automatic for audio/video
  - AI analysis automatic (summary, topics)
  - Action item extraction optional (checkbox)
```

### 11.5 Upload Progress (Persistent)

**Floating Progress Indicator:**

```
Position: Above bottom nav, right side
Size: Compact pill

Collapsed (while uploading):
┌─────────────────────────┐
│  📤 Uploading... 45%    │
│  ████████░░░░░░░░░░░░░  │
└─────────────────────────┘

Expanded (tap to expand):
┌─────────────────────────────────────┐
│  Upload Progress              [×]   │
│                                     │
│  📄 Weekly Team Meeting             │
│  ████████████████░░░░ 78%          │
│  Uploading... 35 MB / 45 MB        │
│                                     │
│  Next: Transcribing                 │
│                                     │
│  [Cancel]                           │
└─────────────────────────────────────┘

Processing stages:
1. Uploading (progress bar)
2. Processing (spinning)
3. Transcribing (progress %)
4. Analyzing (spinning)
5. Complete (checkmark)
```

**Completion Notification:**

```
In-app toast:
┌─────────────────────────────────────┐
│  ✓ "Weekly Meeting" ready           │
│    Tap to view transcript           │
└─────────────────────────────────────┘

Duration: 4 seconds
Action: Tap navigates to note
Dismiss: Swipe away
```

---

## 12. Micro-interactions & Animations

### 12.1 Button Interactions

**Primary Button:**

```
Default → Hover → Press → Release

States:
  - Default: Base color, shadow
  - Hover/Focus: Slightly lighter, larger shadow
  - Press: Scale 0.97, darker color, less shadow
  - Loading: Width contracts, spinner appears
  - Success: Green color, checkmark animates
  - Error: Shake animation, red flash

Timing:
  - Hover: 150ms ease-out
  - Press: 100ms ease-in
  - Release: 200ms spring
  - Loading transition: 300ms
```

**Icon Button:**

```
Interactions:
  - Tap: Scale 0.9 → 1.0 with bounce
  - Hold: Scale 0.85, context menu appears
  - Release: Spring back

Special buttons:
  - Like/favorite: Heart fills with burst particles
  - Delete: Icon shakes slightly
  - Copy: Checkmark replaces icon briefly
```

### 12.2 Card Interactions

**List Card:**

```
Tap:
  - Background highlight (50ms)
  - Scale 0.98 (100ms)
  - Navigate transition begins

Long Press:
  - Scale 0.97 (200ms)
  - Background darkens
  - Context menu fades in
  - Haptic feedback

Swipe:
  - Action color reveals
  - Icon slides into view
  - Rubber-band at threshold
  - Snap to complete or cancel
```

**Expandable Card:**

```
Expand Animation:
  - Height animates (300ms spring)
  - Content fades in (150ms delay)
  - Chevron rotates 180°
  - Other cards push down

Collapse Animation:
  - Content fades out (100ms)
  - Height animates (250ms)
  - Chevron rotates back
```

### 12.3 Navigation Animations

**Tab Switch:**

```
Duration: 250ms
Easing: ease-in-out

Content:
  - Current: Fade out + slide out (direction based)
  - New: Fade in + slide in

Tab Bar:
  - Indicator slides to new position (spring)
  - Icon: Unfilled → Filled morph
  - Label: Opacity change
```

**Push Navigation:**

```
Duration: 350ms
Easing: cubic-bezier(0.2, 0.8, 0.2, 1)

Forward (push):
  - Current screen slides left 30%
  - New screen slides in from right
  - Slight parallax effect

Back (pop):
  - Current screen slides right (out)
  - Previous screen slides in from left
  - Edge swipe gesture supported
```

**Modal Presentation:**

```
Duration: 400ms
Easing: spring (damping: 0.8)

Present:
  - Background dims (fade to 50% black)
  - Modal slides up from bottom
  - Slight scale-up as it appears

Dismiss:
  - Drag down gesture
  - Velocity-based: fast flick dismisses
  - Rubber-band if not past threshold
  - Background undims
```

### 12.4 List Animations

**Item Appearance (Initial Load):**

```
Stagger: 50ms between items
Duration: 300ms each
Effect: Fade in + slide up

Item 1: 0ms delay
Item 2: 50ms delay
Item 3: 100ms delay
...

Max visible stagger: First 10 items
Rest appear instantly
```

**Item Addition:**

```
Duration: 250ms
Effect: Height expands from 0, content fades in
Other items slide down to accommodate
```

**Item Removal:**

```
Duration: 200ms
Effect: Slide out direction + height collapse
Other items slide up
Optional: Undo toast appears
```

**Reorder:**

```
Long press to initiate
Item lifts (scale 1.05, shadow increases)
Drag: Item follows finger
Other items animate around
Release: Item settles into place
Haptic on pickup and drop
```

### 12.5 Loading Animations

**Skeleton Screens:**

```
Content placeholders:
  - Gray rectangles matching content shape
  - Shimmer animation: Gradient slides across
  - Duration: 1.5s, infinite loop
  - Direction: Left to right

Shimmer gradient:
  - rgba(255,255,255,0) → rgba(255,255,255,0.5) → rgba(255,255,255,0)
```

**Spinner:**

```
Primary spinner:
  - Circular, primary color
  - Stroke dasharray animation
  - Rotation: 1s linear infinite

Button spinner:
  - Smaller (16px)
  - White color
  - Same animation
```

**Progress Indicators:**

```
Linear progress:
  - Height: 4px
  - Background: Gray-200
  - Fill: Primary gradient
  - Animation: Width change (spring)

Circular progress:
  - Size: 48px
  - Stroke width: 4px
  - Clockwise fill animation
  - Percentage in center (optional)
```

### 12.6 Feedback Animations

**Success:**

```
Checkmark Draw:
  - Circle appears (scale up)
  - Checkmark draws on (stroke animation)
  - Color: Green-500
  - Duration: 500ms
  - Optional: Confetti burst

Toast:
  - Slides in from top
  - Green accent bar
  - Auto-dismiss after 3s
```

**Error:**

```
Shake:
  - Horizontal oscillation
  - 3 shakes, 50ms each
  - Amplitude: 10px
  - Easing: ease-in-out

Error state:
  - Red border glow
  - Error message slides down
  - Icon: X or warning
```

**Warning:**

```
Pulse:
  - Scale 1.0 → 1.05 → 1.0
  - Duration: 600ms
  - Amber color glow
```

### 12.7 Special Animations

**Recording Indicator:**

```
Red dot:
  - Size: 12px
  - Opacity: 1.0 → 0.3 → 1.0
  - Duration: 1s, infinite
  - Optional: Growing ring effect

Border glow:
  - Red shadow pulses
  - Synchronized with dot
```

**Speaking Indicator:**

```
Avatar ring:
  - Green border appears
  - Opacity pulses with audio level
  - Ring can scale slightly

Alternative (bars):
  - 3-5 vertical bars
  - Height varies with audio
  - Animated continuously while speaking
```

**AI Processing:**

```
Sparkle effect:
  - Small stars animate around element
  - Random positions
  - Fade in, drift, fade out
  - Continuous while processing

Shimmer:
  - Gradient shimmer across AI-generated content
  - Indicates "AI enhanced"
```

**Pull to Refresh:**

```
Pull phase:
  - Custom indicator: App logo
  - Rotation increases with pull distance
  - Threshold indicator (e.g., checkmark appears)

Refresh phase:
  - Logo spins continuously
  - "Syncing..." text
  - Duration: Until data loads

Release phase:
  - Success checkmark
  - Content updates with fade
  - Indicator retracts
```

---

## 13. Dark Mode Implementation

### 13.1 Color Mapping

| Light Mode | Dark Mode | Usage          |
| ---------- | --------- | -------------- |
| #FAFBFC    | #0A0A0B   | Background     |
| #FFFFFF    | #141416   | Surface        |
| #F8FAFC    | #1C1C1F   | Surface-2      |
| #E2E8F0    | #27272A   | Border         |
| #0F172A    | #FAFAFA   | Text Primary   |
| #475569    | #A1A1AA   | Text Secondary |
| #94A3B8    | #71717A   | Text Muted     |
| #3B82F6    | #60A5FA   | Primary        |
| #10B981    | #34D399   | Success        |
| #F59E0B    | #FBBF24   | Warning        |
| #EF4444    | #F87171   | Error          |

### 13.2 Glassmorphism Adjustments

**Light Mode:**

```css
.glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
```

**Dark Mode:**

```css
.glass-dark {
  background: rgba(20, 20, 22, 0.75);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### 13.3 Shadow Adjustments

**Dark mode shadows:**

- Use larger blur radius
- Higher opacity
- Consider colored shadows for primary elements
- Reduce overall shadow usage in favor of borders

```css
/* Light mode */
.card {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Dark mode */
.card-dark {
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

### 13.4 Image & Media Handling

```
Considerations:
- Reduce image brightness slightly in dark mode
- Add subtle dark overlay to bright images
- Invert icons that are pure black
- Adjust illustration colors

Implementation:
- CSS filter: brightness(0.9) for images
- Or use separate dark mode assets
```

### 13.5 Transition Animation

```css
/* Theme transition */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s
      ease;
}

/* Prevent flash */
html {
  color-scheme: light dark;
}
```

---

## 14. Accessibility Guidelines

### 14.1 Touch Targets

```
Minimum sizes:
  - Interactive elements: 44x44 pt (iOS) / 48x48 dp (Android)
  - Spacing between targets: 8px minimum

Exceptions:
  - Inline text links (ensure adequate line height)
  - Dense data tables (provide alternative views)
```

### 14.2 Color Contrast

```
Requirements:
  - Normal text: 4.5:1 minimum
  - Large text (18pt+): 3:1 minimum
  - UI components: 3:1 minimum

Verification:
  - Test all color combinations
  - Don't rely on color alone for meaning
  - Add icons/patterns as secondary indicators
```

### 14.3 Screen Reader Support

```
Labels:
  - All interactive elements have labels
  - Images have alt text or decorative role
  - Icons have tooltips/labels

Announcements:
  - Loading states announced
  - Errors announced immediately
  - Success confirmations announced

Structure:
  - Proper heading hierarchy
  - Landmarks for navigation
  - Focus management on modals
```

### 14.4 Motion Sensitivity

```
Reduced motion support:
  - Respect prefers-reduced-motion
  - Replace animations with fades
  - Keep essential feedback animations
  - Disable parallax effects

Implementation:
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 14.5 Text Scaling

```
Support:
  - Dynamic Type (iOS)
  - Font scaling (Android)
  - Test at 200% scale

Guidelines:
  - Use relative units (rem, em)
  - Allow text to wrap
  - Ensure layouts adapt
  - Don't truncate important info
```

---

## 15. Component Library

### 15.1 Buttons

| Type          | Use Case                | Appearance                             |
| ------------- | ----------------------- | -------------------------------------- |
| **Primary**   | Main CTA                | Solid primary color, shadow, bold text |
| **Secondary** | Secondary actions       | Outlined, primary color border         |
| **Ghost**     | Tertiary actions        | No background, primary text            |
| **Danger**    | Destructive actions     | Red color, use sparingly               |
| **Icon**      | Actions with icons only | Circle/rounded square, subtle bg       |
| **FAB**       | Floating action         | Large, gradient, elevated              |

### 15.2 Inputs

| Type            | Description                        |
| --------------- | ---------------------------------- |
| **Text Input**  | Single line, floating label        |
| **Text Area**   | Multi-line, auto-expand            |
| **Search**      | Rounded, search icon, clear button |
| **Select**      | Dropdown with chevron              |
| **Switch**      | Toggle boolean                     |
| **Checkbox**    | Multiple selection                 |
| **Radio**       | Single selection                   |
| **Slider**      | Range value                        |
| **Date Picker** | Calendar modal                     |

### 15.3 Cards

| Type                | Use Case             |
| ------------------- | -------------------- |
| **Note Card**       | Display note summary |
| **Meeting Card**    | Display meeting info |
| **Todo Card**       | Display task item    |
| **Stats Card**      | Display metrics      |
| **Expandable Card** | Collapsible content  |
| **Action Card**     | Card with CTA        |

### 15.4 Feedback

| Type             | Use Case                  |
| ---------------- | ------------------------- |
| **Toast**        | Brief notifications       |
| **Snackbar**     | Notifications with action |
| **Alert**        | Important messages        |
| **Modal**        | Confirmations, forms      |
| **Bottom Sheet** | Contextual options        |
| **Progress Bar** | Linear progress           |
| **Spinner**      | Indeterminate loading     |
| **Skeleton**     | Content placeholder       |

### 15.5 Navigation

| Type                  | Use Case               |
| --------------------- | ---------------------- |
| **Tab Bar**           | Primary navigation     |
| **Header**            | Screen title + actions |
| **Back Button**       | Navigation back        |
| **Segmented Control** | View switching         |
| **Breadcrumbs**       | Hierarchy navigation   |
| **Bottom Sheet Nav**  | Overflow actions       |

---

## 16. Gesture System

### 16.1 Standard Gestures

| Gesture         | Action                        |
| --------------- | ----------------------------- |
| **Tap**         | Primary action, selection     |
| **Double Tap**  | Secondary action (e.g., zoom) |
| **Long Press**  | Context menu, drag initiation |
| **Swipe Left**  | Delete, secondary action      |
| **Swipe Right** | Complete, primary action      |
| **Pull Down**   | Refresh                       |
| **Pinch**       | Zoom (images, transcripts)    |
| **Edge Swipe**  | Back navigation               |

### 16.2 Custom Gestures

**Video PiP:**

```
- Drag: Move around screen
- Double tap: Swap with main video
- Pinch: Resize
- Swipe away: Minimize
```

**Audio Waveform:**

```
- Tap: Seek to position
- Long press + drag: Fine scrubbing
- Double tap: Toggle play/pause
```

**Transcript:**

```
- Tap word: Seek audio
- Long press: Copy text
- Pinch: Adjust text size
- Two-finger swipe: Quick scroll
```

### 16.3 Gesture Feedback

```
Visual:
  - Highlight on touch
  - Action preview on swipe
  - Rubber-band at boundaries

Haptic:
  - Light: Selection changes
  - Medium: Actions committed
  - Heavy: Destructive actions
  - Success: Task completion
  - Error: Invalid action
```

---

## 17. Haptic Feedback System

### 17.1 Feedback Types (iOS)

| Type              | When to Use                     |
| ----------------- | ------------------------------- |
| **Selection**     | Picker changes, toggles         |
| **Light Impact**  | Button taps, card selections    |
| **Medium Impact** | Significant actions, thresholds |
| **Heavy Impact**  | Destructive actions, errors     |
| **Success**       | Task completion                 |
| **Warning**       | Approaching limits              |
| **Error**         | Failed actions                  |

### 17.2 Feedback Types (Android)

| Type             | When to Use         |
| ---------------- | ------------------- |
| **Click**        | Button taps         |
| **Double Click** | Confirmations       |
| **Heavy Click**  | Significant actions |
| **Tick**         | Incremental changes |

### 17.3 Usage Guidelines

```
DO:
  - Use for important interactions
  - Match intensity to action importance
  - Be consistent across similar actions
  - Respect user haptic settings

DON'T:
  - Overuse (causes fatigue)
  - Use for passive updates
  - Use during continuous gestures (except at thresholds)
  - Use for decorative purposes
```

---

## 18. Loading & Empty States

### 18.1 Loading States

**Skeleton Screens (Preferred):**

```
Use for:
  - Initial page loads
  - List items loading
  - Content-heavy screens

Design:
  - Match content layout exactly
  - Use rounded rectangles
  - Shimmer animation
  - Show realistic proportions
```

**Spinner (Minimal):**

```
Use for:
  - Quick actions (< 2 seconds expected)
  - Button loading states
  - Inline loading

Design:
  - Centered in context
  - Primary color
  - Don't block entire screen if possible
```

**Progress Indicator:**

```
Use for:
  - File uploads
  - Long processes
  - Known duration actions

Design:
  - Show percentage when possible
  - Time remaining estimate
  - Cancel option
```

### 18.2 Empty States

**Structure:**

```
┌─────────────────────────────────────┐
│                                     │
│     [Illustration/Icon]             │
│                                     │
│     Primary Message                 │
│     (What's missing)                │
│                                     │
│     Secondary Message               │
│     (What to do about it)           │
│                                     │
│     [CTA Button]                    │
│                                     │
└─────────────────────────────────────┘
```

**Examples:**

No Notes:

- Icon: Empty folder with document
- Primary: "No notes yet"
- Secondary: "Upload an audio file or start a meeting to get started"
- CTA: "Upload File"

No Search Results:

- Icon: Magnifying glass with X
- Primary: "No results found"
- Secondary: "Try different keywords or check your filters"
- CTA: "Clear Filters"

No Todos:

- Icon: Checkmark with sparkles
- Primary: "All caught up!"
- Secondary: "Your tasks from meetings will appear here"
- CTA: None (celebratory state)

### 18.3 Error States

**Inline Error:**

```
- Red border on input
- Error message below
- Error icon
- Shake animation
```

**Page-Level Error:**

```
- Full screen or modal
- Friendly illustration
- Clear error message
- Retry action
- Report option
```

**Network Error:**

```
- Icon: Cloud with X
- Primary: "Connection issue"
- Secondary: "Check your internet and try again"
- CTA: "Retry"
- Show cached content if available
```

---

## 19. Error Handling UX

### 19.1 Error Types & Responses

| Error Type     | Response                          |
| -------------- | --------------------------------- |
| **Validation** | Inline feedback, highlight fields |
| **Network**    | Toast/banner, retry option        |
| **Auth**       | Redirect to login, explain why    |
| **Permission** | Explain need, link to settings    |
| **Not Found**  | Friendly 404, navigation options  |
| **Server**     | Apologize, retry/report options   |
| **Timeout**    | Notify, auto-retry option         |

### 19.2 Error Messages

**Guidelines:**

```
DO:
  - Be specific about what went wrong
  - Suggest how to fix it
  - Use plain language
  - Provide actions

DON'T:
  - Show error codes to users
  - Blame the user
  - Use technical jargon
  - Leave user without next steps
```

**Examples:**

```
❌ "Error 500: Internal Server Error"
✅ "Something went wrong on our end. Please try again in a moment."

❌ "Invalid input"
✅ "Please enter a valid email address"

❌ "Network request failed"
✅ "Can't connect. Check your internet and try again."
```

### 19.3 Recovery Options

```
Always provide:
  1. Retry action (when applicable)
  2. Alternative path (e.g., offline mode)
  3. Help/support link
  4. Way to report issue

Auto-recovery:
  - Retry network requests automatically (with backoff)
  - Save drafts locally
  - Sync when connection restored
```

---

## 20. Performance Optimization

### 20.1 App Launch

```
Target: < 2 seconds to interactive

Strategies:
  - Show splash screen immediately
  - Load critical content first
  - Defer non-essential initialization
  - Use cached data initially
  - Prefetch common screens
```

### 20.2 Animation Performance

```
Targets:
  - 60 FPS for all animations
  - No jank or frame drops

Strategies:
  - Use native driver when possible
  - Avoid layout thrashing
  - Reduce overdraw
  - Use will-change hints
  - Batch DOM updates
```

### 20.3 List Performance

```
Strategies:
  - Virtualized lists (only render visible)
  - Recycled views
  - Lazy loading images
  - Placeholder content
  - Pagination or infinite scroll
```

### 20.4 Image Optimization

```
Strategies:
  - Responsive images (multiple sizes)
  - Lazy loading
  - WebP format
  - Blur-up placeholders
  - CDN delivery
  - Cache aggressively
```

### 20.5 Network Optimization

```
Strategies:
  - Request batching
  - Response caching
  - Compression
  - Pagination
  - Prefetching
  - Offline support
```

### 20.6 Battery Optimization

```
Strategies:
  - Reduce background activity
  - Batch network requests
  - Use efficient polling intervals
  - Dark mode (OLED savings)
  - Minimize GPS/sensor usage
```

---

## Appendix A: Design Tokens (JSON)

```json
{
  "colors": {
    "primary": {
      "50": "#EFF6FF",
      "500": "#3B82F6",
      "600": "#2563EB"
    },
    "gray": {
      "50": "#F9FAFB",
      "900": "#111827"
    }
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32
  },
  "borderRadius": {
    "sm": 8,
    "md": 12,
    "lg": 16,
    "full": 9999
  },
  "typography": {
    "display": {
      "size": 34,
      "weight": 700,
      "lineHeight": 41
    },
    "body": {
      "size": 15,
      "weight": 400,
      "lineHeight": 22
    }
  }
}
```

---

## Appendix B: Animation Timing Reference

```
Micro-interactions: 100-200ms
Standard transitions: 250-350ms
Complex animations: 400-600ms
Page transitions: 300-400ms
Spring damping: 0.7-0.9
Spring stiffness: 100-200
```

---

## Appendix C: Accessibility Checklist

- [ ] All touch targets ≥ 44pt
- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Screen reader labels on all interactive elements
- [ ] Focus states visible
- [ ] Reduced motion support
- [ ] Dynamic type support
- [ ] No reliance on color alone
- [ ] Keyboard navigation (external keyboards)
- [ ] VoiceOver/TalkBack tested
- [ ] Error announcements

---

## Appendix D: Platform-Specific Notes

### iOS (Swift UI / UIKit)

- Use SF Symbols for icons
- Follow Human Interface Guidelines
- Support Dynamic Type
- Implement haptics with UIImpactFeedbackGenerator
- Use native gestures and springs

### Android (Jetpack Compose / XML)

- Use Material Design 3 components
- Follow Material You guidelines
- Support edge-to-edge display
- Implement haptics with HapticFeedback
- Use predictive back gestures (Android 14+)

---

## Appendix E: File/Folder Structure (Design Assets)

```
/design
  /tokens
    colors.json
    typography.json
    spacing.json
  /components
    /buttons
    /cards
    /inputs
    /navigation
  /screens
    /onboarding
    /auth
    /dashboard
    /notes
    /meetings
    /todos
    /profile
  /icons
    /filled
    /outlined
  /illustrations
    /empty-states
    /onboarding
    /error
  /animations
    /lottie
    /rive
```

---

_Document Version: 1.0_
_Last Updated: December 2024_
_Designed for: MinuteAI Mobile App (iOS & Android)_
