-- =====================================================
-- SIMPLIFIED STORAGE SETUP FOR MEETING RECORDINGS
-- (Run this in Supabase SQL Editor)
-- =====================================================

-- =====================================================
-- ADD COLUMNS TO MEETING_AUDIO TABLE
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

-- =====================================================
-- NOTE: Storage bucket and policies must be created
-- via the Supabase Dashboard Storage UI
-- See STORAGE_SETUP_MANUAL.md for instructions
-- =====================================================
