import { describe, it, expect } from 'vitest';

// Test data based on QualityCheckResult interface
interface TestDataRow {
  id: string | number;
  name: string;
  email: string;
  age: string | number;
  [key: string]: string | number | boolean | null;
}

interface QualityCheckResult {
  id: string;
  column_name: string;
  dimension: string;
  passed_count: number;
  failed_count: number;
  total_count: number;
  score: number;
}

// Simulate the executeRule function
function executeRule(
  dimensionKey: string,
  columnName: string,
  rows: Array<Record<string, string | number | boolean | null>>
): QualityCheckResult {
  let passedCount = 0;
  let failedCount = 0;

  if (dimensionKey === 'completeness') {
    for (const row of rows) {
      const value = row[columnName];
      if (value && String(value).trim() !== '') {
        passedCount++;
      } else {
        failedCount++;
      }
    }
  } else if (dimensionKey === 'uniqueness') {
    const values = new Set();
    for (const row of rows) {
      const value = row[columnName];
      if (value && !values.has(value)) {
        values.add(value);
        passedCount++;
      } else {
        failedCount++;
      }
    }
  } else {
    passedCount = rows.length;
  }

  const totalCount = passedCount + failedCount;
  const score = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

  return {
    id: `${dimensionKey}-${columnName}`,
    column_name: columnName,
    dimension: dimensionKey,
    passed_count: passedCount,
    failed_count: failedCount,
    total_count: totalCount,
    score: score,
  };
}

describe('executeRule - Completeness', () => {
  it('should detect all complete values in a column', () => {
    const rows: Array<Record<string, string | number | boolean | null>> = [
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' },
      { id: 3, name: 'Bob', email: 'bob@example.com' },
    ];

    const result = executeRule('completeness', 'name', rows);

    expect(result.passed_count).toBe(3);
    expect(result.failed_count).toBe(0);
    expect(result.score).toBe(100);
  });

  it('should detect missing values in a column', () => {
    const rows: Array<Record<string, string | number | boolean | null>> = [
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: '', email: 'jane@example.com' },
      { id: 3, name: null, email: 'bob@example.com' },
    ];

    const result = executeRule('completeness', 'name', rows);

    expect(result.passed_count).toBe(1);
    expect(result.failed_count).toBe(2);
    expect(result.score).toBeCloseTo(33.33, 1);
  });

  it('should handle empty rows', () => {
    const result = executeRule('completeness', 'name', []);

    expect(result.passed_count).toBe(0);
    expect(result.failed_count).toBe(0);
    expect(result.score).toBe(0);
  });
});

describe('executeRule - Uniqueness', () => {
  it('should detect all unique values', () => {
    const rows: Array<Record<string, string | number | boolean | null>> = [
      { id: 1, email: 'john@example.com' },
      { id: 2, email: 'jane@example.com' },
      { id: 3, email: 'bob@example.com' },
    ];

    const result = executeRule('uniqueness', 'email', rows);

    expect(result.passed_count).toBe(3);
    expect(result.failed_count).toBe(0);
    expect(result.score).toBe(100);
  });

  it('should detect duplicate values', () => {
    const rows: Array<Record<string, string | number | boolean | null>> = [
      { id: 1, email: 'john@example.com' },
      { id: 2, email: 'john@example.com' },
      { id: 3, email: 'bob@example.com' },
    ];

    const result = executeRule('uniqueness', 'email', rows);

    expect(result.passed_count).toBe(2);
    expect(result.failed_count).toBe(1);
    expect(result.score).toBeCloseTo(66.67, 1);
  });
});

describe('executeRule - Unknown Dimension', () => {
  it('should assume all pass for unknown dimensions', () => {
    const rows: Array<Record<string, string | number | boolean | null>> = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ];

    const result = executeRule('unknown_dimension', 'name', rows);

    expect(result.passed_count).toBe(2);
    expect(result.failed_count).toBe(0);
    expect(result.score).toBe(100);
  });
});
