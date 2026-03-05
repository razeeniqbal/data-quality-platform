-- Migration: Rename snapshot tables to match "Quality Result Score" terminology.
-- Run this in your Supabase SQL Editor.

-- 1. Rename the main table (quality_snapshots → quality_result_scores)
ALTER TABLE quality_snapshots RENAME TO quality_result_scores;

-- Done. The app code is already updated to use these new table names.
-- Next: run add_snapshot_result_rows.sql to create the result_score_rows table.
