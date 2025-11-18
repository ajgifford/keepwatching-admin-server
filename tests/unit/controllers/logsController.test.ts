import { logFileService } from '../../../src/services/LogFileService';
import { logStreamService } from '../../../src/services/LogStreamService';
import { filterLogs } from '../../../src/utils/logFilters';
import { parseLogFile } from '../../../src/utils/logParsers';
import { LogEntry, LogLevel, LogService } from '@ajgifford/keepwatching-types';
import { getLogs, streamLogs } from '@controllers/logsController';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/services/LogFileService', () => ({
  logFileService: {
    getLogFilePaths: jest.fn(),
    readLogFile: jest.fn(),
    getServiceFromLogType: jest.fn(),
  },
}));

jest.mock('../../../src/services/LogStreamService', () => ({
  logStreamService: {
    streamLogs: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logParsers', () => ({
  parseLogFile: jest.fn(),
}));

jest.mock('../../../src/utils/logFilters', () => ({
  filterLogs: jest.fn(),
}));

jest.mock('@ajgifford/keepwatching-common-server/logger', () => ({
  cliLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockLogFileService = logFileService as jest.Mocked<typeof logFileService>;
const mockLogStreamService = logStreamService as jest.Mocked<typeof logStreamService>;
const mockParseLogFile = parseLogFile as jest.MockedFunction<typeof parseLogFile>;
const mockFilterLogs = filterLogs as jest.MockedFunction<typeof filterLogs>;

describe('LogsController', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = {
      query: {},
      on: jest.fn(),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      writeHead: jest.fn(),
      write: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('getLogs', () => {
    const mockLogs: LogEntry[] = [
      {
        timestamp: '2025-01-15T12:00:00Z',
        service: LogService.APP,
        level: LogLevel.INFO,
        message: 'Test log 1',
        logFile: 'app.log',
      },
      {
        timestamp: '2025-01-15T11:00:00Z',
        service: LogService.APP,
        level: LogLevel.ERROR,
        message: 'Test log 2',
        logFile: 'app.log',
      },
    ];

    beforeEach(() => {
      mockLogFileService.getLogFilePaths.mockReturnValue({
        'KeepWatching-App': '/var/log/app.log',
        nginx: '/var/log/nginx/access.log',
      });
      mockLogFileService.readLogFile.mockReturnValue('log file content');
      mockLogFileService.getServiceFromLogType.mockReturnValue(LogService.APP);
      mockParseLogFile.mockReturnValue(mockLogs);
      mockFilterLogs.mockReturnValue(mockLogs);
    });

    it('should return filtered logs', async () => {
      req.query = {
        service: LogService.APP,
        level: LogLevel.ERROR,
        limit: '100',
      };

      await getLogs(req, res, next);

      expect(res.json).toHaveBeenCalledWith(mockLogs);
      expect(mockLogFileService.getLogFilePaths).toHaveBeenCalled();
      expect(mockFilterLogs).toHaveBeenCalled();
    });

    it('should handle missing query parameters', async () => {
      req.query = {};

      await getLogs(req, res, next);

      expect(res.json).toHaveBeenCalled();
      expect(mockLogFileService.getLogFilePaths).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should parse query limit as integer', async () => {
      req.query = { limit: '50' };

      await getLogs(req, res, next);

      expect(mockLogFileService.getLogFilePaths).toHaveBeenCalledWith({
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should pass date filters to getLogFilePaths', async () => {
      req.query = {
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-15T23:59:59Z',
      };

      await getLogs(req, res, next);

      expect(mockLogFileService.getLogFilePaths).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2025-01-15T00:00:00Z',
          endDate: '2025-01-15T23:59:59Z',
        }),
      );
    });

    it('should read all log files returned by getLogFilePaths', async () => {
      mockLogFileService.getLogFilePaths.mockReturnValue({
        'KeepWatching-App': '/var/log/app1.log',
        'KeepWatching-App-1': '/var/log/app2.log',
        nginx: '/var/log/nginx.log',
      });

      await getLogs(req, res, next);

      expect(mockLogFileService.readLogFile).toHaveBeenCalledTimes(3);
      expect(mockLogFileService.readLogFile).toHaveBeenCalledWith('/var/log/app1.log');
      expect(mockLogFileService.readLogFile).toHaveBeenCalledWith('/var/log/app2.log');
      expect(mockLogFileService.readLogFile).toHaveBeenCalledWith('/var/log/nginx.log');
    });

    it('should skip empty log files', async () => {
      mockLogFileService.getLogFilePaths.mockReturnValue({
        'KeepWatching-App': '/var/log/app.log',
        nginx: '/var/log/nginx.log',
      });
      mockLogFileService.readLogFile.mockImplementation((path) => {
        return path === '/var/log/app.log' ? 'content' : '';
      });

      await getLogs(req, res, next);

      expect(mockParseLogFile).toHaveBeenCalledTimes(1);
      expect(mockParseLogFile).toHaveBeenCalledWith('content', LogService.APP, '/var/log/app.log');
    });

    it('should parse logs with correct service type', async () => {
      mockLogFileService.getLogFilePaths.mockReturnValue({
        'KeepWatching-App': '/var/log/app.log',
      });
      mockLogFileService.getServiceFromLogType.mockReturnValue(LogService.APP);

      await getLogs(req, res, next);

      expect(mockLogFileService.getServiceFromLogType).toHaveBeenCalledWith('KeepWatching-App');
      expect(mockParseLogFile).toHaveBeenCalledWith('log file content', LogService.APP, '/var/log/app.log');
    });

    it('should concatenate logs from multiple files', async () => {
      mockLogFileService.getLogFilePaths.mockReturnValue({
        'KeepWatching-App': '/var/log/app.log',
        nginx: '/var/log/nginx.log',
      });

      const appLogs: LogEntry[] = [
        {
          timestamp: '2025-01-15T12:00:00Z',
          service: LogService.APP,
          level: LogLevel.INFO,
          message: 'App log',
          logFile: 'app.log',
        },
      ];

      const nginxLogs: LogEntry[] = [
        {
          timestamp: '2025-01-15T11:00:00Z',
          service: LogService.NGINX,
          level: LogLevel.INFO,
          message: 'Nginx log',
          logFile: 'nginx.log',
        },
      ];

      mockParseLogFile.mockImplementation((content, service) => {
        return service === LogService.APP ? appLogs : nginxLogs;
      });

      mockLogFileService.getServiceFromLogType.mockImplementation((type) => {
        return type === 'KeepWatching-App' ? LogService.APP : LogService.NGINX;
      });

      mockFilterLogs.mockImplementation((logs) => logs);

      await getLogs(req, res, next);

      const filterLogsCall = mockFilterLogs.mock.calls[0][0];
      expect(filterLogsCall).toHaveLength(2);
    });

    it('should apply filters to concatenated logs', async () => {
      const filters = {
        service: LogService.APP,
        level: LogLevel.ERROR,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-15T23:59:59Z',
        searchTerm: 'error',
        limit: 50,
      };

      req.query = {
        service: filters.service,
        level: filters.level,
        startDate: filters.startDate,
        endDate: filters.endDate,
        searchTerm: filters.searchTerm,
        limit: '50',
      };

      await getLogs(req, res, next);

      expect(mockFilterLogs).toHaveBeenCalledWith(expect.any(Array), filters);
    });

    it('should return filtered results in response', async () => {
      const filteredLogs: LogEntry[] = [mockLogs[0]];
      mockFilterLogs.mockReturnValue(filteredLogs);

      await getLogs(req, res, next);

      expect(res.json).toHaveBeenCalledWith(filteredLogs);
    });

    it('should handle errors and pass to next middleware', async () => {
      const error = new Error('Service error');
      mockLogFileService.getLogFilePaths.mockImplementation(() => {
        throw error;
      });

      await getLogs(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle errors from parseLogFile', async () => {
      const error = new Error('Parse error');
      mockParseLogFile.mockImplementation(() => {
        throw error;
      });

      await getLogs(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle errors from filterLogs', async () => {
      const error = new Error('Filter error');
      mockFilterLogs.mockImplementation(() => {
        throw error;
      });

      await getLogs(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should return empty array when no logs match filters', async () => {
      mockFilterLogs.mockReturnValue([]);

      await getLogs(req, res, next);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('streamLogs', () => {
    it('should delegate to logStreamService', async () => {
      await streamLogs(req, res, next);

      expect(mockLogStreamService.streamLogs).toHaveBeenCalledWith(req, res);
    });

    it('should pass request and response objects', async () => {
      const customReq = { ...req, customField: 'test' };
      const customRes = { ...res, customField: 'test' };

      await streamLogs(customReq, customRes, next);

      expect(mockLogStreamService.streamLogs).toHaveBeenCalledWith(customReq, customRes);
    });
  });
});
