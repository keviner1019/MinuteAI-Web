import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type MeetingRecord = Database['public']['Tables']['meetings']['Row'];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, accessToken } = await request.json();

    if (!userId || !accessToken) {
      return NextResponse.json({ error: 'Missing userId or accessToken' }, { status: 400 });
    }

    const supabase = createServerClient();
    const supabaseAny = supabase as any;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: meetingData, error: meetingError } = await supabaseAny
      .from('meetings')
      .select('id, host_id, guest_id')
      .eq('id', params.id)
      .single();

    const meeting = (meetingData as MeetingRecord) || null;

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.host_id === userId || meeting.guest_id === userId) {
      return NextResponse.json({ success: true, guestId: meeting.guest_id ?? userId });
    }

    if (meeting.guest_id && meeting.guest_id !== userId) {
      return NextResponse.json({ error: 'Guest slot already claimed' }, { status: 409 });
    }

    const guestUpdate = {
      guest_id: userId,
    } satisfies Database['public']['Tables']['meetings']['Update'];

    const { data: updatedData, error: updateError } = await supabaseAny
      .from('meetings')
      .update(guestUpdate)
      .eq('id', meeting.id)
      .is('guest_id', null)
      .select('guest_id')
      .single();

    const updated = (updatedData as Pick<MeetingRecord, 'guest_id'>) || null;

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Failed to register guest' }, { status: 500 });
    }

    return NextResponse.json({ success: true, guestId: updated.guest_id });
  } catch (error: any) {
    console.error('register-guest error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

