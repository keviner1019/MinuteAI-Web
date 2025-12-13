-- Multi-User Meetings Migration
-- Converts from 2-user (host/guest) model to multi-participant mesh topology

-- =====================================================
-- 1. Create meeting_participants table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.meeting_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS meeting_participants_meeting_id_idx ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS meeting_participants_user_id_idx ON public.meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS meeting_participants_active_idx ON public.meeting_participants(meeting_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. RLS Policies for meeting_participants
-- =====================================================

-- Users can view participants of meetings they're part of
CREATE POLICY "Users can view meeting participants"
    ON public.meeting_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meeting_participants mp
            WHERE mp.meeting_id = meeting_participants.meeting_id
            AND mp.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_participants.meeting_id
            AND m.host_id = auth.uid()
        )
    );

-- Users can join meetings (insert themselves as participant)
CREATE POLICY "Users can join meetings"
    ON public.meeting_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own participant record (e.g., leave meeting)
CREATE POLICY "Users can update own participant record"
    ON public.meeting_participants FOR UPDATE
    USING (auth.uid() = user_id);

-- Host can remove participants
CREATE POLICY "Host can remove participants"
    ON public.meeting_participants FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_participants.meeting_id
            AND m.host_id = auth.uid()
        )
    );

-- =====================================================
-- 3. Add max_participants to meetings table
-- =====================================================

ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 6;

-- =====================================================
-- 4. Update RLS policies for meetings to support multi-user
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.meetings;

-- New policy: Users can view meetings they're participating in
CREATE POLICY "Users can view their meetings"
    ON public.meetings FOR SELECT
    USING (
        auth.uid() = host_id
        OR
        EXISTS (
            SELECT 1 FROM public.meeting_participants mp
            WHERE mp.meeting_id = meetings.id
            AND mp.user_id = auth.uid()
            AND mp.is_active = true
        )
    );

-- =====================================================
-- 5. Update RLS policies for transcripts
-- =====================================================

DROP POLICY IF EXISTS "Users can view meeting transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can insert transcripts for their meetings" ON public.transcripts;

CREATE POLICY "Users can view meeting transcripts"
    ON public.transcripts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = transcripts.meeting_id
            AND (
                m.host_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.meeting_participants mp
                    WHERE mp.meeting_id = m.id
                    AND mp.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can insert transcripts for their meetings"
    ON public.transcripts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = transcripts.meeting_id
            AND (
                m.host_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.meeting_participants mp
                    WHERE mp.meeting_id = m.id
                    AND mp.user_id = auth.uid()
                    AND mp.is_active = true
                )
            )
        )
    );

-- =====================================================
-- 6. Update RLS policies for meeting_audio
-- =====================================================

DROP POLICY IF EXISTS "Users can view their meeting audio" ON public.meeting_audio;
DROP POLICY IF EXISTS "Users can insert meeting audio" ON public.meeting_audio;

CREATE POLICY "Users can view meeting audio"
    ON public.meeting_audio FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_audio.meeting_id
            AND (
                m.host_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.meeting_participants mp
                    WHERE mp.meeting_id = m.id
                    AND mp.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can insert meeting audio"
    ON public.meeting_audio FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_audio.meeting_id
            AND (
                m.host_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.meeting_participants mp
                    WHERE mp.meeting_id = m.id
                    AND mp.user_id = auth.uid()
                    AND mp.is_active = true
                )
            )
        )
    );

-- =====================================================
-- 7. Update RLS policies for meeting_summaries
-- =====================================================

DROP POLICY IF EXISTS "Users can view their meeting summaries" ON public.meeting_summaries;

CREATE POLICY "Users can view meeting summaries"
    ON public.meeting_summaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_summaries.meeting_id
            AND (
                m.host_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.meeting_participants mp
                    WHERE mp.meeting_id = m.id
                    AND mp.user_id = auth.uid()
                )
            )
        )
    );

-- =====================================================
-- 8. Helper function to get active participant count
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_active_participant_count(p_meeting_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.meeting_participants
        WHERE meeting_id = p_meeting_id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. Function to check if meeting is full
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_meeting_full(p_meeting_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_participants INTEGER;
    v_current_count INTEGER;
BEGIN
    SELECT max_participants INTO v_max_participants
    FROM public.meetings
    WHERE id = p_meeting_id;

    SELECT COUNT(*)::INTEGER INTO v_current_count
    FROM public.meeting_participants
    WHERE meeting_id = p_meeting_id
    AND is_active = true;

    RETURN v_current_count >= COALESCE(v_max_participants, 6);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
