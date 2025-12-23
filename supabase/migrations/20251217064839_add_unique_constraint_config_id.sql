/*
  # Add unique constraint to reference_data_files

  1. Changes
    - Add unique constraint on config_id column
    - This ensures one reference file per configuration
    - Enables proper upsert operations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reference_data_files_config_id_key'
  ) THEN
    ALTER TABLE reference_data_files 
    ADD CONSTRAINT reference_data_files_config_id_key UNIQUE (config_id);
  END IF;
END $$;