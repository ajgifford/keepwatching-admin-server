import {
  getPlatformOverview,
  getPlatformTrends,
  getAccountRankings,
  getAccountHealthMetrics,
  getAccountHealth,
  getContentPopularity,
  getTrendingContent,
  getContentEngagement,
  getAdminDashboard,
} from '@controllers/adminStatisticsController';
import { adminStatisticsService } from '@ajgifford/keepwatching-common-server/services';
import { beforeEach, describe, expect, it } from '@jest/globals';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  adminStatisticsService: {
    getPlatformOverview: jest.fn(),
    getPlatformTrends: jest.fn(),
    getAccountRankings: jest.fn(),
    getAccountHealthMetrics: jest.fn(),
    getAccountHealth: jest.fn(),
    getContentPopularity: jest.fn(),
    getTrendingContent: jest.fn(),
    getContentEngagement: jest.fn(),
    getAdminDashboard: jest.fn(),
  },
}));

describe('AdminStatisticsController', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('getPlatformOverview', () => {
    it('should return platform overview statistics', async () => {
      const mockOverview = { totalAccounts: 100, totalProfiles: 250, totalShows: 500 };
      (adminStatisticsService.getPlatformOverview as jest.Mock).mockResolvedValue(mockOverview);

      await getPlatformOverview(req, res, next);

      expect(adminStatisticsService.getPlatformOverview).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved platform overview',
        results: mockOverview,
      });
    });
  });

  describe('getPlatformTrends', () => {
    it('should return platform trends with default days', async () => {
      const mockTrends = { growth: 5.2, activeUsers: 80 };
      (adminStatisticsService.getPlatformTrends as jest.Mock).mockResolvedValue(mockTrends);

      req.query = {};

      await getPlatformTrends(req, res, next);

      expect(adminStatisticsService.getPlatformTrends).toHaveBeenCalledWith(30);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return platform trends with custom days', async () => {
      const mockTrends = { growth: 10.5, activeUsers: 90 };
      (adminStatisticsService.getPlatformTrends as jest.Mock).mockResolvedValue(mockTrends);

      req.query = { days: '7' };

      await getPlatformTrends(req, res, next);

      expect(adminStatisticsService.getPlatformTrends).toHaveBeenCalledWith(7);
    });
  });

  describe('getAccountRankings', () => {
    it('should return account rankings with default parameters', async () => {
      const mockRankings = [
        { accountId: 1, score: 95 },
        { accountId: 2, score: 88 },
      ];
      (adminStatisticsService.getAccountRankings as jest.Mock).mockResolvedValue(mockRankings);

      req.query = {};

      await getAccountRankings(req, res, next);

      expect(adminStatisticsService.getAccountRankings).toHaveBeenCalledWith('engagement', 50);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return account rankings with custom metric and limit', async () => {
      const mockRankings = [{ accountId: 1, hoursWatched: 500 }];
      (adminStatisticsService.getAccountRankings as jest.Mock).mockResolvedValue(mockRankings);

      req.query = { metric: 'hoursWatched', limit: '10' };

      await getAccountRankings(req, res, next);

      expect(adminStatisticsService.getAccountRankings).toHaveBeenCalledWith('hoursWatched', 10);
    });
  });

  describe('getAccountHealthMetrics', () => {
    it('should return all account health metrics', async () => {
      const mockMetrics = {
        activeAccounts: 85,
        inactiveAccounts: 15,
        atRiskAccounts: 5,
      };
      (adminStatisticsService.getAccountHealthMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      await getAccountHealthMetrics(req, res, next);

      expect(adminStatisticsService.getAccountHealthMetrics).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account health metrics',
        results: mockMetrics,
      });
    });
  });

  describe('getAccountHealth', () => {
    it('should return specific account health', async () => {
      const mockHealth = {
        accountId: 1,
        status: 'active',
        lastActivity: '2025-01-15',
        engagementScore: 85,
      };
      (adminStatisticsService.getAccountHealth as jest.Mock).mockResolvedValue(mockHealth);

      req.params = { accountId: '1' };

      await getAccountHealth(req, res, next);

      expect(adminStatisticsService.getAccountHealth).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account health',
        results: mockHealth,
      });
    });
  });

  describe('getContentPopularity', () => {
    it('should return popular content with default parameters', async () => {
      const mockContent = [
        { contentId: 1, title: 'Popular Show', views: 1000 },
        { contentId: 2, title: 'Popular Movie', views: 850 },
      ];
      (adminStatisticsService.getContentPopularity as jest.Mock).mockResolvedValue(mockContent);

      req.query = {};

      await getContentPopularity(req, res, next);

      expect(adminStatisticsService.getContentPopularity).toHaveBeenCalledWith('all', 20);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved popular content',
        results: mockContent,
      });
    });

    it('should return popular content with custom type and limit', async () => {
      const mockContent = [{ contentId: 1, title: 'Popular Show', views: 1000 }];
      (adminStatisticsService.getContentPopularity as jest.Mock).mockResolvedValue(mockContent);

      req.query = { type: 'show', limit: '10' };

      await getContentPopularity(req, res, next);

      expect(adminStatisticsService.getContentPopularity).toHaveBeenCalledWith('show', 10);
    });
  });

  describe('getTrendingContent', () => {
    it('should return trending content with default days', async () => {
      const mockTrending = [
        { contentId: 5, title: 'Trending Now', recentViews: 500 },
        { contentId: 8, title: 'Rising Star', recentViews: 450 },
      ];
      (adminStatisticsService.getTrendingContent as jest.Mock).mockResolvedValue(mockTrending);

      req.query = {};

      await getTrendingContent(req, res, next);

      expect(adminStatisticsService.getTrendingContent).toHaveBeenCalledWith(30);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved trending content',
        results: mockTrending,
      });
    });

    it('should return trending content with custom days', async () => {
      const mockTrending = [{ contentId: 5, title: 'Hot This Week', recentViews: 300 }];
      (adminStatisticsService.getTrendingContent as jest.Mock).mockResolvedValue(mockTrending);

      req.query = { days: '7' };

      await getTrendingContent(req, res, next);

      expect(adminStatisticsService.getTrendingContent).toHaveBeenCalledWith(7);
    });
  });

  describe('getContentEngagement', () => {
    it('should return content engagement with default type', async () => {
      const mockEngagement = {
        contentId: 123,
        totalViews: 5000,
        uniqueViewers: 450,
        avgRating: 4.5,
      };
      (adminStatisticsService.getContentEngagement as jest.Mock).mockResolvedValue(mockEngagement);

      req.params = { contentId: '123' };
      req.query = {};

      await getContentEngagement(req, res, next);

      expect(adminStatisticsService.getContentEngagement).toHaveBeenCalledWith(123, 'show');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved content engagement',
        results: mockEngagement,
      });
    });

    it('should return content engagement with custom type', async () => {
      const mockEngagement = {
        contentId: 456,
        totalViews: 3000,
        uniqueViewers: 280,
      };
      (adminStatisticsService.getContentEngagement as jest.Mock).mockResolvedValue(mockEngagement);

      req.params = { contentId: '456' };
      req.query = { type: 'movie' };

      await getContentEngagement(req, res, next);

      expect(adminStatisticsService.getContentEngagement).toHaveBeenCalledWith(456, 'movie');
    });
  });

  describe('getAdminDashboard', () => {
    it('should return combined admin dashboard statistics', async () => {
      const mockDashboard = {
        overview: {},
        trends: {},
        popularContent: [],
      };
      (adminStatisticsService.getAdminDashboard as jest.Mock).mockResolvedValue(mockDashboard);

      await getAdminDashboard(req, res, next);

      expect(adminStatisticsService.getAdminDashboard).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved admin dashboard',
        results: mockDashboard,
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors via next middleware', async () => {
      const error = new Error('Service error');
      (adminStatisticsService.getPlatformOverview as jest.Mock).mockRejectedValue(error);

      await getPlatformOverview(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
