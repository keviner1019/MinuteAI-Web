'use client';

import { useEffect, useRef } from 'react';
import { VideoOff, MicOff, Radio, WifiOff, Wifi } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface VideoTileProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  isLocal?: boolean;
  userName?: string;
  userAvatar?: string | null;
  isSpeaking?: boolean;
  isRecording?: boolean;
  connectionState?: RTCPeerConnectionState | 'new' | 'connected';
}

export function VideoTile({
  stream,
  isMuted,
  isLocal,
  userName,
  userAvatar,
  isSpeaking = false,
  isRecording = false,
  connectionState = 'connected',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        // Delay play to allow stream to stabilize
        const playVideo = () => {
          if (!videoRef.current) return;
          videoRef.current.play().catch((err) => {
            console.warn('Video autoplay blocked:', err);
            // Add click listener to resume on user interaction
            const handleClick = () => {
              videoRef.current?.play().catch(() => {});
              document.removeEventListener('click', handleClick);
            };
            document.addEventListener('click', handleClick, { once: true });
          });
        };
        setTimeout(playVideo, 100);
      }
    } else {
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  // Check if stream has video tracks
  const hasVideo = stream && stream.getVideoTracks().length > 0;

  // Determine connection status
  const isConnecting = connectionState === 'connecting' || connectionState === 'new';
  const isDisconnected = connectionState === 'disconnected' || connectionState === 'failed' || connectionState === 'closed';

  // Render connection status badge
  const renderConnectionBadge = () => {
    if (isLocal) return null; // Don't show connection status for local user

    if (isDisconnected) {
      return (
        <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 z-10">
          <WifiOff className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-xs font-semibold">Disconnected</span>
        </div>
      );
    }

    if (isConnecting) {
      return (
        <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 z-10">
          <Wifi className="w-3.5 h-3.5 text-white animate-pulse" />
          <span className="text-white text-xs font-semibold">Connecting...</span>
        </div>
      );
    }

    return null;
  };

  // Render recording indicator
  const renderRecordingBadge = () => {
    if (!isRecording) return null;

    return (
      <div className="absolute bottom-3 right-3 bg-red-600/90 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 z-10 animate-pulse">
        <Radio className="w-3.5 h-3.5 text-white" />
        <span className="text-white text-xs font-semibold">REC</span>
      </div>
    );
  };

  if (!hasVideo) {
    // No video - show avatar placeholder with light theme
    return (
      <div
        className={`relative w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center rounded-xl overflow-hidden transition-all duration-300 border border-slate-200 ${
          isSpeaking ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-white' : ''
        } ${isDisconnected ? 'opacity-60' : ''}`}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        {/* Connection status overlay for disconnected */}
        {isDisconnected && (
          <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center z-5">
            <div className="bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-medium">Connection Lost</span>
            </div>
          </div>
        )}

        <div className="text-center flex flex-col items-center justify-center relative z-10 gap-4">
          <div className="relative flex-shrink-0">
            {/* Speaking glow effect */}
            {isSpeaking && (
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-xl scale-125 animate-pulse -z-10" />
            )}
            <Avatar
              src={userAvatar}
              alt={userName || 'Guest'}
              size="lg"
              isSpeaking={isSpeaking}
            />
          </div>
          <div className="flex flex-col items-center gap-2 mt-1">
            <p className="text-slate-700 text-base font-medium max-w-[150px] truncate">{isLocal ? 'You' : userName || 'Guest'}</p>
            <div className="flex items-center gap-2 text-slate-500 bg-slate-300/50 px-3 py-1.5 rounded-full">
              <VideoOff className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Camera Off</span>
            </div>
          </div>
        </div>

        {/* Connection Badge */}
        {renderConnectionBadge()}

        {/* Recording Badge */}
        {renderRecordingBadge()}

        {/* Muted Badge */}
        {isMuted && (
          <div className="absolute top-3 right-3 bg-red-500 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 z-10">
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
      className={`relative w-full h-full max-w-full max-h-full bg-slate-900 overflow-hidden rounded-xl transition-all duration-300 ${
        isSpeaking ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : ''
      } ${isDisconnected ? 'opacity-60' : ''}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full max-w-full max-h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
      />

      {/* Connection status overlay for disconnected */}
      {isDisconnected && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-5">
          <div className="bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-white" />
            <span className="text-white text-sm font-medium">Connection Lost</span>
          </div>
        </div>
      )}

      {/* Speaking indicator border (alternative to ring) */}
      {isSpeaking && (
        <div className="absolute inset-0 border-4 border-emerald-500 rounded-xl pointer-events-none animate-pulse" />
      )}

      {/* Gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

      {/* Name Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2">
          {isLocal && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
          <span className="text-white text-sm font-medium">{isLocal ? 'You' : userName || 'Guest'}</span>
        </div>
      </div>

      {/* Connection Badge */}
      {renderConnectionBadge()}

      {/* Recording Badge */}
      {renderRecordingBadge()}

      {/* Muted Badge */}
      {isMuted && (
        <div className="absolute top-3 right-3 bg-red-500 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 z-10">
          <MicOff className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-xs font-semibold">Muted</span>
        </div>
      )}

      {/* Speaking indicator (green dot) - only show if not muted */}
      {isSpeaking && !isMuted && (
        <div className="absolute top-3 right-3 bg-emerald-500 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 z-10">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-semibold">Speaking</span>
        </div>
      )}
    </div>
  );
}
