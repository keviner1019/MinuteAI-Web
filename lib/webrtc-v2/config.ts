// WebRTC Configuration
// Based on best practices from MEETING_MODULE_WEBRTC_ARCHITECTURE.md

export const RTCConfig: RTCConfiguration = {
  iceServers: [
    // Google's public STUN servers
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
      ],
    },
    // Add TURN servers here if needed for production
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ],
  iceTransportPolicy: 'all', // Use both STUN and TURN
  iceCandidatePoolSize: 10, // Pre-gather 10 ICE candidates
  bundlePolicy: 'max-bundle', // Bundle all media on same connection
  rtcpMuxPolicy: 'require', // Multiplex RTP and RTCP
};

// Media Constraints
export const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
};

export const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: 'user',
  },
};

export const SCREEN_SHARE_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: {
    displaySurface: 'monitor',
    logicalSurface: true,
    cursor: 'always',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30, max: 30 },
  } as MediaTrackConstraints,
  audio: false, // Set to true if you want system audio
};

// Connection Timeouts
export const CONNECTION_TIMEOUT = 30000; // 30 seconds
export const RECONNECTION_TIMEOUT = 10000; // 10 seconds
export const MAX_RECONNECTION_ATTEMPTS = 3;

// Data Channel Configuration
export const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: true,
  maxRetransmits: 3,
};

// Heartbeat Configuration
export const HEARTBEAT_INTERVAL = 5000; // 5 seconds
export const HEARTBEAT_TIMEOUT = 15000; // 15 seconds (3 missed heartbeats)

// Media Encoding Parameters
export const AUDIO_ENCODING_PARAMS = {
  maxBitrate: 128000, // 128 kbps
};

export const VIDEO_ENCODING_PARAMS = {
  maxBitrate: 1000000, // 1 Mbps
  maxFramerate: 30,
  scaleResolutionDownBy: 1,
};

// Connection Quality Thresholds
export const QUALITY_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
  poor: 20,
};
