# Performance & Native Features

## Performance Optimization

### Image Optimization

```typescript
// components/ui/OptimizedImage.tsx
import { Image } from 'expo-image';

export function OptimizedImage({ source, style, ...props }) {
  return (
    <Image
      source={source}
      style={style}
      contentFit="cover"
      transition={200}
      placeholder={require('@/assets/placeholder.png')}
      cachePolicy="memory-disk"
      {...props}
    />
  );
}
```

### List Virtualization

```typescript
// components/notes/VirtualizedNotesList.tsx
import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo } from 'react';

export function VirtualizedNotesList({ notes, onRefresh, refreshing }) {
  // Memoize render function
  const renderItem = useCallback(({ item }) => (
    <MemoizedNoteCard note={item} />
  ), []);

  // Memoize key extractor
  const keyExtractor = useCallback((item: Note) => item.id, []);

  // Pre-compute estimated size
  const estimatedItemSize = useMemo(() => 100, []);

  return (
    <FlashList
      data={notes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={estimatedItemSize}
      onRefresh={onRefresh}
      refreshing={refreshing}
      drawDistance={250}
      removeClippedSubviews
      overrideItemLayout={(layout, item, index) => {
        layout.size = item.hasImage ? 200 : 100;
      }}
    />
  );
}

// Memoized card component
const MemoizedNoteCard = React.memo(NoteCard, (prev, next) => {
  return prev.note.id === next.note.id &&
         prev.note.updated_at === next.note.updated_at;
});
```

### Heavy Computation Offloading

```typescript
// utils/workers.ts
import { InteractionManager } from 'react-native';

// Defer heavy work until after animations
export function runAfterInteractions<T>(task: () => T): Promise<T> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve(task());
    });
  });
}

// Example usage
const processTranscript = async (text: string) => {
  return runAfterInteractions(() => {
    // Heavy text processing
    return formatTranscriptWithSpeakers(text);
  });
};
```

### Memory Management

```typescript
// hooks/useMemoryWarning.ts
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

export function useMemoryWarning(onWarning: () => void) {
  useEffect(() => {
    if (Platform.OS === 'ios') {
      // iOS memory warning listener
      const subscription = AppState.addEventListener(
        'memoryWarning',
        onWarning
      );
      return () => subscription.remove();
    }
  }, [onWarning]);
}

// Usage: Clear caches on memory warning
useMemoryWarning(() => {
  Image.clearMemoryCache();
  storage.clearAll();
});
```

## Native Device Features

### Camera & Microphone

```typescript
// hooks/useMediaPermissions.ts
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

export function useMediaPermissions() {
  const [cameraPermission, requestCamera] = Camera.useCameraPermissions();
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);

  const requestAudio = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    setAudioPermission(granted);
    return granted;
  };

  const requestAll = async () => {
    const [camera, audio] = await Promise.all([
      requestCamera(),
      requestAudio(),
    ]);
    return camera.granted && audio;
  };

  return {
    camera: cameraPermission?.granted,
    audio: audioPermission,
    requestAll,
  };
}
```

### Audio Recording

```typescript
// hooks/useAudioRecorder.ts
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export function useAudioRecorder() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    setRecording(recording);
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (!recording) return null;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setIsRecording(false);

    // Get file info
    const info = await FileSystem.getInfoAsync(uri!);
    return {
      uri,
      duration: recording._finalDurationMillis,
      size: info.size,
    };
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
```

### Document Picker

```typescript
// hooks/useDocumentPicker.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const ALLOWED_TYPES = [
  'audio/*',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export function useDocumentPicker() {
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_TYPES,
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return [];

    return result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      size: asset.size,
      mimeType: asset.mimeType,
    }));
  };

  return { pickDocument };
}
```

### Haptic Feedback Patterns

```typescript
// utils/haptics.ts
import * as Haptics from 'expo-haptics';

export const haptics = {
  // UI interactions
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  press: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavyPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Notifications
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  // Selection
  selection: () => Haptics.selectionAsync(),
};
```

### Background Audio

```typescript
// Configure audio session for background playback
Audio.setAudioModeAsync({
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});
```

## Bundle Optimization

### Code Splitting

```typescript
// Lazy load heavy screens
const MeetingScreen = React.lazy(() => import('@/app/meeting/[roomId]'));

// Use Suspense for loading
<Suspense fallback={<FullScreenLoader />}>
  <MeetingScreen />
</Suspense>
```

### Tree Shaking

```typescript
// Import only what you need
import { format, parseISO } from 'date-fns';  // ✓ Good
// import * as dateFns from 'date-fns';       // ✗ Bad

import { impactAsync } from 'expo-haptics';   // ✓ Good
// import * as Haptics from 'expo-haptics';   // ✗ Less optimal
```

### Asset Optimization

```bash
# Compress images before bundling
npx expo-optimize

# Use WebP format for images
# Use Lottie JSON instead of GIFs
```

## Monitoring & Analytics

### Performance Tracking

```typescript
// utils/performance.ts
import * as Application from 'expo-application';

export function trackScreenLoad(screenName: string, loadTime: number) {
  // Send to analytics
  analytics.track('screen_load', {
    screen: screenName,
    load_time_ms: loadTime,
    app_version: Application.nativeApplicationVersion,
  });
}

// Usage with useEffect
useEffect(() => {
  const start = Date.now();
  return () => {
    trackScreenLoad('NoteDetail', Date.now() - start);
  };
}, []);
```

### Crash Reporting

```typescript
// Configure in app entry
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_DSN',
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2,
});
```

## Native Module Bridging

### WebRTC for Meetings

```typescript
// lib/webrtc/mobile.ts
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';

export async function createPeerConnection(config: RTCConfiguration) {
  const pc = new RTCPeerConnection(config);

  // Get local media stream
  const stream = await mediaDevices.getUserMedia({
    audio: true,
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });

  // Add tracks to connection
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
  });

  return { pc, localStream: stream };
}
```

## Best Practices Summary

1. **Images**: Use `expo-image` with caching, not React Native Image
2. **Lists**: FlashList for >50 items, memoize render items
3. **Animations**: Worklet-based (Reanimated), avoid JS thread
4. **Storage**: MMKV over AsyncStorage for speed
5. **Lazy Load**: Code split heavy screens and components
6. **Memory**: Clear caches on memory warnings
7. **Permissions**: Request just-in-time, explain why
8. **Background**: Configure audio mode for background playback
9. **Bundle**: Tree shake imports, optimize assets
10. **Monitor**: Track performance metrics and crashes
