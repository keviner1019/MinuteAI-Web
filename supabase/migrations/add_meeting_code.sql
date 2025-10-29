-- Add meeting_code column to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS meeting_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS meetings_meeting_code_idx ON public.meetings(meeting_code);

-- Add comment to explain the column
COMMENT ON COLUMN public.meetings.meeting_code IS '6-character alphanumeric code for easy meeting joining';
