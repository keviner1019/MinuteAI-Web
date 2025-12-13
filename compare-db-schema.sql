-- =====================================================
-- COMPREHENSIVE CHECK: Compare Current DB vs Schema
-- =====================================================

-- Part 1: Check ALL columns in notes table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'notes'
ORDER BY ordinal_position;

-- Part 2: Check ALL columns in meetings table  
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'meetings'
ORDER BY ordinal_position;

-- Part 3: Check meeting_participants (NOT in schema)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'meeting_participants'
ORDER BY ordinal_position;

-- Part 4: Check participant_events (NOT in schema)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'participant_events'
ORDER BY ordinal_position;

-- Part 5: Check peer_connections (NOT in schema)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'peer_connections'
ORDER BY ordinal_position;

-- Part 6: Check ALL RLS policies
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Part 7: Check ALL indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
