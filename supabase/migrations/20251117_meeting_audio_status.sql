-- =====================================================
-- Meeting Audio Upload Status Tracking
-- =====================================================

-- Add status column (if it doesn't exist) to track upload state
ALTER TABLE public.meeting_audio
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

ALTER TABLE public.meeting_audio
ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meeting_audio_status_check'
      AND conrelid = 'public.meeting_audio'::regclass
  ) THEN
    ALTER TABLE public.meeting_audio
      ADD CONSTRAINT meeting_audio_status_check
      CHECK (status IN ('uploading', 'completed', 'failed'));
  END IF;
END $$;

-- Allow audio_url to be nullable while uploads are pending
ALTER TABLE public.meeting_audio
ALTER COLUMN audio_url DROP NOT NULL;

-- Backfill any existing rows with completed status
UPDATE public.meeting_audio
SET status = 'completed'
WHERE status IS NULL;

