import { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptSegment } from '@/types';

interface UseTranscriptSyncProps {
  segments: TranscriptSegment[];
  audioRef: React.RefObject<HTMLAudioElement>;
}

interface UseTranscriptSyncReturn {
  currentSegmentId: string | null;
  currentTime: number;
  seekToTime: (time: number) => void;
  isPlaying: boolean;
}

/**
 * Hook to sync transcript segments with audio playback
 */
export function useTranscriptSync({
  segments,
  audioRef,
}: UseTranscriptSyncProps): UseTranscriptSyncReturn {
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Update current time as audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      // Find the current segment based on audio time
      const activeSegment = segments.find((segment) => time >= segment.start && time < segment.end);

      if (activeSegment) {
        setCurrentSegmentId(activeSegment.id);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [segments, audioRef]);

  // Seek to specific time in audio
  const seekToTime = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);

        // Auto-play after seeking
        audioRef.current.play().catch((err) => {
          console.log('Auto-play prevented:', err);
        });
      }
    },
    [audioRef]
  );

  return {
    currentSegmentId,
    currentTime,
    seekToTime,
    isPlaying,
  };
}
