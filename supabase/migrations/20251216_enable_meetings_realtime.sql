-- Migration: Enable Realtime for meetings table
-- This allows participants to receive real-time updates when the meeting status changes
-- (e.g., when host ends the meeting for all)

-- Enable Realtime for the meetings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;

-- Note: If the table is already added, you may see an error which can be ignored.
-- To check if Realtime is enabled, run:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
