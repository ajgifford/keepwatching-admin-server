import {
  getAccountStatistics,
  getAccountWatchingVelocity,
  getAccountActivityTimeline,
  getAccountBingeWatchingStats,
  getAccountWatchStreakStats,
  getAccountTimeToWatchStats,
  getAccountSeasonalViewingStats,
  getAccountMilestoneStats,
  getAccountContentDepthStats,
  getAccountContentDiscoveryStats,
  getAccountAbandonmentRiskStats,
  getAccountUnairedContentStats,
  getProfileComparison,
} from '@controllers/accountStatisticsController';
import { accountStatisticsService } from '@ajgifford/keepwatching-common-server/services';
import { beforeEach, describe, expect, it } from '@jest/globals';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  accountStatisticsService: {
    getAccountStatistics: jest.fn(),
    getAccountWatchingVelocity: jest.fn(),
    getAccountActivityTimeline: jest.fn(),
    getAccountBingeWatchingStats: jest.fn(),
    getAccountWatchStreakStats: jest.fn(),
    getAccountTimeToWatchStats: jest.fn(),
    getAccountSeasonalViewingStats: jest.fn(),
    getAccountMilestoneStats: jest.fn(),
    getAccountContentDepthStats: jest.fn(),
    getAccountContentDiscoveryStats: jest.fn(),
    getAccountAbandonmentRiskStats: jest.fn(),
    getAccountUnairedContentStats: jest.fn(),
    getProfileComparison: jest.fn(),
  },
}));

describe('AccountStatisticsController', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = {
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('getAccountStatistics', () => {
    it('should return account statistics', async () => {
      const mockStats = { totalProfiles: 3, totalShows: 50, totalMovies: 25 };
      (accountStatisticsService.getAccountStatistics as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountStatistics(req, res, next);

      expect(accountStatisticsService.getAccountStatistics).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account statistics',
        results: mockStats,
      });
    });
  });

  describe('getAccountWatchingVelocity', () => {
    it('should return account watching velocity', async () => {
      const mockVelocity = { avgEpisodesPerDay: 4.5 };
      (accountStatisticsService.getAccountWatchingVelocity as jest.Mock).mockResolvedValue(mockVelocity);

      req.params = { accountId: '1' };

      await getAccountWatchingVelocity(req, res, next);

      expect(accountStatisticsService.getAccountWatchingVelocity).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAccountActivityTimeline', () => {
    it('should return account activity timeline', async () => {
      const mockTimeline = { timeline: [{ date: '2025-01-01', episodes: 5 }] };
      (accountStatisticsService.getAccountActivityTimeline as jest.Mock).mockResolvedValue(mockTimeline);

      req.params = { accountId: '1' };

      await getAccountActivityTimeline(req, res, next);

      expect(accountStatisticsService.getAccountActivityTimeline).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account activity timeline statistics',
        results: mockTimeline,
      });
    });
  });

  describe('getAccountBingeWatchingStats', () => {
    it('should return account binge watching statistics', async () => {
      const mockStats = { avgEpisodesPerSession: 8, longestBinge: 15 };
      (accountStatisticsService.getAccountBingeWatchingStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountBingeWatchingStats(req, res, next);

      expect(accountStatisticsService.getAccountBingeWatchingStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account binge watching statistics',
        results: mockStats,
      });
    });
  });

  describe('getAccountWatchStreakStats', () => {
    it('should return account watch streak statistics', async () => {
      const mockStats = { currentStreak: 10, longestStreak: 25 };
      (accountStatisticsService.getAccountWatchStreakStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountWatchStreakStats(req, res, next);

      expect(accountStatisticsService.getAccountWatchStreakStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account watch streak statistics',
        results: mockStats,
      });
    });
  });

  describe('getAccountTimeToWatchStats', () => {
    it('should return account time to watch statistics', async () => {
      const mockStats = { avgTimeToWatch: 120, totalMinutes: 5400 };
      (accountStatisticsService.getAccountTimeToWatchStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountTimeToWatchStats(req, res, next);

      expect(accountStatisticsService.getAccountTimeToWatchStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account time to watch statistics',
        results: mockStats,
      });
    });
  });

  describe('getAccountSeasonalViewingStats', () => {
    it('should return account seasonal viewing statistics', async () => {
      const mockStats = { spring: 100, summer: 150, fall: 120, winter: 180 };
      (accountStatisticsService.getAccountSeasonalViewingStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountSeasonalViewingStats(req, res, next);

      expect(accountStatisticsService.getAccountSeasonalViewingStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account seasonal viewing statistics',
        results: mockStats,
      });
    });
  });

  describe('getAccountMilestoneStats', () => {
    it('should return account milestone statistics', async () => {
      const mockStats = { milestones: [{ type: '100 episodes', date: '2025-01-15' }] };
      (accountStatisticsService.getAccountMilestoneStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountMilestoneStats(req, res, next);

      expect(accountStatisticsService.getAccountMilestoneStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account milestone statistics',
        results: mockStats,
      });
    });
  });

  describe('getAccountContentDepthStats', () => {
    it('should return account content depth statistics', async () => {
      const mockStats = { avgSeasonsWatched: 3.5, completionRate: 0.75 };
      (accountStatisticsService.getAccountContentDepthStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountContentDepthStats(req, res, next);

      expect(accountStatisticsService.getAccountContentDepthStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account content depth statistics',
        results: mockStats,
      });
    });
  });

  describe('getAccountContentDiscoveryStats', () => {
    it('should return account content discovery statistics', async () => {
      const mockStats = { newShowsPerMonth: 4, explorationRate: 0.6 };
      (accountStatisticsService.getAccountContentDiscoveryStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountContentDiscoveryStats(req, res, next);

      expect(accountStatisticsService.getAccountContentDiscoveryStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account content discovery statistics',
        results: mockStats,
      });
    });
  });

  describe('getAccountAbandonmentRiskStats', () => {
    it('should return account abandonment risk statistics', async () => {
      const mockStats = { atRiskShows: 5, abandonmentRate: 0.15 };
      (accountStatisticsService.getAccountAbandonmentRiskStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountAbandonmentRiskStats(req, res, next);

      expect(accountStatisticsService.getAccountAbandonmentRiskStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account abandonment risk statistics',
        results: mockStats,
      });
    });
  });

  describe('getAccountUnairedContentStats', () => {
    it('should return account unaired content statistics', async () => {
      const mockStats = { unairedEpisodes: 12, upcomingShows: 3 };
      (accountStatisticsService.getAccountUnairedContentStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { accountId: '1' };

      await getAccountUnairedContentStats(req, res, next);

      expect(accountStatisticsService.getAccountUnairedContentStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved account unaired content statistics',
        results: mockStats,
      });
    });
  });

  describe('getProfileComparison', () => {
    it('should return profile comparison data', async () => {
      const mockComparison = {
        profiles: [
          { id: 1, name: 'Profile 1', episodesWatched: 100 },
          { id: 2, name: 'Profile 2', episodesWatched: 80 },
        ],
      };
      (accountStatisticsService.getProfileComparison as jest.Mock).mockResolvedValue(mockComparison);

      req.params = { accountId: '1' };

      await getProfileComparison(req, res, next);

      expect(accountStatisticsService.getProfileComparison).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved profile comparison',
        results: mockComparison,
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors via next middleware', async () => {
      const error = new Error('Service error');
      (accountStatisticsService.getAccountStatistics as jest.Mock).mockRejectedValue(error);

      req.params = { accountId: '1' };

      await getAccountStatistics(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
