'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { formatTime } from '@/utils/timeFormatter';

interface AudioPlayerProps {
  audioUrl: string;
  audioRef?: React.RefObject<HTMLAudioElement>; // Accept external ref
  onTimeUpdate?: (currentTime: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export default function AudioPlayer({
  audioUrl,
  audioRef: externalRef,
  onTimeUpdate,
  onPlay,
  onPause,
}: AudioPlayerProps) {
  const internalRef = useRef<HTMLAudioElement>(null);
  const audioRef = externalRef || internalRef; // Use external ref if provided
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPause?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onPlay, onPause]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(duration, audioRef.current.currentTime + seconds)
      );
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          title="Seek audio"
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progress}%, #E5E7EB ${progress}%, #E5E7EB 100%)`,
          } as React.CSSProperties}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-10)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Rewind 10s"
          >
            <SkipBack className="h-5 w-5 text-gray-700" />
          </button>

          <button
            onClick={togglePlay}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors shadow-md"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={handleStop}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Stop"
          >
            <Square className="h-5 w-5 text-gray-700" />
          </button>

          <button
            onClick={() => skip(10)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Forward 10s"
          >
            <SkipForward className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Speed Control */}
        <button
          onClick={changePlaybackRate}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          title="Change playback speed"
        >
          {playbackRate}×
        </button>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5 text-gray-700" />
            ) : (
              <Volume2 className="h-5 w-5 text-gray-700" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            title="Volume"
          />
        </div>
      </div>

      {/* Status Indicator */}
      {isPlaying && (
        <div className="mt-3 text-xs text-blue-600 flex items-center gap-2">
          <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
          Now Playing
        </div>
      )}
    </div>
  );
}

// Export the ref type for parent components
export type { AudioPlayerProps };
