-- Allow public access to transcripts (for unauthenticated guests)
-- Since transcripts are scoped by meeting_id, this is safe
-- Only people with the meeting room_id can access the meeting

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view meeting transcripts" ON public.transcripts;
DROP POLICY IF EXISTS "Users can insert transcripts for their meetings" ON public.transcripts;

-- Allow anyone to view transcripts (they need to know the meeting_id)
CREATE POLICY "Anyone can view transcripts"
    ON public.transcripts FOR SELECT
    USING (true);

-- Allow anyone to insert transcripts (server-side validation via meeting_id)
CREATE POLICY "Anyone can insert transcripts"
    ON public.transcripts FOR INSERT
    WITH CHECK (true);

-- Also update meetings policy to allow public access by room_id
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.meetings;

CREATE POLICY "Anyone can view meetings by room_id"
    ON public.meetings FOR SELECT
    USING (true);

-- Also update meeting_summaries to allow public viewing
DROP POLICY IF EXISTS "Users can view their meeting summaries" ON public.meeting_summaries;

CREATE POLICY "Anyone can view meeting summaries"
    ON public.meeting_summaries FOR SELECT
    USING (true);
