-- Create import_history table to track all grade imports
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Import metadata
  import_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Exam information
  exam_id TEXT NOT NULL,
  exam_title TEXT NOT NULL,
  exam_type TEXT,
  exam_date DATE,

  -- File information
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,

  -- Import statistics
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,

  -- Import configuration
  mapping_config JSONB,
  import_options JSONB,

  -- Results and logs
  import_status TEXT NOT NULL DEFAULT 'completed' CHECK (import_status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  error_log JSONB,
  warnings JSONB,

  -- Performance metrics
  processing_time_ms INTEGER,

  -- Additional metadata
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_import_history_exam_id ON import_history(exam_id);
CREATE INDEX idx_import_history_exam_title ON import_history(exam_title);
CREATE INDEX idx_import_history_import_date ON import_history(import_date DESC);
CREATE INDEX idx_import_history_imported_by ON import_history(imported_by);
CREATE INDEX idx_import_history_status ON import_history(import_status);

-- Add RLS policies
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own import history
CREATE POLICY "Users can view their own import history" ON import_history
  FOR SELECT
  USING (imported_by = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
  ));

-- Policy: Users can insert their own import records
CREATE POLICY "Users can insert their own import records" ON import_history
  FOR INSERT
  WITH CHECK (imported_by = auth.uid());

-- Policy: Admins can view all import history
CREATE POLICY "Admins can view all import history" ON import_history
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_import_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_import_history_updated_at
  BEFORE UPDATE ON import_history
  FOR EACH ROW
  EXECUTE FUNCTION update_import_history_updated_at();

-- Add comment
COMMENT ON TABLE import_history IS 'Tracks all grade data import operations with metadata, statistics, and logs';
