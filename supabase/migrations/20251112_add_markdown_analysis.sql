-- Migration: Add markdown analysis column for document processing
-- Date: 2025-11-12
-- Description: Adds markdown_analysis column to store formatted document analysis

-- Add markdown_analysis column to notes table
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS markdown_analysis TEXT;

-- Add comment
COMMENT ON COLUMN public.notes.markdown_analysis IS 'Markdown formatted AI analysis for documents';
