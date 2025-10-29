import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();
    const meetingId = params.id;

    // Get all transcripts for this meeting
    const { data: transcripts, error: transcriptError } = await supabase
      .from('transcripts')
      .select('text')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (transcriptError) throw transcriptError;

    if (!transcripts || transcripts.length === 0) {
      return NextResponse.json({ error: 'No transcripts found for this meeting' }, { status: 404 });
    }

    // Extract text array
    const transcriptTexts = transcripts.map((t) => t.text);
    const fullTranscript = transcriptTexts.join('\n');

    // Generate summary using Gemini Flash 1.5 (same model used for audio)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are an AI assistant that creates concise meeting summaries.

Analyze the following meeting transcript and provide:
1. A brief summary (2-3 sentences)
2. Key discussion points (bullet points)
3. Action items (if any)
4. Overall sentiment (positive/neutral/negative)

Transcript:
${fullTranscript}

Format your response as JSON:
{
  "summary": "brief summary here",
  "keyPoints": ["point 1", "point 2", ...],
  "actionItems": ["action 1", "action 2", ...],
  "sentiment": "positive/neutral/negative"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const summary = JSON.parse(jsonMatch[0]);

    // Save summary to database
    const { data: savedSummary, error: saveError } = await supabase
      .from('meeting_summaries')
      .insert({
        meeting_id: meetingId,
        summary: summary.summary,
        key_points: summary.keyPoints,
        action_items: summary.actionItems,
        sentiment: summary.sentiment,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({ summary: savedSummary });
  } catch (error: any) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();

    const { data: summary, error } = await supabase
      .from('meeting_summaries')
      .select('*')
      .eq('meeting_id', params.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json({ error: 'Summary not found' }, { status: 404 });
  }
}
