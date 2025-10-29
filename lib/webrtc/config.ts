// WebRTC Configuration
export const RTCConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'stun:stun1.l.google.com:19302',
    },
    // Optional: Add TURN server for better connectivity
    // Uncomment and configure if you have a TURN server
    // {
    //   urls: process.env.NEXT_PUBLIC_TURN_SERVER || '',
    //   username: process.env.TURN_USERNAME,
    //   credential: process.env.TURN_CREDENTIAL
    // }
  ],
  iceCandidatePoolSize: 10,
};

export const mediaConstraints: MediaStreamConstraints = {
  video: false, // Audio-only mode
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};
