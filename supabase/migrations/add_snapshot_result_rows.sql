-- Migration: Move per-row details out of quality_result_scores.results JSONB
-- into a dedicated result_score_rows table for scalability.
--
-- Run this in your Supabase SQL Editor before deploying the updated app code.
-- NOTE: Run rename_snapshot_tables.sql FIRST if your DB still has the old table names.

-- 1. New table for per-row check details
CREATE TABLE IF NOT EXISTS result_score_rows (
  id          BIGSERIAL PRIMARY KEY,
  score_id    UUID        NOT NULL REFERENCES quality_result_scores(id) ON DELETE CASCADE,
  result_key  TEXT        NOT NULL,   -- "{column_name}:{dimension}"
  row_index   INTEGER     NOT NULL,
  value       TEXT,
  passed      BOOLEAN     NOT NULL,
  reason      TEXT
);

-- Index for fast lookup by score
CREATE INDEX IF NOT EXISTS idx_result_score_rows_score_id
  ON result_score_rows (score_id);

-- Index for filtering by result_key within a score
CREATE INDEX IF NOT EXISTS idx_result_score_rows_key
  ON result_score_rows (score_id, result_key);

-- 2. Strip rowDetails out of existing quality_result_scores.results blobs
--    (keeps only the summary fields: id, column_name, dimension, counts, score, executed_at)
UPDATE quality_result_scores
SET results = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',           elem->>'id',
      'column_name',  elem->>'column_name',
      'dimension',    elem->>'dimension',
      'passed_count', (elem->>'passed_count')::int,
      'failed_count', (elem->>'failed_count')::int,
      'total_count',  (elem->>'total_count')::int,
      'score',        (elem->>'score')::numeric,
      'executed_at',  elem->>'executed_at'
    )
  )
  FROM jsonb_array_elements(results) AS elem
)
WHERE results IS NOT NULL
  AND jsonb_typeof(results) = 'array';

-- NOTE: Existing rowDetails are not migrated to result_score_rows because
-- they were embedded in JSONB and may be large. Old result scores will show
-- "Row details not available" — only new result scores will have per-row data.
