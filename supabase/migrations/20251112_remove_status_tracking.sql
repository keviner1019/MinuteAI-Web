-- Migration: Remove status tracking from notes
-- Date: 2025-11-12
-- Description: The status field is no longer used for tracking processing status.
--              We now show completed transcription directly when available.

-- Make status column nullable (allow NULL values)
ALTER TABLE public.notes 
ALTER COLUMN status DROP NOT NULL;

-- Add comment to indicate field is deprecated
COMMENT ON COLUMN public.notes.status IS 'DEPRECATED: No longer used for tracking. Will be removed in future version.';

-- Update existing records to have NULL status (optional - removes old status data)
-- Uncomment if you want to clean up existing status values
-- UPDATE public.notes SET status = NULL WHERE status IS NOT NULL;

-- Note: We keep the column for backward compatibility but it's no longer used
-- Future migration can drop this column completely once all apps are updated
