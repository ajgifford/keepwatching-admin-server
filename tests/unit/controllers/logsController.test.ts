import { getLogs } from '@controllers/logsController';
import { cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock cliLogger to suppress output during tests
jest.mock('@ajgifford/keepwatching-common-server/logger', () => ({
  cliLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('LogsController', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = {
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('getLogs', () => {
    it('should return logs with filters', async () => {
      req.query = {
        service: 'app',
        level: 'error',
        limit: '100',
      };

      await getLogs(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
    });

    it('should handle missing query parameters', async () => {
      req.query = {};

      await getLogs(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
    });

    it('should log when log files do not exist', async () => {
      req.query = { limit: '10' };

      await getLogs(req, res, next);

      // Should log for each missing log file
      expect(cliLogger.info).toHaveBeenCalled();
      const logCalls = (cliLogger.info as jest.Mock).mock.calls;

      // Check that it logged "File does not exist" messages
      const fileNotExistCalls = logCalls.filter((call) => call[0] === 'File does not exist');
      expect(fileNotExistCalls.length).toBeGreaterThan(0);

      // Validate that each call includes a file path
      fileNotExistCalls.forEach((call) => {
        expect(call[1]).toBeTruthy();
        expect(typeof call[1]).toBe('string');
      });
    });

    it('should return filtered logs based on service', async () => {
      req.query = {
        service: 'nginx',
        limit: '50',
      };

      await getLogs(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
    });

    it('should apply limit to returned logs', async () => {
      req.query = {
        limit: '5',
      };

      await getLogs(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeLessThanOrEqual(5);
    });

    it('should handle errors and pass to next middleware', async () => {
      // Force an error by passing invalid query that would cause parsing issues
      const errorReq: any = {
        get query() {
          throw new Error('Query parsing failed');
        },
      };

      await getLogs(errorReq, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Query parsing failed');
    });
  });
});
