'use client';

import { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';

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
}

export function TranscriptPanel({ transcripts, isTranscribing }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new transcript arrives
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-gray-600" />
          <h2 className="text-gray-900 font-semibold">Live Transcript</h2>
          {isTranscribing && (
            <div className="ml-auto flex items-center gap-2 text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              Recording
            </div>
          )}
        </div>
      </div>

      {/* Transcripts */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {transcripts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {isTranscribing ? <p>Listening...</p> : <p>Start transcription to see live captions</p>}
          </div>
        ) : (
          transcripts.map((transcript) => (
            <div
              key={transcript.id}
              className={`p-3 rounded-lg ${
                transcript.speaker === 'local'
                  ? 'bg-blue-50 border border-blue-200 ml-4'
                  : 'bg-gray-50 border border-gray-200 mr-4'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold ${
                    transcript.speaker === 'local' ? 'text-blue-600' : 'text-violet-600'
                  }`}
                >
                  {transcript.speaker === 'local' ? 'You' : 'Guest'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(transcript.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-gray-900 text-sm">{transcript.text}</p>
              {transcript.confidence < 0.8 && (
                <span className="text-xs text-amber-600">Low confidence</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
