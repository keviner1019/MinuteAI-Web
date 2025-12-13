# Feedback Systems

## Toast Notification System

```typescript
// components/ui/Toast.tsx
import Animated, {
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ message, type, duration = 3000, onDismiss }: ToastProps) {
  const translateY = useSharedValue(-100);

  useEffect(() => {
    translateY.value = withSpring(0);

    // Haptic based on type
    if (type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const timer = setTimeout(() => {
      translateY.value = withSpring(-100, {}, () => {
        runOnJS(onDismiss)();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -50) {
        translateY.value = withSpring(-100, {}, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const colors = {
    success: { bg: '#ECFDF5', border: '#10B981', icon: '✓' },
    error: { bg: '#FEF2F2', border: '#EF4444', icon: '✕' },
    warning: { bg: '#FFFBEB', border: '#F59E0B', icon: '!' },
    info: { bg: '#EFF6FF', border: '#3B82F6', icon: 'i' },
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: colors[type].bg, borderColor: colors[type].border },
          animatedStyle,
        ]}
      >
        <Text style={styles.icon}>{colors[type].icon}</Text>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

### Toast Context

```typescript
// contexts/ToastContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext<{
  show: (message: string, type: ToastType) => void;
}>({ show: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const show = useCallback((message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View style={styles.toastContainer}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
```

## Loading States

### Full Screen Loader

```typescript
// components/ui/FullScreenLoader.tsx
import LottieView from 'lottie-react-native';

export function FullScreenLoader({ message = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('@/assets/animations/loading.json')}
        autoPlay
        loop
        style={{ width: 120, height: 120 }}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
```

### Progress Indicator

```typescript
// components/ui/ProgressBar.tsx
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

export function ProgressBar({ progress, showLabel = true }) {
  const animatedWidth = useAnimatedStyle(() => ({
    width: withTiming(`${progress}%`, { duration: 300 }),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, animatedWidth]} />
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(progress)}%</Text>
      )}
    </View>
  );
}
```

### Upload Progress Card

```typescript
// components/ui/UploadProgressCard.tsx
export function UploadProgressCard({ task }: { task: UploadTask }) {
  const statusConfig = {
    pending: { label: 'Waiting...', color: '#6B7280' },
    uploading: { label: 'Uploading', color: '#3B82F6' },
    processing: { label: 'Processing', color: '#8B5CF6' },
    completed: { label: 'Complete', color: '#10B981' },
    error: { label: 'Failed', color: '#EF4444' },
  };

  const config = statusConfig[task.status];

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutUp}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.fileName} numberOfLines={1}>
          {task.fileName}
        </Text>
        <Text style={[styles.status, { color: config.color }]}>
          {config.label}
        </Text>
      </View>

      {task.status === 'uploading' && (
        <ProgressBar progress={task.progress} />
      )}

      {task.status === 'processing' && (
        <ActivityIndicator color={config.color} />
      )}

      {task.status === 'error' && (
        <Text style={styles.error}>{task.error}</Text>
      )}
    </Animated.View>
  );
}
```

## Error Handling

### Error Boundary

```typescript
// components/ErrorBoundary.tsx
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('@/assets/animations/error.json')}
        autoPlay
        loop={false}
        style={{ width: 150, height: 150 }}
      />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error.message}</Text>
      <AnimatedButton onPress={resetErrorBoundary}>
        <Text>Try Again</Text>
      </AnimatedButton>
    </View>
  );
}

export function AppErrorBoundary({ children }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error) => {
        // Log to analytics
        console.error('App Error:', error);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

### API Error Handler

```typescript
// utils/errorHandler.ts
import { useToast } from '@/contexts/ToastContext';

export function useErrorHandler() {
  const { show } = useToast();

  return (error: unknown) => {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 401:
          show('Session expired. Please log in again.', 'error');
          // Navigate to login
          break;
        case 403:
          show('You don\'t have permission for this action.', 'error');
          break;
        case 404:
          show('Resource not found.', 'error');
          break;
        case 429:
          show('Too many requests. Please wait.', 'warning');
          break;
        case 500:
          show('Server error. Please try again.', 'error');
          break;
        default:
          show(error.message || 'An error occurred.', 'error');
      }
    } else if (error instanceof Error) {
      show(error.message, 'error');
    } else {
      show('An unexpected error occurred.', 'error');
    }
  };
}
```

## Empty States

```typescript
// components/ui/EmptyState.tsx
import LottieView from 'lottie-react-native';

interface EmptyStateProps {
  animation: 'no-notes' | 'no-meetings' | 'no-results';
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ animation, title, description, action }: EmptyStateProps) {
  const animations = {
    'no-notes': require('@/assets/animations/empty-notes.json'),
    'no-meetings': require('@/assets/animations/empty-meetings.json'),
    'no-results': require('@/assets/animations/no-results.json'),
  };

  return (
    <View style={styles.container}>
      <LottieView
        source={animations[animation]}
        autoPlay
        loop
        style={{ width: 200, height: 200 }}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action && (
        <AnimatedButton onPress={action.onPress} variant="primary">
          <Text style={styles.buttonText}>{action.label}</Text>
        </AnimatedButton>
      )}
    </View>
  );
}
```

## Status Displays

### Connection Status

```typescript
// components/ui/ConnectionStatus.tsx
import NetInfo from '@react-native-community/netinfo';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  if (isConnected) return null;

  return (
    <Animated.View
      entering={SlideInUp}
      exiting={SlideOutUp}
      style={styles.banner}
    >
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}
```

### Recording Status Badge

```typescript
// components/meeting/RecordingBadge.tsx
export function RecordingBadge({ isRecording, duration }) {
  return (
    <Animated.View
      style={[
        styles.badge,
        isRecording && styles.recording,
      ]}
      entering={ZoomIn}
      exiting={ZoomOut}
    >
      {isRecording && (
        <Animated.View
          style={styles.dot}
          entering={FadeIn}
        />
      )}
      <Text style={styles.text}>
        {isRecording ? formatDuration(duration) : 'Not Recording'}
      </Text>
    </Animated.View>
  );
}
```

## Best Practices

1. **Immediate Feedback**: Show response within 100ms of user action
2. **Haptic Hierarchy**: Light for taps, Medium for actions, Heavy for errors
3. **Progressive Disclosure**: Show detailed errors only when helpful
4. **Recoverable Actions**: Provide retry/undo for failed operations
5. **Contextual Messages**: Tailor error messages to the specific context
6. **Offline Awareness**: Clearly indicate offline state and queued actions
