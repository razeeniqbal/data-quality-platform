-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create datasets table
CREATE TABLE IF NOT EXISTS datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  column_count INTEGER NOT NULL DEFAULT 0,
  file_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dataset_columns table
CREATE TABLE IF NOT EXISTS dataset_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  column_index INTEGER NOT NULL,
  data_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quality_rules table
CREATE TABLE IF NOT EXISTS quality_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  dimension TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  rule_config JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quality_results table
CREATE TABLE IF NOT EXISTS quality_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES quality_rules(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  dimension TEXT NOT NULL,
  passed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quality_dimension_config table
CREATE TABLE IF NOT EXISTS quality_dimension_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#000000',
  icon TEXT NOT NULL DEFAULT 'Circle',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dimension_configurations table
CREATE TABLE IF NOT EXISTS dimension_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  dimension_key TEXT NOT NULL,
  column_name TEXT NOT NULL,
  config_data JSONB DEFAULT '{}'::jsonb,
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dataset_id, dimension_key, column_name)
);

-- Create reference_data_files table
CREATE TABLE IF NOT EXISTS reference_data_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES dimension_configurations(id) ON DELETE CASCADE UNIQUE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  column_names TEXT[] NOT NULL,
  data JSONB NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default quality dimensions
INSERT INTO quality_dimension_config (name, key, description, color, icon, display_order)
VALUES
  ('Completeness', 'completeness', 'Measures the extent to which data is complete', '#14b8a6', 'CheckCircle', 1),
  ('Consistency', 'consistency', 'Ensures data is consistent across different sources', '#14b8a6', 'RefreshCw', 2),
  ('Validity', 'validity', 'Validates data against defined rules and formats', '#14b8a6', 'Shield', 3),
  ('Uniqueness', 'uniqueness', 'Checks for duplicate records', '#14b8a6', 'Fingerprint', 4)
ON CONFLICT (key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_datasets_project_id ON datasets(project_id);
CREATE INDEX IF NOT EXISTS idx_dataset_columns_dataset_id ON dataset_columns(dataset_id);
CREATE INDEX IF NOT EXISTS idx_quality_rules_dataset_id ON quality_rules(dataset_id);
CREATE INDEX IF NOT EXISTS idx_quality_results_dataset_id ON quality_results(dataset_id);
CREATE INDEX IF NOT EXISTS idx_quality_results_rule_id ON quality_results(rule_id);
CREATE INDEX IF NOT EXISTS idx_dimension_configurations_dataset_id ON dimension_configurations(dataset_id);
CREATE INDEX IF NOT EXISTS idx_reference_data_files_config_id ON reference_data_files(config_id);
CREATE INDEX IF NOT EXISTS idx_reference_data_files_dataset_id ON reference_data_files(dataset_id);

-- Enable Row Level Security (RLS) - currently allowing all access
-- You can customize these policies based on your authentication needs
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_dimension_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimension_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_data_files ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (modify these for production)
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on datasets" ON datasets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on dataset_columns" ON dataset_columns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quality_rules" ON quality_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quality_results" ON quality_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on templates" ON templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quality_dimension_config" ON quality_dimension_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on dimension_configurations" ON dimension_configurations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reference_data_files" ON reference_data_files FOR ALL USING (true) WITH CHECK (true);
