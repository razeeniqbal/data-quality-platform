// Simple logging utility
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, message: string, data?: unknown, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error,
    };

    // Log to console in development
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(level);
      console.log(`%c[${entry.timestamp}] ${level}: ${message}`, style, data || '');
      if (error) console.error(error);
    }

    // Log errors to storage for debugging
    if (level === LogLevel.ERROR) {
      this.storeLogs(entry);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: 'color: #888; font-size: 12px;',
      [LogLevel.INFO]: 'color: #0066cc; font-weight: bold;',
      [LogLevel.WARN]: 'color: #ff8800; font-weight: bold;',
      [LogLevel.ERROR]: 'color: #cc0000; font-weight: bold;',
    };
    return styles[level];
  }

  private storeLogs(entry: LogEntry) {
    try {
      const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      logs.push(entry);
      // Keep only last 100 logs
      if (logs.length > 100) logs.shift();
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch {
      // Ignore storage errors
    }
  }

  debug(message: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: unknown) {
    this.log(LogLevel.ERROR, message, data, error);
  }

  getLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
    } catch {
      return [];
    }
  }

  clearLogs() {
    localStorage.removeItem('app_logs');
  }
}

export const logger = new Logger();
export default logger;
