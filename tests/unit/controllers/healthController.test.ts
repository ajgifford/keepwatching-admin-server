import { healthService } from '@ajgifford/keepwatching-common-server/services';
import {
  archiveDailyPerformance,
  getArchiveLogs,
  getArchiveStatistics,
  getDBHealth,
  getDBQueryHistory,
  getDBQueryStats,
  getHistoricalPerformanceTrends,
  getHistoricalSlowestQueries,
  getPerformanceOverview,
} from '@controllers/healthController';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  healthService: {
    getDatabaseHealth: jest.fn(),
    getQueryStats: jest.fn(),
    getQueryHistory: jest.fn(),
    getHistoricalPerformanceTrends: jest.fn(),
    getHistoricalSlowestQueries: jest.fn(),
    getArchiveLogs: jest.fn(),
    getArchiveStatistics: jest.fn(),
    getPerformanceOverview: jest.fn(),
    archiveDailyPerformanceNow: jest.fn(),
  },
}));

describe('HealthController', () => {
  let req: any, res: any, next: jest.Mock<any, any>;

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

  describe('getDBHealth', () => {
    it('should return database health status', async () => {
      const mockDbHealth = {
        status: 'healthy',
        connected: true,
        responseTime: 10,
      };

      (healthService.getDatabaseHealth as jest.Mock).mockResolvedValue(mockDbHealth);

      await getDBHealth(req, res, next);

      expect(healthService.getDatabaseHealth).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDbHealth);
    });

    it('should handle database health check errors', async () => {
      const error = new Error('Database connection failed');
      (healthService.getDatabaseHealth as jest.Mock).mockRejectedValue(error);

      await getDBHealth(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle database timeout errors', async () => {
      const error = new Error('Connection timeout');
      (healthService.getDatabaseHealth as jest.Mock).mockRejectedValue(error);

      await getDBHealth(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getDBQueryStats', () => {
    it('should return query statistics without limit', async () => {
      const mockStats = [
        { queryName: 'SELECT_USER', avgDuration: 50, count: 100 },
        { queryName: 'INSERT_LOG', avgDuration: 25, count: 200 },
      ];

      (healthService.getQueryStats as jest.Mock).mockResolvedValue(mockStats);

      await getDBQueryStats(req, res, next);

      expect(healthService.getQueryStats).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    it('should return query statistics with limit', async () => {
      req.query = { limit: '10' };
      const mockStats = [{ queryName: 'SELECT_USER', avgDuration: 50, count: 100 }];

      (healthService.getQueryStats as jest.Mock).mockResolvedValue(mockStats);

      await getDBQueryStats(req, res, next);

      expect(healthService.getQueryStats).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch query stats');
      (healthService.getQueryStats as jest.Mock).mockRejectedValue(error);

      await getDBQueryStats(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getDBQueryHistory', () => {
    it('should return query history for a specific query', async () => {
      req.query = { queryName: 'SELECT_USER', limit: '50' };
      const mockHistory = [
        { timestamp: '2025-01-01T00:00:00Z', duration: 45 },
        { timestamp: '2025-01-01T01:00:00Z', duration: 55 },
      ];

      (healthService.getQueryHistory as jest.Mock).mockResolvedValue(mockHistory);

      await getDBQueryHistory(req, res, next);

      expect(healthService.getQueryHistory).toHaveBeenCalledWith('SELECT_USER', 50);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });

    it('should return query history without limit', async () => {
      req.query = { queryName: 'SELECT_USER' };
      const mockHistory = [{ timestamp: '2025-01-01T00:00:00Z', duration: 45 }];

      (healthService.getQueryHistory as jest.Mock).mockResolvedValue(mockHistory);

      await getDBQueryHistory(req, res, next);

      expect(healthService.getQueryHistory).toHaveBeenCalledWith('SELECT_USER', undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });

    it('should return 400 when queryName is missing', async () => {
      req.query = {};

      await getDBQueryHistory(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'queryName query parameter is required' });
      expect(healthService.getQueryHistory).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = { queryName: 'SELECT_USER' };
      const error = new Error('Failed to fetch query history');
      (healthService.getQueryHistory as jest.Mock).mockRejectedValue(error);

      await getDBQueryHistory(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getHistoricalPerformanceTrends', () => {
    it('should return performance trends for valid parameters', async () => {
      req.query = {
        queryHash: 'abc123',
        startDate: '2025-01-01',
        endDate: '2025-01-07',
      };
      const mockTrends = [
        { date: '2025-01-01', avgDuration: 50, maxDuration: 100 },
        { date: '2025-01-02', avgDuration: 55, maxDuration: 110 },
      ];

      (healthService.getHistoricalPerformanceTrends as jest.Mock).mockResolvedValue(mockTrends);

      await getHistoricalPerformanceTrends(req, res, next);

      expect(healthService.getHistoricalPerformanceTrends).toHaveBeenCalledWith(
        'abc123',
        new Date('2025-01-01'),
        new Date('2025-01-07'),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTrends);
    });

    it('should return 400 when queryHash is missing', async () => {
      req.query = { startDate: '2025-01-01', endDate: '2025-01-07' };

      await getHistoricalPerformanceTrends(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'queryHash query parameter is required' });
      expect(healthService.getHistoricalPerformanceTrends).not.toHaveBeenCalled();
    });

    it('should return 400 when startDate is missing', async () => {
      req.query = { queryHash: 'abc123', endDate: '2025-01-07' };

      await getHistoricalPerformanceTrends(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'startDate query parameter is required' });
      expect(healthService.getHistoricalPerformanceTrends).not.toHaveBeenCalled();
    });

    it('should return 400 when endDate is missing', async () => {
      req.query = { queryHash: 'abc123', startDate: '2025-01-01' };

      await getHistoricalPerformanceTrends(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'endDate query parameter is required' });
      expect(healthService.getHistoricalPerformanceTrends).not.toHaveBeenCalled();
    });

    it('should return 400 when startDate format is invalid', async () => {
      req.query = { queryHash: 'abc123', startDate: 'invalid-date', endDate: '2025-01-07' };

      await getHistoricalPerformanceTrends(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid startDate format' });
      expect(healthService.getHistoricalPerformanceTrends).not.toHaveBeenCalled();
    });

    it('should return 400 when endDate format is invalid', async () => {
      req.query = { queryHash: 'abc123', startDate: '2025-01-01', endDate: 'invalid-date' };

      await getHistoricalPerformanceTrends(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid endDate format' });
      expect(healthService.getHistoricalPerformanceTrends).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = { queryHash: 'abc123', startDate: '2025-01-01', endDate: '2025-01-07' };
      const error = new Error('Failed to fetch trends');
      (healthService.getHistoricalPerformanceTrends as jest.Mock).mockRejectedValue(error);

      await getHistoricalPerformanceTrends(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getHistoricalSlowestQueries', () => {
    it('should return slowest queries for valid date range', async () => {
      req.query = { startDate: '2025-01-01', endDate: '2025-01-07', limit: '10' };
      const mockQueries = [
        { queryName: 'SLOW_QUERY_1', avgDuration: 500 },
        { queryName: 'SLOW_QUERY_2', avgDuration: 450 },
      ];

      (healthService.getHistoricalSlowestQueries as jest.Mock).mockResolvedValue(mockQueries);

      await getHistoricalSlowestQueries(req, res, next);

      expect(healthService.getHistoricalSlowestQueries).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        new Date('2025-01-07'),
        10,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockQueries);
    });

    it('should return slowest queries without limit', async () => {
      req.query = { startDate: '2025-01-01', endDate: '2025-01-07' };
      const mockQueries = [{ queryName: 'SLOW_QUERY_1', avgDuration: 500 }];

      (healthService.getHistoricalSlowestQueries as jest.Mock).mockResolvedValue(mockQueries);

      await getHistoricalSlowestQueries(req, res, next);

      expect(healthService.getHistoricalSlowestQueries).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        new Date('2025-01-07'),
        undefined,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockQueries);
    });

    it('should return 400 when startDate is missing', async () => {
      req.query = { endDate: '2025-01-07' };

      await getHistoricalSlowestQueries(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'startDate query parameter is required' });
      expect(healthService.getHistoricalSlowestQueries).not.toHaveBeenCalled();
    });

    it('should return 400 when endDate is missing', async () => {
      req.query = { startDate: '2025-01-01' };

      await getHistoricalSlowestQueries(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'endDate query parameter is required' });
      expect(healthService.getHistoricalSlowestQueries).not.toHaveBeenCalled();
    });

    it('should return 400 when startDate format is invalid', async () => {
      req.query = { startDate: 'invalid-date', endDate: '2025-01-07' };

      await getHistoricalSlowestQueries(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid startDate format' });
      expect(healthService.getHistoricalSlowestQueries).not.toHaveBeenCalled();
    });

    it('should return 400 when endDate format is invalid', async () => {
      req.query = { startDate: '2025-01-01', endDate: 'invalid-date' };

      await getHistoricalSlowestQueries(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid endDate format' });
      expect(healthService.getHistoricalSlowestQueries).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = { startDate: '2025-01-01', endDate: '2025-01-07' };
      const error = new Error('Failed to fetch slowest queries');
      (healthService.getHistoricalSlowestQueries as jest.Mock).mockRejectedValue(error);

      await getHistoricalSlowestQueries(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getArchiveLogs', () => {
    it('should return archive logs without limit', async () => {
      const mockLogs = [
        { id: 1, executedAt: '2025-01-01T00:00:00Z', recordsArchived: 1000 },
        { id: 2, executedAt: '2025-01-02T00:00:00Z', recordsArchived: 1500 },
      ];

      (healthService.getArchiveLogs as jest.Mock).mockResolvedValue(mockLogs);

      await getArchiveLogs(req, res, next);

      expect(healthService.getArchiveLogs).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockLogs);
    });

    it('should return archive logs with limit', async () => {
      req.query = { limit: '5' };
      const mockLogs = [{ id: 1, executedAt: '2025-01-01T00:00:00Z', recordsArchived: 1000 }];

      (healthService.getArchiveLogs as jest.Mock).mockResolvedValue(mockLogs);

      await getArchiveLogs(req, res, next);

      expect(healthService.getArchiveLogs).toHaveBeenCalledWith(5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockLogs);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch archive logs');
      (healthService.getArchiveLogs as jest.Mock).mockRejectedValue(error);

      await getArchiveLogs(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getArchiveStatistics', () => {
    it('should return archive statistics without days parameter', async () => {
      const mockStats = {
        totalRecords: 10000,
        avgDuration: 250,
        oldestRecord: '2025-01-01',
      };

      (healthService.getArchiveStatistics as jest.Mock).mockResolvedValue(mockStats);

      await getArchiveStatistics(req, res, next);

      expect(healthService.getArchiveStatistics).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    it('should return archive statistics with days parameter', async () => {
      req.query = { days: '30' };
      const mockStats = {
        totalRecords: 5000,
        avgDuration: 200,
        oldestRecord: '2025-01-01',
      };

      (healthService.getArchiveStatistics as jest.Mock).mockResolvedValue(mockStats);

      await getArchiveStatistics(req, res, next);

      expect(healthService.getArchiveStatistics).toHaveBeenCalledWith(30);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch archive statistics');
      (healthService.getArchiveStatistics as jest.Mock).mockRejectedValue(error);

      await getArchiveStatistics(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getPerformanceOverview', () => {
    it('should return performance overview without days parameter', async () => {
      const mockOverview = {
        currentStats: { totalQueries: 1000, avgDuration: 100 },
        historicalStats: { totalQueries: 50000, avgDuration: 95 },
        trends: [],
      };

      (healthService.getPerformanceOverview as jest.Mock).mockResolvedValue(mockOverview);

      await getPerformanceOverview(req, res, next);

      expect(healthService.getPerformanceOverview).toHaveBeenCalledWith(undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockOverview);
    });

    it('should return performance overview with days parameter', async () => {
      req.query = { days: '14' };
      const mockOverview = {
        currentStats: { totalQueries: 500, avgDuration: 110 },
        historicalStats: { totalQueries: 10000, avgDuration: 100 },
        trends: [],
      };

      (healthService.getPerformanceOverview as jest.Mock).mockResolvedValue(mockOverview);

      await getPerformanceOverview(req, res, next);

      expect(healthService.getPerformanceOverview).toHaveBeenCalledWith(14);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockOverview);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to fetch performance overview');
      (healthService.getPerformanceOverview as jest.Mock).mockRejectedValue(error);

      await getPerformanceOverview(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('archiveDailyPerformance', () => {
    it('should trigger daily performance archiving', async () => {
      (healthService.archiveDailyPerformanceNow as jest.Mock).mockResolvedValue(undefined);

      await archiveDailyPerformance(req, res, next);

      expect(healthService.archiveDailyPerformanceNow).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to archive performance data');
      (healthService.archiveDailyPerformanceNow as jest.Mock).mockRejectedValue(error);

      await archiveDailyPerformance(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
