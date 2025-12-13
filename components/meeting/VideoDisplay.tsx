'use client';

import { useEffect, useRef } from 'react';
import { VideoOff, MicOff } from 'lucide-react';
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
    if (!videoRef.current) return;

    if (stream) {
      // Always update srcObject when stream changes
      if (videoRef.current.srcObject !== stream) {
        console.log(`📹 Attaching video stream:`, {
          streamId: stream.id,
          tracks: stream.getVideoTracks().length,
          trackStates: stream.getVideoTracks().map(t => ({
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          })),
        });
        videoRef.current.srcObject = stream;

        // Ensure video plays
        videoRef.current.play().catch((err) => {
          console.warn('Video autoplay blocked:', err);
        });
      }
    } else {
      // Clear srcObject when no stream
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} />
        </div>

        <div className="text-center flex flex-col items-center justify-center relative z-10">
          <div className="relative mb-5">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-slate-300/50 blur-2xl scale-125" />
            <Avatar
              src={userAvatar}
              alt={userName || 'Guest'}
              size="xl"
              className="w-28 h-28 mx-auto relative z-10 ring-4 ring-white/50"
            />
          </div>
          <p className="text-slate-800 text-lg font-semibold mb-2">{userName || 'Guest'}</p>
          <div className="flex items-center gap-2 text-slate-500 bg-white/80 px-4 py-2 rounded-full border border-slate-200">
            <VideoOff className="w-4 h-4" />
            <span className="text-sm font-medium">Camera Off</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-200 overflow-hidden group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video to prevent echo
        className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`} // Mirror local video
      />

      {/* Gradient overlay at bottom for better text visibility */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />

      {/* User name badge */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 shadow-lg flex items-center gap-2">
          {isLocal && (
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
          )}
          <span className="text-slate-700 text-sm font-medium">
            {isLocal ? 'You' : userName || 'Guest'}
          </span>
        </div>
      </div>

      {/* Muted indicator */}
      {isMuted && (
        <div className="absolute top-4 right-4 bg-red-500 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 border border-red-400 shadow-lg">
          <MicOff className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-xs font-semibold">Muted</span>
        </div>
      )}

      {/* Live indicator for remote users */}
      {!isLocal && !isMuted && (
        <div className="absolute top-4 right-4 bg-emerald-50 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 border border-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-700 text-xs font-semibold">Live</span>
        </div>
      )}
    </div>
  );
}
