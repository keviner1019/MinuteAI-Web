import { NextRequest, NextResponse } from 'next/server';

// Fallback translation using Google Translate (free, no API key needed)
async function translateWithGoogleFallback(
  text: string,
  targetLanguage: string
): Promise<NextResponse> {
  try {
    // Google Translate language code mapping
    const googleLangMap: Record<string, string> = {
      ms: 'ms', // Malay
      fil: 'tl', // Filipino (Tagalog)
      bn: 'bn', // Bengali
      ta: 'ta', // Tamil
      te: 'te', // Telugu
      ur: 'ur', // Urdu
      zh: 'zh-CN', // Chinese Simplified
      pt: 'pt', // Portuguese
    };

    const googleTargetLang = googleLangMap[targetLanguage.toLowerCase()] || targetLanguage;

    // Use Google Translate API (via third-party free endpoint)
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${googleTargetLang}&dt=t&q=${encodeURIComponent(
        text
      )}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Google Translate request failed');
    }

    const data = await response.json();

    // Parse Google Translate response format
    let translatedText = '';
    if (data && data[0]) {
      translatedText = data[0].map((item: any) => item[0]).join('');
    }

    if (!translatedText) {
      throw new Error('No translation returned');
    }

    return NextResponse.json({
      success: true,
      translatedText,
      detectedLanguage: data[2] || 'unknown',
      provider: 'google',
    });
  } catch (error) {
    console.error('Google Translate fallback error:', error);
    return NextResponse.json({
      success: false,
      translatedText: text,
      error: 'Translation failed. This language might not be supported.',
      provider: 'google',
    });
  }
}

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
    // Note: DeepL has limited language support. Unsupported languages will use fallback
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
      nl: 'NL',
      pl: 'PL',
      tr: 'TR',
      sv: 'SV',
      // Note: Malay (ms) is NOT supported by DeepL
      // Will use fallback translation for unsupported languages
    };

    // Languages NOT supported by DeepL - will use Google Translate fallback
    const unsupportedByDeepL = ['ms', 'fil', 'bn', 'ta', 'te', 'ur'];

    const targetLangLower = targetLanguage.toLowerCase();

    // Check if language is unsupported by DeepL
    if (unsupportedByDeepL.includes(targetLangLower)) {
      // Use Google Translate as fallback for unsupported languages
      return await translateWithGoogleFallback(text, targetLanguage);
    }

    const deeplTargetLang = deeplLanguageMap[targetLangLower] || targetLanguage.toUpperCase();

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
