# Mobile Meeting Module Implementation Guide

## Cross-Platform Meeting Architecture for MinuteAI Mobile App

This document provides a comprehensive implementation guide for the meeting module in the MinuteAI React Native mobile application. The implementation ensures seamless cross-platform compatibility between mobile and web users in the same meeting rooms.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Required Dependencies](#2-required-dependencies)
3. [Platform Configuration](#3-platform-configuration)
4. [WebRTC Implementation](#4-webrtc-implementation)
5. [Pusher Signaling Integration](#5-pusher-signaling-integration)
6. [Real-Time Transcription](#6-real-time-transcription)
7. [Recording System](#7-recording-system)
8. [API Integration](#8-api-integration)
9. [UI Components](#9-ui-components)
10. [State Management](#10-state-management)
11. [Error Handling & Reconnection](#11-error-handling--reconnection)
12. [Testing Strategy](#12-testing-strategy)
13. [Environment Configuration](#13-environment-configuration)

---

## 1. Architecture Overview

### 1.1 Cross-Platform Compatibility Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    MinuteAI Meeting System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                      ┌──────────────┐         │
│  │   Web App    │◄────── WebRTC ──────►│  Mobile App  │         │
│  │  (Next.js)   │      P2P Video/      │(React Native)│         │
│  │              │        Audio         │              │         │
│  └──────┬───────┘                      └──────┬───────┘         │
│         │                                      │                 │
│         │         ┌─────────────┐             │                 │
│         └────────►│   Pusher    │◄────────────┘                 │
│                   │ (Signaling) │                               │
│                   └──────┬──────┘                               │
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Supabase   │  │ AssemblyAI  │  │   Gemini    │             │
│  │  Database   │  │Transcription│  │  Analysis   │             │
│  │  + Storage  │  │             │  │             │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Compatibility Requirements

| Feature | Web Implementation | Mobile Implementation | Compatibility Notes |
|---------|-------------------|----------------------|---------------------|
| WebRTC | simple-peer + native RTCPeerConnection | react-native-webrtc | Same SDP/ICE format |
| Signaling | Pusher JS SDK | pusher-js (RN compatible) | Identical events |
| Transcription | AssemblyAI WebSocket | AssemblyAI WebSocket | Same protocol |
| Recording | MediaRecorder API | Custom implementation | Same storage bucket |
| Audio Format | WebM/Opus | AAC/M4A (iOS) / WebM (Android) | Server normalizes |

### 1.3 Protocol Version Matching

Ensure the mobile app uses compatible protocol versions:

```typescript
// Protocol versions for cross-platform compatibility
const PROTOCOL_VERSIONS = {
  webrtc: 'unified-plan', // Both platforms must use unified-plan SDP
  pusher: '7.0',          // Pusher protocol version
  signaling: '1.0',       // Custom signaling protocol version
  transcription: 'v2',    // AssemblyAI streaming version
};
```

---

## 2. Required Dependencies

### 2.1 Core Dependencies

```json
{
  "dependencies": {
    // WebRTC
    "react-native-webrtc": "^118.0.7",

    // Signaling
    "pusher-js": "^8.4.0-rc2",

    // Supabase
    "@supabase/supabase-js": "^2.39.0",

    // Audio/Video
    "react-native-audio-recorder-player": "^3.6.0",
    "react-native-fs": "^2.20.0",
    "react-native-video": "^6.0.0",

    // Network & Background
    "@react-native-community/netinfo": "^11.3.0",
    "react-native-background-timer": "^2.4.1",
    "react-native-keep-awake": "^4.0.0",

    // Permissions
    "react-native-permissions": "^4.1.0",

    // State Management
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/react-native-webrtc": "^1.75.4"
  }
}
```

### 2.2 iOS Specific Dependencies

Add to `Podfile`:

```ruby
pod 'react-native-webrtc', :path => '../node_modules/react-native-webrtc'

# For background audio
pod 'RNBackgroundAudio', :path => '../node_modules/react-native-background-audio'
```

### 2.3 Android Specific Dependencies

Add to `android/app/build.gradle`:

```gradle
dependencies {
    implementation project(':react-native-webrtc')
    implementation 'org.webrtc:google-webrtc:1.0.32006'
}
```

---

## 3. Platform Configuration

### 3.1 iOS Configuration

#### Info.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <!-- Camera & Microphone Permissions -->
    <key>NSCameraUsageDescription</key>
    <string>MinuteAI needs camera access for video calls</string>

    <key>NSMicrophoneUsageDescription</key>
    <string>MinuteAI needs microphone access for audio calls and transcription</string>

    <!-- Background Modes -->
    <key>UIBackgroundModes</key>
    <array>
        <string>audio</string>
        <string>voip</string>
        <string>fetch</string>
    </array>

    <!-- Network Access -->
    <key>NSLocalNetworkUsageDescription</key>
    <string>MinuteAI needs local network access for peer-to-peer connections</string>

    <key>NSBonjourServices</key>
    <array>
        <string>_http._tcp</string>
        <string>_https._tcp</string>
    </array>

    <!-- App Transport Security (for TURN servers) -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
```

#### Audio Session Configuration (AppDelegate.m)

```objective-c
#import <AVFoundation/AVFoundation.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // Configure audio session for VoIP
    AVAudioSession *audioSession = [AVAudioSession sharedInstance];
    [audioSession setCategory:AVAudioSessionCategoryPlayAndRecord
                         mode:AVAudioSessionModeVoiceChat
                      options:AVAudioSessionCategoryOptionDefaultToSpeaker |
                              AVAudioSessionCategoryOptionAllowBluetooth |
                              AVAudioSessionCategoryOptionMixWithOthers
                        error:nil];
    [audioSession setActive:YES error:nil];

    return YES;
}
```

### 3.2 Android Configuration

#### AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

    <!-- Hardware Features -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="true" />

    <application
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true">

        <!-- Foreground Service for calls -->
        <service
            android:name=".CallForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="mediaProjection|microphone|camera" />

    </application>
</manifest>
```

#### proguard-rules.pro

```proguard
# WebRTC
-keep class org.webrtc.** { *; }
-keep class com.oney.WebRTCModule.** { *; }

# Pusher
-keep class com.pusher.** { *; }
-dontwarn com.pusher.**
```

---

## 4. WebRTC Implementation

### 4.1 WebRTC Configuration (Identical to Web)

```typescript
// src/lib/webrtc/config.ts

import { RTCPeerConnection } from 'react-native-webrtc';

export const RTCConfig: RTCPeerConnection.RTCConfiguration = {
  iceServers: [
    // STUN servers (free, for NAT traversal)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },

    // Metered TURN servers (production - requires credentials)
    {
      urls: 'turn:asia.relay.metered.ca:80',
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    },
    {
      urls: 'turn:asia.relay.metered.ca:80?transport=tcp',
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    },
    {
      urls: 'turn:asia.relay.metered.ca:443',
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    },
    {
      urls: 'turns:asia.relay.metered.ca:443?transport=tcp',
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    },

    // Fallback free TURN server
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

export const mediaConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  video: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { min: 15, ideal: 30, max: 30 },
    facingMode: 'user',
  },
};
```

### 4.2 Peer Connection Manager

```typescript
// src/lib/webrtc/PeerConnectionManager.ts

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  mediaDevices,
} from 'react-native-webrtc';
import { RTCConfig } from './config';

export type ConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

export interface PeerConnectionCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (state: ConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
  onDataChannelOpen: () => void;
  onDataChannelMessage: (message: string) => void;
  onNegotiationNeeded: () => void;
}

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private hasRemoteDescription: boolean = false;
  private callbacks: Partial<PeerConnectionCallbacks> = {};
  private messageQueue: string[] = [];

  async initialize(): Promise<void> {
    try {
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(RTCConfig);

      // Setup event handlers
      this.setupPeerConnectionHandlers();

      // Create data channel for state sync (MUST match web implementation)
      this.dataChannel = this.peerConnection.createDataChannel('presence', {
        ordered: true,
      });
      this.setupDataChannelHandlers(this.dataChannel);

      console.log('[PeerConnection] Initialized successfully');
    } catch (error) {
      console.error('[PeerConnection] Initialization failed:', error);
      throw error;
    }
  }

  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;

    // Handle remote tracks
    this.peerConnection.addEventListener('track', (event) => {
      console.log('[PeerConnection] Remote track received:', event.track.kind);

      if (!this.remoteStream) {
        this.remoteStream = new MediaStream([]);
      }

      this.remoteStream.addTrack(event.track);
      this.callbacks.onRemoteStream?.(this.remoteStream);
    });

    // Handle ICE candidates
    this.peerConnection.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        console.log('[PeerConnection] ICE candidate:', event.candidate.candidate?.substring(0, 50));
        this.callbacks.onIceCandidate?.(event.candidate);
      }
    });

    // Handle connection state changes
    this.peerConnection.addEventListener('connectionstatechange', () => {
      const state = this.peerConnection?.connectionState as ConnectionState;
      console.log('[PeerConnection] Connection state:', state);
      this.callbacks.onConnectionStateChange?.(state);
    });

    // Handle ICE connection state changes
    this.peerConnection.addEventListener('iceconnectionstatechange', () => {
      const state = this.peerConnection?.iceConnectionState as RTCIceConnectionState;
      console.log('[PeerConnection] ICE connection state:', state);
      this.callbacks.onIceConnectionStateChange?.(state);
    });

    // Handle incoming data channel (for non-initiator)
    this.peerConnection.addEventListener('datachannel', (event) => {
      console.log('[PeerConnection] Remote data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannelHandlers(this.dataChannel);
    });

    // Handle negotiation needed
    this.peerConnection.addEventListener('negotiationneeded', () => {
      console.log('[PeerConnection] Negotiation needed');
      this.callbacks.onNegotiationNeeded?.();
    });
  }

  private setupDataChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('[DataChannel] Opened');
      this.callbacks.onDataChannelOpen?.();

      // Flush queued messages
      this.messageQueue.forEach((msg) => {
        channel.send(msg);
      });
      this.messageQueue = [];
    };

    channel.onmessage = (event) => {
      console.log('[DataChannel] Message received');
      this.callbacks.onDataChannelMessage?.(event.data);
    };

    channel.onerror = (error) => {
      console.error('[DataChannel] Error:', error);
    };

    channel.onclose = () => {
      console.log('[DataChannel] Closed');
    };
  }

  setCallbacks(callbacks: Partial<PeerConnectionCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async addLocalStream(stream: MediaStream): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    this.localStream = stream;

    stream.getTracks().forEach((track) => {
      console.log('[PeerConnection] Adding local track:', track.kind);
      this.peerConnection!.addTrack(track, stream);
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    console.log('[PeerConnection] Offer created and set as local description');

    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log('[PeerConnection] Answer created and set as local description');

    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description)
    );
    this.hasRemoteDescription = true;
    console.log('[PeerConnection] Remote description set');

    // Process pending ICE candidates
    await this.flushPendingIceCandidates();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.hasRemoteDescription) {
      console.log('[PeerConnection] Queueing ICE candidate (no remote description yet)');
      this.pendingIceCandidates.push(candidate);
      return;
    }

    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[PeerConnection] ICE candidate added');
    } catch (error) {
      console.warn('[PeerConnection] Failed to add ICE candidate:', error);
    }
  }

  private async flushPendingIceCandidates(): Promise<void> {
    console.log(`[PeerConnection] Flushing ${this.pendingIceCandidates.length} pending ICE candidates`);

    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('[PeerConnection] Failed to add pending ICE candidate:', error);
      }
    }

    this.pendingIceCandidates = [];
  }

  sendDataChannelMessage(message: object): void {
    const messageStr = JSON.stringify(message);

    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(messageStr);
      console.log('[DataChannel] Message sent:', message);
    } else {
      console.log('[DataChannel] Queueing message (channel not open)');
      this.messageQueue.push(messageStr);
    }
  }

  // Send SDP via data channel (fallback for large SDPs)
  sendSDP(type: 'offer' | 'answer', sdp: RTCSessionDescriptionInit): void {
    this.sendDataChannelMessage({
      type: `sdp-${type}`,
      sdp,
    });
  }

  getConnectionState(): ConnectionState | null {
    return this.peerConnection?.connectionState as ConnectionState | null;
  }

  getIceConnectionState(): RTCIceConnectionState | null {
    return this.peerConnection?.iceConnectionState as RTCIceConnectionState | null;
  }

  getSignalingState(): RTCSignalingState | null {
    return this.peerConnection?.signalingState as RTCSignalingState | null;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  async restartIce(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      iceRestart: true,
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  close(): void {
    console.log('[PeerConnection] Closing connection');

    this.dataChannel?.close();
    this.dataChannel = null;

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;

    this.remoteStream = null;

    this.peerConnection?.close();
    this.peerConnection = null;

    this.hasRemoteDescription = false;
    this.pendingIceCandidates = [];
    this.messageQueue = [];
  }
}
```

### 4.3 Media Device Access

```typescript
// src/lib/webrtc/mediaDevices.ts

import { mediaDevices, MediaStream } from 'react-native-webrtc';
import { Platform, PermissionsAndroid } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { mediaConstraints } from './config';

export interface MediaPermissionResult {
  audio: boolean;
  video: boolean;
}

export async function requestMediaPermissions(): Promise<MediaPermissionResult> {
  const result: MediaPermissionResult = { audio: false, video: false };

  if (Platform.OS === 'ios') {
    // iOS permissions
    const micResult = await request(PERMISSIONS.IOS.MICROPHONE);
    const cameraResult = await request(PERMISSIONS.IOS.CAMERA);

    result.audio = micResult === RESULTS.GRANTED;
    result.video = cameraResult === RESULTS.GRANTED;
  } else {
    // Android permissions
    const micResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    const cameraResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );

    result.audio = micResult === PermissionsAndroid.RESULTS.GRANTED;
    result.video = cameraResult === PermissionsAndroid.RESULTS.GRANTED;
  }

  return result;
}

export async function getLocalMediaStream(
  options: { audio?: boolean; video?: boolean } = { audio: true, video: false }
): Promise<MediaStream> {
  try {
    const constraints: MediaStreamConstraints = {};

    if (options.audio) {
      constraints.audio = mediaConstraints.audio;
    }

    if (options.video) {
      constraints.video = mediaConstraints.video;
    }

    const stream = await mediaDevices.getUserMedia(constraints);
    console.log('[MediaDevices] Got local stream:', {
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length,
    });

    return stream;
  } catch (error) {
    console.error('[MediaDevices] Failed to get media stream:', error);
    throw error;
  }
}

export async function switchCamera(stream: MediaStream): Promise<void> {
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    // @ts-ignore - react-native-webrtc specific method
    videoTrack._switchCamera();
  }
}

export function toggleAudioTrack(stream: MediaStream, enabled: boolean): void {
  stream.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function toggleVideoTrack(stream: MediaStream, enabled: boolean): void {
  stream.getVideoTracks().forEach((track) => {
    track.enabled = enabled;
  });
}
```

---

## 5. Pusher Signaling Integration

### 5.1 Signaling Service

```typescript
// src/lib/signaling/SignalingService.ts

import Pusher, { Channel } from 'pusher-js';
import { API_BASE_URL, PUSHER_KEY, PUSHER_CLUSTER } from '@env';

export interface SignalingCallbacks {
  onConnected: () => void;
  onOffer: (offer: RTCSessionDescriptionInit) => void;
  onAnswer: (answer: RTCSessionDescriptionInit) => void;
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onUserJoined: (sessionId: string, timestamp: number) => void;
  onUserLeft: (sessionId: string, timestamp: number) => void;
  onUserProfile: (profile: UserProfile, timestamp: number) => void;
  onMeetingEnded: (sessionId: string) => void;
  onRecordingState: (isRecording: boolean, userId: string) => void;
  onOfferReady: (useDataChannel: boolean) => void;
  onAnswerReady: (useDataChannel: boolean) => void;
  onError: (error: Error) => void;
}

export interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
  userId: string;
}

// Maximum Pusher message size (10KB)
const MAX_PUSHER_MESSAGE_SIZE = 10 * 1024;
const SDP_SIZE_THRESHOLD = 9 * 1024; // Leave buffer for JSON wrapper

export class SignalingService {
  private pusher: Pusher | null = null;
  private channel: Channel | null = null;
  private roomId: string;
  private sessionId: string;
  private callbacks: Partial<SignalingCallbacks> = {};
  private isConnected: boolean = false;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  setCallbacks(callbacks: Partial<SignalingCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async connect(): Promise<void> {
    try {
      this.pusher = new Pusher(PUSHER_KEY, {
        cluster: PUSHER_CLUSTER,
        authEndpoint: `${API_BASE_URL}/api/pusher/auth`,
        auth: {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      });

      // Subscribe to private channel
      const channelName = `private-meeting-${this.roomId}`;
      this.channel = this.pusher.subscribe(channelName);

      // Setup event handlers
      this.channel.bind('pusher:subscription_succeeded', () => {
        console.log('[Signaling] Connected to channel:', channelName);
        this.isConnected = true;
        this.callbacks.onConnected?.();
      });

      this.channel.bind('pusher:subscription_error', (error: any) => {
        console.error('[Signaling] Subscription error:', error);
        this.callbacks.onError?.(new Error('Failed to connect to meeting channel'));
      });

      // Bind to client events
      this.bindClientEvents();

    } catch (error) {
      console.error('[Signaling] Connection failed:', error);
      throw error;
    }
  }

  private bindClientEvents(): void {
    if (!this.channel) return;

    // Offer received
    this.channel.bind('client-offer', (data: { offer: RTCSessionDescriptionInit }) => {
      console.log('[Signaling] Received offer');
      this.callbacks.onOffer?.(data.offer);
    });

    // Answer received
    this.channel.bind('client-answer', (data: { answer: RTCSessionDescriptionInit }) => {
      console.log('[Signaling] Received answer');
      this.callbacks.onAnswer?.(data.answer);
    });

    // ICE candidate received
    this.channel.bind('client-ice-candidate', (data: { candidate: RTCIceCandidateInit }) => {
      console.log('[Signaling] Received ICE candidate');
      this.callbacks.onIceCandidate?.(data.candidate);
    });

    // User joined
    this.channel.bind('client-user-joined', (data: { sessionId: string; timestamp: number }) => {
      if (data.sessionId !== this.sessionId) {
        console.log('[Signaling] User joined:', data.sessionId);
        this.callbacks.onUserJoined?.(data.sessionId, data.timestamp);
      }
    });

    // User left
    this.channel.bind('client-user-left', (data: { sessionId: string; timestamp: number }) => {
      console.log('[Signaling] User left:', data.sessionId);
      this.callbacks.onUserLeft?.(data.sessionId, data.timestamp);
    });

    // User profile
    this.channel.bind('client-user-profile', (data: { profile: UserProfile; timestamp: number }) => {
      console.log('[Signaling] User profile received');
      this.callbacks.onUserProfile?.(data.profile, data.timestamp);
    });

    // Meeting ended
    this.channel.bind('client-meeting-ended', (data: { sessionId: string }) => {
      console.log('[Signaling] Meeting ended by:', data.sessionId);
      this.callbacks.onMeetingEnded?.(data.sessionId);
    });

    // Recording state
    this.channel.bind('client-recording-state', (data: { isRecording: boolean; userId: string }) => {
      console.log('[Signaling] Recording state changed:', data.isRecording);
      this.callbacks.onRecordingState?.(data.isRecording, data.userId);
    });

    // SDP ready via data channel
    this.channel.bind('client-offer-ready', (data: { useDataChannel: boolean }) => {
      console.log('[Signaling] Offer ready via data channel');
      this.callbacks.onOfferReady?.(data.useDataChannel);
    });

    this.channel.bind('client-answer-ready', (data: { useDataChannel: boolean }) => {
      console.log('[Signaling] Answer ready via data channel');
      this.callbacks.onAnswerReady?.(data.useDataChannel);
    });
  }

  // Send methods
  sendOffer(offer: RTCSessionDescriptionInit): boolean {
    const payload = { offer };
    const payloadSize = JSON.stringify(payload).length;

    if (payloadSize > SDP_SIZE_THRESHOLD) {
      console.log('[Signaling] Offer too large for Pusher, use data channel');
      this.trigger('client-offer-ready', { useDataChannel: true });
      return false;
    }

    return this.trigger('client-offer', payload);
  }

  sendAnswer(answer: RTCSessionDescriptionInit): boolean {
    const payload = { answer };
    const payloadSize = JSON.stringify(payload).length;

    if (payloadSize > SDP_SIZE_THRESHOLD) {
      console.log('[Signaling] Answer too large for Pusher, use data channel');
      this.trigger('client-answer-ready', { useDataChannel: true });
      return false;
    }

    return this.trigger('client-answer', payload);
  }

  sendIceCandidate(candidate: RTCIceCandidate): void {
    this.trigger('client-ice-candidate', { candidate: candidate.toJSON() });
  }

  announceJoin(): void {
    this.trigger('client-user-joined', {
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });
  }

  announceLeave(): void {
    this.trigger('client-user-left', {
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });
  }

  sendUserProfile(profile: UserProfile): void {
    this.trigger('client-user-profile', {
      profile,
      timestamp: Date.now(),
    });
  }

  sendMeetingEnded(): void {
    this.trigger('client-meeting-ended', {
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });
  }

  sendRecordingState(isRecording: boolean, userId: string): void {
    this.trigger('client-recording-state', { isRecording, userId });
  }

  private trigger(eventName: string, data: object): boolean {
    if (!this.channel || !this.isConnected) {
      console.warn('[Signaling] Cannot send event, not connected');
      return false;
    }

    try {
      this.channel.trigger(eventName, data);
      return true;
    } catch (error) {
      console.error('[Signaling] Failed to send event:', error);
      return false;
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  disconnect(): void {
    if (this.isConnected) {
      this.announceLeave();
    }

    if (this.channel) {
      this.channel.unbind_all();
      this.pusher?.unsubscribe(`private-meeting-${this.roomId}`);
      this.channel = null;
    }

    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }

    this.isConnected = false;
    console.log('[Signaling] Disconnected');
  }
}
```

---

## 6. Real-Time Transcription

### 6.1 Transcription Service

```typescript
// src/lib/transcription/TranscriptionService.ts

import { API_BASE_URL } from '@env';

interface TranscriptSegment {
  id: string;
  text: string;
  speaker: string;
  timestamp: number;
  confidence: number;
}

interface TranscriptionCallbacks {
  onTranscript: (segment: TranscriptSegment) => void;
  onError: (error: Error) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export class TranscriptionService {
  private websocket: WebSocket | null = null;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private callbacks: Partial<TranscriptionCallbacks> = {};
  private meetingId: string;
  private userId: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(meetingId: string, userId: string) {
    this.meetingId = meetingId;
    this.userId = userId;
  }

  setCallbacks(callbacks: Partial<TranscriptionCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async start(): Promise<void> {
    try {
      this.callbacks.onStatusChange?.('connecting');

      // Get temporary token from server
      await this.refreshToken();

      // Connect to AssemblyAI streaming WebSocket
      this.websocket = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${this.token}`
      );

      this.websocket.onopen = () => {
        console.log('[Transcription] WebSocket connected');
        this.callbacks.onStatusChange?.('connected');
        this.reconnectAttempts = 0;
      };

      this.websocket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.websocket.onerror = (error) => {
        console.error('[Transcription] WebSocket error:', error);
        this.callbacks.onError?.(new Error('Transcription connection error'));
      };

      this.websocket.onclose = (event) => {
        console.log('[Transcription] WebSocket closed:', event.code, event.reason);
        this.callbacks.onStatusChange?.('disconnected');

        // Attempt reconnection for non-terminal closes
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.start(), 2000 * this.reconnectAttempts);
        }
      };

    } catch (error) {
      console.error('[Transcription] Failed to start:', error);
      this.callbacks.onError?.(error as Error);
      this.callbacks.onStatusChange?.('error');
    }
  }

  private async refreshToken(): Promise<void> {
    // Token expires after 10 minutes, refresh when 1 minute remaining
    if (this.token && Date.now() < this.tokenExpiry - 60000) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/transcription/token`);
    const data = await response.json();

    if (!data.token) {
      throw new Error('Failed to get transcription token');
    }

    this.token = data.token;
    this.tokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    console.log('[Transcription] Token refreshed');
  }

  private handleMessage(data: any): void {
    // Handle different message types from AssemblyAI
    if (data.message_type === 'SessionBegins') {
      console.log('[Transcription] Session started:', data.session_id);
      return;
    }

    if (data.message_type === 'FinalTranscript' && data.text) {
      const segment: TranscriptSegment = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        text: data.text,
        speaker: this.userId,
        timestamp: Date.now(),
        confidence: data.confidence || 0,
      };

      this.callbacks.onTranscript?.(segment);

      // Save to server
      this.saveTranscript(segment);
    }
  }

  private async saveTranscript(segment: TranscriptSegment): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/save-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: this.meetingId,
          speaker: segment.speaker,
          text: segment.text,
          confidence: segment.confidence,
          timestamp: Math.floor(segment.timestamp / 1000),
        }),
      });
    } catch (error) {
      console.error('[Transcription] Failed to save transcript:', error);
    }
  }

  sendAudio(audioBuffer: ArrayBuffer): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      // Send as base64 encoded string (AssemblyAI expects this format)
      const base64Audio = this.arrayBufferToBase64(audioBuffer);
      this.websocket.send(JSON.stringify({ audio_data: base64Audio }));
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  stop(): void {
    if (this.websocket) {
      // Send terminate message
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ terminate_session: true }));
      }
      this.websocket.close(1000, 'User stopped transcription');
      this.websocket = null;
    }
    console.log('[Transcription] Stopped');
  }
}
```

### 6.2 Audio Processing Hook

```typescript
// src/hooks/useAudioProcessor.ts

import { useRef, useCallback } from 'react';
import { MediaStream } from 'react-native-webrtc';

interface AudioProcessorOptions {
  sampleRate?: number;
  onAudioData?: (data: ArrayBuffer) => void;
}

export function useAudioProcessor(options: AudioProcessorOptions = {}) {
  const { sampleRate = 16000, onAudioData } = options;
  const processorRef = useRef<any>(null);
  const isProcessingRef = useRef(false);

  const startProcessing = useCallback(async (stream: MediaStream) => {
    if (isProcessingRef.current) return;

    try {
      // Note: React Native WebRTC doesn't have native AudioContext support
      // Use a native module or third-party library for audio processing

      // Option 1: Use react-native-audio-api (if available)
      // Option 2: Implement native audio processing module
      // Option 3: Use react-native-live-audio-stream

      console.log('[AudioProcessor] Starting audio processing');
      isProcessingRef.current = true;

      // Implementation depends on chosen native audio library
      // This is a placeholder for the actual implementation

    } catch (error) {
      console.error('[AudioProcessor] Failed to start:', error);
      throw error;
    }
  }, [sampleRate, onAudioData]);

  const stopProcessing = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.stop();
      processorRef.current = null;
    }
    isProcessingRef.current = false;
    console.log('[AudioProcessor] Stopped');
  }, []);

  return {
    startProcessing,
    stopProcessing,
    isProcessing: isProcessingRef.current,
  };
}
```

---

## 7. Recording System

### 7.1 Mobile Recording Service

```typescript
// src/lib/recording/RecordingService.ts

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { supabase } from '../supabase/client';
import { API_BASE_URL } from '@env';

interface RecordingOptions {
  meetingId: string;
  userId: string;
  format?: 'webm' | 'mp4' | 'm4a';
}

interface RecordingCallbacks {
  onStarted: () => void;
  onStopped: (filePath: string) => void;
  onUploaded: (url: string) => void;
  onError: (error: Error) => void;
  onProgress: (progress: number) => void;
}

export class RecordingService {
  private options: RecordingOptions;
  private callbacks: Partial<RecordingCallbacks> = {};
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private filePath: string | null = null;

  constructor(options: RecordingOptions) {
    this.options = {
      format: Platform.OS === 'ios' ? 'm4a' : 'webm',
      ...options,
    };
  }

  setCallbacks(callbacks: Partial<RecordingCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('[Recording] Already recording');
      return;
    }

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const filename = `meeting_${this.options.meetingId}_${timestamp}.${this.options.format}`;
      this.filePath = `${RNFS.CachesDirectoryPath}/${filename}`;

      // Platform-specific recording implementation
      // Note: This requires a native audio recording module
      // Options: react-native-audio-recorder-player, react-native-audio-api

      console.log('[Recording] Starting recording to:', this.filePath);
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      this.callbacks.onStarted?.();

    } catch (error) {
      console.error('[Recording] Failed to start:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.isRecording || !this.filePath) {
      console.warn('[Recording] Not recording');
      return null;
    }

    try {
      // Stop the native recorder
      // Implementation depends on chosen native module

      this.isRecording = false;
      console.log('[Recording] Stopped recording');

      this.callbacks.onStopped?.(this.filePath);

      // Upload the recording
      await this.uploadRecording();

      return this.filePath;

    } catch (error) {
      console.error('[Recording] Failed to stop:', error);
      this.callbacks.onError?.(error as Error);
      return null;
    }
  }

  private async uploadRecording(): Promise<void> {
    if (!this.filePath) return;

    try {
      const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);

      // Read file as base64
      const fileData = await RNFS.readFile(this.filePath, 'base64');
      const fileInfo = await RNFS.stat(this.filePath);

      // Create blob-like object for upload
      const fileName = this.filePath.split('/').pop() || 'recording';
      const storagePath = `${this.options.meetingId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meeting-audio')
        .upload(storagePath, decode(fileData), {
          contentType: this.getContentType(),
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('meeting-audio')
        .getPublicUrl(storagePath);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('meeting_audio')
        .insert({
          meeting_id: this.options.meetingId,
          audio_url: urlData.publicUrl,
          duration,
          file_size: fileInfo.size,
          format: this.options.format,
          recorded_by: this.options.userId,
          status: 'completed',
        });

      if (dbError) {
        console.error('[Recording] Failed to save metadata:', dbError);
      }

      this.callbacks.onUploaded?.(urlData.publicUrl);
      console.log('[Recording] Uploaded successfully:', urlData.publicUrl);

      // Clean up local file
      await RNFS.unlink(this.filePath);

    } catch (error) {
      console.error('[Recording] Upload failed:', error);

      // Mark as failed in database
      await supabase
        .from('meeting_audio')
        .insert({
          meeting_id: this.options.meetingId,
          recorded_by: this.options.userId,
          status: 'failed',
        });

      this.callbacks.onError?.(error as Error);
    }
  }

  private getContentType(): string {
    switch (this.options.format) {
      case 'm4a':
        return 'audio/mp4';
      case 'mp4':
        return 'video/mp4';
      case 'webm':
      default:
        return 'audio/webm';
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  getRecordingDuration(): number {
    if (!this.isRecording) return 0;
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }
}

// Helper function to decode base64 to Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
```

---

## 8. API Integration

### 8.1 Meeting API Client

```typescript
// src/api/meetingApi.ts

import { supabase } from '../lib/supabase/client';
import { API_BASE_URL } from '@env';

export interface Meeting {
  id: string;
  room_id: string;
  host_id: string;
  guest_id: string | null;
  title: string;
  status: 'scheduled' | 'active' | 'ended';
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingSummary {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentExplanation: string;
}

export interface ActionItem {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  deadline: string | null;
  completed: boolean;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  speaker: string;
  text: string;
  confidence: number;
  timestamp_start: number;
  created_at: string;
}

export const meetingApi = {
  // Get or create meeting by room ID
  async getOrCreateMeeting(roomId: string, userId: string): Promise<Meeting> {
    // First, try to get existing meeting
    const { data: existing } = await supabase
      .from('meetings')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle();

    if (existing) {
      return existing as Meeting;
    }

    // Create new meeting
    const { data: newMeeting, error } = await supabase
      .from('meetings')
      .insert({
        room_id: roomId,
        host_id: userId,
        title: 'Quick Meeting',
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create meeting: ${error.message}`);
    }

    return newMeeting as Meeting;
  },

  // Register as guest in a meeting
  async registerAsGuest(meetingId: string, userId: string, accessToken: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/register-guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId, accessToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register as guest');
    }
  },

  // Update meeting status
  async updateMeetingStatus(
    meetingId: string,
    status: 'active' | 'ended',
    additionalFields?: Partial<Meeting>
  ): Promise<void> {
    const updateData: any = { status, ...additionalFields };

    if (status === 'active') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'ended') {
      updateData.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', meetingId);

    if (error) {
      throw new Error(`Failed to update meeting status: ${error.message}`);
    }
  },

  // Get meeting summary
  async getMeetingSummary(meetingId: string): Promise<MeetingSummary> {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/summarize`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to generate meeting summary');
    }

    return response.json();
  },

  // Get meeting transcripts
  async getTranscripts(meetingId: string): Promise<Transcript[]> {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch transcripts: ${error.message}`);
    }

    return data as Transcript[];
  },

  // Subscribe to real-time transcript updates
  subscribeToTranscripts(
    meetingId: string,
    onTranscript: (transcript: Transcript) => void
  ): () => void {
    const channel = supabase
      .channel(`transcripts:${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcripts',
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          onTranscript(payload.new as Transcript);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
```

---

## 9. UI Components

### 9.1 Meeting Room Screen

```typescript
// src/screens/MeetingRoom/MeetingRoomScreen.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  StatusBar,
  AppState,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import KeepAwake from 'react-native-keep-awake';

import { useMeeting } from '../../hooks/useMeeting';
import { useTranscription } from '../../hooks/useTranscription';
import { useRecording } from '../../hooks/useRecording';

import { MeetingControls } from '../../components/meeting/MeetingControls';
import { ParticipantView } from '../../components/meeting/ParticipantView';
import { TranscriptPanel } from '../../components/meeting/TranscriptPanel';
import { ConnectionStatus } from '../../components/meeting/ConnectionStatus';
import { RecordingIndicator } from '../../components/meeting/RecordingIndicator';

interface MeetingRoomScreenProps {
  route: {
    params: {
      roomId: string;
    };
  };
  navigation: any;
}

export const MeetingRoomScreen: React.FC<MeetingRoomScreenProps> = ({
  route,
  navigation,
}) => {
  const { roomId } = route.params;

  const [showTranscripts, setShowTranscripts] = useState(false);

  const {
    localStream,
    remoteStream,
    isConnected,
    isMuted,
    isVideoEnabled,
    isHost,
    connectionState,
    remoteUserProfile,
    error,
    toggleAudio,
    toggleVideo,
    endCall,
    sendRecordingState,
  } = useMeeting(roomId);

  const {
    transcripts,
    isTranscribing,
    startTranscription,
    stopTranscription,
  } = useTranscription(roomId, localStream);

  const {
    isRecording,
    isSaving,
    startRecording,
    stopRecording,
  } = useRecording(roomId);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        // Continue audio in background, but may need to disable video
        console.log('[MeetingRoom] App went to background');
      }
    });

    return () => subscription.remove();
  }, []);

  // Handle end call
  const handleEndCall = useCallback(() => {
    Alert.alert(
      isHost ? 'End Meeting' : 'Leave Meeting',
      isHost
        ? 'Are you sure you want to end this meeting for everyone?'
        : 'Are you sure you want to leave this meeting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isHost ? 'End Meeting' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (isRecording) {
              await stopRecording();
            }
            if (isTranscribing) {
              stopTranscription();
            }
            endCall();
            navigation.goBack();
          },
        },
      ]
    );
  }, [isHost, isRecording, isTranscribing, endCall, stopRecording, stopTranscription, navigation]);

  // Handle recording toggle
  const handleToggleRecording = useCallback(async () => {
    if (!isHost) return;

    if (isRecording) {
      await stopRecording();
      sendRecordingState(false);
    } else {
      await startRecording();
      sendRecordingState(true);
    }
  }, [isHost, isRecording, startRecording, stopRecording, sendRecordingState]);

  // Handle transcription toggle
  const handleToggleTranscription = useCallback(() => {
    if (isTranscribing) {
      stopTranscription();
    } else {
      startTranscription();
    }
  }, [isTranscribing, startTranscription, stopTranscription]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <KeepAwake />

      {/* Connection Status */}
      <ConnectionStatus state={connectionState} error={error} />

      {/* Recording Indicator */}
      {isRecording && <RecordingIndicator isSaving={isSaving} />}

      {/* Video/Audio Display */}
      <View style={styles.participantsContainer}>
        {/* Local Participant */}
        <ParticipantView
          stream={localStream}
          isLocal
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          label="You"
        />

        {/* Remote Participant */}
        {remoteStream && (
          <ParticipantView
            stream={remoteStream}
            isLocal={false}
            isMuted={false}
            isVideoEnabled={true}
            label={remoteUserProfile?.display_name || 'Participant'}
            avatarUrl={remoteUserProfile?.avatar_url}
          />
        )}
      </View>

      {/* Transcript Panel */}
      {showTranscripts && (
        <TranscriptPanel
          transcripts={transcripts}
          isTranscribing={isTranscribing}
          onClose={() => setShowTranscripts(false)}
        />
      )}

      {/* Controls */}
      <MeetingControls
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isTranscribing={isTranscribing}
        isRecording={isRecording}
        isSavingRecording={isSaving}
        isHost={isHost}
        showTranscripts={showTranscripts}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleTranscription={handleToggleTranscription}
        onToggleRecording={handleToggleRecording}
        onToggleTranscripts={() => setShowTranscripts(!showTranscripts)}
        onEndCall={handleEndCall}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  participantsContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
});
```

### 9.2 Meeting Controls Component

```typescript
// src/components/meeting/MeetingControls.tsx

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MeetingControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isTranscribing: boolean;
  isRecording: boolean;
  isSavingRecording: boolean;
  isHost: boolean;
  showTranscripts: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleTranscription: () => void;
  onToggleRecording: () => void;
  onToggleTranscripts: () => void;
  onEndCall: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isMuted,
  isVideoEnabled,
  isTranscribing,
  isRecording,
  isSavingRecording,
  isHost,
  showTranscripts,
  onToggleAudio,
  onToggleVideo,
  onToggleTranscription,
  onToggleRecording,
  onToggleTranscripts,
  onEndCall,
}) => {
  return (
    <View style={styles.container}>
      {/* Microphone */}
      <TouchableOpacity
        style={[styles.button, isMuted && styles.buttonOff]}
        onPress={onToggleAudio}
      >
        <Icon
          name={isMuted ? 'microphone-off' : 'microphone'}
          size={24}
          color={isMuted ? '#ef4444' : '#ffffff'}
        />
        <Text style={styles.buttonLabel}>
          {isMuted ? 'Unmute' : 'Mute'}
        </Text>
      </TouchableOpacity>

      {/* Camera */}
      <TouchableOpacity
        style={[styles.button, !isVideoEnabled && styles.buttonOff]}
        onPress={onToggleVideo}
      >
        <Icon
          name={isVideoEnabled ? 'video' : 'video-off'}
          size={24}
          color={isVideoEnabled ? '#ffffff' : '#ef4444'}
        />
        <Text style={styles.buttonLabel}>
          {isVideoEnabled ? 'Camera' : 'Camera Off'}
        </Text>
      </TouchableOpacity>

      {/* Transcription */}
      <TouchableOpacity
        style={[styles.button, isTranscribing && styles.buttonActive]}
        onPress={onToggleTranscription}
      >
        <Icon
          name="closed-caption"
          size={24}
          color={isTranscribing ? '#22c55e' : '#ffffff'}
        />
        <Text style={styles.buttonLabel}>
          {isTranscribing ? 'CC On' : 'CC Off'}
        </Text>
      </TouchableOpacity>

      {/* Transcripts Panel */}
      <TouchableOpacity
        style={[styles.button, showTranscripts && styles.buttonActive]}
        onPress={onToggleTranscripts}
      >
        <Icon
          name="text"
          size={24}
          color={showTranscripts ? '#22c55e' : '#ffffff'}
        />
        <Text style={styles.buttonLabel}>Transcript</Text>
      </TouchableOpacity>

      {/* Recording (Host only) */}
      {isHost && (
        <TouchableOpacity
          style={[styles.button, isRecording && styles.buttonRecording]}
          onPress={onToggleRecording}
          disabled={isSavingRecording}
        >
          {isSavingRecording ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Icon
              name={isRecording ? 'stop' : 'record-circle'}
              size={24}
              color={isRecording ? '#ef4444' : '#ffffff'}
            />
          )}
          <Text style={styles.buttonLabel}>
            {isSavingRecording ? 'Saving...' : isRecording ? 'Stop' : 'Record'}
          </Text>
        </TouchableOpacity>
      )}

      {/* End Call */}
      <TouchableOpacity
        style={[styles.button, styles.buttonEnd]}
        onPress={onEndCall}
      >
        <Icon name="phone-hangup" size={24} color="#ffffff" />
        <Text style={styles.buttonLabel}>
          {isHost ? 'End' : 'Leave'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#16162a',
    gap: 8,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2d2d4a',
    minWidth: 64,
  },
  buttonOff: {
    backgroundColor: '#3d3d5a',
  },
  buttonActive: {
    backgroundColor: '#1e4620',
  },
  buttonRecording: {
    backgroundColor: '#4a1e1e',
  },
  buttonEnd: {
    backgroundColor: '#dc2626',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 10,
    marginTop: 4,
  },
});
```

### 9.3 Participant View Component

```typescript
// src/components/meeting/ParticipantView.tsx

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ParticipantViewProps {
  stream: MediaStream | null;
  isLocal: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  label: string;
  avatarUrl?: string | null;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  stream,
  isLocal,
  isMuted,
  isVideoEnabled,
  label,
  avatarUrl,
}) => {
  const hasVideo = stream?.getVideoTracks().length > 0 && isVideoEnabled;

  return (
    <View style={styles.container}>
      {hasVideo && stream ? (
        <RTCView
          streamURL={stream.toURL()}
          style={styles.video}
          objectFit="cover"
          mirror={isLocal}
          zOrder={isLocal ? 1 : 0}
        />
      ) : (
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {label.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Overlay info */}
      <View style={styles.overlay}>
        <View style={styles.nameTag}>
          <Text style={styles.name} numberOfLines={1}>
            {label}
          </Text>
        </View>

        {isMuted && (
          <View style={styles.mutedIndicator}>
            <Icon name="microphone-off" size={16} color="#ef4444" />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d2d4a',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    flex: 1,
    backgroundColor: '#000000',
  },
  avatar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4a4a6a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  overlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: '80%',
  },
  name: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  mutedIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
    borderRadius: 4,
  },
});
```

---

## 10. State Management

### 10.1 Meeting Store (Zustand)

```typescript
// src/stores/meetingStore.ts

import { create } from 'zustand';
import { MediaStream } from 'react-native-webrtc';

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
  userId: string;
}

interface Transcript {
  id: string;
  text: string;
  speaker: string;
  timestamp: number;
  confidence: number;
}

interface MeetingState {
  // Connection state
  roomId: string | null;
  meetingId: string | null;
  isHost: boolean;
  isConnected: boolean;
  connectionState: string;
  error: string | null;

  // Streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  remoteVideoStream: MediaStream | null;

  // Media state
  isMuted: boolean;
  isVideoEnabled: boolean;
  isRemoteMuted: boolean;
  isRemoteVideoEnabled: boolean;

  // Recording state
  isRecording: boolean;
  isRemoteRecording: boolean;
  isSaving: boolean;

  // Transcription state
  isTranscribing: boolean;
  transcripts: Transcript[];

  // User profiles
  localUserProfile: UserProfile | null;
  remoteUserProfile: UserProfile | null;

  // Actions
  setRoomId: (roomId: string) => void;
  setMeetingId: (meetingId: string) => void;
  setIsHost: (isHost: boolean) => void;
  setConnectionState: (state: string) => void;
  setIsConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;

  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setLocalVideoStream: (stream: MediaStream | null) => void;
  setRemoteVideoStream: (stream: MediaStream | null) => void;

  setIsMuted: (muted: boolean) => void;
  setIsVideoEnabled: (enabled: boolean) => void;
  setIsRemoteMuted: (muted: boolean) => void;
  setIsRemoteVideoEnabled: (enabled: boolean) => void;

  setIsRecording: (recording: boolean) => void;
  setIsRemoteRecording: (recording: boolean) => void;
  setIsSaving: (saving: boolean) => void;

  setIsTranscribing: (transcribing: boolean) => void;
  addTranscript: (transcript: Transcript) => void;
  clearTranscripts: () => void;

  setLocalUserProfile: (profile: UserProfile | null) => void;
  setRemoteUserProfile: (profile: UserProfile | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  roomId: null,
  meetingId: null,
  isHost: false,
  isConnected: false,
  connectionState: 'new',
  error: null,
  localStream: null,
  remoteStream: null,
  localVideoStream: null,
  remoteVideoStream: null,
  isMuted: false,
  isVideoEnabled: false,
  isRemoteMuted: false,
  isRemoteVideoEnabled: false,
  isRecording: false,
  isRemoteRecording: false,
  isSaving: false,
  isTranscribing: false,
  transcripts: [],
  localUserProfile: null,
  remoteUserProfile: null,
};

export const useMeetingStore = create<MeetingState>((set) => ({
  ...initialState,

  setRoomId: (roomId) => set({ roomId }),
  setMeetingId: (meetingId) => set({ meetingId }),
  setIsHost: (isHost) => set({ isHost }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setError: (error) => set({ error }),

  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setLocalVideoStream: (localVideoStream) => set({ localVideoStream }),
  setRemoteVideoStream: (remoteVideoStream) => set({ remoteVideoStream }),

  setIsMuted: (isMuted) => set({ isMuted }),
  setIsVideoEnabled: (isVideoEnabled) => set({ isVideoEnabled }),
  setIsRemoteMuted: (isRemoteMuted) => set({ isRemoteMuted }),
  setIsRemoteVideoEnabled: (isRemoteVideoEnabled) => set({ isRemoteVideoEnabled }),

  setIsRecording: (isRecording) => set({ isRecording }),
  setIsRemoteRecording: (isRemoteRecording) => set({ isRemoteRecording }),
  setIsSaving: (isSaving) => set({ isSaving }),

  setIsTranscribing: (isTranscribing) => set({ isTranscribing }),
  addTranscript: (transcript) =>
    set((state) => ({
      transcripts: [...state.transcripts, transcript],
    })),
  clearTranscripts: () => set({ transcripts: [] }),

  setLocalUserProfile: (localUserProfile) => set({ localUserProfile }),
  setRemoteUserProfile: (remoteUserProfile) => set({ remoteUserProfile }),

  reset: () => set(initialState),
}));
```

---

## 11. Error Handling & Reconnection

### 11.1 Connection Recovery

```typescript
// src/hooks/useConnectionRecovery.ts

import { useRef, useCallback } from 'react';
import { PeerConnectionManager } from '../lib/webrtc/PeerConnectionManager';
import { SignalingService } from '../lib/signaling/SignalingService';

interface ConnectionRecoveryOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  onReconnectFailed?: () => void;
}

export function useConnectionRecovery(
  peerManager: React.RefObject<PeerConnectionManager | null>,
  signaling: React.RefObject<SignalingService | null>,
  options: ConnectionRecoveryOptions = {}
) {
  const {
    maxReconnectAttempts = 3,
    reconnectDelay = 2000,
    onReconnecting,
    onReconnected,
    onReconnectFailed,
  } = options;

  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const attemptReconnection = useCallback(async (reason: string) => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('[Recovery] Max reconnection attempts reached');
      onReconnectFailed?.();
      return;
    }

    reconnectAttemptsRef.current++;
    console.log(`[Recovery] Attempting reconnection (${reconnectAttemptsRef.current}/${maxReconnectAttempts}): ${reason}`);
    onReconnecting?.();

    try {
      // Attempt ICE restart
      const offer = await peerManager.current?.restartIce();

      if (offer && signaling.current) {
        const sent = signaling.current.sendOffer(offer);
        if (!sent) {
          // Fallback to data channel
          peerManager.current?.sendSDP('offer', offer);
        }
      }
    } catch (error) {
      console.error('[Recovery] Reconnection attempt failed:', error);

      // Schedule next attempt
      reconnectTimerRef.current = setTimeout(() => {
        attemptReconnection(reason);
      }, reconnectDelay * reconnectAttemptsRef.current);
    }
  }, [maxReconnectAttempts, reconnectDelay, peerManager, signaling, onReconnecting, onReconnectFailed]);

  const handleConnectionStateChange = useCallback((state: string) => {
    switch (state) {
      case 'connected':
      case 'completed':
        reconnectAttemptsRef.current = 0;
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        onReconnected?.();
        break;

      case 'disconnected':
        // Wait a bit before attempting reconnection
        reconnectTimerRef.current = setTimeout(() => {
          attemptReconnection('disconnected');
        }, 5000);
        break;

      case 'failed':
        attemptReconnection('failed');
        break;
    }
  }, [attemptReconnection, onReconnected]);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
  }, []);

  return {
    handleConnectionStateChange,
    attemptReconnection,
    cleanup,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
}
```

### 11.2 Error Boundaries

```typescript
// src/components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MeetingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Meeting error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Icon name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred during the meeting.'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    padding: 24,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  message: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

