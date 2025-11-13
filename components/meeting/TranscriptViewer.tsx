'use client';

import React, { useState } from 'react';
import { TranscriptSegment } from '@/types';
import TranscriptExport from './TranscriptExport';
import TranscriptTranslator from './TranscriptTranslator';
import { FileText, Loader2 } from 'lucide-react';

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
          <TranscriptExport segments={displaySegments} title={title} language={displayLanguage} />
        </div>
      </div>

      {/* Transcript Content - Simple Display */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-h-[600px] overflow-y-auto">
        <div className="prose prose-sm max-w-none">
          {hasTranslation && showBothVersions
            ? // Show both versions side by side
              displaySegments.map((segment, index) => (
                <div
                  key={segment.id || index}
                  className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-blue-600 uppercase mb-2">
                      Translated ({displayLanguage})
                    </p>
                    <p className="text-gray-900 leading-relaxed font-medium">{segment.text}</p>
                  </div>
                  <div className="border-t border-gray-300 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Original</p>
                    <p className="text-gray-600 leading-relaxed">{segments[index]?.text}</p>
                  </div>
                </div>
              ))
            : // Show single version
              displaySegments.map((segment, index) => (
                <p key={segment.id || index} className="text-gray-800 leading-relaxed mb-4">
                  {segment.text}
                </p>
              ))}
        </div>
      </div>
    </div>
  );
}
