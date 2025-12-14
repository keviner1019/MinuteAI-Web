-- Meeting Module Database Migration
-- Version: 2.0
-- Date: November 16, 2025
-- Purpose: Migrate from 2-user model to multi-participant model

-- ==============================================
-- STEP 1: CREATE NEW TABLES
-- ==============================================

-- Meeting Participants Table (Supports unlimited participants)
CREATE TABLE IF NOT EXISTS public.meeting_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,  -- WebRTC session ID for this connection

    -- User information (denormalized for performance)
    display_name TEXT NOT NULL,
    avatar_url TEXT,

    -- Role and permissions
    role TEXT DEFAULT 'participant' CHECK (role IN ('host', 'moderator', 'participant', 'observer')),

    -- Permissions (JSONB for flexibility)
    permissions JSONB DEFAULT '{
        "can_speak": true,
        "can_share_screen": true,
        "can_record": false,
        "can_invite": false,
        "can_kick": false
    }'::jsonb,

    -- Time tracking
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,

    -- Connection state
    connection_state TEXT DEFAULT 'connecting' CHECK (connection_state IN (
        'connecting',
        'connected',
        'disconnected',
        'reconnecting',
        'failed'
    )),
    connection_quality INTEGER CHECK (connection_quality >= 0 AND connection_quality <= 100),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Network info (for debugging)
    ip_address INET,
    user_agent TEXT,

    -- Prevent duplicate sessions
    UNIQUE(meeting_id, user_id, session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_active ON public.meeting_participants(meeting_id, is_active)
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON public.meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_session ON public.meeting_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_last_seen ON public.meeting_participants(last_seen_at)
    WHERE is_active = true;

-- Peer Connections Table (for debugging)
CREATE TABLE IF NOT EXISTS public.peer_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    participant_a_id UUID REFERENCES public.meeting_participants(id) ON DELETE CASCADE NOT NULL,
    participant_b_id UUID REFERENCES public.meeting_participants(id) ON DELETE CASCADE NOT NULL,

    -- Connection states (from RTCPeerConnection)
    connection_state TEXT CHECK (connection_state IN (
        'new', 'connecting', 'connected', 'disconnected', 'failed', 'closed'
    )),
    ice_connection_state TEXT CHECK (ice_connection_state IN (
        'new', 'checking', 'connected', 'completed', 'failed', 'disconnected', 'closed'
    )),
    signaling_state TEXT CHECK (signaling_state IN (
        'stable', 'have-local-offer', 'have-remote-offer', 'have-local-pranswer', 'have-remote-pranswer', 'closed'
    )),

    -- Timing
    established_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,

    -- Metrics
    reconnection_attempts INTEGER DEFAULT 0,
    total_bytes_sent BIGINT DEFAULT 0,
    total_bytes_received BIGINT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure we don't create duplicate connections
    UNIQUE(meeting_id, participant_a_id, participant_b_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_connections_meeting ON public.peer_connections(meeting_id);
CREATE INDEX IF NOT EXISTS idx_peer_connections_state ON public.peer_connections(connection_state);

-- Participant Events Table (for analytics)
CREATE TABLE IF NOT EXISTS public.participant_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    participant_id UUID REFERENCES public.meeting_participants(id) ON DELETE CASCADE NOT NULL,

    event_type TEXT NOT NULL CHECK (event_type IN (
        'joined', 'left', 'muted', 'unmuted',
        'video_enabled', 'video_disabled',
        'screen_share_started', 'screen_share_stopped',
        'recording_started', 'recording_stopped',
        'connection_lost', 'connection_restored',
        'kicked', 'promoted', 'demoted'
    )),

    event_data JSONB,  -- Additional data specific to event type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participant_events_meeting ON public.participant_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_participant_events_participant ON public.participant_events(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_events_type ON public.participant_events(event_type);
CREATE INDEX IF NOT EXISTS idx_participant_events_created ON public.participant_events(created_at DESC);

-- ==============================================
-- STEP 2: ADD NEW COLUMNS TO MEETINGS TABLE
-- ==============================================

ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS waiting_room_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS record_automatically BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lobby_message TEXT;

-- ==============================================
-- STEP 3: CREATE TRIGGER FOR PARTICIPANT COUNT
-- ==============================================

CREATE OR REPLACE FUNCTION update_meeting_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.meetings
        SET participant_count = participant_count + 1
        WHERE id = NEW.meeting_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.meetings
        SET participant_count = GREATEST(participant_count - 1, 0)
        WHERE id = OLD.meeting_id;
    ELSIF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
        UPDATE public.meetings
        SET participant_count = GREATEST(participant_count - 1, 0)
        WHERE id = NEW.meeting_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_participant_count ON public.meeting_participants;
CREATE TRIGGER trigger_update_participant_count
AFTER INSERT OR DELETE OR UPDATE OF is_active ON public.meeting_participants
FOR EACH ROW
EXECUTE FUNCTION update_meeting_participant_count();

-- ==============================================
-- STEP 4: MIGRATE EXISTING DATA
-- ==============================================

-- Migrate existing hosts to participants table
INSERT INTO public.meeting_participants (
    meeting_id,
    user_id,
    session_id,
    display_name,
    avatar_url,
    role,
    permissions,
    joined_at,
    is_active,
    connection_state
)
SELECT
    m.id AS meeting_id,
    m.host_id AS user_id,
    'legacy_' || m.host_id::text AS session_id,
    COALESCE(up.display_name, 'Host') AS display_name,
    up.avatar_url,
    'host' AS role,
    '{
        "can_speak": true,
        "can_share_screen": true,
        "can_record": true,
        "can_invite": true,
        "can_kick": true
    }'::jsonb AS permissions,
    m.created_at AS joined_at,
    CASE
        WHEN m.status = 'active' THEN true
        ELSE false
    END AS is_active,
    CASE
        WHEN m.status = 'active' THEN 'connected'
        WHEN m.status = 'ended' THEN 'disconnected'
        ELSE 'connecting'
    END AS connection_state
FROM public.meetings m
LEFT JOIN public.user_profiles up ON up.id = m.host_id
ON CONFLICT (meeting_id, user_id, session_id) DO NOTHING;

-- Migrate existing guests to participants table (where they exist)
INSERT INTO public.meeting_participants (
    meeting_id,
    user_id,
    session_id,
    display_name,
    avatar_url,
    role,
    permissions,
    joined_at,
    is_active,
    connection_state
)
SELECT
    m.id AS meeting_id,
    m.guest_id AS user_id,
    'legacy_' || m.guest_id::text AS session_id,
    COALESCE(up.display_name, 'Guest') AS display_name,
    up.avatar_url,
    'participant' AS role,
    '{
        "can_speak": true,
        "can_share_screen": true,
        "can_record": false,
        "can_invite": false,
        "can_kick": false
    }'::jsonb AS permissions,
    COALESCE(m.started_at, m.created_at) AS joined_at,
    CASE
        WHEN m.status = 'active' THEN true
        ELSE false
    END AS is_active,
    CASE
        WHEN m.status = 'active' THEN 'connected'
        WHEN m.status = 'ended' THEN 'disconnected'
        ELSE 'connecting'
    END AS connection_state
FROM public.meetings m
LEFT JOIN public.user_profiles up ON up.id = m.guest_id
WHERE m.guest_id IS NOT NULL
ON CONFLICT (meeting_id, user_id, session_id) DO NOTHING;

-- Update participant counts
UPDATE public.meetings m
SET participant_count = (
    SELECT COUNT(*)
    FROM public.meeting_participants mp
    WHERE mp.meeting_id = m.id
);

-- ==============================================
-- STEP 5: UPDATE RLS POLICIES
-- ==============================================

-- Drop old policies that reference guest_id
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can update their own meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can delete their own meetings" ON public.meetings;
DROP POLICY IF EXISTS "Users can view meetings they participate in" ON public.meetings;
DROP POLICY IF EXISTS "Hosts can update their meetings" ON public.meetings;
DROP POLICY IF EXISTS "Hosts can delete their meetings" ON public.meetings;

-- Create new policy that uses meeting_participants
-- Note: This policy references meeting_participants, but meeting_participants policies
-- must NOT reference meetings back to avoid infinite recursion
CREATE POLICY "Users can view meetings they participate in"
    ON public.meetings FOR SELECT
    USING (
        auth.uid() = host_id
        OR EXISTS (
            SELECT 1 FROM public.meeting_participants mp
            WHERE mp.meeting_id = meetings.id
            AND mp.user_id = auth.uid()
        )
    );

CREATE POLICY "Hosts can update their meetings"
    ON public.meetings FOR UPDATE
    USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their meetings"
    ON public.meetings FOR DELETE
    USING (auth.uid() = host_id);

-- RLS for meeting_participants table
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants in their meetings" ON public.meeting_participants;
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Hosts can update participant states" ON public.meeting_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.meeting_participants;

CREATE POLICY "Users can view participants in their meetings"
    ON public.meeting_participants FOR SELECT
    USING (
        -- User is viewing their own participant record
        user_id = auth.uid()
    );

-- Separate policy for hosts to see all participants WITHOUT circular dependency
CREATE POLICY "Hosts can view all participants in their meetings"
    ON public.meeting_participants FOR SELECT
    USING (
        meeting_id IN (
            SELECT id FROM public.meetings
            WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert themselves as participants"
    ON public.meeting_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hosts can update participant states"
    ON public.meeting_participants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_participants.meeting_id
            AND m.host_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own participant record"
    ON public.meeting_participants FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS for peer_connections (read-only for participants)
ALTER TABLE public.peer_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view peer connections in their meetings" ON public.peer_connections;

CREATE POLICY "Participants can view peer connections in their meetings"
    ON public.peer_connections FOR SELECT
    USING (
        participant_a_id IN (
            SELECT id FROM public.meeting_participants
            WHERE user_id = auth.uid()
        )
        OR participant_b_id IN (
            SELECT id FROM public.meeting_participants
            WHERE user_id = auth.uid()
        )
    );

-- RLS for participant_events
ALTER TABLE public.participant_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view events in their meetings" ON public.participant_events;
DROP POLICY IF EXISTS "Service role can insert events" ON public.participant_events;

CREATE POLICY "Participants can view events in their meetings"
    ON public.participant_events FOR SELECT
    USING (
        participant_id IN (
            SELECT id FROM public.meeting_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can insert events"
    ON public.participant_events FOR INSERT
    WITH CHECK (true);

-- ==============================================
-- STEP 6: UPDATE TRANSCRIPT POLICIES
-- ==============================================

DROP POLICY IF EXISTS "Users can view meeting transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can insert transcripts for their meetings" ON public.transcripts;
DROP POLICY IF EXISTS "Participants can view transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Participants can insert transcripts" ON public.transcripts;

CREATE POLICY "Participants can view transcripts"
    ON public.transcripts FOR SELECT
    USING (
        meeting_id IN (
            SELECT meeting_id FROM public.meeting_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can insert transcripts"
    ON public.transcripts FOR INSERT
    WITH CHECK (
        meeting_id IN (
            SELECT meeting_id FROM public.meeting_participants
            WHERE user_id = auth.uid()
        )
    );

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Verify data migration (should return 0 rows if successful)
-- SELECT
--     m.id,
--     m.room_id,
--     m.participant_count,
--     COUNT(mp.id) AS actual_participants
-- FROM public.meetings m
-- LEFT JOIN public.meeting_participants mp ON mp.meeting_id = m.id
-- GROUP BY m.id, m.room_id, m.participant_count
-- HAVING m.participant_count != COUNT(mp.id);

-- ==============================================
-- NOTES
-- ==============================================

-- ⚠️ IMPORTANT: Keep guest_id column for now for backward compatibility
-- Only drop it after verifying everything works:
-- ALTER TABLE public.meetings DROP COLUMN IF EXISTS guest_id;
