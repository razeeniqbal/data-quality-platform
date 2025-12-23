/*
  # Create Quality Templates Table

  1. New Tables
    - `quality_templates`
      - `id` (uuid, primary key)
      - `name` (text) - Template name
      - `description` (text) - Template description
      - `template_data` (jsonb) - Stores dimension rules configuration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `quality_templates` table
    - Add policies for public access (no authentication required)
  
  3. Purpose
    - Stores saved quality check templates that can be reused across datasets
    - Template data includes dimension-to-column mappings and configurations
*/

CREATE TABLE IF NOT EXISTS quality_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quality_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to templates"
  ON quality_templates
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to templates"
  ON quality_templates
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to templates"
  ON quality_templates
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to templates"
  ON quality_templates
  FOR DELETE
  TO public
  USING (true);