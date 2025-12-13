-- =====================================================
-- SYNC DATABASE TO CURRENT STATE
-- Migration: Sync database schema with current state
-- Date: 2025-11-16
-- =====================================================
-- This migration ensures the database matches the expected schema
-- while preserving existing tables that contain data

-- =====================================================
-- STEP 1: Ensure all base tables exist with correct columns
-- =====================================================

-- Notes table - ensure all columns exist
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS transcript_segments JSONB;

ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS markdown_analysis TEXT;

-- Meetings table - ensure meeting_code exists
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS meeting_code TEXT UNIQUE;

-- =====================================================
-- STEP 2: Ensure all indexes exist
-- =====================================================

-- Notes indexes
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS notes_status_idx ON public.notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_transcript_segments ON public.notes USING gin(transcript_segments);
CREATE INDEX IF NOT EXISTS idx_notes_transcript_search ON public.notes USING gin(to_tsvector('english', COALESCE(transcript, '')));

-- Meetings indexes
CREATE INDEX IF NOT EXISTS meetings_host_id_idx ON public.meetings(host_id);
CREATE INDEX IF NOT EXISTS meetings_guest_id_idx ON public.meetings(guest_id);
CREATE INDEX IF NOT EXISTS meetings_room_id_idx ON public.meetings(room_id);
CREATE INDEX IF NOT EXISTS meetings_status_idx ON public.meetings(status);
CREATE INDEX IF NOT EXISTS meetings_meeting_code_idx ON public.meetings(meeting_code);

-- Transcripts indexes
CREATE INDEX IF NOT EXISTS transcripts_meeting_id_idx ON public.transcripts(meeting_id);

-- Meeting invitations indexes
CREATE INDEX IF NOT EXISTS meeting_invitations_token_idx ON public.meeting_invitations(token);

-- Translations cache indexes
CREATE INDEX IF NOT EXISTS idx_translations_cache_note_id ON public.translations_cache(note_id);
CREATE INDEX IF NOT EXISTS idx_translations_cache_language ON public.translations_cache(target_language);

-- Meeting participants indexes (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_participants') THEN
        CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);
        CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON public.meeting_participants(user_id);
        CREATE INDEX IF NOT EXISTS idx_meeting_participants_session ON public.meeting_participants(session_id);
        CREATE INDEX IF NOT EXISTS idx_meeting_participants_active ON public.meeting_participants(meeting_id, is_active) WHERE is_active = true;
        CREATE INDEX IF NOT EXISTS idx_meeting_participants_last_seen ON public.meeting_participants(last_seen_at) WHERE is_active = true;
    END IF;
END $$;

-- Participant events indexes (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'participant_events') THEN
        CREATE INDEX IF NOT EXISTS idx_participant_events_meeting ON public.participant_events(meeting_id);
        CREATE INDEX IF NOT EXISTS idx_participant_events_participant ON public.participant_events(participant_id);
        CREATE INDEX IF NOT EXISTS idx_participant_events_type ON public.participant_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_participant_events_created ON public.participant_events(created_at DESC);
    END IF;
END $$;

-- Peer connections indexes (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'peer_connections') THEN
        CREATE INDEX IF NOT EXISTS idx_peer_connections_meeting ON public.peer_connections(meeting_id);
        CREATE INDEX IF NOT EXISTS idx_peer_connections_state ON public.peer_connections(connection_state);
    END IF;
END $$;

-- =====================================================
-- STEP 3: Ensure all RLS policies are correct
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations_cache ENABLE ROW LEVEL SECURITY;

-- Enable RLS on additional tables (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_participants') THEN
        ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'participant_events') THEN
        ALTER TABLE public.participant_events ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'peer_connections') THEN
        ALTER TABLE public.peer_connections ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Notes Policies
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes"
    ON public.notes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes"
    ON public.notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes"
    ON public.notes FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes"
    ON public.notes FOR DELETE
    USING (auth.uid() = user_id);

-- Meetings Policies
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.meetings;
CREATE POLICY "Users can view their own meetings"
    ON public.meetings FOR SELECT
    USING (auth.uid() = host_id OR auth.uid() = guest_id);

DROP POLICY IF EXISTS "Users can create meetings" ON public.meetings;
CREATE POLICY "Users can create meetings"
    ON public.meetings FOR INSERT
    WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update their meetings" ON public.meetings;
CREATE POLICY "Hosts can update their meetings"
    ON public.meetings FOR UPDATE
    USING (auth.uid() = host_id);

-- Transcripts Policies
DROP POLICY IF EXISTS "Users can view meeting transcripts" ON public.transcripts;
CREATE POLICY "Users can view meeting transcripts"
    ON public.transcripts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = transcripts.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert transcripts for their meetings" ON public.transcripts;
CREATE POLICY "Users can insert transcripts for their meetings"
    ON public.transcripts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = transcripts.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

-- Meeting Audio Policies
DROP POLICY IF EXISTS "Users can view their meeting audio" ON public.meeting_audio;
CREATE POLICY "Users can view their meeting audio"
    ON public.meeting_audio FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = meeting_audio.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert meeting audio" ON public.meeting_audio;
CREATE POLICY "Users can insert meeting audio"
    ON public.meeting_audio FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = meeting_audio.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

-- Meeting Summaries Policies
DROP POLICY IF EXISTS "Users can view their meeting summaries" ON public.meeting_summaries;
CREATE POLICY "Users can view their meeting summaries"
    ON public.meeting_summaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE meetings.id = meeting_summaries.meeting_id
            AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Service role can insert summaries" ON public.meeting_summaries;
