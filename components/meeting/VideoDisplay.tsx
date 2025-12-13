'use client';

import { useEffect, useRef } from 'react';
import { VideoOff } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface VideoDisplayProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  isLocal?: boolean;
  userName?: string;
  userAvatar?: string | null;
}

export function VideoDisplay({
  stream,
  isMuted,
  isLocal,
  userName,
  userAvatar,
}: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="mb-4">
            <Avatar
              src={userAvatar}
              alt={userName || 'Guest'}
              size="xl"
              className="w-32 h-32 mx-auto"
            />
          </div>
          <p className="text-white text-lg font-medium mb-2">{userName || 'Guest'}</p>
          <div className="flex items-center gap-2 text-gray-400">
            <VideoOff className="w-5 h-5" />
            <span className="text-sm">Camera Off</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video to prevent echo
        className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`} // Mirror local video
      />

      {/* User name badge */}
      <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
        <span className="text-white text-sm font-medium">
          {isLocal ? 'You' : userName || 'Guest'}
        </span>
      </div>

      {/* Muted indicator */}
      {isMuted && (
        <div className="absolute top-3 right-3 bg-red-500 px-2 py-1 rounded-full flex items-center gap-1">
          <span className="text-white text-xs font-medium">Muted</span>
        </div>
      )}
    </div>
  );
}
