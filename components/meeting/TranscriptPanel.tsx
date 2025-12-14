'use client';

import { useEffect, useRef, useMemo } from 'react';
import { FileText, Mic } from 'lucide-react';

interface Transcript {
  id: string;
  text: string;
  speaker: 'local' | 'remote';
  timestamp: number;
  confidence: number;
}

interface TranscriptPanelProps {
  transcripts: Transcript[];
  isTranscribing: boolean;
  onToggleLive?: () => void;
}

// Speaker color configuration
const speakerColors = {
  local: {
    bg: 'bg-blue-500',
    text: 'text-blue-700',
    border: 'border-l-blue-500',
    label: 'You',
  },
  remote: {
    bg: 'bg-purple-500',
    text: 'text-purple-700',
    border: 'border-l-purple-500',
    label: 'Guest',
  },
};

export function TranscriptPanel({ transcripts, isTranscribing, onToggleLive }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group consecutive transcripts by speaker
  const groupedTranscripts = useMemo(() => {
    const groups: Array<{
      speaker: 'local' | 'remote';
      segments: Transcript[];
      startTime: number;
    }> = [];

    transcripts.forEach((transcript) => {
      const lastGroup = groups[groups.length - 1];

      // If same speaker and within 10 seconds, add to existing group
      if (
        lastGroup &&
        lastGroup.speaker === transcript.speaker &&
        transcript.timestamp - lastGroup.segments[lastGroup.segments.length - 1].timestamp < 10000
      ) {
        lastGroup.segments.push(transcript);
      } else {
        // Start new group
        groups.push({
          speaker: transcript.speaker,
          segments: [transcript],
          startTime: transcript.timestamp,
        });
      }
    });

    return groups;
  }, [transcripts]);

  useEffect(() => {
    // Auto-scroll to bottom when new transcript arrives
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="w-96 bg-gradient-to-b from-gray-50 to-white border-l border-gray-200 flex flex-col relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText size={18} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-gray-900 font-semibold text-sm">Live Transcript</h2>
            <p className="text-xs text-gray-500">Real-time speech to text</p>
          </div>
          {isTranscribing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-red-600">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Transcripts - Conversation Style */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 relative">
        {transcripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-gray-500 py-12">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Mic size={24} className="text-gray-400" />
            </div>
            {isTranscribing ? (
              <>
                <p className="font-medium text-gray-700">Listening...</p>
                <p className="text-sm text-gray-500 mt-1">Start speaking to see transcript</p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-700">Transcript Ready</p>
                <p className="text-sm text-gray-500 mt-1">Your conversation will appear here</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedTranscripts.map((group, groupIndex) => {
              const colors = speakerColors[group.speaker];
              return (
                <div
                  key={`group-${groupIndex}-${group.startTime}`}
                  className={`border-l-4 ${colors.border} pl-3 py-1`}
                >
                  {/* Speaker header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 ${colors.bg} rounded-full flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">
                        {colors.label.charAt(0)}
                      </span>
                    </div>
                    <span className={`text-sm font-semibold ${colors.text}`}>
                      {colors.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(group.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Combined transcript text */}
                  <div className="text-gray-800 text-sm leading-relaxed">
                    {group.segments.map((segment, segIndex) => (
                      <span key={segment.id}>
                        {segment.text}
                        {segIndex < group.segments.length - 1 ? ' ' : ''}
                      </span>
                    ))}
                  </div>

                  {/* Low confidence indicator */}
                  {group.segments.some(s => s.confidence < 0.8) && (
                    <span className="inline-block mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      Low confidence
                    </span>
                  )}
                </div>
              );
            })}

            {/* Typing indicator when transcribing */}
            {isTranscribing && (
              <div className="flex items-center gap-2 text-gray-400 text-sm pl-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Listening...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Toggle Button */}
      {onToggleLive && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={onToggleLive}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all shadow-lg ${
              isTranscribing
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isTranscribing ? 'bg-white animate-pulse' : 'bg-gray-400'
              }`}
            />
            Live
          </button>
        </div>
      )}
    </div>
  );
}
