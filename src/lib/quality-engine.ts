/**
 * quality-engine.ts
 *
 * TypeScript port of the Python Qplus_v3 DataQualityEngine.
 * Pure logic — no React imports, no Supabase calls.
 * Reference loading (CSV / DB) is handled by the caller and passed in as Set<string>.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Row = Record<string, string | number | boolean | null | undefined>;

export interface RowDetail {
  rowIndex: number;
  value: unknown;
  passed: boolean;
  reason?: string;
}

export interface CheckResult {
  id: string;
  column_name: string;
  dimension: string;
  passed_count: number;
  failed_count: number;
  total_count: number;
  score: number;
  rowDetails: RowDetail[];
}

// ---------------------------------------------------------------------------
// Completeness config shapes
// ---------------------------------------------------------------------------

export interface CompletenessConfig {
  column: string;
  mode: 'default' | 'conditional';
  // conditional (comp_if_str): column must be present IF conditionColumn value is in conditionValues
  conditionColumn?: string;
  conditionValues?: string[];
}

// ---------------------------------------------------------------------------
// Validity rule config shapes (mirror Python VALIDITY_RULES keys)
// ---------------------------------------------------------------------------

export type ValidityRuleType =
  | 'vali_val_pos'
  | 'vali_val_neg'
  | 'vali_val_rang'
  | 'vali_high_val'
  | 'vali_low_val'
  | 'vali_high_col'
  | 'vali_low_col'
  | 'vali_list_str'
  | 'vali_if_str_rang'
  | 'vali_if_col_rang'
  | 'pattern'
  | 'datatype';

export interface ValidityConfig {
  column: string;
  ruleType: ValidityRuleType;
  // range (vali_val_rang)
  min?: number;
  max?: number;
  // threshold (vali_high_val / vali_low_val)
  threshold?: number;
  // column comparison (vali_high_col / vali_low_col)
  compareToColumn?: string;
  compareDirection?: 'greater' | 'less';
  // list (vali_list_str)
  values?: string[];
  // legacy list (comma-separated string from UI)
  allowedValues?: string;
  // conditional range (vali_if_str_rang): apply range only when conditionColumn IN conditionValues
  conditionColumn?: string;
  conditionValues?: string[];
  // conditional column range (vali_if_col_rang): apply range only when conditionColumn IN conditionValues, bounds from columns
  minColumn?: string;
  maxColumn?: string;
  // pattern
  pattern?: string;
  // datatype
  dataType?: 'number' | 'email' | 'url' | 'date' | 'string';
  // sign (kept for backward compat with existing saved configs)
  expectedSign?: 'positive' | 'negative';
}

export interface UniquenessConfig {
  column: string;
  mode: 'single' | 'multi';
  companionColumns?: string[];
}

export interface ConsistencyConfig {
  column: string;
  // mode: 'list' uses inlineValues; 'reference' uses referenceValues set pre-loaded by caller
  mode: 'list' | 'reference';
  referenceValues?: Set<string>; // pre-loaded by caller, lowercased (used when mode='reference')
  inlineValues?: string[];       // used when mode='list' (cons_list_str)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === '';
}

function buildResult(
  id: string,
  column: string,
  dimension: string,
  details: RowDetail[]
): CheckResult {
  const passed_count = details.filter(d => d.passed).length;
  const failed_count = details.filter(d => !d.passed).length;
  const total_count = details.length;
  const score = total_count > 0 ? (passed_count / total_count) * 100 : 0;
  return { id, column_name: column, dimension, passed_count, failed_count, total_count, score, rowDetails: details };
}

// ---------------------------------------------------------------------------
// COMPLETENESS  (Python: _check_completeness)
// ---------------------------------------------------------------------------

/**
 * Simple form: pass columns[] — every column gets a plain comp_def check.
 * Extended form: pass CompletenessConfig[] — supports comp_if_str (conditional completeness).
 */
