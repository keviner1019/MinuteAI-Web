# UI/UX Strategy

## Animation Framework

### Reanimated 3 Setup

```typescript
// components/animations/FadeIn.tsx
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';

// Shared animated values for micro-interactions
export const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

export const timingConfig = {
  duration: 200,
};
```

### Gesture-Driven Animations

```typescript
// components/notes/SwipeableNoteCard.tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export function SwipeableNoteCard({ note, onDelete, onArchive }) {
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((e) => {
      translateX.value = contextX.value + e.translationX;
    })
    .onEnd((e) => {
      if (translateX.value < -100) {
        translateX.value = withSpring(-150);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      } else if (translateX.value > 100) {
        translateX.value = withSpring(150);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <NoteCard note={note} />
      </Animated.View>
    </GestureDetector>
  );
}
```

## Component Library

### Design Tokens

```typescript
// constants/theme.ts
export const theme = {
  colors: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#10B981',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    border: '#E5E7EB',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
    h2: { fontSize: 22, fontWeight: '600', lineHeight: 28 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  },
  shadows: {
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
      elevation: 3,
    },
  },
};
```

### Animated Button

```typescript
// components/ui/AnimatedButton.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

export function AnimatedButton({ onPress, children, variant = 'primary' }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfig);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles[variant], animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
```

### Skeleton Loader

```typescript
// components/ui/Skeleton.tsx
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';

export function Skeleton({ width, height, borderRadius = 8 }) {
  const translateX = useSharedValue(-width);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width, { duration: 1000 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ width, height, borderRadius, overflow: 'hidden', backgroundColor: '#E5E7EB' }}>
      <Animated.View style={[{ width: '100%', height: '100%' }, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
```

## Lottie Animations

```typescript
// components/animations/RecordingIndicator.tsx
import LottieView from 'lottie-react-native';

export function RecordingIndicator({ isRecording }) {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (isRecording) {
      animationRef.current?.play();
    } else {
      animationRef.current?.pause();
    }
  }, [isRecording]);

  return (
    <LottieView
      ref={animationRef}
      source={require('@/assets/animations/recording-pulse.json')}
      style={{ width: 60, height: 60 }}
      loop
    />
  );
}
```

## List Optimization

```typescript
// components/notes/NotesList.tsx
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';

export function NotesList({ notes }) {
  const renderItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SwipeableNoteCard note={item} />
    </Animated.View>
  );

  return (
    <FlashList
      data={notes}
      renderItem={renderItem}
      estimatedItemSize={100}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      contentContainerStyle={{ padding: 16 }}
    />
  );
}
```

## Layout Animations

```typescript
// Screen transitions with shared element
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LayoutAnimation, UIManager, Platform } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Trigger layout animation on state change
const toggleExpand = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setExpanded(!expanded);
};
```

## Best Practices

1. **60 FPS Target**: Use `useNativeDriver` and Reanimated worklets
2. **Haptic Feedback**: Provide tactile response on interactions
3. **Skeleton States**: Show loading placeholders, never empty screens
4. **Gesture Priority**: Use `simultaneousHandlers` for nested gestures
5. **Memoization**: Wrap list items in `React.memo`
6. **FlashList**: Replace FlatList for lists > 100 items
