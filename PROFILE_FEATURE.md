# Profile Feature Documentation

## Overview

The profile feature allows users to customize their profile with a display name and profile picture. These profile details are displayed in meetings with speaking animation effects.

## Features Implemented

### 1. Profile Page (`/profile`)

- **Profile Picture Upload**: Users can upload a profile picture (max 5MB)
- **Display Name**: Users can set their display name
- **Account Information**: Shows email, account creation date, and last sign-in
- **Auto-save**: Changes are saved to the database

### 2. Avatar Component

Located: `components/ui/Avatar.tsx`

Features:

- Displays user profile pictures or a default user icon
- Speaking animation with pulsing green rings when user is talking
- Multiple sizes (sm, md, lg, xl)
- Smooth transitions and animations

Usage:

```tsx
<Avatar src={userProfile?.avatar_url} alt="User Name" size="xl" isSpeaking={isSpeaking} />
```

### 3. Meeting UI Updates

The meeting page now displays:

- User profile pictures instead of generic avatars
- User display names
- Speaking detection with visual feedback (animated green ring)
- Audio level detection to trigger speaking animations

### 4. Database Schema

Updated tables:

- `user_profiles`: Stores display_name and avatar_url
- Storage bucket `avatars`: Stores profile pictures with user-based folder structure

### 5. Storage Policies

- Users can only upload/update/delete their own avatars
- Public read access for all avatars
- Organized by user ID: `{userId}/{timestamp}.{ext}`

## How It Works

### Speaking Detection

1. Audio context analyzes the audio stream using Web Audio API
2. Frequency data is converted to an average audio level (0-1)
3. When level exceeds threshold (0.1), `isSpeaking` is set to true
4. The Avatar component receives `isSpeaking` and displays animation

### Avatar Animation

When speaking:

- Green pulsing ring appears
- Avatar scales up slightly
- Smooth CSS transitions for all effects
- Standard `animate-ping` and `animate-pulse` utilities

## File Structure

```
app/
  profile/
    page.tsx              # Profile settings page

components/
  ui/
    Avatar.tsx            # Reusable avatar component with speaking animation
  meeting/
    AudioCall.tsx         # Updated with avatar integration

hooks/
  useUserProfile.ts       # Hook to fetch user profile data

supabase/
  migrations/
    add_avatars_storage.sql  # Storage bucket and policies setup

types/
  index.ts              # Added UserProfile type
```

## Usage Instructions

### For Users

1. Navigate to Dashboard
2. Click "Profile" button
3. Click camera icon to upload profile picture
4. Enter display name
5. Click "Save Changes"
6. Profile picture and name will appear in all future meetings

### For Developers

To use the Avatar component in other parts of the app:

```tsx
import { Avatar } from '@/components/ui/Avatar';
import { useUserProfile } from '@/hooks/useUserProfile';

// In your component
const { profile } = useUserProfile(userId);

<Avatar
  src={profile?.avatar_url}
  alt={profile?.display_name || 'User'}
  size="lg"
  isSpeaking={audioLevel > threshold}
/>;
```

## Browser Compatibility

- Modern browsers with Web Audio API support
- Chrome, Firefox, Safari, Edge (latest versions)
- Requires microphone permissions for audio level detection

## Performance Considerations

- Avatar images are cached by Supabase CDN
- Audio level calculation runs on animation frame (60fps)
- Minimal CPU usage for speaking detection
- Images are optimized and limited to 5MB

## Future Enhancements

- Image cropping/editing before upload
- Multiple avatar upload with selection
- Status indicators (online, busy, away)
- Custom avatar colors/themes
- Participant profile viewing in meetings
