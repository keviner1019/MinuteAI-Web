// Debug logging for environment variables
console.log('🔧 Loading WebRTC configuration...');
console.log('🔑 TURN credentials available:', {
  hasUsername: !!process.env.NEXT_PUBLIC_TURN_USERNAME,
  hasCredential: !!process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  hasStun: !!process.env.NEXT_PUBLIC_TURN_STUN,
  username: process.env.NEXT_PUBLIC_TURN_USERNAME?.substring(0, 8) + '...',
});

// WebRTC Configuration
export const RTCConfig: RTCConfiguration = {
  iceServers: [
    // STUN servers for NAT discovery
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'stun:stun1.l.google.com:19302',
    },
    // Metered STUN server (if configured)
    ...(process.env.NEXT_PUBLIC_TURN_STUN
      ? [
          {
            urls: process.env.NEXT_PUBLIC_TURN_STUN,
          },
        ]
      : []),
    // Metered TURN servers - Production grade
    // Sign up at https://www.metered.ca/ to get your own credentials
    // Supports multiple regions: asia.relay.metered.ca, a.relay.metered.ca, etc.
    ...(process.env.NEXT_PUBLIC_TURN_USERNAME && process.env.NEXT_PUBLIC_TURN_CREDENTIAL
      ? [
          {
            urls: process.env.NEXT_PUBLIC_TURN_SERVER_1 || 'turn:asia.relay.metered.ca:80',
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
          },
          {
            urls:
              process.env.NEXT_PUBLIC_TURN_SERVER_2 || 'turn:asia.relay.metered.ca:80?transport=tcp',
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
          },
          {
            urls: process.env.NEXT_PUBLIC_TURN_SERVER_3 || 'turn:asia.relay.metered.ca:443',
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
          },
          {
            urls:
              process.env.NEXT_PUBLIC_TURN_SERVER_4 ||
              'turns:asia.relay.metered.ca:443?transport=tcp',
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
          },
        ]
      : [
          // Fallback to free/open TURN server for development
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
        ]),
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all', // Try all candidates (host, srflx, relay)
  bundlePolicy: 'max-bundle', // Bundle all media on single transport
  rtcpMuxPolicy: 'require', // Multiplex RTP and RTCP on same port
};

// Log final configuration
if (RTCConfig.iceServers && RTCConfig.iceServers.length > 0) {
  console.log('✅ WebRTC config loaded with', RTCConfig.iceServers.length, 'ICE servers');
  RTCConfig.iceServers.forEach((server, index) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    urls.forEach((url) => {
      if (url.includes('turn:') || url.includes('turns:')) {
        console.log(`  [${index}] TURN: ${url} (${server.username ? 'authenticated' : 'anonymous'})`);
      } else {
        console.log(`  [${index}] STUN: ${url}`);
      }
    });
  });
} else {
  console.warn('⚠️ No ICE servers configured!');
}

export const mediaConstraints: MediaStreamConstraints = {
  video: false, // Audio-only mode
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};