export function checkCompleteness(
  rows: Row[],
  columnsOrConfigs: string[] | CompletenessConfig[]
): CheckResult[] {
  // Normalise to CompletenessConfig[]
  const configs: CompletenessConfig[] = (columnsOrConfigs as (string | CompletenessConfig)[]).map(c =>
    typeof c === 'string' ? { column: c, mode: 'default' } : c
  );

  return configs.map(cfg => {
    const { column, mode, conditionColumn, conditionValues = [] } = cfg;

    const details: RowDetail[] = rows.map((row, i) => {
      const value = row[column] ?? null;

      if (mode === 'conditional' && conditionColumn) {
        // comp_if_str: only require this column when conditionColumn's value is in conditionValues
        const triggerValue = String(row[conditionColumn] ?? '').trim();
        const normalizedConditions = conditionValues.map(v => v.trim());
        const conditionMet = normalizedConditions.includes(triggerValue);

        if (!conditionMet) {
          // Condition not triggered — skip (pass)
          return { rowIndex: i, value, passed: true, reason: undefined };
        }
        // Condition triggered — column must be present
        const passed = !isEmpty(value);
        return {
          rowIndex: i,
          value,
          passed,
          reason: passed
            ? undefined
            : `Value required when ${conditionColumn} is "${triggerValue}"`,
        };
      }

      // comp_def: plain completeness
      const passed = !isEmpty(value);
      return {
        rowIndex: i,
        value,
        passed,
        reason: passed ? undefined : 'Value is empty or null',
      };
    });

    return buildResult(`completeness-${column}`, column, 'completeness', details);
  });
}

// ---------------------------------------------------------------------------
// UNIQUENESS  (Python: _check_uniqueness)
// ---------------------------------------------------------------------------

export function checkUniqueness(rows: Row[], configs: UniquenessConfig[]): CheckResult[] {
  return configs.map(cfg => {
    const { column, mode, companionColumns = [] } = cfg;

    if (mode === 'multi' && companionColumns.length > 0) {
      // Multi-column composite key (Python: uniq_mult)
      const allCols = [column, ...companionColumns];
      const keyCounts = new Map<string, number>();

      // Count occurrences of each composite key (excluding rows where any col is null)
      rows.forEach(row => {
        if (allCols.some(c => isEmpty(row[c]))) return;
        const key = allCols.map(c => String(row[c] ?? '')).join('||');
        keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      });

      const details: RowDetail[] = rows.map((row, i) => {
        const value = row[column] ?? null;
        if (allCols.some(c => isEmpty(row[c]))) {
          // Skip null rows — treated as pass (Python behaviour)
          return { rowIndex: i, value, passed: true, reason: undefined };
        }
        const key = allCols.map(c => String(row[c] ?? '')).join('||');
        const passed = (keyCounts.get(key) ?? 0) <= 1;
        return {
          rowIndex: i,
          value,
          passed,
          reason: passed
            ? undefined
            : `Duplicate combination: ${allCols.map(c => `${c}="${row[c]}"`).join(', ')}`,
        };
      });

      const label = allCols.join('+');
      return buildResult(`uniqueness-${label}`, column, 'uniqueness', details);
    }

    // Single column uniqueness (Python: uniq_sing)
    const valueCounts = new Map<string, number>();
    rows.forEach(row => {
      if (isEmpty(row[column])) return;
      const key = String(row[column]);
      valueCounts.set(key, (valueCounts.get(key) ?? 0) + 1);
    });

    const details: RowDetail[] = rows.map((row, i) => {
      const value = row[column] ?? null;
      if (isEmpty(value)) {
        // Nulls skipped — treated as pass (Python: dropna before evaluating)
        return { rowIndex: i, value, passed: true, reason: undefined };
      }
      const passed = (valueCounts.get(String(value)) ?? 0) <= 1;
      return {
        rowIndex: i,
        value,
        passed,
        reason: passed ? undefined : 'Duplicate value',
      };
    });

    return buildResult(`uniqueness-${column}`, column, 'uniqueness', details);
  });
}

// ---------------------------------------------------------------------------
// VALIDITY  (Python: _check_validity + VALIDITY_RULES)
// ---------------------------------------------------------------------------

