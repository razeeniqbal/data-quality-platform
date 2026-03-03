import { useState } from 'react';
import {
  BookOpen, CheckCircle2, XCircle, AlertCircle,
  Fingerprint, ShieldCheck, List, Info, ChevronRight, Lightbulb,
} from 'lucide-react';

// ─── Mini-table types ──────────────────────────────────────────────────────────
interface MiniRow {
  cells: Record<string, string>;    // column → value (empty string = blank)
  status: 'pass' | 'fail';
  reason?: string;                  // shown on hover when fail
}

interface MiniTable {
  columns: string[];                // ordered column keys
  checkCol: string;                 // which column is under the lens
  rows: MiniRow[];
  note: string;                     // one-line explanation shown below the table
}

// ─── Rule type ─────────────────────────────────────────────────────────────────
interface RuleDef {
  name: string;
  tag: string;
  description: string;
  configLabel: string;
  tip: string;
  table: MiniTable;
}

// ─── Dimension type ────────────────────────────────────────────────────────────
interface DimensionDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  summary: string;
  detail: string;
  rules: RuleDef[];
}

// ─── Colour map ────────────────────────────────────────────────────────────────
const ACCENT: Record<string, { lightBg: string; text: string; border: string; pill: string }> = {
  teal:   { lightBg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-300',   pill: 'bg-teal-100 text-teal-700'   },
  violet: { lightBg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300', pill: 'bg-violet-100 text-violet-700' },
  blue:   { lightBg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-300',   pill: 'bg-blue-100 text-blue-700'   },
  amber:  { lightBg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-300',  pill: 'bg-amber-100 text-amber-700'  },
};

// ─── Dimension + rule definitions ─────────────────────────────────────────────
const DIMS: DimensionDef[] = [
  // ── COMPLETENESS ─────────────────────────────────────────────────────────────
  {
    id: 'completeness',
    label: 'Completeness',
    icon: <CheckCircle2 className="w-5 h-5" />,
    accent: 'teal',
    summary: 'Ensures mandatory fields are not left empty.',
    detail:
      'For each configured column the engine checks whether the cell value is present and non-blank. ' +
      'You can choose Default (always required) or Conditional — the field is only mandatory ' +
      'when another column equals a specified value. ' +
      'This lets you skip the check for record types where the field genuinely does not apply, ' +
      'e.g. Planned wells may not yet have a TotalDepthM.',
    rules: [
      {
        name: 'Default',
        tag: 'Always required',
        description: 'Every row must have a non-empty value. Blank or null → Fail.',
        configLabel: 'Add Attribute → open config → Mode: Default',
        tip: 'Use for fields that must always be populated regardless of other columns, e.g. WellboreName, Country.',
        table: {
          columns: ['WellboreName', 'Country', 'Phase'],
          checkCol: 'Country',
          note: 'Country is set to Default. Any blank value fails unconditionally.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A', Country: 'Malaysia', Phase: 'Exploration' }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',  Country: 'Malaysia', Phase: 'Development' }, status: 'pass' },
            { cells: { WellboreName: 'GAMMA-7',  Country: '',         Phase: 'Exploration' }, status: 'fail', reason: 'Country is empty' },
            { cells: { WellboreName: 'DELTA-2C', Country: 'Malaysia', Phase: 'Development' }, status: 'pass' },
          ],
        },
      },
      {
        name: 'Conditional',
        tag: 'If condition met',
        description: 'Value is required only when a condition column equals one of the trigger values. Other rows are skipped.',
        configLabel: 'Mode: Conditional → Condition Column → Trigger Values',
        tip: 'e.g. TotalDepthM is required only when CurrentStatus = "Actual". Planned wells are exempt.',
        table: {
          columns: ['WellboreName', 'CurrentStatus', 'TotalDepthM'],
          checkCol: 'TotalDepthM',
          note: 'TotalDepthM is required only when CurrentStatus = "Actual". GAMMA-7 is Planned → skipped (Pass).',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  CurrentStatus: 'Actual',  TotalDepthM: '3420' }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',   CurrentStatus: 'Actual',  TotalDepthM: ''     }, status: 'fail', reason: 'TotalDepthM is empty and CurrentStatus = "Actual"' },
            { cells: { WellboreName: 'GAMMA-7',   CurrentStatus: 'Planned', TotalDepthM: ''     }, status: 'pass' },
            { cells: { WellboreName: 'EPSILON-4', CurrentStatus: 'Actual',  TotalDepthM: '2870' }, status: 'pass' },
          ],
        },
      },
    ],
  },

  // ── UNIQUENESS ────────────────────────────────────────────────────────────────
  {
    id: 'uniqueness',
    label: 'Uniqueness',
    icon: <Fingerprint className="w-5 h-5" />,
    accent: 'violet',
    summary: 'Detects duplicate records across one or more columns.',
    detail:
      'Single-column mode tracks every seen value; any second occurrence fails. ' +
      'Multi-column mode forms a composite key from two or more columns — useful when no single column alone ' +
      'is a unique identifier. For example, WellboreName alone may repeat across phases, ' +
      'but WellboreName + Phase together should be unique. Null values are always excluded from the check.',
    rules: [
      {
        name: 'Single column',
        tag: 'No duplicates',
        description: 'Each value must appear at most once. The second occurrence of a value → Fail.',
        configLabel: 'Add Attribute → open config → Mode: Single column',
        tip: 'Use on natural identifier columns. e.g. WellboreName should be unique if each wellbore has exactly one record.',
        table: {
          columns: ['WellboreName', 'Phase', 'TotalDepthM'],
          checkCol: 'WellboreName',
          note: '"ALPHA-1A" appears twice → both occurrences fail. Each value must be unique across all rows.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  Phase: 'Exploration', TotalDepthM: '3420' }, status: 'fail', reason: '"ALPHA-1A" appears in row 1 and row 4 — duplicate' },
            { cells: { WellboreName: 'BETA-3B',   Phase: 'Development', TotalDepthM: '4800' }, status: 'pass' },
            { cells: { WellboreName: 'GAMMA-7',   Phase: 'Exploration', TotalDepthM: '2100' }, status: 'pass' },
            { cells: { WellboreName: 'ALPHA-1A',  Phase: 'Exploration', TotalDepthM: '3420' }, status: 'fail', reason: '"ALPHA-1A" appears in row 1 and row 4 — duplicate' },
          ],
        },
      },
      {
        name: 'Multi-column',
        tag: 'Composite key',
        description: 'The combination of selected columns must be unique. Duplicate composite keys → Fail.',
        configLabel: 'Mode: Multi-column → Add companion columns (Additional Attributes)',
        tip: 'Companion columns are automatically excluded from other dimensions so they are not double-counted.',
        table: {
          columns: ['WellboreName', 'Phase', 'TotalDepthM'],
          checkCol: 'WellboreName',
          note: 'Checking WellboreName + Phase as composite key. Row 1 & 4 share "ALPHA-1A + Exploration" → fail. Row 2 & 3 differ by Phase → pass.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A', Phase: 'Exploration', TotalDepthM: '3420' }, status: 'fail', reason: 'WellboreName + Phase "ALPHA-1A / Exploration" is duplicated in rows 1 and 4' },
            { cells: { WellboreName: 'ALPHA-1A', Phase: 'Development', TotalDepthM: '4100' }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',  Phase: 'Exploration', TotalDepthM: '2870' }, status: 'pass' },
            { cells: { WellboreName: 'ALPHA-1A', Phase: 'Exploration', TotalDepthM: '3420' }, status: 'fail', reason: 'WellboreName + Phase "ALPHA-1A / Exploration" is duplicated in rows 1 and 4' },
          ],
        },
      },
    ],
  },

  // ── VALIDITY ──────────────────────────────────────────────────────────────────
  {
    id: 'validity',
    label: 'Validity',
    icon: <ShieldCheck className="w-5 h-5" />,
    accent: 'blue',
    summary: 'Validates values against numeric, pattern, and list-based rules.',
    detail:
      'The engine applies a configurable rule to each non-null value. ' +
      'Rules cover sign checks, fixed numeric ranges, bounds read from other columns in the same row, ' +
      'threshold comparisons, column-to-column comparisons, allowed-value lists, regex patterns, and data-type checks. ' +
      'Conditional variants apply the check only when another column matches a trigger value. ' +
      'Null values are always skipped — only present values are evaluated.',
    rules: [
      {
        name: 'Positive / Negative',
        tag: '+/−',
        description: 'Value must be > 0 (Positive only) or < 0 (Negative only). Zero always fails.',
        configLabel: 'Type: Positive only  /  Negative only',
        tip: 'e.g. TotalDepthM must be positive. A negative depth value is a data entry error.',
        table: {
          columns: ['WellboreName', 'TotalDepthM'],
          checkCol: 'TotalDepthM',
          note: 'Rule: TotalDepthM must be positive (> 0). BETA-3B has −150 → fail.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  TotalDepthM: '3420' }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',   TotalDepthM: '-150' }, status: 'fail', reason: 'TotalDepthM = −150. Must be positive (> 0)' },
            { cells: { WellboreName: 'DELTA-2C',  TotalDepthM: '5100' }, status: 'pass' },
            { cells: { WellboreName: 'EPSILON-4', TotalDepthM: '2870' }, status: 'pass' },
          ],
        },
      },
      {
        name: 'Numeric range',
        tag: '[min, max]',
        description: 'Value must fall within a specified min–max range (inclusive). Outside → Fail.',
        configLabel: 'Type: Numeric range → Min → Max',
        tip: 'e.g. WaterDepthM between 0 and 2000 to reject physically impossible offshore depths.',
        table: {
          columns: ['WellboreName', 'WaterDepthM'],
          checkCol: 'WaterDepthM',
          note: 'Rule: WaterDepthM must be between 0 and 500. DELTA-2C has 620 → fail.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  WaterDepthM: '85'  }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',   WaterDepthM: '210' }, status: 'pass' },
            { cells: { WellboreName: 'DELTA-2C',  WaterDepthM: '620' }, status: 'fail', reason: 'WaterDepthM = 620. Must be between 0 and 500' },
            { cells: { WellboreName: 'EPSILON-4', WaterDepthM: '95'  }, status: 'pass' },
          ],
        },
      },
      {
        name: 'Column bounds',
        tag: 'Row bounds',
        description: 'Min/max bounds are read from other columns in the same row — no hardcoded values needed.',
        configLabel: 'Type: Conditional col. range → Condition column → Trigger values → Min column → Max column',
        tip: 'e.g. TVDSSm must not exceed TotalDepthM. The max bound varies row by row.',
        table: {
          columns: ['WellboreName', 'TVDSSm', 'TotalDepthM'],
          checkCol: 'TVDSSm',
          note: 'Rule: TVDSSm must be ≤ TotalDepthM (max column). BETA-3B has TVDSSm 4100 > TotalDepthM 3800 → fail.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A', TVDSSm: '3310', TotalDepthM: '3420' }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',  TVDSSm: '4100', TotalDepthM: '3800' }, status: 'fail', reason: 'TVDSSm (4100) exceeds TotalDepthM (3800) — TVDSS cannot exceed total depth' },
            { cells: { WellboreName: 'DELTA-2C', TVDSSm: '4980', TotalDepthM: '5100' }, status: 'pass' },
            { cells: { WellboreName: 'ZETA-9',   TVDSSm: '4490', TotalDepthM: '4610' }, status: 'pass' },
          ],
        },
      },
      {
        name: 'Greater / Less than threshold',
        tag: 'Threshold',
        description: 'Value must exceed (>) or stay below (<) a fixed numeric threshold.',
        configLabel: 'Type: Greater than threshold  /  Less than threshold → Threshold value',
        tip: 'e.g. SpudYear > 1950 to catch obviously wrong year values caused by data entry errors.',
        table: {
          columns: ['WellboreName', 'SpudYear'],
          checkCol: 'SpudYear',
          note: 'Rule: SpudYear must be > 1950. GAMMA-7 has 1888 (likely mis-keyed) → fail.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  SpudYear: '2019' }, status: 'pass' },
            { cells: { WellboreName: 'GAMMA-7',   SpudYear: '1888' }, status: 'fail', reason: 'SpudYear = 1888. Must be > 1950 (plausible drilling year)' },
            { cells: { WellboreName: 'DELTA-2C',  SpudYear: '2018' }, status: 'pass' },
            { cells: { WellboreName: 'EPSILON-4', SpudYear: '2020' }, status: 'pass' },
          ],
        },
      },
      {
        name: 'Column comparison',
        tag: 'Col A vs Col B',
        description: 'One column must be greater or less than another column in the same row.',
        configLabel: 'Type: Greater than column  /  Less than column → Compare-to column',
        tip: 'e.g. TotalDepthM must be ≥ WaterDepthM — a well\'s total depth must always exceed water depth.',
        table: {
          columns: ['WellboreName', 'TotalDepthM', 'WaterDepthM'],
          checkCol: 'TotalDepthM',
          note: 'Rule: TotalDepthM must be > WaterDepthM. BETA-3B has TotalDepthM 180 < WaterDepthM 210 → fail.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  TotalDepthM: '3420', WaterDepthM: '85'  }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',   TotalDepthM: '180',  WaterDepthM: '210' }, status: 'fail', reason: 'TotalDepthM (180) < WaterDepthM (210) — physically impossible' },
            { cells: { WellboreName: 'DELTA-2C',  TotalDepthM: '5100', WaterDepthM: '320' }, status: 'pass' },
            { cells: { WellboreName: 'EPSILON-4', TotalDepthM: '2870', WaterDepthM: '95'  }, status: 'pass' },
          ],
        },
      },
      {
        name: 'Allowed string list',
        tag: 'In list',
        description: 'Value must be one of a specified set of strings. Any unlisted value → Fail.',
        configLabel: 'Type: Allowed string list → Values (comma-separated)',
        tip: 'e.g. Phase must be one of: Exploration, Development, Abandonment. Typos or unofficial codes fail.',
        table: {
          columns: ['WellboreName', 'Phase'],
          checkCol: 'Phase',
          note: 'Allowed list: Exploration, Development, Abandonment. GAMMA-7 has "Appraisal" (not in list) → fail.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  Phase: 'Exploration'  }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',   Phase: 'Development'  }, status: 'pass' },
            { cells: { WellboreName: 'GAMMA-7',   Phase: 'Appraisal'    }, status: 'fail', reason: '"Appraisal" is not in the allowed list: Exploration, Development, Abandonment' },
            { cells: { WellboreName: 'ZETA-9',    Phase: 'Abandonment'  }, status: 'pass' },
          ],
        },
      },
      {
        name: 'Conditional range',
        tag: 'If → range',
        description: 'A numeric range check that is applied only when another column matches a trigger value. Other rows are skipped.',
        configLabel: 'Type: Conditional string range → Condition column → Trigger values → Min → Max',
        tip: 'e.g. TotalDepthM must be in [500, 8000] only when CurrentStatus = "Actual". Planned wells are not yet drilled — skip them.',
        table: {
          columns: ['WellboreName', 'CurrentStatus', 'TotalDepthM'],
          checkCol: 'TotalDepthM',
          note: 'Rule: TotalDepthM in [500, 8000] only when CurrentStatus = "Actual". GAMMA-7 is Planned → skipped (Pass). BETA-3B is Actual with 120 → fail.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  CurrentStatus: 'Actual',  TotalDepthM: '3420' }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',   CurrentStatus: 'Actual',  TotalDepthM: '120'  }, status: 'fail', reason: 'TotalDepthM = 120. Must be in [500, 8000] when CurrentStatus = "Actual"' },
            { cells: { WellboreName: 'GAMMA-7',   CurrentStatus: 'Planned', TotalDepthM: ''     }, status: 'pass' },
            { cells: { WellboreName: 'EPSILON-4', CurrentStatus: 'Actual',  TotalDepthM: '2870' }, status: 'pass' },
          ],
        },
      },
      {
        name: 'Pattern / Data type',
        tag: 'Regex / Type',
        description: 'Value must match a regular expression (pattern) or a specific data type: number, date, email, url, or string.',
        configLabel: 'Type: Pattern match → Regex string  /  Data type check → Data type',
        tip: 'e.g. SpudYear must be a valid number; QCStatus must match /^(Approved|Pending|Rejected)$/ to block free-text entries.',
        table: {
          columns: ['WellboreName', 'QCStatus'],
          checkCol: 'QCStatus',
          note: 'Pattern: /^(Approved|Pending|Rejected)$/. GAMMA-7 has "Under Review" — not in pattern → fail.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  QCStatus: 'Approved'    }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',   QCStatus: 'Pending'     }, status: 'pass' },
            { cells: { WellboreName: 'GAMMA-7',   QCStatus: 'Under Review' }, status: 'fail', reason: '"Under Review" does not match pattern /^(Approved|Pending|Rejected)$/' },
            { cells: { WellboreName: 'DELTA-2C',  QCStatus: 'Approved'    }, status: 'pass' },
          ],
        },
      },
    ],
  },

  // ── CONSISTENCY ───────────────────────────────────────────────────────────────
  {
    id: 'consistency',
    label: 'Consistency',
    icon: <List className="w-5 h-5" />,
    accent: 'amber',
    summary: 'Checks values against a controlled reference list.',
    detail:
      'The engine verifies each non-null value exists in an approved set. ' +
      'You can define the set by typing values directly (Inline List of Values) ' +
      'or by uploading a reference CSV dataset whose column acts as the master list (Upload CSV File). ' +
      'This enforces controlled vocabularies — ensuring only sanctioned codes appear in ' +
      'classification fields like HydrocarbonType or TrajectoryShape.',
    rules: [
      {
        name: 'Inline list',
        tag: 'Typed list',
        description: 'Acceptable values are typed directly in the configuration panel. Any value not in the list → Fail.',
        configLabel: 'Source: Inline List of Values → enter values (comma-separated or one per line)',
        tip: 'e.g. HydrocarbonType must be one of: Oil, Gas, Condensate. Any unlisted value such as "LNG" or a typo fails immediately.',
        table: {
          columns: ['WellboreName', 'HydrocarbonType'],
          checkCol: 'HydrocarbonType',
          note: 'Approved inline list: Oil, Gas, Condensate. EPSILON-4 has "LNG" (not in list) → fail. GAMMA-7 is empty → skipped.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  HydrocarbonType: 'Gas'        }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',   HydrocarbonType: 'Oil'        }, status: 'pass' },
            { cells: { WellboreName: 'GAMMA-7',   HydrocarbonType: ''           }, status: 'pass' },
            { cells: { WellboreName: 'EPSILON-4', HydrocarbonType: 'LNG'        }, status: 'fail', reason: '"LNG" is not in the approved list: Oil, Gas, Condensate' },
            { cells: { WellboreName: 'DELTA-2C',  HydrocarbonType: 'Condensate' }, status: 'pass' },
          ],
        },
      },
      {
        name: 'CSV reference',
        tag: 'From dataset',
        description: 'Acceptable values are loaded from a column in a previously uploaded reference dataset. Anything not found → Fail.',
        configLabel: 'Source: Upload CSV File → select Reference dataset → Reference column → Match column',
        tip: 'Upload a master "Hydrocarbon Types" CSV with one column of approved codes. The engine loads it as the reference set at run-time.',
        table: {
          columns: ['WellboreName', 'TrajectoryShape'],
          checkCol: 'TrajectoryShape',
          note: 'Reference CSV contains: Vertical, Deviated, Horizontal. GAMMA-7 has "S-Curve" (not in reference file) → fail.',
          rows: [
            { cells: { WellboreName: 'ALPHA-1A',  TrajectoryShape: 'Vertical'   }, status: 'pass' },
            { cells: { WellboreName: 'BETA-3B',   TrajectoryShape: 'Deviated'   }, status: 'pass' },
            { cells: { WellboreName: 'GAMMA-7',   TrajectoryShape: 'S-Curve'    }, status: 'fail', reason: '"S-Curve" is not in the reference dataset column. Approved: Vertical, Deviated, Horizontal' },
            { cells: { WellboreName: 'DELTA-2C',  TrajectoryShape: 'Horizontal' }, status: 'pass' },
          ],
        },
      },
    ],
  },
];

