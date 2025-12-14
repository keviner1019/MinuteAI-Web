'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TranscriptSegment } from '@/types';
import TranscriptExport from './TranscriptExport';
import TranscriptTranslator from './TranscriptTranslator';
import CustomAudioPlayer, { CustomAudioPlayerRef } from './CustomAudioPlayer';
import { FileText, Loader2 } from 'lucide-react';

interface WordTimestamp {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string;
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  audioUrl: string;
  title: string;
  noteId: string;
  loading?: boolean;
}

export default function TranscriptViewer({
  segments,
  audioUrl,
  title,
  noteId,
  loading = false,
}: TranscriptViewerProps) {
  // Translation state
  const [translatedSegments, setTranslatedSegments] = useState<TranscriptSegment[]>([]);
  const [displayLanguage, setDisplayLanguage] = useState<string>('Original');
  const [showBothVersions, setShowBothVersions] = useState<boolean>(false);

  // Audio playback state
  const audioPlayerRef = useRef<CustomAudioPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Parse word timestamps from segments
  const wordTimestamps = React.useMemo(() => {
    const words: WordTimestamp[] = [];
    segments.forEach((segment) => {
      // If segment has words array from AssemblyAI
      if ((segment as any).words && Array.isArray((segment as any).words)) {
        (segment as any).words.forEach((word: any) => {
          words.push({
            text: word.text,
            start: word.start / 1000, // Convert ms to seconds
            end: word.end / 1000,
            confidence: word.confidence || 0.95,
            speaker: word.speaker || segment.speaker || '',
          });
        });
      }
    });
    return words;
  }, [segments]);

  // Handle time updates from custom audio player
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  // Handle word click to seek audio
  const handleWordClick = (startTime: number) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seek(startTime);
      audioPlayerRef.current.play();
    }
  };

  // Use translated segments if available, otherwise use original
  const displaySegments = translatedSegments.length > 0 ? translatedSegments : segments;
  const hasTranslation = translatedSegments.length > 0 && displayLanguage !== 'Original';

  // Handle translation with caching
  const handleTranslate = async (translatedText: string, languageCode: string) => {
    if (languageCode === 'Original') {
      setTranslatedSegments([]);
      setDisplayLanguage('Original');
      return;
    }

    // Check cache first
    try {
      const cacheResponse = await fetch(
        `/api/translations-cache?noteId=${noteId}&targetLanguage=${languageCode}`
      );
      const cacheData = await cacheResponse.json();

      if (cacheData.cached && cacheData.translatedSegments) {
        console.log('Using cached translation');
        setTranslatedSegments(cacheData.translatedSegments);
        setDisplayLanguage(languageCode);
        return;
      }
    } catch (error) {
      console.warn('Cache check failed, proceeding with translation:', error);
    }

    // Translate all segments if not cached
    setDisplayLanguage(languageCode);

    // Extract language code (e.g., "es" from "Spanish (Español)")
    const langCode = languageCode.toLowerCase().slice(0, 2);

    const translated = await Promise.all(
      segments.map(async (segment) => {
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: segment.text,
              targetLanguage: langCode,
            }),
          });

          const data = await response.json();

          // If translation failed or not successful, return original segment
          if (!data.success || !data.translatedText) {
            console.warn('Translation failed for segment, using original:', data.error);
            return segment;
          }

          return {
            ...segment,
            text: data.translatedText,
          };
        } catch (error) {
          console.error('Translation error:', error);
          return segment; // Return original on error
        }
      })
    );

    setTranslatedSegments(translated);

    // Save to cache in background (don't await)
    fetch('/api/translations-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        noteId,
        targetLanguage: langCode,
        translatedSegments: translated,
      }),
    }).catch((error) => console.warn('Failed to cache translation:', error));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading transcript...</span>
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-sm mb-2">No transcript available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Custom Audio Player */}
      <CustomAudioPlayer
        ref={audioPlayerRef}
        src={audioUrl}
        fileName={`${title}.mp3`}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
      />

      {/* Header with Translate and Export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {hasTranslation && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors">
              <input
                type="checkbox"
                checked={showBothVersions}
                onChange={(e) => setShowBothVersions(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium">Show Original Text</span>
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TranscriptTranslator
            text={segments.map((s) => s.text).join(' ')}
            onTranslate={handleTranslate}
          />
          <TranscriptExport
            segments={displaySegments}
            title={title}
            language={displayLanguage}
            originalSegments={hasTranslation ? segments : undefined}
          />
        </div>
      </div>

      {/* Interactive Transcript with Word-Level Accuracy */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border-2 border-gray-200 p-8 max-h-[700px] overflow-y-auto shadow-inner">
        <div className="space-y-5">
          {wordTimestamps.length > 0 && !hasTranslation
            ? // Interactive word-level transcript (only when not translated)
              (() => {
                const segmentsByUtterance: Array<{ speaker: string; words: WordTimestamp[] }> = [];
                let currentSpeaker = '';
                let currentWords: WordTimestamp[] = [];

                wordTimestamps.forEach((word, idx) => {
                  if (word.speaker !== currentSpeaker && currentWords.length > 0) {
                    segmentsByUtterance.push({ speaker: currentSpeaker, words: currentWords });
                    currentWords = [];
                  }
                  currentSpeaker = word.speaker;
                  currentWords.push(word);

                  if (idx === wordTimestamps.length - 1) {
                    segmentsByUtterance.push({ speaker: currentSpeaker, words: currentWords });
                  }
                });

                return segmentsByUtterance.map((utterance, index) => {
                  const speakerLetter = utterance.speaker || 'A';
                  const speakerColors = {
                    A: {
                      gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                      border: '#3B82F6',
                      text: '#1D4ED8',
                      badge: '#DBEAFE',
                      badgeText: '#1E40AF',
                    },
                    B: {
                      gradient: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
                      border: '#A855F7',
                      text: '#7E22CE',
                      badge: '#F3E8FF',
                      badgeText: '#6B21A8',
                    },
                    C: {
                      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      border: '#10B981',
                      text: '#047857',
                      badge: '#D1FAE5',
                      badgeText: '#065F46',
                    },
                    D: {
                      gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                      border: '#F97316',
                      text: '#C2410C',
                      badge: '#FFEDD5',
                      badgeText: '#9A3412',
                    },
                    E: {
                      gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                      border: '#EC4899',
                      text: '#BE185D',
                      badge: '#FCE7F3',
                      badgeText: '#9F1239',
                    },
                    F: {
                      gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                      border: '#14B8A6',
                      text: '#0F766E',
                      badge: '#CCFBF1',
                      badgeText: '#115E59',
                    },
                  } as const;
                  const colors =
                    speakerColors[speakerLetter as keyof typeof speakerColors] || speakerColors.A;

                  return (
                    <div
                      key={`utterance-${index}`}
                      className="bg-white rounded-xl p-5 shadow-sm border-l-4 hover:shadow-md transition-shadow"
                      style={{ borderLeftColor: colors.border }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{ background: colors.gradient }}
                        >
                          {speakerLetter}
                        </div>
                        <p className="text-sm font-bold" style={{ color: colors.text }}>
                          Speaker {speakerLetter}
                        </p>
                        <span
                          className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: colors.badge, color: colors.badgeText }}
                        >
                          {speakerLetter}
                        </span>
                      </div>

                      <div className="text-gray-800 leading-relaxed text-base pl-10">
                        {utterance.words.map((word, wordIdx) => {
                          const isActive = currentTime >= word.start && currentTime <= word.end;
                          return (
                            <span
                              key={`${index}-${wordIdx}`}
                              onClick={() => handleWordClick(word.start)}
                              className={`cursor-pointer hover:bg-blue-100 hover:text-blue-900 transition-colors rounded px-0.5 ${
                                isActive ? 'bg-yellow-200 text-yellow-900 font-semibold' : ''
                              }`}
                              title={`Click to play from ${word.start.toFixed(1)}s`}
                            >
                              {word.text}{' '}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()
            : hasTranslation && showBothVersions
            ? // Show both translated and original versions side by side
              displaySegments.map((segment, index) => {
                const speakerLetter = segment.speaker?.split(' ')[1] || 'A';
                const speakerColors = {
                  A: {
                    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    border: '#3B82F6',
                    text: '#1D4ED8',
                    badge: '#DBEAFE',
                    badgeText: '#1E40AF',
                  },
                  B: {
                    gradient: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
                    border: '#A855F7',
                    text: '#7E22CE',
                    badge: '#F3E8FF',
                    badgeText: '#6B21A8',
                  },
                  C: {
                    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: '#10B981',
                    text: '#047857',
                    badge: '#D1FAE5',
                    badgeText: '#065F46',
                  },
                  D: {
                    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                    border: '#F97316',
                    text: '#C2410C',
                    badge: '#FFEDD5',
                    badgeText: '#9A3412',
                  },
                  E: {
                    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                    border: '#EC4899',
                    text: '#BE185D',
                    badge: '#FCE7F3',
                    badgeText: '#9F1239',
                  },
                  F: {
                    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                    border: '#14B8A6',
                    text: '#0F766E',
                    badge: '#CCFBF1',
                    badgeText: '#115E59',
                  },
                } as const;
                const colors =
                  speakerColors[speakerLetter as keyof typeof speakerColors] || speakerColors.A;

                return (
                  <div
                    key={segment.id || index}
                    className="bg-white rounded-xl p-5 shadow-sm border-l-4 hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: colors.border }}
                  >
                    {segment.speaker && (
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{ background: colors.gradient }}
                        >
                          {speakerLetter}
                        </div>
                        <p className="text-sm font-bold" style={{ color: colors.text }}>
                          {segment.speaker}
                        </p>
                        <span
                          className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: colors.badge, color: colors.badgeText }}
                        >
                          {speakerLetter}
                        </span>
                      </div>
                    )}
                    <div className="mb-4 pl-10">
                      <p className="text-xs font-semibold text-blue-600 uppercase mb-2 tracking-wide">
                        Translated ({displayLanguage})
                      </p>
                      <p className="text-gray-900 leading-relaxed text-base">{segment.text}</p>
                    </div>
                    <div className="border-t border-gray-200 pt-4 pl-10">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wide">
                        Original
                      </p>
                      <p className="text-gray-600 leading-relaxed text-sm">
                        {segments[index]?.text}
                      </p>
                    </div>
                  </div>
                );
              })
            : // Show single version with enhanced styling
              displaySegments.map((segment, index) => {
                const speakerLetter = segment.speaker?.split(' ')[1] || 'A';
                const speakerColors = {
                  A: {
                    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    border: '#3B82F6',
                    text: '#1D4ED8',
                    badge: '#DBEAFE',
                    badgeText: '#1E40AF',
                  },
                  B: {
                    gradient: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
                    border: '#A855F7',
                    text: '#7E22CE',
                    badge: '#F3E8FF',
                    badgeText: '#6B21A8',
                  },
                  C: {
                    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: '#10B981',
                    text: '#047857',
                    badge: '#D1FAE5',
                    badgeText: '#065F46',
                  },
                  D: {
                    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                    border: '#F97316',
                    text: '#C2410C',
                    badge: '#FFEDD5',
                    badgeText: '#9A3412',
                  },
                  E: {
                    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                    border: '#EC4899',
                    text: '#BE185D',
                    badge: '#FCE7F3',
                    badgeText: '#9F1239',
                  },
                  F: {
                    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                    border: '#14B8A6',
                    text: '#0F766E',
                    badge: '#CCFBF1',
                    badgeText: '#115E59',
                  },
                } as const;
                const colors =
                  speakerColors[speakerLetter as keyof typeof speakerColors] || speakerColors.A;

                return (
                  <div
                    key={segment.id || index}
                    className="bg-white rounded-xl p-5 shadow-sm border-l-4 hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: colors.border }}
                  >
                    {segment.speaker && (
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{ background: colors.gradient }}
                        >
                          {speakerLetter}
                        </div>
                        <p className="text-sm font-bold" style={{ color: colors.text }}>
                          {segment.speaker}
                        </p>
                        <span
                          className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: colors.badge, color: colors.badgeText }}
                        >
                          {speakerLetter}
                        </span>
                      </div>
                    )}
                    <p className="text-gray-800 leading-relaxed text-base pl-10">{segment.text}</p>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}
