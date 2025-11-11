import { NextRequest, NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';
import { supabaseAdmin } from '@/lib/supabase/admin';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  let noteId: string = '';

  try {
    const body = await request.json();
    noteId = body.noteId;
    const audioUrl = body.audioUrl;

    if (!noteId || !audioUrl) {
      return NextResponse.json({ error: 'Missing noteId or audioUrl' }, { status: 400 });
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json({ error: 'AssemblyAI API key not configured' }, { status: 500 });
    }

    console.log('Starting transcription for note:', noteId);

    // Start transcription with Universal model
    // Features enabled:
    // - Automatic language detection (99+ languages including Chinese)
    // - Code switching (automatically handles mixed languages)
    // - Speaker labels (identifies different speakers)
    const transcript = await client.transcripts.transcribe({
      audio: audioUrl,
      speech_model: 'universal', // Use Universal model for best accuracy
      language_detection: true, // Automatic language detection
      speaker_labels: true, // Enable speaker diarization
      // language_code is not needed when language_detection is enabled
    });

    if (transcript.status === 'error') {
      throw new Error(transcript.error || 'Transcription failed');
    }

    if (!transcript.text) {
      throw new Error('No transcript text returned');
    }

    console.log('Transcription completed, updating note...');
    console.log('Transcript length:', transcript.text.length);
    console.log('Audio duration:', transcript.audio_duration);
    console.log('Detected language:', transcript.language_code);
    console.log('Number of speakers:', transcript.utterances?.length || 0);

    // Format transcript with speaker labels if available
    let formattedTranscript = transcript.text;
    let transcriptSegments: any[] = [];

    if (transcript.utterances && transcript.utterances.length > 0) {
      // Create formatted transcript with speaker labels
      formattedTranscript = transcript.utterances
        .map((utterance) => `Speaker ${utterance.speaker}: ${utterance.text}`)
        .join('\n\n');

      // Create transcript segments with accurate timestamps from AssemblyAI
      transcriptSegments = transcript.utterances.map((utterance, index) => ({
        id: `segment-${index}`,
        text: utterance.text,
        start: utterance.start / 1000, // Convert milliseconds to seconds
        end: utterance.end / 1000, // Convert milliseconds to seconds
        speaker: `Speaker ${utterance.speaker}`,
        confidence: utterance.confidence || 0.95,
      }));

      console.log('Formatted transcript with speaker labels');
      console.log(
        'Created',
        transcriptSegments.length,
        'transcript segments with accurate timestamps'
      );
    } else if (transcript.words && transcript.words.length > 0) {
      // Fallback: Use words if utterances not available
      // Group words into sentences (every 15-20 words or by punctuation)
      const wordsPerSegment = 15;
      for (let i = 0; i < transcript.words.length; i += wordsPerSegment) {
        const segmentWords = transcript.words.slice(i, i + wordsPerSegment);
        const segmentText = segmentWords.map((w) => w.text).join(' ');

        transcriptSegments.push({
          id: `segment-${Math.floor(i / wordsPerSegment)}`,
          text: segmentText,
          start: segmentWords[0].start / 1000, // First word start time
          end: segmentWords[segmentWords.length - 1].end / 1000, // Last word end time
          confidence:
            segmentWords.reduce((acc, w) => acc + (w.confidence || 0), 0) / segmentWords.length,
        });
      }

      console.log('Created', transcriptSegments.length, 'transcript segments from words');
    }

    // Update note with transcript using admin client (bypasses RLS)
    // @ts-ignore - Admin client bypasses RLS, types are correct at runtime
    const { data, error: updateError } = await supabaseAdmin
      .from('notes')
      .update({
        transcript: formattedTranscript, // Use formatted transcript with speaker labels
        transcript_segments: transcriptSegments, // Save accurate timestamp segments
        duration: Math.round(transcript.audio_duration || 0),
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

    console.log('Note updated successfully:', data[0]);

    // Trigger AI analysis automatically (don't await - let it run in background)
    console.log('Triggering AI analysis for note:', noteId);
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://minute-ai-web.vercel.app'}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, transcript: formattedTranscript }),
    })
      .then(async (res) => {
        if (res.ok) {
          console.log('AI analysis triggered successfully for note:', noteId);
        } else {
          const error = await res.json();
          console.error('AI analysis failed:', error);
        }
      })
      .catch((err) => {
        console.error('Failed to trigger AI analysis:', err);
      });

    return NextResponse.json({
      success: true,
      transcript: formattedTranscript,
      duration: transcript.audio_duration,
      language: transcript.language_code,
      speakers: transcript.utterances?.length || 0,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);

    return NextResponse.json({ error: error.message || 'Transcription failed' }, { status: 500 });
  }
}
