'use client';

import React, { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface TranscriptTranslatorProps {
  text: string;
  onTranslate: (translatedText: string, languageCode: string) => void;
}

// Common languages with their codes
const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'th', name: 'Thai (ไทย)' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  { code: 'id', name: 'Indonesian (Bahasa Indonesia)' },
  { code: 'ms', name: 'Malay (Bahasa Melayu)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'sv', name: 'Swedish (Svenska)' },
];

export default function TranscriptTranslator({ text, onTranslate }: TranscriptTranslatorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translating, setTranslating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleTranslate = async (languageCode: string, languageName: string) => {
    if (!text) return;

    setTranslating(true);
    setShowDropdown(false);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: languageCode,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      // Pass language code instead of language name to parent
      onTranslate(data.translatedText, languageCode);
      setSelectedLanguage(languageName);
    } catch (error) {
      console.error('Translation error:', error);
      alert('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const handleShowOriginal = () => {
    onTranslate(text, 'Original');
    setSelectedLanguage('');
  };

  return (
    <div className="relative">
      {/* Translate Button */}
      <Button
        variant="secondary"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={translating || !text}
      >
        {translating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Translating...
          </>
        ) : (
          <>
            <Languages className="h-4 w-4" />
            {selectedLanguage ? `Translated: ${selectedLanguage}` : 'Translate'}
          </>
        )}
      </Button>

      {/* Language Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-y-auto">
            <div className="p-2 border-b border-gray-200 bg-gray-50 sticky top-0">
              <p className="text-xs font-medium text-gray-700">Select Language</p>
            </div>

            <div className="p-1">
              {/* Show Original Button */}
              {selectedLanguage && (
                <button
                  onClick={handleShowOriginal}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-md transition-colors mb-1 border-b border-gray-200"
                >
                  <p className="text-sm font-medium text-blue-600">
                    ← Show Original
                  </p>
                </button>
              )}

              {/* Language Options */}
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleTranslate(lang.code, lang.name)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors ${
                    selectedLanguage === lang.name ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="text-sm text-gray-900">{lang.name}</p>
                </button>
              ))}
            </div>

            <div className="p-2 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <p className="text-xs text-gray-500">
                🌍 Translation powered by LibreTranslate (Free & Open Source)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
