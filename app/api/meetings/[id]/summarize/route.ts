import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { ActionItem } from '@/types';

// Lazy initialization to avoid build-time errors when env vars are not available
function getDeepSeekClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: 'https://api.deepseek.com',
  });
}

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
    const transcriptTexts = transcripts.map((t: any) => t.text);
    const fullTranscript = transcriptTexts.join('\n');

    // Generate summary using DeepSeek
    const prompt = `
You are an AI assistant that creates comprehensive meeting summaries with actionable tasks.

Analyze the following meeting transcript and provide:

1. **Summary**: A brief but comprehensive summary (3-4 sentences) that captures the main discussion points and outcomes.

2. **Key Discussion Points**: List 4-6 main discussion points or topics covered (bullet points).

3. **Action Items**: Extract SPECIFIC and ACTIONABLE tasks with PRIORITIES. Each action item MUST include:

   **Format** (as JSON object):
   {
     "text": "Clear description of what needs to be done",
     "priority": "high" | "medium" | "low",
     "assignee": "WHO should do it (if mentioned, otherwise 'Unassigned')",
     "deadline": "WHEN it should be done (if mentioned, otherwise null)"
   }

   **Priority Guidelines**:
   - HIGH: Urgent decisions, immediate blockers, critical deadlines within days
   - MEDIUM: Important follow-ups, tasks with weekly deadlines, standard deliverables
   - LOW: Nice to have, long-term tasks, informational follow-ups

   **Action Item Best Practices**:
   - Start with action verbs (Schedule, Send, Complete, Review, Follow up, Prepare, etc.)
   - Include WHO (if mentioned: "Sarah to...", "Engineering team to...")
   - Include WHAT (specific task with context)
   - Include WHEN (if deadline was mentioned: "by Friday", "next week")

   **Examples**:
   - { "text": "Sarah to send updated proposal to client by Friday", "priority": "high", "assignee": "Sarah", "deadline": "Friday" }
   - { "text": "Schedule follow-up meeting with stakeholders for next week", "priority": "medium", "assignee": "Unassigned", "deadline": "next week" }
   - { "text": "Engineering team to review technical requirements and provide estimates", "priority": "medium", "assignee": "Engineering team", "deadline": null }

4. **Decisions Made**: List any key decisions or conclusions reached during the meeting.

5. **Overall Sentiment**: Assess the overall meeting sentiment (positive/neutral/negative/mixed) with a brief explanation.

Format your response as JSON:
{
  "summary": "comprehensive meeting summary",
  "keyPoints": ["discussion point 1", "discussion point 2", ...],
  "actionItems": [
    {
      "text": "specific action with owner and deadline",
      "priority": "high" | "medium" | "low",
      "assignee": "person or team name",
      "deadline": "deadline if mentioned or null"
    }
  ],
  "decisions": ["decision 1", "decision 2", ...],
  "sentiment": "positive/neutral/negative/mixed",
  "sentimentExplanation": "brief explanation of the sentiment"
}

Transcript:
${fullTranscript}
`;

    const deepseek = getDeepSeekClient();
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that analyzes meeting transcripts and provides structured JSON responses. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content || '';

    // Parse JSON response
    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from AI response');
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse meeting summary:', parseError);
      console.error('Raw response:', text.substring(0, 500));
      // Fallback
      analysis = {
        summary: text.substring(0, 500),
        keyPoints: [],
        actionItems: [],
        decisions: [],
        sentiment: 'neutral',
        sentimentExplanation: '',
      };
    }

    // Convert action items to proper format with priorities
    const actionItems: ActionItem[] = (analysis.actionItems || []).map(
      (item: any, index: number) => {
        if (typeof item === 'string') {
          return {
            id: `meeting-action-${index}`,
            text: item,
            completed: false,
            priority: 'medium',
          };
        } else {
          return {
            id: `meeting-action-${index}`,
            text: item.text || item,
            completed: false,
            priority: item.priority || 'medium',
            deadline: item.deadline || undefined,
          };
        }
      }
    );

    // Update meeting with summary
    try {
      await (supabase as any)
        .from('meetings')
        .update({
          summary: analysis.summary || text.substring(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId);
    } catch (updateError) {
      console.error('Failed to update meeting:', updateError);
      // Don't throw, just log - summary generation succeeded
    }

    // Save full summary to meeting_summaries table
    try {
      // First check if a summary already exists
      const { data: existingSummary } = await supabase
        .from('meeting_summaries')
        .select('id')
        .eq('meeting_id', meetingId)
        .maybeSingle();

      const summaryRecord = {
        meeting_id: meetingId,
        summary: analysis.summary || text.substring(0, 500),
        key_points: analysis.keyPoints || [],
        action_items: actionItems.map((item: ActionItem) => item.text),
        sentiment: analysis.sentiment || 'neutral',
      };

      if (existingSummary) {
        // Update existing summary
        await supabase
          .from('meeting_summaries')
          .update(summaryRecord)
          .eq('meeting_id', meetingId);
      } else {
        // Insert new summary
        await supabase
          .from('meeting_summaries')
          .insert(summaryRecord);
      }
    } catch (summaryError) {
      console.error('Failed to save to meeting_summaries:', summaryError);
      // Don't throw, the API response still works
    }

    return NextResponse.json({
      summary: analysis.summary,
      keyPoints: analysis.keyPoints || [],
      actionItems,
      decisions: analysis.decisions || [],
      sentiment: analysis.sentiment || 'neutral',
      sentimentExplanation: analysis.sentimentExplanation || '',
    });
  } catch (error: any) {
    console.error('Meeting summarization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