// ─── Mini table component ──────────────────────────────────────────────────────
function MiniSampleTable({
  table, accent, hoveredRowKey, onHoverRow,
}: {
  table: MiniTable;
  accent: string;
  hoveredRowKey: number | null;
  onHoverRow: (i: number | null) => void;
}) {
  const ac = ACCENT[accent];
  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr>
            {table.columns.map((col) => (
              <th
                key={col}
                className={`px-2 py-1.5 text-left font-semibold border-b border-slate-200 whitespace-nowrap ${
                  col === table.checkCol ? `${ac.lightBg} ${ac.text}` : 'bg-slate-50 text-slate-500'
                }`}
              >
                {col === table.checkCol
                  ? <span className="flex items-center gap-1">{col}<span className={`text-[8px] font-bold px-1 rounded ${ac.pill}`}>checking</span></span>
                  : col}
              </th>
            ))}
            <th className="px-2 py-1.5 text-left font-semibold border-b border-slate-200 bg-slate-50 text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => {
            const isFail = row.status === 'fail';
            const isHov = hoveredRowKey === i;
            return (
              <tr
                key={i}
                onMouseEnter={() => onHoverRow(i)}
                onMouseLeave={() => onHoverRow(null)}
                className={`cursor-default transition ${
                  isFail ? (isHov ? 'bg-red-100' : 'bg-red-50') : (isHov ? 'bg-green-50' : 'bg-white')
                }`}
              >
                {table.columns.map((col) => {
                  const isChecked = col === table.checkCol;
                  const val = row.cells[col] ?? '';
                  return (
                    <td
                      key={col}
                      className={`px-2 py-1.5 border-b border-slate-100 font-mono ${
                        isChecked && isFail
                          ? 'bg-red-100 text-red-700 font-bold'
                          : isChecked
                          ? `${ac.lightBg} ${ac.text}`
                          : 'text-slate-700'
                      }`}
                    >
                      {val || <span className="italic text-slate-300">(empty)</span>}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 border-b border-slate-100 whitespace-nowrap">
                  {isFail
                    ? <span className="flex items-center gap-1 text-red-600 font-semibold"><XCircle className="w-3 h-3" />Fail</span>
                    : <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="w-3 h-3" />Pass</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Inline hover reason */}
      {hoveredRowKey !== null && table.rows[hoveredRowKey]?.status === 'fail' && table.rows[hoveredRowKey]?.reason && (
        <div className="flex items-start gap-1.5 px-3 py-1.5 bg-red-50 border-t border-red-200 text-[11px] text-red-700">
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span><span className="font-semibold">Reason:</span> {table.rows[hoveredRowKey].reason}</span>
        </div>
      )}
      {/* Note */}
      <div className={`flex items-start gap-1.5 px-3 py-1.5 ${ac.lightBg} border-t ${ac.border} text-[11px] ${ac.text}`}>
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span>{table.note}</span>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function GuidePage() {
  const [activeDim, setActiveDim] = useState('completeness');
  const [hoveredRule, setHoveredRule] = useState<string | null>(null);
  // Per-rule hover row: key = `${dimId}-${ruleName}`, value = row index
  const [hoveredRows, setHoveredRows] = useState<Record<string, number | null>>({});

  const dim = DIMS.find((d) => d.id === activeDim)!;
  const ac = ACCENT[dim.accent];

  function setHoveredRow(ruleKey: string, i: number | null) {
    setHoveredRows((prev) => ({ ...prev, [ruleKey]: i }));
  }

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md p-6 flex items-start gap-4">
        <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-teal-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quality Dimensions Guide</h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
            Learn how each of the 4 quality dimensions works in{' '}
            <span className="font-semibold text-teal-700">Governance Plus</span>.
            Hover a rule card to expand configuration steps and see its own sample table.
            Hover table rows to reveal the exact fail reason. Sample data is fictional — it mirrors the OSDU wellbore schema.
          </p>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {DIMS.map((d) => {
            const a = ACCENT[d.accent];
            const active = activeDim === d.id;
            return (
              <button
                key={d.id}
                onClick={() => { setActiveDim(d.id); setHoveredRule(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium transition-all ${
                  active
                    ? `${a.lightBg} ${a.text} ${a.border} border shadow-sm`
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <span className={active ? a.text : 'text-slate-400'}>{d.icon}</span>
                <span>{d.label}</span>
                {active && <ChevronRight className={`w-3.5 h-3.5 ml-auto ${a.text}`} />}
              </button>
            );
          })}
        </div>

        {/* ── Main ────────────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Overview */}
          <div className={`rounded-xl border ${ac.border} ${ac.lightBg} p-5`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={ac.text}>{dim.icon}</span>
              <h2 className={`text-lg font-bold ${ac.text}`}>{dim.label}</h2>
            </div>
            <p className="text-slate-700 text-sm font-medium mb-1">{dim.summary}</p>
            <p className="text-slate-600 text-sm leading-relaxed">{dim.detail}</p>
          </div>

          {/* Rule cards */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Rule types</span>
              <span className="text-xs text-slate-400">— hover a card to expand its example</span>
            </div>

            {dim.rules.map((rule) => {
              const ruleKey = `${dim.id}-${rule.name}`;
              const hovered = hoveredRule === ruleKey;
              return (
                <div
                  key={ruleKey}
                  onMouseEnter={() => setHoveredRule(ruleKey)}
                  onMouseLeave={() => setHoveredRule(null)}
                  className={`rounded-xl border transition-all duration-150 cursor-default select-none ${
                    hovered
                      ? `${ac.border} ${ac.lightBg} shadow-md`
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="p-4">
                    {/* Rule header */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-slate-800">{rule.name}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${ac.pill}`}>{rule.tag}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{rule.description}</p>

                    {/* Expanded content on hover */}
                    {hovered && (
                      <div className="mt-3 space-y-2">
                        {/* Config path */}
                        <div className={`rounded-lg ${ac.lightBg} border ${ac.border} px-3 py-2`}>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Where to configure</p>
                          <p className={`text-xs font-mono ${ac.text} leading-relaxed`}>{rule.configLabel}</p>
                        </div>

                        {/* Tip */}
                        <div className="flex items-start gap-1.5 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
                          <Lightbulb className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-800">{rule.tip}</p>
                        </div>

                        {/* Per-rule sample table */}
                        <MiniSampleTable
                          table={rule.table}
                          accent={dim.accent}
                          hoveredRowKey={hoveredRows[ruleKey] ?? null}
                          onHoverRow={(i) => setHoveredRow(ruleKey, i)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
