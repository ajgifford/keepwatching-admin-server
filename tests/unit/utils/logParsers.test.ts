import { describe, expect, it, jest } from '@jest/globals';
import { LogLevel, LogService } from '@ajgifford/keepwatching-types';
import {
  parseAppLogLine,
  parseNginxLogLine,
  parseConsoleLogLine,
  parseErrorLogFile,
  parseLogTimestamp,
  normalizeTimestamp,
  parseLogFile,
} from '@utils/logParsers';

// Mock cliLogger to suppress output during tests
jest.mock('@ajgifford/keepwatching-common-server/logger', () => ({
  cliLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('logParsers', () => {
  describe('parseAppLogLine', () => {
    it('should parse valid JSON log line', () => {
      const line = JSON.stringify({
        timestamp: '2025-01-15T12:00:00Z',
        level: 'info',
        message: 'Test message',
        logId: '123',
      });

      const result = parseAppLogLine(line, LogService.APP, 'test.log');

      expect(result).toEqual({
        timestamp: '2025-01-15T12:00:00Z',
        service: LogService.APP,
        message: 'Test message',
        level: 'info',
        logId: '123',
        logFile: 'test.log',
        request: {},
        response: {},
      });
    });

    it('should return null for invalid JSON', () => {
      const line = 'not valid json';
      const result = parseAppLogLine(line, LogService.APP, 'test.log');
      expect(result).toBeNull();
    });

    it('should parse log with request data', () => {
      const line = JSON.stringify({
        timestamp: '2025-01-15T12:00:00Z',
        level: 'info',
        message: 'Request received',
        logId: '456',
        data: {
          request: {
            path: '/api/test',
            method: 'GET',
            body: { foo: 'bar' },
            params: { id: '1' },
            query: { filter: 'active' },
          },
        },
      });

      const result = parseAppLogLine(line, LogService.APP, 'test.log');

      expect(result?.request).toEqual({
        url: '/api/test',
        method: 'GET',
        body: { foo: 'bar' },
        params: { id: '1' },
        query: { filter: 'active' },
      });
    });

    it('should parse log with response data', () => {
      const line = JSON.stringify({
        timestamp: '2025-01-15T12:00:00Z',
        level: 'info',
        message: 'Response sent',
        logId: '789',
        data: {
          response: {
            statusCode: 200,
            body: { success: true },
          },
        },
      });

      const result = parseAppLogLine(line, LogService.APP, 'test.log');

      expect(result?.response).toEqual({
        statusCode: 200,
        body: { success: true },
      });
    });

    it('should handle missing optional fields gracefully', () => {
      const line = JSON.stringify({
        timestamp: '2025-01-15T12:00:00Z',
        message: 'Minimal log',
      });

      const result = parseAppLogLine(line, LogService.APP, 'test.log');

      expect(result).toBeTruthy();
      expect(result?.level).toBeUndefined();
      expect(result?.logId).toBeUndefined();
      expect(result?.request).toEqual({});
      expect(result?.response).toEqual({});
    });

    it('should handle partial request data with missing fields', () => {
      const line = JSON.stringify({
        timestamp: '2025-01-15T12:00:00Z',
        message: 'Partial request',
        data: {
          request: {
            method: 'POST',
          },
        },
      });

      const result = parseAppLogLine(line, LogService.APP, 'test.log');

      expect(result?.request).toEqual({
        url: 'N/A',
        method: 'POST',
        body: {},
        params: {},
        query: {},
      });
    });

    it('should use basename of log file', () => {
      const line = JSON.stringify({
        timestamp: '2025-01-15T12:00:00Z',
        message: 'Test',
      });

      const result = parseAppLogLine(line, LogService.APP, '/var/log/app/test.log');
      expect(result?.logFile).toBe('test.log');
    });

    it('should handle empty JSON objects', () => {
      const line = '{}';
      const result = parseAppLogLine(line, LogService.APP, 'test.log');

      expect(result).toBeTruthy();
      expect(result?.timestamp).toBeUndefined();
      expect(result?.message).toBeUndefined();
    });
  });

  describe('parseNginxLogLine', () => {
    it('should parse valid nginx access log line', () => {
      const line =
        '192.168.1.1 - user1 [15/Jan/2025:12:00:00 -0500] "GET /api/test HTTP/1.1" 200 1234 "http://referrer.com" "Mozilla/5.0"';

      const result = parseNginxLogLine(line, 'access.log');

      expect(result).toBeTruthy();
      expect(result?.service).toBe(LogService.NGINX);
      expect(result?.level).toBe(LogLevel.INFO);
      expect(result?.message).toBe('Request: GET /api/test HTTP/1.1 >>> Status: 200');
      expect(result?.logFile).toBe('access.log');
      expect(result?.remoteAddr).toBe('192.168.1.1');
      expect(result?.remoteUser).toBe('user1');
      expect(result?.request).toBe('GET /api/test HTTP/1.1');
      expect(result?.status).toBe(200);
      expect(result?.bytesSent).toBe(1234);
      expect(result?.httpReferer).toBe('http://referrer.com');
      expect(result?.httpUserAgent).toBe('Mozilla/5.0');
    });

    it('should return null for invalid log format', () => {
      const line = 'invalid nginx log line';
      const result = parseNginxLogLine(line, 'access.log');
      expect(result).toBeNull();
    });

    it('should handle hyphen for missing user', () => {
      const line =
        '10.0.0.1 - - [15/Jan/2025:12:00:00 -0500] "POST /api/data HTTP/1.1" 201 512 "-" "curl/7.68.0"';

      const result = parseNginxLogLine(line, 'access.log');

      expect(result?.remoteAddr).toBe('10.0.0.1');
      expect(result?.remoteUser).toBe('-');
      expect(result?.httpReferer).toBe('-');
    });

    it('should normalize timestamp', () => {
      const line =
        '192.168.1.1 - - [02/Jul/2025:02:13:02 -0500] "GET / HTTP/1.1" 200 100 "-" "-"';

      const result = parseNginxLogLine(line, 'access.log');

      expect(result?.timestamp).toBeTruthy();
      // Should be a valid ISO timestamp
      expect(new Date(result!.timestamp).toISOString()).toBe(result?.timestamp);
    });

    it('should parse different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        const line = `192.168.1.1 - - [15/Jan/2025:12:00:00 -0500] "${method} /test HTTP/1.1" 200 100 "-" "-"`;
        const result = parseNginxLogLine(line, 'access.log');
        expect(result?.request).toBe(`${method} /test HTTP/1.1`);
      });
    });

    it('should parse different status codes', () => {
      const statuses = [200, 201, 400, 404, 500];

      statuses.forEach((status) => {
        const line = `192.168.1.1 - - [15/Jan/2025:12:00:00 -0500] "GET / HTTP/1.1" ${status} 100 "-" "-"`;
        const result = parseNginxLogLine(line, 'access.log');
        expect(result?.status).toBe(status);
      });
    });

    it('should use basename of log file', () => {
      const line =
        '192.168.1.1 - - [15/Jan/2025:12:00:00 -0500] "GET / HTTP/1.1" 200 100 "-" "-"';
      const result = parseNginxLogLine(line, '/var/log/nginx/access.log');
      expect(result?.logFile).toBe('access.log');
    });
  });

  describe('parseConsoleLogLine', () => {
    it('should parse valid console log line', () => {
      const line = '[Jan-15-2025 12:00:00] info (1.0.0): Application started';

      const result = parseConsoleLogLine(line, LogService.CONSOLE, 'console.log');

      expect(result).toEqual({
        timestamp: 'Jan-15-2025 12:00:00',
        level: LogLevel.INFO,
        message: 'Application started',
        service: LogService.CONSOLE,
        version: '1.0.0',
        logFile: 'console.log',
      });
    });

    it('should return null for invalid format', () => {
      const line = 'invalid console log';
      const result = parseConsoleLogLine(line, LogService.CONSOLE, 'console.log');
      expect(result).toBeNull();
    });

    it('should handle different log levels', () => {
      const levels = ['info', 'warn', 'error', 'debug'];

      levels.forEach((level) => {
        const line = `[Jan-15-2025 12:00:00] ${level} (1.0.0): Test message`;
        const result = parseConsoleLogLine(line, LogService.CONSOLE, 'console.log');
        expect(result?.level).toBe(level);
      });
    });

    it('should handle ANSI color codes', () => {
      const line = '[Jan-15-2025 12:00:00] \x1b[32minfo\x1b [0m (1.0.0): Colored message';

      const result = parseConsoleLogLine(line, LogService.CONSOLE, 'console.log');

      expect(result).toBeTruthy();
      expect(result?.message).toBe('Colored message');
    });

    it('should use basename of log file', () => {
      const line = '[Jan-15-2025 12:00:00] info (1.0.0): Test';
      const result = parseConsoleLogLine(line, LogService.CONSOLE, '/var/log/pm2/console.log');
      expect(result?.logFile).toBe('console.log');
    });
  });

  describe('parseErrorLogFile', () => {
    it('should parse single error with timestamp', () => {
      const content = '[Jul-03-2025 12:49:28] ERROR: Something went wrong';

      const result = parseErrorLogFile(content, LogService.APP, 'error.log');

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Something went wrong');
      expect(result[0].level).toBe(LogLevel.ERROR);
      expect(result[0].service).toBe(LogService.APP);
      expect(result[0].logFile).toBe('error.log');
      expect(result[0].stack).toEqual([]);
    });

    it('should parse error with stack trace', () => {
      const content = `[Jul-03-2025 12:49:28] ERROR: Error occurred
    at functionName (/path/to/file.js:123:45)
    at anotherFunction (/path/to/other.js:67:89)`;

      const result = parseErrorLogFile(content, LogService.APP, 'error.log');

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Error occurred');
      expect(result[0].stack).toHaveLength(2);
      expect(result[0].stack[0]).toBe('at functionName (/path/to/file.js:123:45)');
      expect(result[0].stack[1]).toBe('at anotherFunction (/path/to/other.js:67:89)');
    });

    it('should parse multiple errors', () => {
      const content = `[Jul-03-2025 12:49:28] ERROR: First error
[Jul-03-2025 12:50:00] WARN: Warning message
[Jul-03-2025 12:51:00] ERROR: Second error`;

      const result = parseErrorLogFile(content, LogService.APP, 'error.log');

      expect(result).toHaveLength(3);
      expect(result[0].message).toBe('First error');
      expect(result[1].message).toBe('Warning message');
      expect(result[1].level).toBe(LogLevel.WARN);
      expect(result[2].message).toBe('Second error');
    });

    it('should parse error without timestamp (fallback)', () => {
      const content = 'ValidationError: Invalid input provided';

      const result = parseErrorLogFile(content, LogService.APP, 'error.log');

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('ValidationError: Invalid input provided');
      expect(result[0].level).toBe(LogLevel.ERROR);
    });

    it('should parse error with JSON details', () => {
      const content = `[Jul-03-2025 12:49:28] ERROR: Error with details
{
  "code": "ERR_INVALID",
  "details": "Additional info"
}`;

      const result = parseErrorLogFile(content, LogService.APP, 'error.log');

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Error with details');
      expect(result[0].details).toContain('"code": "ERR_INVALID"');
    });

    it('should handle multiline error messages', () => {
      const content = `[Jul-03-2025 12:49:28] ERROR: Complex error
This is additional context
More context here
    at someFunction (/path/to/file.js:10:5)`;

      const result = parseErrorLogFile(content, LogService.APP, 'error.log');

      expect(result).toHaveLength(1);
      expect(result[0].fullText).toContain('Complex error');
      expect(result[0].fullText).toContain('This is additional context');
      expect(result[0].stack).toHaveLength(1);
    });

    it('should handle FirebaseAuthError', () => {
      const content = 'FirebaseAuthError: Invalid token';

      const result = parseErrorLogFile(content, LogService.APP, 'error.log');

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('FirebaseAuthError: Invalid token');
    });

    it('should use basename of log file', () => {
      const content = '[Jul-03-2025 12:49:28] ERROR: Test';
      const result = parseErrorLogFile(content, LogService.APP, '/var/log/errors/error.log');
      expect(result[0].logFile).toBe('error.log');
    });
  });

  describe('parseLogTimestamp', () => {
    it('should parse valid timestamp format', () => {
      const timestamp = 'Jul-03-2025 12:49:28';
      const result = parseLogTimestamp(timestamp);

      const expectedDate = new Date(2025, 6, 3, 12, 49, 28);
      expect(result).toBe(expectedDate.toISOString());
    });

    it('should handle all months correctly', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      months.forEach((month, index) => {
        const timestamp = `${month}-15-2025 12:00:00`;
        const result = parseLogTimestamp(timestamp);
        const expectedDate = new Date(2025, index, 15, 12, 0, 0);
        expect(result).toBe(expectedDate.toISOString());
      });
    });

    it('should handle different days', () => {
      expect(parseLogTimestamp('Jan-01-2025 00:00:00')).toBeTruthy();
      expect(parseLogTimestamp('Jan-15-2025 12:00:00')).toBeTruthy();
      expect(parseLogTimestamp('Jan-31-2025 23:59:59')).toBeTruthy();
    });

    it('should return current timestamp for invalid format', () => {
      const beforeParse = new Date().getTime();
      const result = parseLogTimestamp('invalid-format');
      const afterParse = new Date().getTime();

      const resultTime = new Date(result).getTime();
      expect(resultTime).toBeGreaterThanOrEqual(beforeParse);
      expect(resultTime).toBeLessThanOrEqual(afterParse);
    });

    it('should return current timestamp for invalid month', () => {
      const result = parseLogTimestamp('Xyz-15-2025 12:00:00');
      const resultDate = new Date(result);
      expect(resultDate.getTime()).toBeGreaterThan(0);
    });
  });

  describe('normalizeTimestamp', () => {
    it('should normalize nginx timestamp format', () => {
      const timestamp = '02/Jul/2025:02:13:02 -0500';
      const result = normalizeTimestamp(timestamp);

      expect(result).toBeTruthy();
      // Should be a valid ISO timestamp
      expect(new Date(result).toISOString()).toBe(result);
    });

    it('should handle positive timezone offset', () => {
      const timestamp = '15/Jan/2025:12:00:00 +0200';
      const result = normalizeTimestamp(timestamp);

      expect(result).toBeTruthy();
      expect(new Date(result).toISOString()).toBe(result);
    });

    it('should handle negative timezone offset', () => {
      const timestamp = '15/Jan/2025:12:00:00 -0800';
      const result = normalizeTimestamp(timestamp);

      expect(result).toBeTruthy();
      expect(new Date(result).toISOString()).toBe(result);
    });

    it('should handle UTC timezone (+0000)', () => {
      const timestamp = '15/Jan/2025:12:00:00 +0000';
      const result = normalizeTimestamp(timestamp);

      expect(result).toBeTruthy();
      expect(new Date(result).toISOString()).toBe(result);
    });

    it('should handle all months in nginx format', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      months.forEach((month) => {
        const timestamp = `15/${month}/2025:12:00:00 +0000`;
        const result = normalizeTimestamp(timestamp);
        expect(new Date(result).toISOString()).toBe(result);
      });
    });

    it('should handle already ISO format timestamps', () => {
      const timestamp = '2025-01-15T12:00:00Z';
      const result = normalizeTimestamp(timestamp);

      expect(result).toBe(timestamp);
    });

    it('should handle standard date strings', () => {
      const timestamp = 'January 15, 2025 12:00:00';
      const result = normalizeTimestamp(timestamp);

      expect(result).toBeTruthy();
      expect(new Date(result).toISOString()).toBe(result);
    });

    it('should return current timestamp for invalid format', () => {
      const beforeNormalize = new Date().getTime();
      const result = normalizeTimestamp('completely invalid format');
      const afterNormalize = new Date().getTime();

      const resultTime = new Date(result).getTime();
      expect(resultTime).toBeGreaterThanOrEqual(beforeNormalize);
      expect(resultTime).toBeLessThanOrEqual(afterNormalize);
    });
  });

  describe('parseLogFile', () => {
    it('should parse app service logs', () => {
      const content = [
        JSON.stringify({ timestamp: '2025-01-15T10:00:00Z', message: 'Log 1', level: 'info' }),
        JSON.stringify({ timestamp: '2025-01-15T11:00:00Z', message: 'Log 2', level: 'error' }),
        'invalid line',
        JSON.stringify({ timestamp: '2025-01-15T12:00:00Z', message: 'Log 3', level: 'warn' }),
      ].join('\n');

      const result = parseLogFile(content, LogService.APP, 'test.log');

      expect(result).toHaveLength(3);
      expect(result[0].message).toBe('Log 1');
      expect(result[1].message).toBe('Log 2');
      expect(result[2].message).toBe('Log 3');
    });

    it('should filter out invalid app log lines', () => {
      const content = [
        'invalid line 1',
        'invalid line 2',
        JSON.stringify({ timestamp: '2025-01-15T10:00:00Z', message: 'Valid log' }),
      ].join('\n');

      const result = parseLogFile(content, LogService.APP, 'test.log');

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Valid log');
    });

    it('should parse nginx service logs', () => {
      const content = [
        '192.168.1.1 - - [15/Jan/2025:12:00:00 -0500] "GET /api/test HTTP/1.1" 200 1234 "-" "Mozilla"',
        '192.168.1.2 - - [15/Jan/2025:12:01:00 -0500] "POST /api/data HTTP/1.1" 201 512 "-" "curl"',
      ].join('\n');

      const result = parseLogFile(content, LogService.NGINX, 'access.log');

      expect(result).toHaveLength(2);
      expect(result[0].service).toBe(LogService.NGINX);
      expect(result[1].service).toBe(LogService.NGINX);
    });

    it('should parse console service logs', () => {
      const content = [
        '[Jan-15-2025 12:00:00] info (1.0.0): Console log 1',
        '[Jan-15-2025 12:01:00] warn (1.0.0): Console log 2',
      ].join('\n');

      const result = parseLogFile(content, LogService.CONSOLE, 'console.log');

      expect(result).toHaveLength(2);
      expect(result[0].service).toBe(LogService.CONSOLE);
      expect(result[1].service).toBe(LogService.CONSOLE);
    });

    it('should parse console error service logs', () => {
      const content = '[Jul-03-2025 12:49:28] ERROR: Test error';

      const result = parseLogFile(content, LogService.CONSOLE_ERROR, 'error.log');

      expect(result).toHaveLength(1);
      expect(result[0].service).toBe(LogService.CONSOLE_ERROR);
    });

    it('should return empty array for unknown service', () => {
      const content = 'Some log content';
      const result = parseLogFile(content, 'UNKNOWN' as LogService, 'test.log');

      expect(result).toEqual([]);
    });

    it('should handle empty content', () => {
      expect(parseLogFile('', LogService.APP, 'test.log')).toEqual([]);
      expect(parseLogFile('', LogService.NGINX, 'test.log')).toEqual([]);
      expect(parseLogFile('', LogService.CONSOLE, 'test.log')).toEqual([]);
    });

    it('should handle content with only newlines', () => {
      const content = '\n\n\n';
      const result = parseLogFile(content, LogService.APP, 'test.log');

      expect(result).toEqual([]);
    });
  });
});
