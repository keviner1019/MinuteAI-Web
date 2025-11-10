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

    // Using LibreTranslate API (free, no API key needed)
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: 'auto', // Auto-detect source language
        target: targetLanguage,
        format: 'text',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      translatedText: data.translatedText,
      detectedLanguage: data.detectedLanguage,
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error.message || 'Translation failed' },
      { status: 500 }
    );
  }
}
