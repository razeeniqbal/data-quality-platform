/*
  # Create quality dimension configuration table

  1. New Tables
    - `quality_dimensions`
      - `id` (uuid, primary key)
      - `name` (text) - Display name of the dimension
      - `key` (text, unique) - System key for the dimension (e.g., 'completeness', 'consistency')
      - `description` (text) - Description of what this dimension measures
      - `color` (text) - Color code for UI display
      - `icon` (text) - Icon identifier for UI display
      - `is_active` (boolean) - Whether this dimension is currently active
      - `display_order` (integer) - Order in which to display the dimension
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `quality_dimensions` table
    - Add policy for public read access (all users can see dimensions)
    - Add policy for public write access (users can configure dimensions)

  3. Initial Data
    - Insert default quality dimensions (Completeness, Consistency, Validity, Uniqueness)
*/

-- Create quality_dimensions table
CREATE TABLE IF NOT EXISTS quality_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#14b8a6',
  icon text NOT NULL DEFAULT 'target',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quality_dimensions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to quality dimensions
CREATE POLICY "Anyone can view quality dimensions"
  ON quality_dimensions
  FOR SELECT
  USING (true);

-- Allow public insert access
CREATE POLICY "Anyone can create quality dimensions"
  ON quality_dimensions
  FOR INSERT
  WITH CHECK (true);

-- Allow public update access
CREATE POLICY "Anyone can update quality dimensions"
  ON quality_dimensions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public delete access
CREATE POLICY "Anyone can delete quality dimensions"
  ON quality_dimensions
  FOR DELETE
  USING (true);

-- Insert default quality dimensions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM quality_dimensions WHERE key = 'completeness') THEN
    INSERT INTO quality_dimensions (name, key, description, color, icon, display_order)
    VALUES 
      ('Completeness', 'completeness', 'Measures the presence of required data values', '#14b8a6', 'check-circle', 1),
      ('Consistency', 'consistency', 'Ensures data values are consistent across the dataset', '#3b82f6', 'refresh-cw', 2),
      ('Validity', 'validity', 'Validates data against defined rules and formats', '#8b5cf6', 'shield-check', 3),
      ('Uniqueness', 'uniqueness', 'Identifies duplicate or unique values in the data', '#f59e0b', 'fingerprint', 4);
  END IF;
END $$;