```typescript
// __tests__/PeerConnectionManager.test.ts

import { PeerConnectionManager } from '../src/lib/webrtc/PeerConnectionManager';

// Mock react-native-webrtc
jest.mock('react-native-webrtc', () => ({
  RTCPeerConnection: jest.fn().mockImplementation(() => ({
    createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
    createAnswer: jest.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
    setLocalDescription: jest.fn().mockResolvedValue(undefined),
    setRemoteDescription: jest.fn().mockResolvedValue(undefined),
    addIceCandidate: jest.fn().mockResolvedValue(undefined),
    addTrack: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    createDataChannel: jest.fn().mockReturnValue({
      send: jest.fn(),
      close: jest.fn(),
    }),
    connectionState: 'new',
    iceConnectionState: 'new',
    signalingState: 'stable',
  })),
  RTCSessionDescription: jest.fn(),
  RTCIceCandidate: jest.fn(),
  MediaStream: jest.fn(),
}));

describe('PeerConnectionManager', () => {
  let manager: PeerConnectionManager;

  beforeEach(() => {
    manager = new PeerConnectionManager();
  });

  afterEach(() => {
    manager.close();
  });

  it('should initialize peer connection', async () => {
    await manager.initialize();
    expect(manager.getConnectionState()).toBe('new');
  });

  it('should create offer', async () => {
    await manager.initialize();
    const offer = await manager.createOffer();
    expect(offer).toHaveProperty('type', 'offer');
    expect(offer).toHaveProperty('sdp');
  });

  it('should create answer', async () => {
    await manager.initialize();
    await manager.setRemoteDescription({ type: 'offer', sdp: 'mock-sdp' });
    const answer = await manager.createAnswer();
    expect(answer).toHaveProperty('type', 'answer');
  });

  it('should buffer ICE candidates before remote description', async () => {
    await manager.initialize();
    const candidate = { candidate: 'mock-candidate', sdpMid: '0', sdpMLineIndex: 0 };
    await manager.addIceCandidate(candidate);
    // Should not throw, candidate is buffered
  });
});
```

