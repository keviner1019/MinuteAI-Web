import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ActionItem } from '@/types';

// DeepSeek API client (OpenAI-compatible)
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

export async function POST(request: NextRequest) {
  let noteId: string = '';

  try {
    const body = await request.json();
    noteId = body.noteId;
    const transcript = body.transcript;
    const fileType = body.fileType || 'audio';
    const fileCount = body.fileCount || 1;
    const generateTodos = body.generateTodos !== false; // Default to true

    if (!noteId || !transcript) {
      return NextResponse.json({ error: 'Missing noteId or transcript' }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'DeepSeek API key not configured' }, { status: 500 });
    }

    console.log('Starting AI analysis for note:', noteId);
    console.log('File type:', fileType);
    console.log('File count:', fileCount);

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

    // Determine if we have mixed types
    const hasMixedTypes = fileCount > 1 && isAudio && isDocument;

    let prompt = '';
    const multiFileNote =
      fileCount > 1
        ? `\n\nNOTE: This analysis combines content from ${fileCount} different files. Consider the relationships and connections between all files when generating insights.\n`
        : '';

    // Use comprehensive prompt for all types (always include markdownAnalysis)
    if (isAudio || isDocument || hasMixedTypes) {
      let actionItemsSection = '';
      if (generateTodos) {
        actionItemsSection = `
2. **Action Items**: Extract SPECIFIC and ACTIONABLE tasks. Each action item MUST include:

   **Format** (as JSON object):
   {
     "text": "Clear description of what needs to be done",
     "priority": "high" | "medium" | "low",
     "assignee": "WHO should do it (if mentioned, otherwise 'Unassigned')",
     "deadline": "YYYY-MM-DD" or null
   }

   **CRITICAL - Deadline Rules:**
   - If NO specific date/time is mentioned in the transcript → Use: null (not "null" as string, but actual null value)
   - If a specific date IS mentioned → Convert to ISO format "YYYY-MM-DD" (e.g., "2025-11-20")
   - For relative dates mentioned in transcript:
     * "by tomorrow" → Calculate tomorrow's date and use "YYYY-MM-DD"
     * "by Friday" → Calculate next Friday's date and use "YYYY-MM-DD"
     * "next week" → Calculate one week from today and use "YYYY-MM-DD"
     * "end of month" → Calculate last day of current month and use "YYYY-MM-DD"
   - NEVER use descriptive text like "by tomorrow" or "next week" - always convert to "YYYY-MM-DD"
   - NEVER invent deadlines that aren't explicitly mentioned in the transcript
   - When in doubt or if deadline is vague, use null
   - Today's date for reference: ${new Date().toISOString().split('T')[0]}

   **Priority Guidelines**:
   - HIGH: Urgent tasks, deadlines within days, critical decisions, blockers
   - MEDIUM: Important but not urgent, deadlines within weeks, regular follow-ups
   - LOW: Nice to have, long-term tasks, informational items

   **Action Item Best Practices**:
   - Start with a clear action verb (Schedule, Send, Complete, Review, Follow up, Implement, Research, Prepare, etc.)
   - Include WHO should do it (if mentioned: "John to...", "Team lead to...", "Sarah to...")
   - Include WHAT needs to be done (specific task with context)
   - Include WHEN **only if explicitly mentioned in the transcript**
   - Be clear enough that someone can act on it immediately
   - DO NOT invent or assume deadlines that aren't in the content

   **Examples of GOOD action items**:
   - { "text": "Jamie to prepare updated mockups by tomorrow", "priority": "high", "assignee": "Jamie", "deadline": "2025-11-19" }  ← "tomorrow" mentioned, converted to date
   - { "text": "Schedule follow-up meeting with marketing team", "priority": "medium", "assignee": "Unassigned", "deadline": null }  ← No specific deadline mentioned
   - { "text": "Complete security audit by end of month", "priority": "high", "assignee": "Security team", "deadline": "2025-11-30" }  ← "end of month" converted to specific date
   - { "text": "Review and approve budget document", "priority": "high", "assignee": "Unassigned", "deadline": null }  ← No deadline mentioned
   - { "text": "Research customer feedback tools", "priority": "low", "assignee": "Product team", "deadline": null }  ← No deadline mentioned

   **Examples of BAD deadlines (NEVER do this)**:
   - "by tomorrow" ❌ (should be "2025-11-19")
   - "next week" ❌ (should be "2025-11-25" or similar)
   - "in two days" ❌ (should be "2025-11-20" or similar)
   - "Friday" ❌ (should be "2025-11-22" or similar)

   **Avoid vague items like**:
   - "Follow up on project" (too vague)
   - "Send email" (missing context and recipient)
   - "Update docs" (what docs? when? who?)

`;
      }

      // Unified comprehensive prompt for ALL file types (audio, documents, mixed)
      const contentType =
        isAudio && !isDocument
          ? 'meeting transcript/audio content'
          : isDocument && !isAudio
          ? 'document content'
          : 'combined meeting transcripts and documents';

      prompt = `
Analyze the following ${contentType}${
        fileCount > 1 ? ` from ${fileCount} files` : ''
      } and provide a comprehensive analysis in beautiful markdown format:

${
  fileCount > 1 && isAudio
    ? `
**IMPORTANT - Multiple Audio Files**:
- You are analyzing ${fileCount} audio file transcripts.
- Each transcript has been processed with automatic language detection.
- If transcripts are in the SAME language, combine them into a single cohesive analysis.
- If transcripts are in DIFFERENT languages, create separate sections for each language,
  clearly labeling the language and providing analysis for each.
- Identify speakers across all files and maintain consistent speaker labels if the same
  person appears in multiple recordings.
`
    : ''
}

**IMPORTANT**: The markdownAnalysis field should contain ONLY the content analysis. ${
        generateTodos
          ? 'Do NOT include action items in the markdown - they will be in a separate section.'
          : ''
      }

1. **Executive Summary**: Provide a concise 2-4 sentence overview${
        fileCount > 1 ? ' that synthesizes insights from all files' : ''
      }.

2. **Detailed Analysis**: Create a comprehensive markdown analysis with:
   - Key Points: Extract and list the most important points (bullet points)
   - Main Topics: Identify 4-7 main topics or themes
   - Important Details: Highlight important numbers, dates, names, decisions, or specific details
   - Conclusions: Summarize conclusions, decisions, recommendations, or next steps
${actionItemsSection}
${multiFileNote}
Format your response as JSON with this structure:
{
  "summary": "executive summary",
  "markdownAnalysis": "full analysis in beautiful markdown with headers, bullet points, bold text, etc.",${
    generateTodos
      ? `
  "actionItems": [
    {
      "text": "specific action with context",
      "priority": "high" | "medium" | "low",
      "assignee": "person or team",
      "deadline": "deadline if mentioned or null"
    }
  ],`
      : ''
  }
  "keyTopics": ["topic 1", "topic 2", ...]
}

IMPORTANT: Ensure all JSON strings are properly escaped:
- Escape backslashes as \\\\
- Escape double quotes as \\"
- Escape newlines as \\n
- Do NOT use unescaped line breaks or special characters inside JSON string values
- DO NOT use backticks or special formatting characters inside the JSON
- The JSON must be valid and parseable
- Keep the markdownAnalysis field simple and avoid complex formatting that could break JSON parsing

Make the markdownAnalysis visually appealing with:
- Use ## headers for sections
- Use **bold** for emphasis
- Use bullet points (-)  for lists
- Use > for important quotes or highlights
- Use tables if there are structured data
- Use --- for section dividers${
        fileCount > 1
          ? '\n- Clearly indicate which information comes from which source file when relevant'
          : ''
      }

${
  generateTodos
    ? '**CRITICAL**: Do NOT include an "Action Items" section in the markdownAnalysis. Action items should ONLY be in the actionItems JSON array, NOT in the markdown content.'
    : ''
}

Content:
${transcript}
`;
    } else {
      // Fallback for unknown types - should rarely be used
      prompt = `
Analyze the following content${fileCount > 1 ? ` from ${fileCount} files` : ''} and provide:

1. A concise summary (2-4 sentences)
2. Comprehensive markdown analysis
3. Specific, actionable items with priorities (format as JSON objects with text, priority, assignee, deadline)
4. Key topics (3-7 topics)
${multiFileNote}
Format your response as JSON with this exact structure:
{
  "summary": "your summary here",
  "markdownAnalysis": "full analysis in markdown format",
  "actionItems": [
    {
      "text": "specific action",
      "priority": "high" | "medium" | "low",
      "assignee": "person or team",
      "deadline": "deadline or null"
    }
  ],
  "keyTopics": ["topic 1", "topic 2", ...]
}

IMPORTANT: Ensure all JSON strings are properly escaped.

Content:
${transcript}
`;
    }

    // DeepSeek API call with retry logic
    let result;
    let lastError;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Trying DeepSeek API (attempt ${attempt + 1}/${maxRetries})`);

        const completion = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that analyzes content and provides structured JSON responses. Always respond with valid JSON only, no additional text or markdown code blocks around the JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        });

        result = completion.choices[0]?.message?.content;
        console.log('✓ Successfully received response from DeepSeek');
        break;
      } catch (error: any) {
        lastError = error;
        console.log(`DeepSeek API error (attempt ${attempt + 1}/${maxRetries}):`, error.message);

        // Check if it's a rate limit or service error
        const isRetryableError =
          error.status === 429 ||
          error.status === 503 ||
          error.message?.includes('429') ||
          error.message?.includes('503') ||
          error.message?.includes('overloaded');

        if (isRetryableError && attempt < maxRetries - 1) {
          const delayMs = Math.min(3000 * Math.pow(2, attempt), 10000);
          console.log(`Waiting ${delayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        throw error;
      }
    }

    if (!result) {
      throw lastError || new Error('Failed to get response from DeepSeek API');
    }

    const text = result;
    console.log('AI response length:', text.length);
    console.log('AI response preview:', text.substring(0, 500));
    console.log('AI response ending:', text.substring(Math.max(0, text.length - 500)));

    // Parse the JSON response with robust error handling
    let analysis;
    try {
      // Try to extract JSON from markdown code blocks first
      let jsonText = text;
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      } else {
        // Try to find raw JSON - use greedy match to get ALL content
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonText = text.substring(jsonStart, jsonEnd + 1);
        }
      }

      jsonText = jsonText.trim();

      console.log('Extracted JSON length:', jsonText.length);
      console.log('Extracted JSON has actionItems?', jsonText.includes('"actionItems"'));

      // Try to parse
      try {
        analysis = JSON.parse(jsonText);
      } catch (firstError) {
        console.error('First JSON parse failed, attempting robust extraction...', firstError);

        // More aggressive extraction for malformed JSON
        // Extract summary with proper escape sequence handling
        let summary = '';
        const summaryStart = jsonText.indexOf('"summary"');
        if (summaryStart !== -1) {
          const summaryContentStart = jsonText.indexOf(':', summaryStart) + 1;
          const summaryQuoteStart = jsonText.indexOf('"', summaryContentStart) + 1;

          let escaped = false;
          let summaryContent = '';

          for (let i = summaryQuoteStart; i < jsonText.length; i++) {
            const char = jsonText[i];

            if (escaped) {
              if (char === 'n') {
                summaryContent += ' '; // Convert newlines to spaces in summary
              } else if (char === '"') {
                summaryContent += '"';
              } else if (char === '\\') {
                summaryContent += '\\';
              } else {
                summaryContent += char;
              }
              escaped = false;
              continue;
            }

            if (char === '\\') {
              escaped = true;
              continue;
            }

            if (char === '"') {
              break;
            }

            summaryContent += char;
          }

          summary = summaryContent;
        }

        // Extract markdownAnalysis with ULTRA-ROBUST handling
        let markdownAnalysis = '';
        let mdWorkingText = jsonText;
        let mdStart = jsonText.indexOf('"markdownAnalysis"');

        // If not found in extracted JSON, search full text
        if (mdStart === -1) {
          console.log('markdownAnalysis not in extracted JSON, searching full text...');
          mdStart = text.indexOf('"markdownAnalysis"');
          if (mdStart !== -1) {
            mdWorkingText = text;
            console.log('Found markdownAnalysis in full text');
          }
        }

        if (mdStart !== -1) {
          const mdContentStart = mdWorkingText.indexOf(':', mdStart) + 1;
          const mdQuoteStart = mdWorkingText.indexOf('"', mdContentStart) + 1;

          console.log('Extracting markdown from position:', mdQuoteStart);

          // Find the closing quote by tracking escape sequences carefully
          let escaped = false;
          let mdContent = '';
          let charCount = 0;
          const maxChars = 50000; // Safety limit

          for (let i = mdQuoteStart; i < mdWorkingText.length && charCount < maxChars; i++) {
            const char = mdWorkingText[i];
            charCount++;

            if (escaped) {
              // Handle escape sequences
              if (char === 'n') {
                mdContent += '\n';
              } else if (char === 't') {
                mdContent += '\t';
              } else if (char === '"') {
                mdContent += '"';
              } else if (char === '\\') {
                mdContent += '\\';
              } else if (char === 'r') {
                mdContent += '\r';
              } else {
                // Unknown escape, keep the backslash and char
                mdContent += char;
              }
              escaped = false;
              continue;
            }

            if (char === '\\') {
              escaped = true;
              continue;
            }

            if (char === '"') {
              // Found unescaped closing quote
              console.log('Found markdown closing quote at position:', i);
              console.log('Markdown length:', mdContent.length);
              break;
            }

            mdContent += char;
          }

          markdownAnalysis = mdContent;

          if (charCount >= maxChars) {
            console.log('⚠️ Hit markdown extraction safety limit');
          }
        } else {
          console.log('⚠️ markdownAnalysis field not found in JSON or full text');
        }

        // Extract action items with ULTRA-AGGRESSIVE parsing
        const actionItems: any[] = [];
        let workingText = jsonText;
        let actionItemsStart = jsonText.indexOf('"actionItems"');

        console.log('Looking for action items in extracted JSON...');
        console.log('Found "actionItems" at position:', actionItemsStart);

        // If not found in extracted JSON, search in FULL original text
        if (actionItemsStart === -1) {
          console.log('⚠️ Not found in extracted JSON, searching full AI response...');
          actionItemsStart = text.indexOf('"actionItems"');
          console.log('Found "actionItems" in full text at position:', actionItemsStart);

          if (actionItemsStart !== -1) {
            workingText = text; // Use full text instead
            console.log('✓ Switching to full AI response for extraction');
          }
        }

        if (actionItemsStart !== -1) {
          const arrayStart = workingText.indexOf('[', actionItemsStart);
          console.log('Array starts at position:', arrayStart);

          if (arrayStart !== -1) {
            // Find matching closing bracket
            let depth = 0;
            let arrayEnd = -1;
            for (let i = arrayStart; i < workingText.length; i++) {
              if (workingText[i] === '[') depth++;
              if (workingText[i] === ']') {
                depth--;
                if (depth === 0) {
                  arrayEnd = i + 1;
                  break;
                }
              }
            }

            console.log('Array ends at position:', arrayEnd);
            console.log('Array length:', arrayEnd !== -1 ? arrayEnd - arrayStart : 'not found');

            if (arrayEnd !== -1) {
              const itemsStr = workingText.substring(arrayStart, arrayEnd);
              console.log('Action items JSON length:', itemsStr.length);
              console.log('Action items JSON preview:', itemsStr.substring(0, 500));

              try {
                // Try standard parsing first
                const fixedItemsStr = itemsStr
                  .replace(/\\n/g, '\\\\n')
                  .replace(/\n/g, ' ')
                  .replace(/\r/g, ' ')
                  .replace(/\t/g, ' ');
                const parsedItems = JSON.parse(fixedItemsStr);
                if (Array.isArray(parsedItems)) {
                  actionItems.push(...parsedItems);
                  console.log(`✓ Standard JSON parse succeeded: ${actionItems.length} items`);
                }
              } catch (itemsError) {
                console.log('Standard JSON parse failed, trying aggressive extraction...');

                // ULTRA-AGGRESSIVE: Extract each individual action item object
                // Match: { any content with "text" and "priority" }
                const objectPattern = /\{[^}]*"text"[^}]*"priority"[^}]*\}/gi;
                const matches = itemsStr.match(objectPattern);

                console.log(`Found ${matches?.length || 0} potential action item objects`);

                if (matches) {
                  for (const matchStr of matches) {
                    try {
                      // Try to parse each object individually
                      const cleaned = matchStr
                        .replace(/\\n/g, '\\\\n')
                        .replace(/\n/g, ' ')
                        .replace(/\r/g, ' ')
                        .replace(/\t/g, ' ');
                      const item = JSON.parse(cleaned);

                      if (item.text && item.priority) {
                        actionItems.push({
                          text: item.text,
                          priority: item.priority,
                          assignee: item.assignee || 'Unassigned',
                          deadline: item.deadline || null,
                        });
                      }
                    } catch {
                      // If individual parse fails, try regex extraction
                      const textMatch = matchStr.match(/"text"\s*:\s*"([^"]*)"/);
                      const priorityMatch = matchStr.match(/"priority"\s*:\s*"(high|medium|low)"/i);
                      const assigneeMatch = matchStr.match(/"assignee"\s*:\s*"([^"]*)"/);
                      const deadlineMatch = matchStr.match(/"deadline"\s*:\s*"?([^",}]*)\"?/);

                      if (textMatch && priorityMatch) {
                        actionItems.push({
                          text: textMatch[1],
                          priority: priorityMatch[1].toLowerCase(),
                          assignee: assigneeMatch ? assigneeMatch[1] : 'Unassigned',
                          deadline: deadlineMatch ? deadlineMatch[1] : null,
                        });
                      }
                    }
                  }
                  console.log(`✓ Aggressive extraction succeeded: ${actionItems.length} items`);
                }
              }
            } else {
              console.log('⚠️ Could not find closing ] for action items array');
            }
          } else {
            console.log('⚠️ Could not find [ after "actionItems"');
          }
        } else {
          console.log('⚠️ "actionItems" field not found in JSON');
        }

        // Extract key topics
        const keyTopics: string[] = [];
        const topicsMatch = jsonText.match(/"keyTopics"\s*:\s*\[([\s\S]*?)\](?=\s*[,}])/);
        if (topicsMatch) {
          try {
            const topicsStr = '[' + topicsMatch[1] + ']';
            const parsedTopics = JSON.parse(topicsStr);
            keyTopics.push(...parsedTopics);
          } catch {
            // Failed to parse topics, leave empty
          }
        }

        // Build safe analysis object
        analysis = {
          summary: summary || text.substring(0, 500),
          markdownAnalysis: markdownAnalysis || undefined,
          actionItems,
          keyTopics,
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response after all attempts:', parseError);
      console.error('Raw text (first 500 chars):', text.substring(0, 500));
      // Final fallback
      analysis = {
        summary: text.substring(0, 500),
        actionItems: [],
        keyTopics: [],
      };
    }

    // Convert action items to the correct format with priorities
    const actionItems: ActionItem[] = (analysis.actionItems || []).map(
      (item: any, index: number) => {
        // Handle both old string format and new object format
        if (typeof item === 'string') {
          return {
            id: `action-${index}`,
            text: item,
            completed: false,
            priority: 'medium', // Default priority for old format
          };
        } else {
          return {
            id: `action-${index}`,
            text: item.text || item,
            completed: false,
            priority: item.priority || 'medium',
            deadline: item.deadline || undefined,
          };
        }
      }
    );

    console.log(`Action items extracted: ${actionItems.length} items`);
    if (actionItems.length > 0) {
      console.log('First action item:', actionItems[0]);
    } else {
      console.log('⚠️ No action items found in AI response');
    }

    // Update note with AI analysis using admin client
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

    if (updateError) {
      console.error('Error updating note:', updateError);
      throw new Error(`Failed to update note: ${updateError.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to update note - no rows affected');
    }

    console.log('Note updated successfully with AI analysis');

    return NextResponse.json({
      success: true,
      summary: analysis.summary,
      actionItems,
      keyTopics: analysis.keyTopics,
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);

    let errorMessage = 'AI analysis failed';

    if (
      error.status === 503 ||
      error.message?.includes('503') ||
      error.message?.includes('overloaded')
    ) {
      errorMessage = 'AI service is currently overloaded. Please try again in a moment.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: error.status || 500 });
  }
}
