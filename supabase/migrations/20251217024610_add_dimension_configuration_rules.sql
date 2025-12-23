/*
  # Add dimension configuration rules

  1. New Tables
    - `dimension_configurations`
      - `id` (uuid, primary key)
      - `dataset_id` (uuid, references datasets)
      - `dimension_key` (text)
      - `column_name` (text)
      - `config_data` (jsonb) - stores validation rules, patterns, reference data
      - `is_configured` (boolean) - tracks if configuration is complete
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `dimension_configurations` table
    - Add policies for public access (matching existing pattern)
*/

CREATE TABLE IF NOT EXISTS dimension_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE,
  dimension_key text NOT NULL,
  column_name text NOT NULL,
  config_data jsonb DEFAULT '{}'::jsonb,
  is_configured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dataset_id, dimension_key, column_name)
);

ALTER TABLE dimension_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to dimension configurations"
  ON dimension_configurations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to dimension configurations"
  ON dimension_configurations
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to dimension configurations"
  ON dimension_configurations
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to dimension configurations"
  ON dimension_configurations
  FOR DELETE
  TO public
  USING (true);