### 12.2 Integration Tests

```typescript
// __tests__/integration/MeetingFlow.test.ts

import { renderHook, act } from '@testing-library/react-hooks';
import { useMeeting } from '../../src/hooks/useMeeting';

// Mock all external dependencies
jest.mock('../../src/lib/webrtc/PeerConnectionManager');
jest.mock('../../src/lib/signaling/SignalingService');
jest.mock('../../src/api/meetingApi');

describe('Meeting Flow Integration', () => {
  it('should handle complete meeting lifecycle', async () => {
    const roomId = 'test-room-123';

    const { result, waitForNextUpdate } = renderHook(() =>
      useMeeting(roomId)
    );

    // Initial state
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('new');

    // Wait for connection
    await waitForNextUpdate({ timeout: 5000 });

    // Toggle audio
    act(() => {
      result.current.toggleAudio();
    });
    expect(result.current.isMuted).toBe(true);

    // Toggle video
    act(() => {
      result.current.toggleVideo();
    });
    expect(result.current.isVideoEnabled).toBe(true);

    // End call
    act(() => {
      result.current.endCall();
    });
    expect(result.current.isConnected).toBe(false);
  });
});
```

### 12.3 E2E Testing Checklist

- [ ] Web user creates meeting, mobile user joins
- [ ] Mobile user creates meeting, web user joins
- [ ] Audio works in both directions
- [ ] Video works in both directions
- [ ] Mute state syncs between platforms
- [ ] Recording state syncs between platforms
- [ ] Transcripts appear on both platforms
- [ ] Meeting end notification received on both platforms
- [ ] Reconnection works after temporary network loss
- [ ] Background audio continues on mobile
- [ ] App state changes don't break connection

