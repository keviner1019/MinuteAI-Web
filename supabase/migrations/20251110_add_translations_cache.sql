-- Add translations cache table to store translated transcripts
-- This reduces API calls by caching translations

CREATE TABLE IF NOT EXISTS translations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_language VARCHAR(10) NOT NULL,
  translated_segments JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one translation per note per language
  UNIQUE(note_id, target_language)
);

-- Index for fast lookups
CREATE INDEX idx_translations_cache_note_id ON translations_cache(note_id);
CREATE INDEX idx_translations_cache_language ON translations_cache(target_language);

-- RLS Policies
ALTER TABLE translations_cache ENABLE ROW LEVEL SECURITY;

-- Users can read their own translations
CREATE POLICY "Users can view own translations"
  ON translations_cache
  FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own translations
CREATE POLICY "Users can create own translations"
  ON translations_cache
  FOR INSERT
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );

-- Users can update their own translations
CREATE POLICY "Users can update own translations"
  ON translations_cache
  FOR UPDATE
  USING (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own translations
CREATE POLICY "Users can delete own translations"
  ON translations_cache
  FOR DELETE
  USING (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE translations_cache IS 'Caches translated transcript segments to reduce API calls';
