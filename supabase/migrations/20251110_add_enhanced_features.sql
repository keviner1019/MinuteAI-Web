-- Migration: Add Enhanced Features for Interactive Transcript and Smart Action Items
-- Created: 2025-11-10
-- Description: Adds support for transcript segments with timestamps and enhanced action items

-- Add transcript_segments column to store timestamped transcript data
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS transcript_segments JSONB;

-- Add index for faster JSONB queries on transcript segments
CREATE INDEX IF NOT EXISTS idx_notes_transcript_segments 
ON notes USING gin(transcript_segments);

-- Add full-text search index for better transcript search performance
CREATE INDEX IF NOT EXISTS idx_notes_transcript_search 
ON notes USING gin(to_tsvector('english', COALESCE(transcript, '')));

-- Update existing notes to ensure action_items have default priority
-- This migration is safe and only updates records that don't have priority set
UPDATE notes
SET action_items = (
  SELECT jsonb_agg(
    item || jsonb_build_object(
      'priority', COALESCE((item->>'priority'), 'medium'),
      'createdAt', COALESCE((item->>'createdAt'), NOW()::text),
      'updatedAt', COALESCE((item->>'updatedAt'), NOW()::text)
    )
  )
  FROM jsonb_array_elements(action_items) AS item
)
WHERE action_items IS NOT NULL 
AND action_items != '[]'::jsonb
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(action_items) AS item 
  WHERE item->>'priority' IS NULL
);

-- Add comment to document the schema changes
COMMENT ON COLUMN notes.transcript_segments IS 
'JSONB array of transcript segments with timestamps: [{id, text, start, end, speaker, confidence}]';

COMMENT ON COLUMN notes.action_items IS 
'JSONB array of action items: [{id, text, priority, completed, deadline, createdAt, updatedAt}]';
