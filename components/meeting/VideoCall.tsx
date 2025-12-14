'use client';

import { useEffect, useRef } from 'react';

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
}

export function VideoCall({
  localStream,
  remoteStream,
  isConnected,
  connectionState,
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="flex-1 relative bg-gray-900">
      {/* Remote Video (Main) */}
      <div className="absolute inset-0">
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">👤</span>
              </div>
              <p className="text-lg">
                {connectionState === 'connecting'
                  ? 'Connecting...'
                  : 'Waiting for other participant...'}
              </p>
              <p className="text-sm text-gray-400 mt-2">Share the room link to invite someone</p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (PiP) */}
      <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-xl border-2 border-gray-700">
        {localStream && localStream.getTracks().length > 0 ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white text-center p-2">
            <span className="text-2xl mb-1">📷🔇</span>
            <span className="text-xs">Camera/Mic Off</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-xs">
          You
        </div>
      </div>

      {/* Connection Status */}
      {isConnected && (
        <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Connected
        </div>
      )}

      {/* Connection State Info */}
      {connectionState !== 'connected' && connectionState !== 'new' && (
        <div className="absolute top-4 left-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">
          {connectionState}
        </div>
      )}
    </div>
  );
}
