import { useState, useMemo, useCallback } from 'react';
import { TranscriptSegment } from '@/types';
import { debounce } from '@/utils/timeFormatter';

interface UseTranscriptSearchProps {
  segments: TranscriptSegment[];
}

interface SearchMatch {
  segmentId: string;
  segmentIndex: number;
}

interface UseTranscriptSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  matches: SearchMatch[];
  currentMatchIndex: number;
  totalMatches: number;
  goToNextMatch: () => void;
  goToPreviousMatch: () => void;
  clearSearch: () => void;
  highlightedSegmentId: string | null;
}

/**
 * Hook for searching and highlighting transcript segments
 */
export function useTranscriptSearch({
  segments,
}: UseTranscriptSearchProps): UseTranscriptSearchReturn {
  const [searchQuery, setSearchQueryState] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Find all matching segments
  const matches = useMemo<SearchMatch[]>(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchMatch[] = [];

    segments.forEach((segment, index) => {
      if (segment.text.toLowerCase().includes(query)) {
        results.push({
          segmentId: segment.id,
          segmentIndex: index,
        });
      }
    });

    return results;
  }, [searchQuery, segments]);

  // Get currently highlighted segment
  const highlightedSegmentId = matches.length > 0 ? matches[currentMatchIndex]?.segmentId : null;

  // Navigate to next match
  const goToNextMatch = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
    }
  }, [matches.length]);

  // Navigate to previous match
  const goToPreviousMatch = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
    }
  }, [matches.length]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQueryState('');
    setCurrentMatchIndex(0);
  }, []);

  // Update search query with debouncing
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    setCurrentMatchIndex(0); // Reset to first match when query changes
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    matches,
    currentMatchIndex,
    totalMatches: matches.length,
    goToNextMatch,
    goToPreviousMatch,
    clearSearch,
    highlightedSegmentId,
  };
}