CREATE POLICY "Service role can insert summaries"
    ON public.meeting_summaries FOR INSERT
    WITH CHECK (true);

-- Meeting Invitations Policies
DROP POLICY IF EXISTS "Users can view their invitations" ON public.meeting_invitations;
CREATE POLICY "Users can view their invitations"
    ON public.meeting_invitations FOR SELECT
    USING (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "Users can create invitations" ON public.meeting_invitations;
CREATE POLICY "Users can create invitations"
    ON public.meeting_invitations FOR INSERT
    WITH CHECK (auth.uid() = inviter_id);

-- Translations Cache Policies
DROP POLICY IF EXISTS "Users can view own translations" ON public.translations_cache;
CREATE POLICY "Users can view own translations"
    ON public.translations_cache FOR SELECT
    USING (
        note_id IN (
            SELECT id FROM public.notes WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create own translations" ON public.translations_cache;
CREATE POLICY "Users can create own translations"
    ON public.translations_cache FOR INSERT
    WITH CHECK (
        note_id IN (
            SELECT id FROM public.notes WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own translations" ON public.translations_cache;
CREATE POLICY "Users can update own translations"
    ON public.translations_cache FOR UPDATE
    USING (
        note_id IN (
            SELECT id FROM public.notes WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own translations" ON public.translations_cache;
CREATE POLICY "Users can delete own translations"
    ON public.translations_cache FOR DELETE
    USING (
        note_id IN (
            SELECT id FROM public.notes WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- RLS Policies for Additional Tables (if they exist)
-- =====================================================

-- Meeting Participants Policies (for WebRTC multi-participant meetings)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meeting_participants') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own participant records" ON public.meeting_participants;
        DROP POLICY IF EXISTS "Users can insert themselves as participants" ON public.meeting_participants;
        DROP POLICY IF EXISTS "Users can update their own participant record" ON public.meeting_participants;
        
        -- Create policies
        EXECUTE 'CREATE POLICY "Users can view their own participant records"
            ON public.meeting_participants FOR SELECT
            USING (
                user_id = auth.uid() OR 
                meeting_id IN (
                    SELECT id FROM public.meetings 
                    WHERE host_id = auth.uid() OR guest_id = auth.uid()
                )
            )';
        
        EXECUTE 'CREATE POLICY "Users can insert themselves as participants"
            ON public.meeting_participants FOR INSERT
            WITH CHECK (user_id = auth.uid())';
        
        EXECUTE 'CREATE POLICY "Users can update their own participant record"
            ON public.meeting_participants FOR UPDATE
            USING (user_id = auth.uid())';
    END IF;
END $$;

-- Participant Events Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'participant_events') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Participants can view events in their meetings" ON public.participant_events;
        DROP POLICY IF EXISTS "Service role can insert events" ON public.participant_events;
        
        -- Create policies
        EXECUTE 'CREATE POLICY "Participants can view events in their meetings"
            ON public.participant_events FOR SELECT
            USING (
                meeting_id IN (
                    SELECT meeting_id FROM public.meeting_participants 
                    WHERE user_id = auth.uid()
                )
            )';
        
        EXECUTE 'CREATE POLICY "Service role can insert events"
            ON public.participant_events FOR INSERT
            WITH CHECK (true)';
    END IF;
END $$;

-- Peer Connections Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'peer_connections') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Participants can view peer connections in their meetings" ON public.peer_connections;
        
        -- Create policies
        EXECUTE 'CREATE POLICY "Participants can view peer connections in their meetings"
            ON public.peer_connections FOR SELECT
            USING (
                meeting_id IN (
                    SELECT meeting_id FROM public.meeting_participants 
                    WHERE user_id = auth.uid()
                )
            )';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Ensure triggers exist
-- =====================================================

-- Create or replace the update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
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

DROP TRIGGER IF EXISTS update_meetings_updated_at ON public.meetings;
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON public.meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for new user profile creation
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 5: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN public.notes.transcript_segments IS 
'JSONB array of transcript segments with timestamps: [{id, text, start, end, speaker, confidence}]';

COMMENT ON COLUMN public.notes.action_items IS 
'JSONB array of action items: [{id, text, priority, completed, deadline, createdAt, updatedAt}]';

COMMENT ON COLUMN public.notes.markdown_analysis IS 
'Markdown formatted AI analysis for documents';

COMMENT ON COLUMN public.meetings.meeting_code IS 
'6-character alphanumeric code for easy meeting joining';

COMMENT ON TABLE public.translations_cache IS 
'Caches translated transcript segments to reduce API calls';

-- =====================================================
-- STEP 6: Storage Buckets and Policies
-- =====================================================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('audio-files', 'audio-files', false, 524288000, ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/x-m4a'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('meeting-recordings', 'meeting-recordings', false, 524288000, ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'video/webm', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Audio Files Bucket Policies
CREATE POLICY "Users can upload their own audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'audio-files' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own audio files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'audio-files' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own audio files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'audio-files' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own audio files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'audio-files' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Meeting Recordings Bucket Policies
CREATE POLICY "Users can upload their own meeting recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'meeting-recordings' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own meeting recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'meeting-recordings' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own meeting recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'meeting-recordings' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Avatars Bucket Policies (Public bucket)
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration has synchronized your database to match
-- the expected schema while preserving any additional tables
-- (meeting_participants, participant_events, peer_connections)
-- that contain data.
--
-- Storage buckets created: audio-files, meeting-recordings, avatars
-- Storage policies configured for secure file uploads
