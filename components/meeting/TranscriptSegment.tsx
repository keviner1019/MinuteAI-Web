'use client';

import React, { useRef, useEffect } from 'react';
import { TranscriptSegment } from '@/types';
import { formatTime } from '@/utils/timeFormatter';
import { Clock, User } from 'lucide-react';

interface TranscriptSegmentProps {
  segment: TranscriptSegment;
  isActive: boolean;
  isHighlighted: boolean;
  searchQuery: string;
  onClick: () => void;
}

const TranscriptSegmentComponent = React.memo(
  ({ segment, isActive, isHighlighted, searchQuery, onClick }: TranscriptSegmentProps) => {
    const segmentRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active or highlighted segment
    useEffect(() => {
      if ((isActive || isHighlighted) && segmentRef.current) {
        segmentRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }, [isActive, isHighlighted]);

    // Highlight search terms in text
    const highlightText = (text: string, query: string) => {
      if (!query.trim()) return text;

      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      );
    };

    return (
      <div
        ref={segmentRef}
        className={`
          group p-4 rounded-lg border transition-all duration-200 cursor-pointer
          ${
            isActive
              ? 'bg-blue-50 border-blue-300 shadow-sm'
              : isHighlighted
              ? 'bg-yellow-50 border-yellow-300'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }
        `}
        onClick={onClick}
      >
        {/* Header: Timestamp and Speaker */}
        <div className="flex items-center gap-3 mb-2">
          <button
            className={`
              flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded transition-colors
              ${
                isActive
                  ? 'text-blue-700 bg-blue-100'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }
            `}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Clock className="h-3.5 w-3.5" />
            {formatTime(segment.start)}
          </button>

          {segment.speaker && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium">{segment.speaker}</span>
            </div>
          )}

          {segment.confidence && (
            <span className="text-xs text-gray-400 ml-auto">
              {Math.round(segment.confidence * 100)}% confident
            </span>
          )}
        </div>

        {/* Transcript Text */}
        <p className="text-sm text-gray-700 leading-relaxed">
          {highlightText(segment.text, searchQuery)}
        </p>

        {/* Play icon hint on hover */}
        {!isActive && (
          <div className="mt-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to jump to this moment ▶
          </div>
        )}
      </div>
    );
  }
);

TranscriptSegmentComponent.displayName = 'TranscriptSegment';

export default TranscriptSegmentComponent;
