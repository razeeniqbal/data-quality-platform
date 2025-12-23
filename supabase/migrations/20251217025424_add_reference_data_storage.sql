/*
  # Add reference data storage

  1. New Tables
    - `reference_data_files`
      - `id` (uuid, primary key)
      - `config_id` (uuid, references dimension_configurations)
      - `dataset_id` (uuid, references datasets)
      - `file_name` (text)
      - `column_names` (text array)
      - `data` (jsonb) - stores the parsed CSV data as array of objects
      - `row_count` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `reference_data_files` table
    - Add policies for public access (matching existing pattern)
*/

CREATE TABLE IF NOT EXISTS reference_data_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid REFERENCES dimension_configurations(id) ON DELETE CASCADE,
  dataset_id uuid REFERENCES datasets(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  column_names text[] DEFAULT '{}',
  data jsonb DEFAULT '[]'::jsonb,
  row_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE reference_data_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to reference data files"
  ON reference_data_files
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to reference data files"
  ON reference_data_files
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to reference data files"
  ON reference_data_files
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to reference data files"
  ON reference_data_files
  FOR DELETE
  TO public
  USING (true);