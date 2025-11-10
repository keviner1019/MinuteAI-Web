'use client';

import React, { useRef } from 'react';
import { TranscriptSegment } from '@/types';
import { useTranscriptSync } from '@/hooks/useTranscriptSync';
import { useTranscriptSearch } from '@/hooks/useTranscriptSearch';
import TranscriptSegmentComponent from './TranscriptSegment';
import TranscriptSearch from './TranscriptSearch';
import TranscriptExport from './TranscriptExport';
import { FileText, Loader2 } from 'lucide-react';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  audioUrl: string;
  title: string;
  loading?: boolean;
}

export default function TranscriptViewer({
  segments,
  audioUrl,
  title,
  loading = false,
}: TranscriptViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Transcript sync with audio
  const { currentSegmentId, seekToTime, isPlaying } = useTranscriptSync({
    segments,
    audioRef,
  });

  // Search functionality
  const {
    searchQuery,
    setSearchQuery,
    currentMatchIndex,
    totalMatches,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch,
    highlightedSegmentId,
  } = useTranscriptSearch({ segments });

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
        <p className="text-gray-500 text-sm">
          No transcript segments available yet. Process the audio to generate a transcript with
          timestamps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

      {/* Header with Search and Export */}
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

        <TranscriptExport segments={segments} title={title} />
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
