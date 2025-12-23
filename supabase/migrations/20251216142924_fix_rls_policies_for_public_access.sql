/*
  # Fix RLS Policies for Public Access

  1. Changes
    - Update all RLS policies to allow public/anonymous access for demo purposes
    - This allows the platform to work without authentication

  2. Security Note
    - For production use, authentication should be implemented
    - Current setup is for demonstration and development only
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
DROP POLICY IF EXISTS "Allow all operations on datasets" ON datasets;
DROP POLICY IF EXISTS "Allow all operations on dataset_columns" ON dataset_columns;
DROP POLICY IF EXISTS "Allow all operations on quality_rules" ON quality_rules;
DROP POLICY IF EXISTS "Allow all operations on quality_results" ON quality_results;
DROP POLICY IF EXISTS "Allow all operations on templates" ON templates;

-- Create new policies for public access
CREATE POLICY "Public can manage projects"
  ON projects
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can manage datasets"
  ON datasets
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can manage dataset_columns"
  ON dataset_columns
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can manage quality_rules"
  ON quality_rules
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can manage quality_results"
  ON quality_results
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can manage templates"
  ON templates
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);