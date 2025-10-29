import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import Pusher from 'pusher';

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, speaker, text, confidence, timestamp } = body;

    if (!meetingId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('Saving transcript for meeting:', meetingId, 'speaker:', speaker, 'text:', text);

    // Use admin client to bypass RLS
    // @ts-ignore - Admin client bypasses RLS
    const { data, error } = await supabaseAdmin
      .from('transcripts')
      .insert({
        meeting_id: meetingId,
        speaker: speaker || 'local',
        text: text,
        confidence: confidence || 0,
        timestamp_start: timestamp || Math.floor(Date.now() / 1000),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save transcript:', error);
      return NextResponse.json(
        { error: 'Failed to save transcript', details: error },
        { status: 500 }
      );
    }

    console.log('Transcript saved successfully:', data);

    // Broadcast via Pusher for real-time sync
    try {
      await pusher.trigger(`private-meeting-${meetingId}`, 'new-transcript', {
        transcript: data,
      });
      console.log('Transcript broadcasted via Pusher');
    } catch (pusherError) {
      console.error('Failed to broadcast via Pusher:', pusherError);
      // Don't fail the request if Pusher fails
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Transcript save error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
