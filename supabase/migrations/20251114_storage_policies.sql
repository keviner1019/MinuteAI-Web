-- =====================================================
-- STORAGE BUCKETS AND POLICIES FOR MEETING RECORDINGS
-- =====================================================

-- Create meeting-audio bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-audio', 'meeting-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their meeting recordings" ON storage.objects;

-- Allow authenticated users to upload their meeting recordings
CREATE POLICY "Users can upload their meeting recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-audio' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to view recordings from meetings they participate in
CREATE POLICY "Users can view their meeting recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-audio' AND
  EXISTS (
    SELECT 1 FROM public.meetings
    WHERE meetings.id = (storage.foldername(name))[1]::uuid
    AND (meetings.host_id = auth.uid() OR meetings.guest_id = auth.uid())
  )
);

-- Allow users to delete their own recordings
CREATE POLICY "Users can delete their meeting recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-audio' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to update their own recordings
CREATE POLICY "Users can update their meeting recordings"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'meeting-audio' AND
  auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'meeting-audio' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- =====================================================
-- ADD RECORDED_BY COLUMN TO MEETING_AUDIO TABLE
-- =====================================================

-- Add recorded_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meeting_audio' 
    AND column_name = 'recorded_by'
  ) THEN
    ALTER TABLE public.meeting_audio 
    ADD COLUMN recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meeting_audio' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.meeting_audio 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_meeting_audio_updated_at ON public.meeting_audio;
CREATE TRIGGER update_meeting_audio_updated_at
    BEFORE UPDATE ON public.meeting_audio
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
