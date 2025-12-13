# Architecture & Configuration

## Project Structure

```
minuteai-mobile/
├── app/                          # Expo Router file-based routing
│   ├── (auth)/                   # Auth group (login, register)
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Dashboard/Notes list
│   │   ├── meetings.tsx          # Active meetings
│   │   └── profile.tsx           # User settings
│   ├── notes/[id].tsx            # Note detail screen
│   ├── meeting/[roomId].tsx      # Live meeting room
│   └── _layout.tsx               # Root layout
├── components/
│   ├── ui/                       # Reusable UI primitives
│   ├── meeting/                  # Meeting-specific components
│   ├── notes/                    # Note-related components
│   └── animations/               # Shared animated components
├── hooks/                        # Custom React hooks
├── lib/
│   ├── supabase.ts              # Supabase client config
│   ├── api.ts                   # API client wrapper
│   └── webrtc/                  # WebRTC utilities
├── stores/                       # Zustand state stores
├── utils/                        # Helper functions
├── constants/                    # App constants, theme
└── types/                        # TypeScript definitions
```

## Expo Configuration

### app.json
```json
{
  "expo": {
    "name": "MinuteAI",
    "slug": "minuteai",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-av",
      "expo-file-system",
      "expo-document-picker",
      "expo-haptics",
      [
        "expo-camera",
        { "cameraPermission": "Allow MinuteAI to access camera for video meetings" }
      ],
      [
        "expo-av",
        { "microphonePermission": "Allow MinuteAI to access microphone for recording" }
      ]
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.minuteai.app",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Required for audio recording and meetings",
        "NSCameraUsageDescription": "Required for video meetings",
        "UIBackgroundModes": ["audio"]
      }
    },
    "android": {
      "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png" },
      "package": "com.minuteai.app",
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS"
      ]
    }
  }
}
```

## Core Dependencies

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "expo-av": "~14.0.0",
    "expo-camera": "~15.0.0",
    "expo-file-system": "~17.0.0",
    "expo-document-picker": "~12.0.0",
    "expo-haptics": "~13.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-linear-gradient": "~13.0.0",

    "@supabase/supabase-js": "^2.39.0",
    "react-native-webrtc": "^118.0.0",
    "pusher-js": "^8.4.0",
    "zustand": "^4.5.0",

    "react-native-reanimated": "~3.10.0",
    "react-native-gesture-handler": "~2.16.0",
    "lottie-react-native": "^6.7.0",
    "@shopify/flash-list": "^1.6.0",
    "react-native-mmkv": "^2.12.0"
  }
}
```

## TypeScript Configuration

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@components/*": ["components/*"],
      "@hooks/*": ["hooks/*"],
      "@lib/*": ["lib/*"],
      "@stores/*": ["stores/*"]
    }
  }
}
```

## Environment Setup

```typescript
// lib/config.ts
import Constants from 'expo-constants';

export const config = {
  supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl,
  supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey,
  pusherKey: Constants.expoConfig?.extra?.pusherKey,
  pusherCluster: Constants.expoConfig?.extra?.pusherCluster,
  apiBaseUrl: Constants.expoConfig?.extra?.apiBaseUrl,
};
```

## Navigation Architecture

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="meeting/[roomId]"
            options={{
              presentation: 'fullScreenModal',
              animation: 'fade'
            }}
          />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
```

## Supabase Client

```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

## Best Practices

1. **New Architecture**: Enable Fabric renderer for better performance
2. **Secure Storage**: Use `expo-secure-store` for auth tokens
3. **File-based Routing**: Expo Router for type-safe navigation
4. **Path Aliases**: Clean imports with TypeScript paths
5. **Environment Variables**: Use `expo-constants` for config
