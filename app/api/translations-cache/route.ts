import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Get cached translation for a note
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    const targetLanguage = searchParams.get('targetLanguage');

    if (!noteId || !targetLanguage) {
      return NextResponse.json({ error: 'Missing noteId or targetLanguage' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get cached translation
    const { data, error } = await supabase
      .from('translations_cache')
      .select('translated_segments, created_at')
      .eq('note_id', noteId)
      .eq('target_language', targetLanguage)
      .single();

    if (error || !data) {
      return NextResponse.json({ cached: false });
    }

    return NextResponse.json({
      cached: true,
      translatedSegments: (data as any).translated_segments,
      cachedAt: (data as any).created_at,
    });
  } catch (error: any) {
    console.error('Cache retrieval error:', error);
    return NextResponse.json({ cached: false });
  }
}

// Save translated segments to cache
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { noteId, targetLanguage, translatedSegments } = body;

    if (!noteId || !targetLanguage || !translatedSegments) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Upsert (insert or update) translation cache
    const { data, error } = await supabase
      .from('translations_cache')
      .upsert(
        {
          note_id: noteId,
          target_language: targetLanguage,
          translated_segments: translatedSegments,
          updated_at: new Date().toISOString(),
        } as any,
        {
          onConflict: 'note_id,target_language',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Cache save error:', error);
      return NextResponse.json({ error: 'Failed to save cache' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Cache save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
