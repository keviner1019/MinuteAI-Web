'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Download, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Summary {
  summary: string;
  key_points: string[];
  action_items: string[];
  sentiment: string;
}

interface Transcript {
  id: string;
  text: string;
  speaker: string;
  created_at: string;
  confidence: number;
}

export default function MeetingSummary() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [meeting, setMeeting] = useState<any>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [roomId]);

  async function loadData() {
    try {
      console.log('🔍 Loading data for room:', roomId);

      // Load meeting details
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (meetingError) {
        console.error('❌ Error loading meeting:', meetingError);
        return;
      }

      console.log('✅ Meeting loaded:', meetingData);
      setMeeting(meetingData as any);

      if (!meetingData) return;

      // Load transcripts
      console.log('🔍 Loading transcripts for meeting:', (meetingData as any).id);
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('meeting_id', (meetingData as any).id)
        .order('created_at', { ascending: true });

      if (transcriptError) {
        console.error('❌ Error loading transcripts:', transcriptError);
      } else {
        console.log('✅ Transcripts loaded:', transcriptData?.length || 0);
        setTranscripts(transcriptData || []);
      }

      // Load summary if exists - use maybeSingle() instead of single()
      console.log('🔍 Loading summary for meeting:', (meetingData as any).id);
      const { data: summaryData, error: summaryError } = await supabase
        .from('meeting_summaries')
        .select('*')
        .eq('meeting_id', (meetingData as any).id)
        .maybeSingle();

      if (summaryError) {
        console.error('❌ Error loading summary:', summaryError);
      } else if (summaryData) {
        console.log('✅ Summary loaded:', summaryData);
        const data = summaryData as any;
        setSummary({
          summary: data.summary,
          key_points: data.key_points,
          action_items: data.action_items,
          sentiment: data.sentiment,
        });
      } else {
        console.log('ℹ️ No summary found for this meeting');
      }
    } catch (error) {
      console.error('💥 Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateSummary() {
    if (!meeting) return;

    try {
      setGenerating(true);

      const response = await fetch(`/api/meetings/${meeting.id}/summarize`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const data = await response.json();
      setSummary({
        summary: data.summary.summary,
        key_points: data.summary.key_points,
        action_items: data.summary.action_items,
        sentiment: data.summary.sentiment,
      });
    } catch (error) {
      console.error('Summary generation error:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function downloadTranscript() {
    const text = transcripts
      .map((t) => `[${new Date(t.created_at).toLocaleTimeString()}] ${t.speaker}: ${t.text}`)
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting_${roomId}_transcript.txt`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4 transition"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">Meeting Summary</h1>
          <p className="text-gray-400">
            {meeting?.title} • {new Date(meeting?.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Summary Section */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">AI Summary</h2>
            {!summary && (
              <button
                onClick={generateSummary}
                disabled={generating || transcripts.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {generating && <Loader2 className="animate-spin" size={16} />}
                {generating ? 'Generating...' : 'Generate Summary'}
              </button>
            )}
          </div>

          {summary ? (
            <div className="space-y-6">
              {/* Main Summary */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Overview</h3>
                <p className="text-gray-100">{summary.summary}</p>
              </div>

              {/* Sentiment */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Sentiment</h3>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm ${
                    summary.sentiment === 'positive'
                      ? 'bg-green-500 bg-opacity-20 text-green-400'
                      : summary.sentiment === 'negative'
                      ? 'bg-red-500 bg-opacity-20 text-red-400'
                      : 'bg-gray-500 bg-opacity-20 text-gray-400'
                  }`}
                >
                  {summary.sentiment}
                </span>
              </div>

              {/* Key Points */}
              {summary.key_points && summary.key_points.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Key Points</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-100">
                    {summary.key_points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {summary.action_items && summary.action_items.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Action Items</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-100">
                    {summary.action_items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              {transcripts.length === 0
                ? 'No transcripts available for this meeting'
                : 'Click "Generate Summary" to create an AI-powered summary'}
            </p>
          )}
        </div>

        {/* Transcript Section */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Full Transcript</h2>
            {transcripts.length > 0 && (
              <button
                onClick={downloadTranscript}
                className="flex items-center gap-2 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition"
              >
                <Download size={16} />
                Download
              </button>
            )}
          </div>

          {transcripts.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {transcripts.map((transcript, idx) => {
                // Determine if this is the first occurrence of this speaker
                const speakerIndex = transcripts
                  .slice(0, idx + 1)
                  .filter((t) => t.speaker === transcript.speaker).length;
                const isFirstSpeaker =
                  idx === 0 ||
                  transcripts.slice(0, idx).every((t) => t.speaker !== transcript.speaker);
                const speakerNumber =
                  [...new Set(transcripts.slice(0, idx + 1).map((t) => t.speaker))].indexOf(
                    transcript.speaker
                  ) + 1;

                return (
                  <div key={idx} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs ${
                          speakerNumber === 1
                            ? 'bg-blue-500 bg-opacity-20 text-blue-400'
                            : 'bg-green-500 bg-opacity-20 text-green-400'
                        }`}
                      >
                        {speakerNumber === 1 ? 'Speaker 1' : 'Speaker 2'}
                      </span>
                    </div>
                    <p className="text-gray-100 flex-1">{transcript.text}</p>
                    <span className="text-gray-500 text-xs">
                      {new Date(transcript.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No transcript available for this meeting
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
