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
    const fileType = body.fileType || 'audio';

    if (!noteId || !transcript) {
      return NextResponse.json({ error: 'Missing noteId or transcript' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Google Gemini API key not configured' }, { status: 500 });
    }

    console.log('Starting AI analysis for note:', noteId);
    console.log('File type:', fileType);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Different prompts based on file type
    const isAudio = fileType.includes('audio') || fileType.includes('video');
    const isDocument =
      fileType.includes('pdf') ||
      fileType.includes('document') ||
      fileType.includes('word') ||
      fileType.includes('presentation') ||
      fileType.includes('powerpoint') ||
      fileType.includes('spreadsheet') ||
      fileType.includes('excel') ||
      fileType.includes('text');

    let prompt = '';

    if (isAudio) {
      prompt = `
Analyze the following meeting transcript and provide:
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
    } else if (isDocument) {
      prompt = `
Analyze the following document content and provide a comprehensive analysis in beautiful markdown format:

1. **Executive Summary**: Provide a concise 2-3 sentence overview
2. **Key Points**: Extract and list the most important points (bullet points)
3. **Main Topics**: Identify 3-5 main topics or themes
4. **Action Items**: List any action items, tasks, or recommendations
5. **Important Details**: Highlight any important numbers, dates, names, or specific details
6. **Conclusions**: Summarize any conclusions or outcomes

Format your response as JSON with this structure:
{
  "summary": "executive summary in markdown",
  "markdownAnalysis": "full analysis in beautiful markdown with headers, bullet points, bold text, etc.",
  "actionItems": ["action 1", "action 2", ...],
  "keyTopics": ["topic 1", "topic 2", ...]
}

Make the markdownAnalysis visually appealing with:
- Use ## headers for sections
- Use **bold** for emphasis
- Use bullet points (-)  for lists
- Use > for important quotes or highlights
- Use tables if there are structured data
- Use --- for section dividers

Document Content:
${transcript}
`;
    } else {
      // Fallback
      prompt = `
Analyze the following content and provide:
1. A concise summary (2-3 sentences)
2. A list of action items (if any)
3. Key topics (3-5 topics)

Format your response as JSON with this exact structure:
{
  "summary": "your summary here",
  "actionItems": ["action 1", "action 2", ...],
  "keyTopics": ["topic 1", "topic 2", ...]
}

Content:
${transcript}
`;
    }

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
    const updateData: any = {
      summary: analysis.summary || '',
      action_items: actionItems,
      key_topics: analysis.keyTopics || [],
    };

    // Add markdown analysis for documents
    if (analysis.markdownAnalysis) {
      updateData.markdown_analysis = analysis.markdownAnalysis;
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('notes')
      .update(updateData)
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

    return NextResponse.json({ error: error.message || 'AI analysis failed' }, { status: 500 });
  }
}
