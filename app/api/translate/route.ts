import { NextRequest, NextResponse } from 'next/server';

// Using DeepL API for high-quality translation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, targetLanguage } = body;

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Missing text or targetLanguage' }, { status: 400 });
    }

    // Get DeepL API key from environment
    const deeplApiKey = process.env.DEEPL_API_KEY;

    if (!deeplApiKey) {
      console.error('DeepL API key not configured');
      return NextResponse.json(
        {
          success: false,
          error:
            'Translation service not configured. Please add DEEPL_API_KEY to environment variables.',
          translatedText: text,
        },
        { status: 500 }
      );
    }

    // Map common language codes to DeepL format
    const deeplLanguageMap: Record<string, string> = {
      en: 'EN',
      zh: 'ZH',
      es: 'ES',
      fr: 'FR',
      de: 'DE',
      ja: 'JA',
      ko: 'KO',
      ar: 'AR',
      pt: 'PT-PT',
      ru: 'RU',
      it: 'IT',
      hi: 'HI',
      th: 'TH',
      vi: 'VI',
      id: 'ID',
      ms: 'MS',
      nl: 'NL',
      pl: 'PL',
      tr: 'TR',
      sv: 'SV',
    };

    const deeplTargetLang =
      deeplLanguageMap[targetLanguage.toLowerCase()] || targetLanguage.toUpperCase();

    // Call DeepL API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Use DeepL Free API endpoint (if you have free plan) or Pro endpoint
      const apiUrl = deeplApiKey.endsWith(':fx')
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${deeplApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [text],
          target_lang: deeplTargetLang,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('DeepL API error:', response.status, errorData);

        return NextResponse.json({
          success: false,
          translatedText: text,
          detectedLanguage: 'unknown',
          error: `Translation failed: ${errorData.message || response.statusText}`,
        });
      }

      const data = await response.json();

      if (!data.translations || data.translations.length === 0) {
        return NextResponse.json({
          success: false,
          translatedText: text,
          detectedLanguage: 'unknown',
          error: 'No translation returned from API',
        });
      }

      const translation = data.translations[0];

      return NextResponse.json({
        success: true,
        translatedText: translation.text,
        detectedLanguage: translation.detected_source_language || 'unknown',
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('Translation request timed out');
        return NextResponse.json({
          success: false,
          translatedText: text,
          error: 'Translation timed out. Please try again.',
        });
      }

      console.error('Translation fetch error:', fetchError);
      return NextResponse.json({
        success: false,
        translatedText: text,
        error: 'Translation failed. Please try again.',
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
