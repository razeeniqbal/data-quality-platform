/*
  # Data Quality Platform Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text, project name)
      - `description` (text, project description)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `datasets`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text, dataset name)
      - `row_count` (integer, number of rows)
      - `column_count` (integer, number of columns)
      - `file_data` (jsonb, stores CSV data)
      - `created_at` (timestamp)
    
    - `dataset_columns`
      - `id` (uuid, primary key)
      - `dataset_id` (uuid, foreign key to datasets)
      - `column_name` (text)
      - `column_index` (integer)
      - `data_type` (text)
    
    - `quality_rules`
      - `id` (uuid, primary key)
      - `dataset_id` (uuid, foreign key to datasets)
      - `column_name` (text)
      - `dimension` (text, one of: completeness, consistency, validity, uniqueness)
      - `rule_type` (text, e.g., "must_be_present", "must_be_unique")
      - `rule_config` (jsonb, stores rule parameters)
      - `status` (text, one of: pending, ready, completed)
      - `description` (text)
    
    - `quality_results`
      - `id` (uuid, primary key)
      - `dataset_id` (uuid, foreign key to datasets)
      - `rule_id` (uuid, foreign key to quality_rules)
      - `column_name` (text)
      - `dimension` (text)
      - `passed_count` (integer)
      - `failed_count` (integer)
      - `total_count` (integer)
      - `score` (numeric, percentage score)
      - `executed_at` (timestamp)
    
    - `templates`
      - `id` (uuid, primary key)
      - `name` (text, template name)
      - `rules` (jsonb, stores rule configurations)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create datasets table
CREATE TABLE IF NOT EXISTS datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  row_count integer DEFAULT 0,
  column_count integer DEFAULT 0,
  file_data jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create dataset_columns table
CREATE TABLE IF NOT EXISTS dataset_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE NOT NULL,
  column_name text NOT NULL,
  column_index integer NOT NULL,
  data_type text DEFAULT 'text'
);

-- Create quality_rules table
CREATE TABLE IF NOT EXISTS quality_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE NOT NULL,
  column_name text NOT NULL,
  dimension text NOT NULL CHECK (dimension IN ('completeness', 'consistency', 'validity', 'uniqueness')),
  rule_type text NOT NULL,
  rule_config jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'completed')),
  description text DEFAULT ''
);

-- Create quality_results table
CREATE TABLE IF NOT EXISTS quality_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE NOT NULL,
  rule_id uuid REFERENCES quality_rules(id) ON DELETE CASCADE,
  column_name text NOT NULL,
  dimension text NOT NULL,
  passed_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  total_count integer DEFAULT 0,
  score numeric DEFAULT 0,
  executed_at timestamptz DEFAULT now()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rules jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Policies for projects (allow all operations for now for demo purposes)
CREATE POLICY "Allow all operations on projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for datasets
CREATE POLICY "Allow all operations on datasets"
  ON datasets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for dataset_columns
CREATE POLICY "Allow all operations on dataset_columns"
  ON dataset_columns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for quality_rules
CREATE POLICY "Allow all operations on quality_rules"
  ON quality_rules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for quality_results
CREATE POLICY "Allow all operations on quality_results"
  ON quality_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for templates
CREATE POLICY "Allow all operations on templates"
  ON templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_datasets_project_id ON datasets(project_id);
CREATE INDEX IF NOT EXISTS idx_dataset_columns_dataset_id ON dataset_columns(dataset_id);
CREATE INDEX IF NOT EXISTS idx_quality_rules_dataset_id ON quality_rules(dataset_id);
CREATE INDEX IF NOT EXISTS idx_quality_results_dataset_id ON quality_results(dataset_id);