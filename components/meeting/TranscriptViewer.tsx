'use client';

import React, { useRef, useState } from 'react';
import { TranscriptSegment } from '@/types';
import { useTranscriptSync } from '@/hooks/useTranscriptSync';
import { useTranscriptSearch } from '@/hooks/useTranscriptSearch';
import TranscriptSegmentComponent from './TranscriptSegment';
import TranscriptSearch from './TranscriptSearch';
import TranscriptExport from './TranscriptExport';
import AudioPlayer from './AudioPlayer';
import TranscriptTranslator from './TranscriptTranslator';
import { FileText, Loader2 } from 'lucide-react';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  audioUrl: string;
  title: string;
  noteId: string; // Add noteId for caching
  loading?: boolean;
}

export default function TranscriptViewer({
  segments,
  audioUrl,
  title,
  noteId,
  loading = false,
}: TranscriptViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Translation state
  const [translatedSegments, setTranslatedSegments] = useState<TranscriptSegment[]>([]);
  const [displayLanguage, setDisplayLanguage] = useState<string>('Original');

  // Use translated segments if available, otherwise use original
  const displaySegments = translatedSegments.length > 0 ? translatedSegments : segments;

  // Transcript sync with audio (use displaySegments)
  const { currentSegmentId, seekToTime, isPlaying } = useTranscriptSync({
    segments: displaySegments,
    audioRef,
  });

  // Search functionality (use displaySegments)
  const {
    searchQuery,
    setSearchQuery,
    currentMatchIndex,
    totalMatches,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch,
    highlightedSegmentId,
  } = useTranscriptSearch({ segments: displaySegments });

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

  // Handle segment click - seek audio to that time
  const handleSegmentClick = (segment: TranscriptSegment) => {
    seekToTime(segment.start);
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
        <p className="text-gray-500 text-sm mb-2">No transcript segments available yet.</p>
        <p className="text-xs text-gray-400">
          Process or re-process the audio to generate an interactive transcript with accurate
          timestamps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Audio Player with Controls */}
      <AudioPlayer
        audioUrl={audioUrl}
        audioRef={audioRef}
        onTimeUpdate={(time) => {
          // Update handled by useTranscriptSync hook
        }}
      />

      {/* Header with Search, Translate, and Export */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <TranscriptSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentMatch={currentMatchIndex}
            totalMatches={totalMatches}
            onNextMatch={goToNextMatch}
            onPreviousMatch={goToPreviousMatch}
            onClearSearch={clearSearch}
          />
        </div>

        <div className="flex items-center gap-2">
          <TranscriptTranslator
            text={segments.map((s) => s.text).join(' ')}
            onTranslate={handleTranslate}
          />
          <TranscriptExport segments={displaySegments} title={title} language={displayLanguage} />
        </div>
      </div>

      {/* Transcript Segments */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {segments.map((segment) => (
          <TranscriptSegmentComponent
            key={segment.id}
            segment={segment}
            isActive={segment.id === currentSegmentId}
            isHighlighted={segment.id === highlightedSegmentId}
            searchQuery={searchQuery}
            onClick={() => handleSegmentClick(segment)}
          />
        ))}
      </div>

      {/* Audio Status Indicator */}
      {isPlaying && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse z-50">
          <div className="h-2 w-2 bg-white rounded-full animate-bounce" />
          <span className="text-sm font-medium">Audio Playing</span>
        </div>
      )}
    </div>
  );
}