export function checkValidity(rows: Row[], configs: ValidityConfig[]): CheckResult[] {
  return configs.map(cfg => {
    const { column, ruleType } = cfg;

    const details: RowDetail[] = rows.map((row, i) => {
      const value = row[column] ?? null;

      // Null rows: skip evaluation — treated as pass (Python: non_null_mask)
      if (isEmpty(value)) {
        return { rowIndex: i, value, passed: true, reason: undefined };
      }

      let passed = false;
      let reason = '';

      switch (ruleType) {
        case 'vali_val_pos': {
          const n = toNum(value);
          if (n === null) { reason = 'Not a valid number'; }
          else if (n > 0) { passed = true; }
          else { reason = 'Expected positive value (> 0)'; }
          break;
        }

        case 'vali_val_neg': {
          const n = toNum(value);
          if (n === null) { reason = 'Not a valid number'; }
          else if (n < 0) { passed = true; }
          else { reason = 'Expected negative value (< 0)'; }
          break;
        }

        case 'vali_val_rang': {
          const n = toNum(value);
          const min = cfg.min ?? -Infinity;
          const max = cfg.max ?? Infinity;
          if (n === null) { reason = 'Not a valid number'; }
          else if (n >= min && n <= max) { passed = true; }
          else { reason = `Value out of range [${min}, ${max}]`; }
          break;
        }

        case 'vali_high_val': {
          const n = toNum(value);
          const threshold = cfg.threshold ?? 0;
          if (n === null) { reason = 'Not a valid number'; }
          else if (n > threshold) { passed = true; }
          else { reason = `Value must be > ${threshold}`; }
          break;
        }

        case 'vali_low_val': {
          const n = toNum(value);
          const threshold = cfg.threshold ?? 0;
          if (n === null) { reason = 'Not a valid number'; }
          else if (n < threshold) { passed = true; }
          else { reason = `Value must be < ${threshold}`; }
          break;
        }

        case 'vali_high_col': {
          const n = toNum(value);
          const compareCol = cfg.compareToColumn ?? '';
          const compareVal = toNum(row[compareCol]);
          if (n === null || compareVal === null) { reason = 'Not a valid number'; }
          else if (n > compareVal) { passed = true; }
          else { reason = `${column} (${n}) must be > ${compareCol} (${compareVal})`; }
          break;
        }

        case 'vali_low_col': {
          const n = toNum(value);
          const compareCol = cfg.compareToColumn ?? '';
          const compareVal = toNum(row[compareCol]);
          if (n === null || compareVal === null) { reason = 'Not a valid number'; }
          else if (n < compareVal) { passed = true; }
          else { reason = `${column} (${n}) must be < ${compareCol} (${compareVal})`; }
          break;
        }

        case 'vali_list_str': {
          const allowed = cfg.values ?? (cfg.allowedValues ? cfg.allowedValues.split(',').map(v => v.trim()) : []);
          const str = String(value).trim();
          if (allowed.includes(str)) { passed = true; }
          else { reason = 'Value not in allowed list'; }
          break;
        }

        case 'vali_if_str_rang': {
          // Conditional range: only apply range check when conditionColumn value is in conditionValues
          const conditionColumn = cfg.conditionColumn ?? '';
          const conditionValues = cfg.conditionValues ?? [];
          const triggerValue = String(row[conditionColumn] ?? '').trim();
          const normalizedConditions = conditionValues.map(v => v.trim());
          const conditionMet = normalizedConditions.length > 0 && normalizedConditions.includes(triggerValue);

          if (!conditionMet) {
            // Condition not triggered — skip (pass)
            passed = true;
          } else {
            const n = toNum(value);
            const min = cfg.min ?? -Infinity;
            const max = cfg.max ?? Infinity;
            if (n === null) { reason = 'Not a valid number'; }
            else if (n >= min && n <= max) { passed = true; }
            else { reason = `Value out of range [${min}, ${max}] when ${conditionColumn} is "${triggerValue}"`; }
          }
          break;
        }

        case 'vali_if_col_rang': {
          // Conditional column range: apply range check only when conditionColumn IN conditionValues,
          // with bounds read from minColumn / maxColumn in the same row
          const conditionColumn = cfg.conditionColumn ?? '';
          const conditionValues = cfg.conditionValues ?? [];
          const triggerValue = String(row[conditionColumn] ?? '').trim();
          const normalizedConditions = conditionValues.map(v => v.trim());
          const conditionMet = normalizedConditions.length > 0 && normalizedConditions.includes(triggerValue);

          if (!conditionMet) {
            passed = true;
          } else {
            const n = toNum(value);
            const minRaw = cfg.minColumn ? toNum(row[cfg.minColumn]) : (cfg.min ?? null);
            const maxRaw = cfg.maxColumn ? toNum(row[cfg.maxColumn]) : (cfg.max ?? null);
            const min = minRaw ?? -Infinity;
            const max = maxRaw ?? Infinity;
            if (n === null) { reason = 'Not a valid number'; }
            else if (n >= min && n <= max) { passed = true; }
            else {
              const minLabel = cfg.minColumn ? `${cfg.minColumn}(${min})` : String(min);
              const maxLabel = cfg.maxColumn ? `${cfg.maxColumn}(${max})` : String(max);
              reason = `Value out of range [${minLabel}, ${maxLabel}] when ${conditionColumn} is "${triggerValue}"`;
            }
          }
          break;
        }

        case 'pattern': {
          try {
            const regex = new RegExp(cfg.pattern ?? '');
            passed = regex.test(String(value));
            if (!passed) reason = `Does not match pattern: ${cfg.pattern}`;
          } catch {
            reason = 'Invalid regex pattern';
          }
          break;
        }

        case 'datatype': {
          const str = String(value ?? '');
          switch (cfg.dataType) {
            case 'number': passed = !isNaN(Number(str)) && str.trim() !== ''; break;
            case 'email':  passed = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str); break;
            case 'url':    passed = /^https?:\/\/.+/.test(str); break;
            case 'date':   passed = !isNaN(Date.parse(str)); break;
            default:       passed = str.trim() !== '';
          }
          if (!passed) reason = `Invalid ${cfg.dataType ?? 'value'}`;
          break;
        }

        default: {
          // Legacy 'sign' type from existing saved configs
          const legacyConfig = cfg as ValidityConfig & { validationType?: string };
          if (legacyConfig.validationType === 'sign' || ruleType === ('sign' as ValidityRuleType)) {
            const n = toNum(value);
            const expectPositive = cfg.expectedSign !== 'negative';
            if (n === null) { reason = 'Not a valid number'; }
            else if (expectPositive ? n >= 0 : n < 0) { passed = true; }
            else { reason = expectPositive ? 'Expected positive value' : 'Expected negative value'; }
          } else {
            passed = true; // unknown rule type — pass through
          }
        }
      }

      return { rowIndex: i, value, passed, reason: passed ? undefined : reason };
    });

    return buildResult(`validity-${column}-${ruleType}`, column, 'validity', details);
  });
}

// ---------------------------------------------------------------------------
// CONSISTENCY  (Python: _check_consistency)
// ---------------------------------------------------------------------------

export function checkConsistency(rows: Row[], configs: ConsistencyConfig[]): CheckResult[] {
  return configs.map(cfg => {
    const { column, mode } = cfg;

    // Build the set to check against
    const checkSet: Set<string> =
      mode === 'list'
        ? new Set((cfg.inlineValues ?? []).map(v => v.trim().toLowerCase()))
        : cfg.referenceValues ?? new Set();

    const details: RowDetail[] = rows.map((row, i) => {
      const value = row[column] ?? null;

      // Null rows: skip (Python: notna() filter → treated as pass)
      if (isEmpty(value)) {
        return { rowIndex: i, value, passed: true, reason: undefined };
      }

      if (checkSet.size === 0) {
        // No reference loaded — treat as pass
        return { rowIndex: i, value, passed: true, reason: undefined };
      }

      const passed = checkSet.has(String(value).trim().toLowerCase());
      return {
        rowIndex: i,
        value,
        passed,
        reason: passed ? undefined : 'Value not found in reference data',
      };
    });

    return buildResult(`consistency-${column}`, column, 'consistency', details);
  });
}
