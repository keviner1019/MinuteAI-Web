import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface EmailPreferences {
  meeting_reminders: boolean;
  deadline_reminders: boolean;
  daily_summary: boolean;
  friend_requests: boolean;
  note_shared: boolean;
  reminder_minutes_before: number;
}

const DEFAULT_PREFERENCES: EmailPreferences = {
  meeting_reminders: true,
  deadline_reminders: true,
  daily_summary: true,
  friend_requests: true,
  note_shared: true,
  reminder_minutes_before: 15,
};

// GET: Retrieve user's email preferences
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('email_preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    const preferences = profile?.email_preferences || DEFAULT_PREFERENCES;

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update user's email preferences
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Partial<EmailPreferences> = {};

    // Validate and pick only valid preference keys
    if (typeof body.meeting_reminders === 'boolean') {
      updates.meeting_reminders = body.meeting_reminders;
    }
    if (typeof body.deadline_reminders === 'boolean') {
      updates.deadline_reminders = body.deadline_reminders;
    }
    if (typeof body.daily_summary === 'boolean') {
      updates.daily_summary = body.daily_summary;
    }
    if (typeof body.friend_requests === 'boolean') {
      updates.friend_requests = body.friend_requests;
    }
    if (typeof body.note_shared === 'boolean') {
      updates.note_shared = body.note_shared;
    }
    if (typeof body.reminder_minutes_before === 'number' && body.reminder_minutes_before > 0) {
      updates.reminder_minutes_before = Math.min(body.reminder_minutes_before, 60); // Max 60 minutes
    }

    // Get current preferences
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email_preferences')
      .eq('id', user.id)
      .single();

    const currentPreferences = (profile?.email_preferences as EmailPreferences) || DEFAULT_PREFERENCES;
    const newPreferences = { ...currentPreferences, ...updates };

    // Update preferences
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ email_preferences: newPreferences })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences: newPreferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
