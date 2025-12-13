'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, RotateCcw, Download, Volume2, VolumeX } from 'lucide-react';

interface CustomAudioPlayerProps {
  src: string;
  fileName?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export interface CustomAudioPlayerRef {
  audioElement: HTMLAudioElement | null;
  currentTime: number;
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
}

const CustomAudioPlayer = forwardRef<CustomAudioPlayerRef, CustomAudioPlayerProps>(
  ({ src, fileName = 'audio.mp3', onTimeUpdate, onPlay, onPause }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isDragging, setIsDragging] = useState(false);

    const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      audioElement: audioRef.current,
      currentTime,
      seek: (time: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
        }
      },
      play: () => {
        audioRef.current?.play();
      },
      pause: () => {
        audioRef.current?.pause();
      },
    }));

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleTimeUpdate = () => {
        if (!isDragging) {
          setCurrentTime(audio.currentTime);
          onTimeUpdate?.(audio.currentTime);
        }
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
        setCurrentTime(0);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }, [isDragging, onTimeUpdate, onPlay, onPause]);

    const togglePlayPause = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    };

    const handleSeekStart = () => {
      setIsDragging(true);
    };

    const handleSeekEnd = () => {
      setIsDragging(false);
    };

    const handleRestart = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    };

    const toggleMute = () => {
      if (audioRef.current) {
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
      }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
        if (newVolume === 0) {
          setIsMuted(true);
        } else if (isMuted) {
          setIsMuted(false);
        }
      }
    };

    const handleSpeedChange = () => {
      const currentIndex = playbackSpeeds.indexOf(playbackRate);
      const nextIndex = (currentIndex + 1) % playbackSpeeds.length;
      const newSpeed = playbackSpeeds[nextIndex];
      setPlaybackRate(newSpeed);
      if (audioRef.current) {
        audioRef.current.playbackRate = newSpeed;
      }
    };

    const formatTime = (time: number) => {
      if (isNaN(time)) return '0:00';
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleDownload = () => {
      const link = document.createElement('a');
      link.href = src;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 shadow-lg">
        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Main Controls */}
        <div className="flex items-center gap-4 mb-4">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" fill="white" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" fill="white" />
            )}
          </button>

          {/* Time Display */}
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span className="text-blue-700">{formatTime(currentTime)}</span>
              <span className="text-gray-500">{formatTime(duration)}</span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden group cursor-pointer">
              <div
                className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekEnd}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {/* Hover effect */}
              <div className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-20 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Restart Button */}
            <button
              onClick={handleRestart}
              className="p-2 rounded-lg hover:bg-white/80 text-gray-700 hover:text-blue-600 transition-all"
              title="Restart"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Speed Control */}
            <button
              onClick={handleSpeedChange}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-100 text-gray-700 hover:text-blue-700 font-semibold text-sm transition-all border border-gray-200 hover:border-blue-300 min-w-[60px]"
              title="Playback Speed"
            >
              {playbackRate}x
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg hover:bg-white/80 text-gray-700 hover:text-blue-600 transition-all"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <div className="w-0 group-hover:w-20 overflow-hidden transition-all duration-300">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-gray-300 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-blue-100 text-gray-700 hover:text-blue-700 font-medium text-sm transition-all border border-gray-200 hover:border-blue-300 shadow-sm"
            title="Download Audio"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    );
  }
);

CustomAudioPlayer.displayName = 'CustomAudioPlayer';

export default CustomAudioPlayer;
