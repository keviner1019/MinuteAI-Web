-- Migration: Remove status requirement from notes table
-- This allows the status column to remain for backward compatibility
-- but it's no longer required or actively used in the UI

-- Make status column nullable and remove the NOT NULL constraint
ALTER TABLE public.notes 
  ALTER COLUMN status DROP NOT NULL,
  ALTER COLUMN status DROP DEFAULT;

-- Update existing notes to have NULL status if they're stuck in processing
UPDATE public.notes 
SET status = NULL 
WHERE status IN ('processing', 'uploading');

-- Remove the status index since we're not using it anymore
DROP INDEX IF EXISTS notes_status_idx;

-- Add a comment to the column to indicate it's deprecated
COMMENT ON COLUMN public.notes.status IS 'DEPRECATED: This column is no longer used. Kept for backward compatibility only.';
