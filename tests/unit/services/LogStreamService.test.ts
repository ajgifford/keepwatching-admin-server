import { LogLevel, LogService } from '@ajgifford/keepwatching-types';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LogStreamService } from '@services/LogStreamService';
import { LogFileService } from '@services/LogFileService';
import { Request, Response } from 'express';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('@ajgifford/keepwatching-common-server/logger', () => ({
  cliLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('tail');
jest.mock('@utils/logFilters', () => ({
  determineLogLevel: jest.fn((service: string, logLine: string) => {
    if (service.toLowerCase().includes('error')) return 'ERROR';
    if (logLine.toLowerCase().includes('error')) return 'ERROR';
    if (logLine.toLowerCase().includes('warn')) return 'WARN';
    return 'INFO';
  }),
}));

// Create a mock Tail class that extends EventEmitter
class MockTail extends EventEmitter {
  unwatch = jest.fn();
  constructor(public filePath: string, public options: any) {
    super();
  }
}

// Import Tail to mock it
import { Tail } from 'tail';

describe('LogStreamService', () => {
  let service: LogStreamService;
  let mockLogFileService: jest.Mocked<LogFileService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let writtenData: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    writtenData = [];

    // Create mock LogFileService
    mockLogFileService = {
      getLogPathsConfig: jest.fn(() => ({
        'KeepWatching-App': '/var/log/express/keepwatching-January-15-2025.log',
        'KeepWatching-App-Error': '/var/log/express/keepwatching-error.log',
        'KeepWatching-Console': '/var/log/pm2/keepwatching-api-server-out-0.log',
        nginx: '/var/log/nginx/access.log',
      })),
      getServiceMapping: jest.fn(() => ({
        'KeepWatching-App': LogService.APP,
        'KeepWatching-App-Error': LogService.APP,
        'KeepWatching-Console': LogService.CONSOLE,
        nginx: LogService.NGINX,
      })),
      fileExists: jest.fn(() => true),
      readLogFile: jest.fn(),
      findRotatingLogs: jest.fn(),
      findLatestRotatingLog: jest.fn(),
      getLogFilePaths: jest.fn(),
      getServiceFromLogType: jest.fn(),
    } as any;

    service = new LogStreamService(mockLogFileService);

    // Create mock request with EventEmitter
    const requestEmitter = new EventEmitter();
    mockRequest = Object.assign(requestEmitter, {
      method: 'GET',
      url: '/api/logs/stream',
    });

    // Create mock response
    mockResponse = {
      writeHead: jest.fn(),
      write: jest.fn((data: string) => {
        writtenData.push(data);
        return true;
      }),
      end: jest.fn(),
      statusCode: 200,
    };

    // Mock the Tail constructor
    (Tail as any) = jest.fn((filePath: string, options: any) => {
      return new MockTail(filePath, options);
    });
  });

  describe('streamLogs', () => {
    it('should set correct SSE headers', () => {
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
    });

    it('should create Tail instances for existing log files', () => {
      mockLogFileService.fileExists.mockReturnValue(true);

      service.streamLogs(mockRequest as Request, mockResponse as Response);

      expect(Tail).toHaveBeenCalledTimes(4);
      expect(Tail).toHaveBeenCalledWith(
        '/var/log/express/keepwatching-January-15-2025.log',
        expect.objectContaining({ follow: true })
      );
    });

    it('should send not found entry for missing log files', () => {
      mockLogFileService.fileExists.mockImplementation((path: string) => {
        return !path.includes('nginx');
      });

      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Log file not found');
      expect(writtenContent).toContain('/var/log/nginx/access.log');
    });

    it('should send initial status message with available logs', () => {
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Log streaming started');
      expect(writtenContent).toContain('Available logs:');
    });

    it('should handle file existence check correctly', () => {
      mockLogFileService.fileExists
        .mockReturnValueOnce(true)  // KeepWatching-App
        .mockReturnValueOnce(false) // KeepWatching-App-Error
        .mockReturnValueOnce(true)  // KeepWatching-Console
        .mockReturnValueOnce(false); // nginx

      service.streamLogs(mockRequest as Request, mockResponse as Response);

      // Should create tails only for existing files
      expect(Tail).toHaveBeenCalledTimes(2);
    });

    it('should clean up tails when request closes', () => {
      mockLogFileService.fileExists.mockReturnValue(true);

      service.streamLogs(mockRequest as Request, mockResponse as Response);

      // Get all created tail instances
      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);

      // Trigger close event
      (mockRequest as EventEmitter).emit('close');

      // Verify all tails were unwatched
      tailInstances.forEach((tail: MockTail) => {
        expect(tail.unwatch).toHaveBeenCalled();
      });
    });

    it('should map service names correctly for log not found entries', () => {
      mockLogFileService.fileExists.mockImplementation((path: string) => {
        return path.includes('KeepWatching-App') && !path.includes('Error');
      });

      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const writtenContent = writtenData.join('');
      const entries = writtenContent.split('data: ').filter(d => d.trim());

      // Find the nginx not found entry
      const nginxEntry = entries.find(e => e.includes('nginx'));
      if (nginxEntry) {
        const parsed = JSON.parse(nginxEntry.split('\n\n')[0]);
        expect(parsed.level).toBe(LogLevel.WARN);
      }
    });
  });

  describe('handleLogLine - Complete JSON', () => {
    let mockTail: MockTail;

    beforeEach(() => {
      mockLogFileService.fileExists.mockReturnValue(true);
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      // Get the first tail instance
      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);
      mockTail = tailInstances[0];

      // Clear any initial writes
      writtenData = [];
    });

    it('should process complete JSON log lines', () => {
      const jsonLog = JSON.stringify({ message: 'Test log', level: 'info' });

      mockTail.emit('line', jsonLog);

      const writtenContent = writtenData.join('');
      const dataLines = writtenContent.split('data: ').filter(d => d.trim());
      const logEntry = JSON.parse(dataLines[0].split('\n\n')[0]);

      // The JSON log should be wrapped in a LogEntry with the original JSON as the message
      expect(logEntry.message).toBe(jsonLog);
      expect(logEntry.service).toBe(LogService.APP);
      expect(writtenContent).toContain('data: ');
    });

    it('should send buffered error before processing new JSON', () => {
      // First send an error line to start buffering
      mockTail.emit('line', 'Error: Something went wrong');

      // Wait for buffer timeout would happen here, but we'll send JSON to flush it
      mockTail.emit('line', JSON.stringify({ message: 'New log' }));

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Error: Something went wrong');
      expect(writtenContent).toContain('New log');
    });
  });

  describe('handleLogLine - Error Buffering', () => {
    let mockTail: MockTail;

    beforeEach(() => {
      jest.useFakeTimers();
      mockLogFileService.fileExists.mockReturnValue(true);
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);
      mockTail = tailInstances[0];

      writtenData = [];
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should buffer error start lines', () => {
      mockTail.emit('line', 'TypeError: Cannot read property');

      // Error should not be sent immediately
      expect(writtenData.length).toBe(0);
    });

    it('should buffer stack trace lines with error', () => {
      mockTail.emit('line', 'Error: Test error');
      mockTail.emit('line', '    at Function.test (/path/to/file.js:10:15)');
      mockTail.emit('line', '    at Object.<anonymous> (/path/to/other.js:5:3)');

      // Errors should still be buffering
      expect(writtenData.length).toBe(0);

      // Advance timer to trigger send
      jest.advanceTimersByTime(500);

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Error: Test error');
      expect(writtenContent).toContain('at Function.test');
      expect(writtenContent).toContain('at Object.<anonymous>');
    });

    it('should send buffered error after timeout', () => {
      mockTail.emit('line', 'Error: Timeout test');

      expect(writtenData.length).toBe(0);

      jest.advanceTimersByTime(500);

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Error: Timeout test');
    });

    it('should reset timer when additional stack trace lines arrive', () => {
      mockTail.emit('line', 'Error: Multi-line error');

      jest.advanceTimersByTime(300);
      expect(writtenData.length).toBe(0);

      // Add more stack trace - should reset timer
      mockTail.emit('line', '    at test.js:10:5');

      jest.advanceTimersByTime(300);
      expect(writtenData.length).toBe(0); // Still buffering

      jest.advanceTimersByTime(200); // Total 500ms from last line

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Error: Multi-line error');
      expect(writtenContent).toContain('at test.js:10:5');
    });

    it('should detect various error patterns', () => {
      const errorPatterns = [
        'Error: Standard error',
        'TypeError: Type error',
        'ReferenceError: Reference error',
        'SyntaxError: Syntax error',
        ' Exception: Custom exception',
      ];

      errorPatterns.forEach((pattern) => {
        writtenData = [];
        mockTail.emit('line', pattern);
        expect(writtenData.length).toBe(0); // Should buffer
        jest.advanceTimersByTime(500);
        expect(writtenData.length).toBeGreaterThan(0); // Should send after timeout
      });
    });

    it('should detect stack trace line patterns', () => {
      mockTail.emit('line', 'Error: Test');

      const stackPatterns = [
        '    at someFunction (/path/to/file.js:10:5)',
        '  at node:internal/modules/cjs/loader:1234:15',
        '    {',
        '  code: "MODULE_NOT_FOUND"',
        '  help: "npm install missing-module"',
      ];

      stackPatterns.forEach((pattern) => {
        mockTail.emit('line', pattern);
      });

      // Add closing brace separately to trigger immediate send
      mockTail.emit('line', '    }');

      const writtenContent = writtenData.join('');
      const dataLines = writtenContent.split('data: ').filter(d => d.trim());
      const logEntry = JSON.parse(dataLines[0].split('\n\n')[0]);

      // All patterns should be in the combined message
      stackPatterns.forEach((pattern) => {
        expect(logEntry.message).toContain(pattern);
      });
      expect(logEntry.message).toContain('Error: Test');
    });

    it('should send buffered error when closing brace detected', () => {
      mockTail.emit('line', 'Error: Test error');
      mockTail.emit('line', '  {');
      mockTail.emit('line', '    code: "ERR_TEST"');
      mockTail.emit('line', '  }');

      // Closing brace should trigger immediate send
      const writtenContent = writtenData.join('');
      const dataLines = writtenContent.split('data: ').filter(d => d.trim());
      const logEntry = JSON.parse(dataLines[0].split('\n\n')[0]);

      expect(logEntry.message).toContain('Error: Test error');
      expect(logEntry.message).toContain('code: "ERR_TEST"');
    });

    it('should send previous error when new error starts', () => {
      mockTail.emit('line', 'Error: First error');
      mockTail.emit('line', '    at first.js:10:5');

      // Start new error
      mockTail.emit('line', 'Error: Second error');

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Error: First error');
      expect(writtenContent).toContain('at first.js:10:5');

      // Second error should still be buffering
      expect(writtenContent).not.toContain('Error: Second error');

      jest.advanceTimersByTime(500);

      const finalContent = writtenData.join('');
      expect(finalContent).toContain('Error: Second error');
    });

    it('should send buffered error when non-stack-trace line arrives', () => {
      mockTail.emit('line', 'Error: Buffered error');
      mockTail.emit('line', '    at test.js:5:10');

      // Regular log line should flush buffer
      mockTail.emit('line', 'Regular info log line');

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Error: Buffered error');
      expect(writtenContent).toContain('at test.js:5:10');
      expect(writtenContent).toContain('Regular info log line');
    });

    it('should set error level for buffered errors', () => {
      mockTail.emit('line', 'Error: Test error');

      jest.advanceTimersByTime(500);

      const writtenContent = writtenData.join('');
      const dataLines = writtenContent.split('data: ').filter(d => d.trim());
      const errorEntry = JSON.parse(dataLines[0].split('\n\n')[0]);

      expect(errorEntry.level).toBe(LogLevel.ERROR);
    });
  });

  describe('handleLogLine - Normal Lines', () => {
    let mockTail: MockTail;

    beforeEach(() => {
      mockLogFileService.fileExists.mockReturnValue(true);
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);
      mockTail = tailInstances[0];

      writtenData = [];
    });

    it('should process normal log lines immediately', () => {
      mockTail.emit('line', 'This is a normal log line');

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('This is a normal log line');
      expect(writtenContent).toContain('data: ');
    });

    it('should include service information in log entry', () => {
      mockTail.emit('line', 'Test log');

      const writtenContent = writtenData.join('');
      const dataLines = writtenContent.split('data: ').filter(d => d.trim());
      const logEntry = JSON.parse(dataLines[0].split('\n\n')[0]);

      expect(logEntry.service).toBe(LogService.APP);
    });

    it('should include timestamp in log entry', () => {
      const beforeTime = new Date().toISOString();
      mockTail.emit('line', 'Test log');
      const afterTime = new Date().toISOString();

      const writtenContent = writtenData.join('');
      const dataLines = writtenContent.split('data: ').filter(d => d.trim());
      const logEntry = JSON.parse(dataLines[0].split('\n\n')[0]);

      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.timestamp >= beforeTime).toBe(true);
      expect(logEntry.timestamp <= afterTime).toBe(true);
    });

    it('should include log file basename in entry', () => {
      mockTail.emit('line', 'Test log');

      const writtenContent = writtenData.join('');
      const dataLines = writtenContent.split('data: ').filter(d => d.trim());
      const logEntry = JSON.parse(dataLines[0].split('\n\n')[0]);

      expect(logEntry.logFile).toBe('keepwatching-January-15-2025.log');
    });
  });

  describe('cleanup', () => {
    it('should unwatch all tail instances', () => {
      mockLogFileService.fileExists.mockReturnValue(true);
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);

      (mockRequest as EventEmitter).emit('close');

      tailInstances.forEach((tail: MockTail) => {
        expect(tail.unwatch).toHaveBeenCalled();
      });
    });

    it('should clear all error timers on cleanup', () => {
      jest.useFakeTimers();
      mockLogFileService.fileExists.mockReturnValue(true);
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);

      // Create some error buffers with timers
      tailInstances[0].emit('line', 'Error: Test 1');
      tailInstances[1].emit('line', 'Error: Test 2');

      // Trigger cleanup
      (mockRequest as EventEmitter).emit('close');

      // Advance timers - no errors should be sent after cleanup
      writtenData = [];
      jest.advanceTimersByTime(1000);

      expect(writtenData.length).toBe(0);

      jest.useRealTimers();
    });

    it('should handle errors during tail unwatch', () => {
      mockLogFileService.fileExists.mockReturnValue(true);
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);

      // Make one tail throw an error on unwatch
      tailInstances[0].unwatch.mockImplementation(() => {
        throw new Error('Unwatch failed');
      });

      // Should not throw
      expect(() => {
        (mockRequest as EventEmitter).emit('close');
      }).not.toThrow();

      // Other tails should still be unwatched
      expect(tailInstances[1].unwatch).toHaveBeenCalled();
    });
  });

  describe('Integration - Multiple Services', () => {
    beforeEach(() => {
      mockLogFileService.fileExists.mockReturnValue(true);
    });

    it('should handle logs from multiple services simultaneously', () => {
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);

      writtenData = [];

      // Emit from different services
      tailInstances[0].emit('line', 'App log 1');
      tailInstances[1].emit('line', 'App error log');
      tailInstances[2].emit('line', 'Console log 1');

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('App log 1');
      expect(writtenContent).toContain('App error log');
      expect(writtenContent).toContain('Console log 1');
    });

    it('should maintain separate error buffers per service', () => {
      jest.useFakeTimers();
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);

      writtenData = [];

      // Start errors on different services
      tailInstances[0].emit('line', 'Error: Service 1 error');
      tailInstances[1].emit('line', 'Error: Service 2 error');

      jest.advanceTimersByTime(500);

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Error: Service 1 error');
      expect(writtenContent).toContain('Error: Service 2 error');

      jest.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    let mockTail: MockTail;

    beforeEach(() => {
      mockLogFileService.fileExists.mockReturnValue(true);
      service.streamLogs(mockRequest as Request, mockResponse as Response);

      const tailInstances = (Tail as any).mock.results.map((r: any) => r.value);
      mockTail = tailInstances[0];

      writtenData = [];
    });

    it('should handle empty log lines', () => {
      mockTail.emit('line', '');

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('data: ');
    });

    it('should handle very long log lines', () => {
      const longLine = 'A'.repeat(10000);
      mockTail.emit('line', longLine);

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain(longLine);
    });

    it('should handle malformed JSON', () => {
      mockTail.emit('line', '{invalid json');

      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('{invalid json');
    });

    it('should handle special characters in log lines', () => {
      const specialChars = 'Log with "quotes" and \\backslashes\\ and \nnewlines';
      mockTail.emit('line', specialChars);

      expect(writtenData.length).toBeGreaterThan(0);
    });

    it('should handle rapid successive log lines', () => {
      for (let i = 0; i < 100; i++) {
        mockTail.emit('line', `Log line ${i}`);
      }

      expect(writtenData.length).toBeGreaterThan(0);
      const writtenContent = writtenData.join('');
      expect(writtenContent).toContain('Log line 0');
      expect(writtenContent).toContain('Log line 99');
    });
  });
});