---

## 13. Environment Configuration

### 13.1 Environment Variables

```typescript
// .env

# API
API_BASE_URL=https://your-domain.com

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Pusher
PUSHER_KEY=your-pusher-key
PUSHER_CLUSTER=your-cluster

# TURN Servers
TURN_USERNAME=your-turn-username
TURN_CREDENTIAL=your-turn-credential
```

### 13.2 React Native Config Setup

```typescript
// react-native.config.js

module.exports = {
  dependencies: {
    'react-native-webrtc': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-webrtc/android',
        },
      },
    },
  },
};
```

### 13.3 Environment Type Definitions

```typescript
// src/types/env.d.ts

declare module '@env' {
  export const API_BASE_URL: string;
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const PUSHER_KEY: string;
  export const PUSHER_CLUSTER: string;
  export const TURN_USERNAME: string;
  export const TURN_CREDENTIAL: string;
}
```

---

## Cross-Platform Compatibility Checklist

### Protocol Compatibility

| Component | Web Format | Mobile Format | Conversion Needed |
|-----------|-----------|---------------|-------------------|
| SDP | Standard | Standard | No |
| ICE Candidates | JSON | JSON | No |
| Pusher Events | JSON | JSON | No |
| Transcripts | JSON | JSON | No |
| Audio Format | WebM/Opus | AAC/M4A or WebM | Server-side |
| Video Codec | VP8/VP9 | H.264/VP8 | Auto-negotiated |

