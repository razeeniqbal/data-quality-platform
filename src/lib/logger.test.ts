import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logger } from '../lib/logger';

describe('Logger', () => {
  beforeEach(() => {
    // Clear logs before each test
    logger.clearLogs();
  });

  afterEach(() => {
    logger.clearLogs();
  });

  it('should log debug messages', () => {
    logger.debug('Test debug message', { key: 'value' });
    const logs = logger.getLogs();
    // Debug logs are not stored, only errors
    expect(logs.length).toBe(0);
  });

  it('should log and store error messages', () => {
    const error = new Error('Test error');
    logger.error('Test error message', error, { context: 'test' });
    const logs = logger.getLogs();

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].message).toContain('Test error message');
  });

  it('should keep only last 100 logs', () => {
    // Add more than 100 error logs
    for (let i = 0; i < 150; i++) {
      logger.error(`Error ${i}`, new Error(`Test error ${i}`));
    }

    const logs = logger.getLogs();
    expect(logs.length).toBe(100);
  });

  it('should clear all logs', () => {
    logger.error('Error 1', new Error('Test'));
    logger.error('Error 2', new Error('Test'));

    let logs = logger.getLogs();
    expect(logs.length).toBeGreaterThan(0);

    logger.clearLogs();
    logs = logger.getLogs();
    expect(logs.length).toBe(0);
  });
});
