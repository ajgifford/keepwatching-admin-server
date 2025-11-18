import { LogService } from '@ajgifford/keepwatching-types';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LogFileService } from '@services/LogFileService';
import fs from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('@ajgifford/keepwatching-common-server/config', () => ({
  getExpressLogDir: jest.fn(() => '/var/log/express'),
  getPM2LogDir: jest.fn(() => '/var/log/pm2'),
}));
jest.mock('@ajgifford/keepwatching-common-server/logger', () => ({
  cliLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock('@utils/dateHelpers', () => ({
  getCurrentDate: jest.fn(() => 'January-15-2025'),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('LogFileService', () => {
  let service: LogFileService;

  beforeEach(() => {
    service = new LogFileService();
    jest.clearAllMocks();
  });

  describe('readLogFile', () => {
    it('should read and return file content', () => {
      const mockContent = 'log file content';
      mockFs.accessSync = jest.fn();
      mockFs.readFileSync = jest.fn(() => mockContent as any);

      const result = service.readLogFile('/path/to/log.log');

      expect(result).toBe(mockContent);
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/log.log', 'utf-8');
    });

    it('should return empty string if file does not exist', () => {
      mockFs.accessSync = jest.fn(() => {
        throw new Error('File not found');
      });

      const result = service.readLogFile('/path/to/nonexistent.log');

      expect(result).toBe('');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should return empty string if read fails', () => {
      mockFs.accessSync = jest.fn();
      mockFs.readFileSync = jest.fn(() => {
        throw new Error('Read failed');
      });

      const result = service.readLogFile('/path/to/log.log');

      expect(result).toBe('');
    });
  });

  describe('findRotatingLogs', () => {
    it('should find and sort rotating log files', () => {
      const mockFiles = [
        'keepwatching-January-15-2025.log',
        'keepwatching-January-14-2025.log',
        'keepwatching-January-13-2025.log',
      ];

      mockFs.readdirSync = jest.fn(() => mockFiles as any);
      mockFs.statSync = jest.fn((filePath: any) => {
        const fileName = filePath.split('/').pop();
        const day = parseInt(fileName.match(/\d+/)?.[0] || '0');
        return { mtime: new Date(2025, 0, day) } as any;
      });

      const result = service.findRotatingLogs('/var/log/keepwatching-January-15-2025.log');

      expect(result).toHaveLength(3);
      expect(result[0]).toContain('January-15-2025');
      expect(result[1]).toContain('January-14-2025');
      expect(result[2]).toContain('January-13-2025');
    });

    it('should filter out error log files', () => {
      const mockFiles = [
        'keepwatching-January-15-2025.log',
        'keepwatching-error.log',
        'keepwatching-January-14-2025.log',
      ];

      mockFs.readdirSync = jest.fn(() => mockFiles as any);
      mockFs.statSync = jest.fn(() => ({ mtime: new Date() }) as any);

      const result = service.findRotatingLogs('/var/log/keepwatching-January-15-2025.log');

      expect(result).toHaveLength(2);
      expect(result.some((path) => path.includes('error'))).toBe(false);
    });

    it('should return empty array on error', () => {
      mockFs.readdirSync = jest.fn(() => {
        throw new Error('Directory not found');
      });

      const result = service.findRotatingLogs('/path/to/nonexistent.log');

      expect(result).toEqual([]);
    });

    it('should only include files with matching prefix', () => {
      const mockFiles = [
        'keepwatching-January-15-2025.log',
        'other-app-January-15-2025.log',
        'keepwatching-January-14-2025.log',
      ];

      mockFs.readdirSync = jest.fn(() => mockFiles as any);
      mockFs.statSync = jest.fn(() => ({ mtime: new Date() }) as any);

      const result = service.findRotatingLogs('/var/log/keepwatching-January-15-2025.log');

      expect(result).toHaveLength(2);
      expect(result.every((path) => path.includes('keepwatching'))).toBe(true);
    });
  });

  describe('findLatestRotatingLog', () => {
    it('should return the latest rotating log', () => {
      const mockFiles = ['keepwatching-January-15-2025.log', 'keepwatching-January-14-2025.log'];

      mockFs.readdirSync = jest.fn(() => mockFiles as any);
      mockFs.statSync = jest.fn((filePath: any) => {
        const fileName = filePath.split('/').pop();
        const day = parseInt(fileName.match(/\d+/)?.[0] || '0');
        return { mtime: new Date(2025, 0, day) } as any;
      });

      const result = service.findLatestRotatingLog('/var/log/keepwatching-January-15-2025.log');

      expect(result).toContain('January-15-2025');
    });

    it('should return null if no logs found', () => {
      mockFs.readdirSync = jest.fn(() => [] as any);

      const result = service.findLatestRotatingLog('/var/log/keepwatching-January-15-2025.log');

      expect(result).toBeNull();
    });

    it('should return null on error', () => {
      mockFs.readdirSync = jest.fn(() => {
        throw new Error('Directory not found');
      });

      const result = service.findLatestRotatingLog('/path/to/nonexistent.log');

      expect(result).toBeNull();
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists and is readable', () => {
      mockFs.accessSync = jest.fn();

      const result = service.fileExists('/path/to/existing.log');

      expect(result).toBe(true);
      expect(mockFs.accessSync).toHaveBeenCalledWith('/path/to/existing.log', fs.constants.R_OK);
    });

    it('should return false if file does not exist', () => {
      mockFs.accessSync = jest.fn(() => {
        throw new Error('File not found');
      });

      const result = service.fileExists('/path/to/nonexistent.log');

      expect(result).toBe(false);
    });

    it('should return false if file is not readable', () => {
      mockFs.accessSync = jest.fn(() => {
        throw new Error('Permission denied');
      });

      const result = service.fileExists('/path/to/unreadable.log');

      expect(result).toBe(false);
    });
  });

  describe('getLogFilePaths', () => {
    beforeEach(() => {
      // Setup default mocks for rotating log functionality
      mockFs.readdirSync = jest.fn(() => ['keepwatching-January-15-2025.log'] as any);
      mockFs.statSync = jest.fn(() => ({ mtime: new Date() }) as any);
    });

    it('should return default log file paths', () => {
      const result = service.getLogFilePaths();

      expect(result).toHaveProperty('nginx');
      expect(result).toHaveProperty('KeepWatching-App');
      expect(result).toHaveProperty('KeepWatching-App-Error');
      expect(result).toHaveProperty('KeepWatching-Console');
      expect(result).toHaveProperty('KeepWatching-Console-Error');
    });

    it('should use latest rotating log for KeepWatching-App', () => {
      const mockFiles = ['keepwatching-January-16-2025.log', 'keepwatching-January-15-2025.log'];

      mockFs.readdirSync = jest.fn(() => mockFiles as any);
      mockFs.statSync = jest.fn((filePath: any) => {
        const day = filePath.includes('16') ? 16 : 15;
        return { mtime: new Date(2025, 0, day) } as any;
      });

      const result = service.getLogFilePaths();

      expect(result['KeepWatching-App']).toContain('January-16-2025');
    });

    it('should include additional rotating logs when date filters are provided', () => {
      const mockFiles = [
        'keepwatching-January-15-2025.log',
        'keepwatching-January-14-2025.log',
        'keepwatching-January-13-2025.log',
      ];

      mockFs.readdirSync = jest.fn(() => mockFiles as any);
      mockFs.statSync = jest.fn(() => ({ mtime: new Date() }) as any);

      const result = service.getLogFilePaths({
        startDate: '2025-01-13T00:00:00Z',
        endDate: '2025-01-15T23:59:59Z',
      });

      expect(result).toHaveProperty('KeepWatching-App-1');
      expect(result).toHaveProperty('KeepWatching-App-2');
    });

    it('should not include additional rotating logs without date filters', () => {
      const mockFiles = ['keepwatching-January-15-2025.log', 'keepwatching-January-14-2025.log'];

      mockFs.readdirSync = jest.fn(() => mockFiles as any);
      mockFs.statSync = jest.fn(() => ({ mtime: new Date() }) as any);

      const result = service.getLogFilePaths();

      expect(result).not.toHaveProperty('KeepWatching-App-1');
    });
  });

  describe('getServiceFromLogType', () => {
    it('should return correct service for log type', () => {
      expect(service.getServiceFromLogType('KeepWatching-App')).toBe(LogService.APP);
      expect(service.getServiceFromLogType('KeepWatching-App-Error')).toBe(LogService.APP);
      expect(service.getServiceFromLogType('nginx')).toBe(LogService.NGINX);
      expect(service.getServiceFromLogType('KeepWatching-Console')).toBe(LogService.CONSOLE);
      expect(service.getServiceFromLogType('KeepWatching-Console-Error')).toBe(LogService.CONSOLE_ERROR);
    });

    it('should strip numeric suffix from log type', () => {
      expect(service.getServiceFromLogType('KeepWatching-App-1')).toBe(LogService.APP);
      expect(service.getServiceFromLogType('KeepWatching-App-2')).toBe(LogService.APP);
      expect(service.getServiceFromLogType('KeepWatching-App-123')).toBe(LogService.APP);
    });

    it('should return SYSTEM for unknown log type', () => {
      expect(service.getServiceFromLogType('unknown-log-type')).toBe(LogService.SYSTEM);
    });
  });

  describe('getLogPathsConfig', () => {
    it('should return a copy of log paths configuration', () => {
      const result = service.getLogPathsConfig();

      expect(result).toHaveProperty('nginx');
      expect(result).toHaveProperty('KeepWatching-App');
      expect(result).toHaveProperty('KeepWatching-App-Error');
    });

    it('should return a new object (not the same reference)', () => {
      const result1 = service.getLogPathsConfig();
      const result2 = service.getLogPathsConfig();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe('getServiceMapping', () => {
    it('should return service mapping configuration', () => {
      const result = service.getServiceMapping();

      expect(result['KeepWatching-App']).toBe(LogService.APP);
      expect(result['nginx']).toBe(LogService.NGINX);
      expect(result['KeepWatching-Console']).toBe(LogService.CONSOLE);
    });

    it('should return a new object (not the same reference)', () => {
      const result1 = service.getServiceMapping();
      const result2 = service.getServiceMapping();

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });
});