### Data Channel Messages

All data channel messages use identical JSON format:

```typescript
// State sync messages (identical on both platforms)
interface MuteStateMessage {
  type: 'mute-state';
  isMuted: boolean;
}

interface VideoStateMessage {
  type: 'video-state';
  isVideoEnabled: boolean;
}

interface RecordingStateMessage {
  type: 'recording-state';
  isRecording: boolean;
}

interface MeetingEndedMessage {
  type: 'meeting-ended';
}

interface SDPMessage {
  type: 'sdp-offer' | 'sdp-answer';
  sdp: RTCSessionDescriptionInit;
}
```

### Signaling Events

All Pusher events use identical payloads:

```typescript
// Identical event structure on both platforms
const SIGNALING_EVENTS = {
  'client-offer': { offer: RTCSessionDescriptionInit },
  'client-answer': { answer: RTCSessionDescriptionInit },
  'client-ice-candidate': { candidate: RTCIceCandidateInit },
  'client-user-joined': { sessionId: string, timestamp: number },
  'client-user-left': { sessionId: string, timestamp: number },
  'client-user-profile': { profile: UserProfile, timestamp: number },
  'client-meeting-ended': { sessionId: string, timestamp: number },
  'client-recording-state': { isRecording: boolean, userId: string },
};
```

---

## Summary

This implementation guide provides a complete blueprint for building a React Native mobile app that works seamlessly with the MinuteAI web platform. Key points:

1. **WebRTC Configuration**: Use identical ICE server configuration and RTCPeerConnection settings
2. **Signaling**: Pusher events and payloads are platform-agnostic
3. **State Sync**: Data channel messages use the same JSON format
4. **Transcription**: AssemblyAI WebSocket protocol works on both platforms
5. **Recording**: Different native formats are normalized server-side
6. **UI Components**: Platform-specific but functionally equivalent

The cross-platform compatibility is achieved through:
- Standardized WebRTC protocols (SDP, ICE)
- JSON-based messaging for all state sync
- Platform-agnostic backend APIs
- Server-side media format normalization

Follow this guide to ensure mobile users can join meetings with web users and experience full feature parity.
