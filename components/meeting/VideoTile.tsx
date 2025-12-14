'use client';

import { useEffect, useRef } from 'react';
import { VideoOff, MicOff } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface VideoTileProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  isLocal?: boolean;
  userName?: string;
  userAvatar?: string | null;
  isSpeaking?: boolean;
}

export function VideoTile({
  stream,
  isMuted,
  isLocal,
  userName,
  userAvatar,
  isSpeaking = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn('Video autoplay blocked:', err);
        });
      }
    } else {
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  // Check if stream has video tracks
  const hasVideo = stream && stream.getVideoTracks().length > 0;

  if (!hasVideo) {
    // No video - show avatar placeholder
    return (
      <div
        className={`relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center rounded-xl overflow-hidden transition-all duration-300 ${
          isSpeaking ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : ''
        }`}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="text-center flex flex-col items-center justify-center relative z-10">
          <div className="relative mb-4">
            {/* Speaking glow effect */}
            {isSpeaking && (
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-xl scale-150 animate-pulse" />
            )}
            <Avatar
              src={userAvatar}
              alt={userName || 'Guest'}
              size="xl"
              className={`w-20 h-20 md:w-24 md:h-24 mx-auto relative z-10 ${
                isSpeaking ? 'ring-4 ring-emerald-400' : 'ring-2 ring-white/20'
              }`}
            />
          </div>
          <p className="text-white text-base font-medium mb-2">{isLocal ? 'You' : userName || 'Guest'}</p>
          <div className="flex items-center gap-2 text-slate-400 bg-slate-700/50 px-3 py-1 rounded-full">
            <VideoOff className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Camera Off</span>
          </div>
        </div>

        {/* Name Badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2">
            {isLocal && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
            <span className="text-white text-sm font-medium">{isLocal ? 'You' : userName || 'Guest'}</span>
          </div>
        </div>

        {/* Muted Badge */}
        {isMuted && (
          <div className="absolute top-3 right-3 bg-red-500 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <MicOff className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-semibold">Muted</span>
          </div>
        )}
      </div>
    );
  }

  // Has video - show video feed
  return (
    <div
      className={`relative w-full h-full bg-slate-900 overflow-hidden rounded-xl transition-all duration-300 ${
        isSpeaking ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : ''
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
      />

      {/* Speaking indicator border (alternative to ring) */}
      {isSpeaking && (
        <div className="absolute inset-0 border-4 border-emerald-500 rounded-xl pointer-events-none animate-pulse" />
      )}

      {/* Gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

      {/* Name Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2">
          {isLocal && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
          <span className="text-white text-sm font-medium">{isLocal ? 'You' : userName || 'Guest'}</span>
        </div>
      </div>

      {/* Muted Badge */}
      {isMuted && (
        <div className="absolute top-3 right-3 bg-red-500 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          <MicOff className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-xs font-semibold">Muted</span>
        </div>
      )}

      {/* Speaking indicator (green dot) */}
      {isSpeaking && !isMuted && (
        <div className="absolute top-3 right-3 bg-emerald-500 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-semibold">Speaking</span>
        </div>
      )}
    </div>
  );
}
