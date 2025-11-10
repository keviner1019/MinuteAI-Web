import { NextRequest, NextResponse } from 'next/server';

// Using free translation API - no API key required
// This is a simple implementation using LibreTranslate (free and open-source)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, targetLanguage } = body;

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing text or targetLanguage' },
        { status: 400 }
      );
    }

    // Using LibreTranslate API (free, no API key needed) with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        body: JSON.stringify({
          q: text,
          source: 'auto', // Auto-detect source language
          target: targetLanguage,
          format: 'text',
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('LibreTranslate API error:', response.status, response.statusText);
        // Return original text if translation fails
        return NextResponse.json({
          success: false,
          translatedText: text,
          detectedLanguage: 'unknown',
          error: 'Translation service unavailable. Showing original text.',
        });
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        translatedText: data.translatedText || text,
        detectedLanguage: data.detectedLanguage || 'unknown',
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Translation request timed out');
      } else {
        console.error('Translation fetch error:', fetchError);
      }

      // Return original text on error
      return NextResponse.json({
        success: false,
        translatedText: text,
        detectedLanguage: 'unknown',
        error: 'Translation failed. Showing original text.',
      });
    }
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Translation failed',
        translatedText: '',
      },
      { status: 500 }
    );
  }
}
