-- MinuteAI Database Schema for Supabase
-- This file contains all the tables and policies needed for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE (Extended Profile Information)
-- =====================================================
-- Note: Supabase Auth manages basic user data (email, password, etc.)
-- This table stores additional profile information

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Policies for user_profiles
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- NOTES TABLE (Audio Files + AI Analysis)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    duration INTEGER, -- in seconds
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('uploading', 'processing', 'completed', 'failed')),
    transcript TEXT,
    summary TEXT,
    action_items JSONB DEFAULT '[]'::jsonb,
    key_topics TEXT[] DEFAULT ARRAY[]::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS notes_status_idx ON public.notes(status);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;

-- Policies for notes
CREATE POLICY "Users can view their own notes"
    ON public.notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
    ON public.notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON public.notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON public.notes FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STORAGE POLICIES
-- =====================================================
-- Note: These are configured separately in the Supabase Storage section
-- For now, we'll use public bucket or configure via dashboard

-- =====================================================
-- MEETINGS TABLES (P2P Video Calls)
-- =====================================================

-- Meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT DEFAULT 'Quick Meeting',
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcripts table
CREATE TABLE IF NOT EXISTS public.transcripts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    speaker TEXT NOT NULL, -- 'host' or 'guest' or 'local' or 'remote'
    text TEXT NOT NULL,
    confidence FLOAT,
    timestamp_start INTEGER, -- milliseconds from meeting start
    timestamp_end INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting recordings/audio
CREATE TABLE IF NOT EXISTS public.meeting_audio (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    audio_url TEXT NOT NULL, -- Supabase Storage URL
    duration INTEGER,
    file_size BIGINT,
    format TEXT DEFAULT 'webm',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Summaries for meetings
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    summary TEXT NOT NULL,
    key_points JSONB DEFAULT '[]'::jsonb,
    action_items JSONB DEFAULT '[]'::jsonb,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting invitations
CREATE TABLE IF NOT EXISTS public.meeting_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    inviter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invitee_email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for meetings performance
CREATE INDEX IF NOT EXISTS meetings_host_id_idx ON public.meetings(host_id);
CREATE INDEX IF NOT EXISTS meetings_guest_id_idx ON public.meetings(guest_id);
CREATE INDEX IF NOT EXISTS meetings_room_id_idx ON public.meetings(room_id);
CREATE INDEX IF NOT EXISTS meetings_status_idx ON public.meetings(status);
CREATE INDEX IF NOT EXISTS transcripts_meeting_id_idx ON public.transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS meeting_invitations_token_idx ON public.meeting_invitations(token);

-- Enable RLS on meetings tables
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing meeting policies if they exist
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Hosts can update their meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can view meeting transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can insert transcripts for their meetings" ON public.transcripts;
DROP POLICY IF EXISTS "Users can view their meeting audio" ON public.meeting_audio;
DROP POLICY IF EXISTS "Users can insert meeting audio" ON public.meeting_audio;
DROP POLICY IF EXISTS "Users can view their meeting summaries" ON public.meeting_summaries;
DROP POLICY IF EXISTS "Service role can insert summaries" ON public.meeting_summaries;
DROP POLICY IF EXISTS "Users can view their invitations" ON public.meeting_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.meeting_invitations;

-- RLS Policies for meetings
CREATE POLICY "Users can view their own meetings"
    ON public.meetings FOR SELECT
    USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE POLICY "Users can create meetings"
    ON public.meetings FOR INSERT
    WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their meetings"
    ON public.meetings FOR UPDATE
    USING (auth.uid() = host_id);

-- RLS Policies for transcripts
CREATE POLICY "Users can view meeting transcripts"
    ON public.transcripts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = transcripts.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert transcripts for their meetings"
    ON public.transcripts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = transcripts.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

-- RLS Policies for meeting_audio
CREATE POLICY "Users can view their meeting audio"
    ON public.meeting_audio FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = meeting_audio.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert meeting audio"
    ON public.meeting_audio FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = meeting_audio.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

-- RLS Policies for meeting_summaries
CREATE POLICY "Users can view their meeting summaries"
    ON public.meeting_summaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = meeting_summaries.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

CREATE POLICY "Service role can insert summaries"
    ON public.meeting_summaries FOR INSERT
    WITH CHECK (true);

-- RLS Policies for meeting_invitations
CREATE POLICY "Users can view their invitations"
    ON public.meeting_invitations FOR SELECT
    USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations"
    ON public.meeting_invitations FOR INSERT
    WITH CHECK (auth.uid() = inviter_id);

-- Triggers for meetings
DROP TRIGGER IF EXISTS update_meetings_updated_at ON public.meetings;
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON public.meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (for testing - remove in production)
-- =====================================================

-- Uncomment to insert sample data
-- INSERT INTO public.notes (user_id, title, file_name, file_size, file_type, storage_url, status)
-- VALUES 
--     (auth.uid(), 'Sample Meeting', 'meeting.mp3', 1048576, 'audio/mpeg', 'https://example.com/meeting.mp3', 'completed');

