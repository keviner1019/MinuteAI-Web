-- Check the structure of the extra tables not in schema.sql

-- Check meeting_participants columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'meeting_participants'
ORDER BY ordinal_position;

-- Check participant_events columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'participant_events'
ORDER BY ordinal_position;

-- Check peer_connections columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'peer_connections'
ORDER BY ordinal_position;

-- Check RLS policies for these tables
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('meeting_participants', 'participant_events', 'peer_connections')
ORDER BY tablename, policyname;
