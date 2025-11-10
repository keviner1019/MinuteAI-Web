'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface TranscriptSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentMatch: number;
  totalMatches: number;
  onNextMatch: () => void;
  onPreviousMatch: () => void;
  onClearSearch: () => void;
}

export default function TranscriptSearch({
  searchQuery,
  onSearchChange,
  currentMatch,
  totalMatches,
  onNextMatch,
  onPreviousMatch,
  onClearSearch,
}: TranscriptSearchProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {/* Search Icon */}
        <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />

        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search in transcript..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Match Counter */}
        {searchQuery && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-gray-600 font-medium min-w-[80px] text-center">
              {totalMatches > 0 ? (
                <>
                  {currentMatch + 1} of {totalMatches}
                </>
              ) : (
                'No matches'
              )}
            </span>

            {/* Navigation Buttons */}
            {totalMatches > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPreviousMatch}
                  disabled={totalMatches === 0}
                  title="Previous match"
                  className="p-1.5"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNextMatch}
                  disabled={totalMatches === 0}
                  title="Next match"
                  className="p-1.5"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      {isFocused && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
          <span>💡 Tip: Use Enter to go to next match</span>
        </div>
      )}
    </div>
  );
}
