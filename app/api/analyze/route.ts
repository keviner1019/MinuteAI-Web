import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ActionItem } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  let noteId: string = '';

  try {
    const body = await request.json();
    noteId = body.noteId;
    const transcript = body.transcript;

    if (!noteId || !transcript) {
      return NextResponse.json({ error: 'Missing noteId or transcript' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Google Gemini API key not configured' }, { status: 500 });
    }

    console.log('Starting AI analysis for note:', noteId);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Analyze the following transcript and provide:
1. A concise summary (2-3 sentences)
2. A list of action items (if any)
3. Key topics discussed (3-5 topics)

Format your response as JSON with this exact structure:
{
  "summary": "your summary here",
  "actionItems": ["action 1", "action 2", ...],
  "keyTopics": ["topic 1", "topic 2", ...]
}

Transcript:
${transcript}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('AI response:', text);

    // Parse the JSON response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: create a basic structure
      analysis = {
        summary: text.substring(0, 500),
        actionItems: [],
        keyTopics: [],
      };
    }

    // Convert action items to the correct format
    const actionItems: ActionItem[] = (analysis.actionItems || []).map(
      (text: string, index: number) => ({
        id: `action-${index}`,
        text,
        completed: false,
      })
    );

    console.log('Updating note with AI analysis...');
    console.log('Summary length:', analysis.summary?.length || 0);
    console.log('Action items count:', actionItems.length);
    console.log('Key topics count:', analysis.keyTopics?.length || 0);

    // Update note with AI analysis using admin client (bypasses RLS)
    // @ts-ignore - Admin client bypasses RLS, types are correct at runtime
    const { data, error: updateError } = await supabaseAdmin
      .from('notes')
      .update({
        summary: analysis.summary || '',
        action_items: actionItems,
        key_topics: analysis.keyTopics || [],
        status: 'completed',
      })
      .eq('id', noteId)
      .select();

    console.log('Update response - data:', data);
    console.log('Update response - error:', updateError);

    if (updateError) {
      console.error('Error updating note:', updateError);
      throw new Error(`Failed to update note: ${updateError.message}`);
    }

    if (!data || data.length === 0) {
      console.error('No rows updated! Note might not exist or RLS is blocking.');
      throw new Error('Failed to update note - no rows affected');
    }

    console.log('Note updated successfully with AI analysis:', data[0]);

    return NextResponse.json({
      success: true,
      summary: analysis.summary,
      actionItems,
      keyTopics: analysis.keyTopics,
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);

    // Update note status to failed
    if (noteId) {
      try {
        // @ts-ignore - Admin client bypasses RLS
        await supabaseAdmin.from('notes').update({ status: 'failed' }).eq('id', noteId);
      } catch (updateError) {
        console.error('Failed to update note status:', updateError);
      }
    }

    return NextResponse.json({ error: error.message || 'AI analysis failed' }, { status: 500 });
  }
}
