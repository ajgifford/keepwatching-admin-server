import { LogEntry, LogFilter, LogLevel, LogService } from '@ajgifford/keepwatching-types';
import { describe, expect, it } from '@jest/globals';
import { determineLogLevel, filterLogs, limitLogs, matchesFilter, sortLogsByTimestamp } from '@utils/logFilters';

describe('logFilters', () => {
  describe('determineLogLevel', () => {
    it('should return ERROR for service names containing "error"', () => {
      expect(determineLogLevel('KeepWatching-App-Error', 'Some log message')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app-error', 'Normal message')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('error-log', 'Info message')).toBe(LogLevel.ERROR);
    });

    it('should return ERROR for log lines containing "error"', () => {
      expect(determineLogLevel('app', 'This is an error message')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app', 'Error: Something went wrong')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app', 'ERROR: Failed to connect')).toBe(LogLevel.ERROR);
    });

    it('should return ERROR for log lines containing "err]"', () => {
      expect(determineLogLevel('app', '[err] Connection failed')).toBe(LogLevel.ERROR);
    });

    it('should return ERROR for log lines containing "exception"', () => {
      expect(determineLogLevel('app', 'Exception occurred during processing')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app', 'Unhandled exception')).toBe(LogLevel.ERROR);
    });

    it('should return ERROR for log lines matching error patterns', () => {
      expect(determineLogLevel('app', 'TypeError: Cannot read property')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app', 'ValidationError: Invalid input')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app', 'ReferenceError: x is not defined')).toBe(LogLevel.ERROR);
    });

    it('should return ERROR for stack trace lines', () => {
      expect(determineLogLevel('app', 'Stack trace:')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app', 'at /home/user/app.js:123')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app', 'code: ERR_MODULE_NOT_FOUND')).toBe(LogLevel.ERROR);
    });

    it('should return WARN for log lines containing "warn" or "warning"', () => {
      expect(determineLogLevel('app', 'Warning: Deprecated API')).toBe(LogLevel.WARN);
      expect(determineLogLevel('app', 'warn: Low disk space')).toBe(LogLevel.WARN);
      expect(determineLogLevel('app', 'WARNING: Rate limit approaching')).toBe(LogLevel.WARN);
    });

    it('should return INFO for normal log lines', () => {
      expect(determineLogLevel('app', 'Application started successfully')).toBe(LogLevel.INFO);
      expect(determineLogLevel('app', 'Processing request')).toBe(LogLevel.INFO);
      expect(determineLogLevel('app', 'Database connected')).toBe(LogLevel.INFO);
    });

    it('should be case insensitive', () => {
      expect(determineLogLevel('app', 'ERROR: Failed')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app', 'error: failed')).toBe(LogLevel.ERROR);
      expect(determineLogLevel('app', 'WARNING: Test')).toBe(LogLevel.WARN);
      expect(determineLogLevel('app', 'warning: test')).toBe(LogLevel.WARN);
    });
  });

  describe('matchesFilter', () => {
    const mockLog: LogEntry = {
      timestamp: '2025-01-15T12:00:00Z',
      service: LogService.APP,
      level: LogLevel.INFO,
      message: 'Test message with search term',
      logFile: 'test.log',
    };

    it('should return true when no filters are applied', () => {
      const filter: LogFilter = {};
      expect(matchesFilter(mockLog, filter)).toBe(true);
    });

    it('should filter by service', () => {
      expect(matchesFilter(mockLog, { service: LogService.APP })).toBe(true);
      expect(matchesFilter(mockLog, { service: LogService.NGINX })).toBe(false);
    });

    it('should filter by level', () => {
      expect(matchesFilter(mockLog, { level: LogLevel.INFO })).toBe(true);
      expect(matchesFilter(mockLog, { level: LogLevel.ERROR })).toBe(false);
    });

    it('should filter by startDate', () => {
      expect(matchesFilter(mockLog, { startDate: '2025-01-15T11:00:00Z' })).toBe(true);
      expect(matchesFilter(mockLog, { startDate: '2025-01-15T12:00:00Z' })).toBe(false);
      expect(matchesFilter(mockLog, { startDate: '2025-01-15T13:00:00Z' })).toBe(false);
    });

    it('should filter by endDate', () => {
      expect(matchesFilter(mockLog, { endDate: '2025-01-15T13:00:00Z' })).toBe(true);
      expect(matchesFilter(mockLog, { endDate: '2025-01-15T12:00:00Z' })).toBe(false);
      expect(matchesFilter(mockLog, { endDate: '2025-01-15T11:00:00Z' })).toBe(false);
    });

    it('should filter by searchTerm', () => {
      expect(matchesFilter(mockLog, { searchTerm: 'search term' })).toBe(true);
      expect(matchesFilter(mockLog, { searchTerm: 'Test' })).toBe(true);
      expect(matchesFilter(mockLog, { searchTerm: 'not found' })).toBe(false);
    });

    it('should apply multiple filters (AND logic)', () => {
      const filter: LogFilter = {
        service: LogService.APP,
        level: LogLevel.INFO,
        searchTerm: 'Test',
      };
      expect(matchesFilter(mockLog, filter)).toBe(true);

      const filterNoMatch: LogFilter = {
        service: LogService.APP,
        level: LogLevel.ERROR, // This doesn't match
        searchTerm: 'Test',
      };
      expect(matchesFilter(mockLog, filterNoMatch)).toBe(false);
    });

    it('should handle date range filtering', () => {
      const filter: LogFilter = {
        startDate: '2025-01-15T10:00:00Z',
        endDate: '2025-01-15T14:00:00Z',
      };
      expect(matchesFilter(mockLog, filter)).toBe(true);

      const filterOutOfRange: LogFilter = {
        startDate: '2025-01-16T00:00:00Z',
        endDate: '2025-01-17T00:00:00Z',
      };
      expect(matchesFilter(mockLog, filterOutOfRange)).toBe(false);
    });
  });

  describe('sortLogsByTimestamp', () => {
    const logs: LogEntry[] = [
      {
        timestamp: '2025-01-15T12:00:00Z',
        service: LogService.APP,
        level: LogLevel.INFO,
        message: 'Log 2',
        logFile: 'test.log',
      },
      {
        timestamp: '2025-01-15T10:00:00Z',
        service: LogService.APP,
        level: LogLevel.INFO,
        message: 'Log 1',
        logFile: 'test.log',
      },
      {
        timestamp: '2025-01-15T14:00:00Z',
        service: LogService.APP,
        level: LogLevel.INFO,
        message: 'Log 3',
        logFile: 'test.log',
      },
    ];

    it('should sort logs by timestamp in descending order by default', () => {
      const sorted = sortLogsByTimestamp(logs);

      expect(sorted[0].message).toBe('Log 3');
      expect(sorted[1].message).toBe('Log 2');
      expect(sorted[2].message).toBe('Log 1');
    });

    it('should sort logs by timestamp in ascending order when specified', () => {
      const sorted = sortLogsByTimestamp(logs, 'asc');

      expect(sorted[0].message).toBe('Log 1');
      expect(sorted[1].message).toBe('Log 2');
      expect(sorted[2].message).toBe('Log 3');
    });

    it('should sort logs by timestamp in descending order when specified', () => {
      const sorted = sortLogsByTimestamp(logs, 'desc');

      expect(sorted[0].message).toBe('Log 3');
      expect(sorted[1].message).toBe('Log 2');
      expect(sorted[2].message).toBe('Log 1');
    });

    it('should not mutate the original array', () => {
      const originalLength = logs.length;
      const originalFirst = logs[0].message;

      sortLogsByTimestamp(logs);

      expect(logs.length).toBe(originalLength);
      expect(logs[0].message).toBe(originalFirst);
    });

    it('should handle empty arrays', () => {
      const sorted = sortLogsByTimestamp([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single element arrays', () => {
      const singleLog = [logs[0]];
      const sorted = sortLogsByTimestamp(singleLog);
      expect(sorted).toEqual(singleLog);
    });
  });

  describe('limitLogs', () => {
    const logs: LogEntry[] = Array.from({ length: 150 }, (_, i) => ({
      timestamp: `2025-01-15T${String(i).padStart(2, '0')}:00:00Z`,
      service: LogService.APP,
      level: LogLevel.INFO,
      message: `Log ${i}`,
      logFile: 'test.log',
    }));

    it('should limit logs to default of 100', () => {
      const limited = limitLogs(logs);
      expect(limited.length).toBe(100);
    });

    it('should limit logs to specified number', () => {
      expect(limitLogs(logs, 10).length).toBe(10);
      expect(limitLogs(logs, 50).length).toBe(50);
      expect(limitLogs(logs, 25).length).toBe(25);
    });

    it('should return all logs if limit is greater than array length', () => {
      const limited = limitLogs(logs, 200);
      expect(limited.length).toBe(150);
    });

    it('should return first N elements', () => {
      const limited = limitLogs(logs, 5);
      expect(limited[0].message).toBe('Log 0');
      expect(limited[4].message).toBe('Log 4');
    });

    it('should handle empty arrays', () => {
      const limited = limitLogs([]);
      expect(limited).toEqual([]);
    });

    it('should handle limit of 0', () => {
      const limited = limitLogs(logs, 0);
      expect(limited).toEqual([]);
    });
  });

  describe('filterLogs', () => {
    const mockLogs: LogEntry[] = [
      {
        timestamp: '2025-01-15T10:00:00Z',
        service: LogService.APP,
        level: LogLevel.INFO,
        message: 'Info log from app',
        logFile: 'app.log',
      },
      {
        timestamp: '2025-01-15T11:00:00Z',
        service: LogService.APP,
        level: LogLevel.ERROR,
        message: 'Error log from app',
        logFile: 'app.log',
      },
      {
        timestamp: '2025-01-15T12:00:00Z',
        service: LogService.NGINX,
        level: LogLevel.INFO,
        message: 'Nginx access log',
        logFile: 'nginx.log',
      },
      {
        timestamp: '2025-01-15T13:00:00Z',
        service: LogService.APP,
        level: LogLevel.WARN,
        message: 'Warning from app',
        logFile: 'app.log',
      },
      {
        timestamp: '2025-01-15T14:00:00Z',
        service: LogService.CONSOLE,
        level: LogLevel.INFO,
        message: 'Console log entry',
        logFile: 'console.log',
      },
    ];

    it('should return all logs when no filters are applied', () => {
      const result = filterLogs(mockLogs, {});
      expect(result.length).toBe(5);
    });

    it('should filter by service', () => {
      const result = filterLogs(mockLogs, { service: LogService.APP });
      expect(result.length).toBe(3);
      expect(result.every((log) => log.service === LogService.APP)).toBe(true);
    });

    it('should filter by level', () => {
      const result = filterLogs(mockLogs, { level: LogLevel.ERROR });
      expect(result.length).toBe(1);
      expect(result[0].level).toBe(LogLevel.ERROR);
    });

    it('should filter by searchTerm', () => {
      const result = filterLogs(mockLogs, { searchTerm: 'app' });
      expect(result.length).toBe(3);
      expect(result.every((log) => log.message.toLowerCase().includes('app'))).toBe(true);
    });

    it('should filter by date range', () => {
      const result = filterLogs(mockLogs, {
        startDate: '2025-01-15T11:00:00Z',
        endDate: '2025-01-15T13:00:00Z',
      });
      expect(result.length).toBe(1);
      expect(result[0].timestamp).toBe('2025-01-15T12:00:00Z');
    });

    it('should apply multiple filters together', () => {
      const result = filterLogs(mockLogs, {
        service: LogService.APP,
        level: LogLevel.ERROR,
      });
      expect(result.length).toBe(1);
      expect(result[0].message).toBe('Error log from app');
    });

    it('should sort logs by timestamp (newest first)', () => {
      const result = filterLogs(mockLogs, {});
      expect(result[0].timestamp).toBe('2025-01-15T14:00:00Z');
      expect(result[result.length - 1].timestamp).toBe('2025-01-15T10:00:00Z');
    });

    it('should apply limit to results', () => {
      const result = filterLogs(mockLogs, { limit: 2 });
      expect(result.length).toBe(2);
    });

    it('should default to limit of 100', () => {
      const manyLogs: LogEntry[] = Array.from({ length: 150 }, (_, i) => ({
        timestamp: `2025-01-15T${String(i).padStart(2, '0')}:00:00Z`,
        service: LogService.APP,
        level: LogLevel.INFO,
        message: `Log ${i}`,
        logFile: 'test.log',
      }));

      const result = filterLogs(manyLogs, {});
      expect(result.length).toBe(100);
    });

    it('should return empty array when no logs match', () => {
      const result = filterLogs(mockLogs, { service: LogService.CONSOLE_ERROR });
      expect(result).toEqual([]);
    });

    it('should handle complex filtering scenario', () => {
      const result = filterLogs(mockLogs, {
        service: LogService.APP,
        startDate: '2025-01-15T10:30:00Z',
        endDate: '2025-01-15T13:30:00Z',
        limit: 10,
      });

      expect(result.length).toBe(2);
      expect(result.every((log) => log.service === LogService.APP)).toBe(true);
      expect(result[0].timestamp).toBe('2025-01-15T13:00:00Z'); // Most recent first
      expect(result[1].timestamp).toBe('2025-01-15T11:00:00Z');
    });
  });
});
