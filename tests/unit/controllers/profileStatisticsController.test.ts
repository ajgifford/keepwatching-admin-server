import {
  getProfileStatistics,
  getWatchingVelocity,
  getDailyActivity,
  getWeeklyActivity,
  getMonthlyActivity,
  getActivityTimeline,
  getBingeWatchingStats,
  getWatchStreakStats,
  getTimeToWatchStats,
  getSeasonalViewingStats,
  getMilestoneStats,
  getContentDepthStats,
  getContentDiscoveryStats,
  getAbandonmentRiskStats,
  getUnairedContentStats,
} from '@controllers/profileStatisticsController';
import { profileStatisticsService } from '@ajgifford/keepwatching-common-server/services';
import { beforeEach, describe, expect, it } from '@jest/globals';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  profileStatisticsService: {
    getProfileStatistics: jest.fn(),
    getWatchingVelocity: jest.fn(),
    getDailyActivity: jest.fn(),
    getWeeklyActivity: jest.fn(),
    getMonthlyActivity: jest.fn(),
    getActivityTimeline: jest.fn(),
    getBingeWatchingStats: jest.fn(),
    getWatchStreakStats: jest.fn(),
    getTimeToWatchStats: jest.fn(),
    getSeasonalViewingStats: jest.fn(),
    getMilestoneStats: jest.fn(),
    getContentDepthStats: jest.fn(),
    getContentDiscoveryStats: jest.fn(),
    getAbandonmentRiskStats: jest.fn(),
    getUnairedContentStats: jest.fn(),
  },
}));

describe('ProfileStatisticsController', () => {
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

  describe('getProfileStatistics', () => {
    it('should return profile statistics', async () => {
      const mockStats = { shows: 10, movies: 5, totalHours: 100 };
      (profileStatisticsService.getProfileStatistics as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getProfileStatistics(req, res, next);

      expect(profileStatisticsService.getProfileStatistics).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved profile statistics',
        results: mockStats,
      });
    });
  });

  describe('getWatchingVelocity', () => {
    it('should return watching velocity with default days', async () => {
      const mockVelocity = { avgEpisodesPerDay: 2.5 };
      (profileStatisticsService.getWatchingVelocity as jest.Mock).mockResolvedValue(mockVelocity);

      req.params = { profileId: '1' };
      req.query = {};

      await getWatchingVelocity(req, res, next);

      expect(profileStatisticsService.getWatchingVelocity).toHaveBeenCalledWith('1', 30);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return watching velocity with custom days', async () => {
      const mockVelocity = { avgEpisodesPerDay: 3.0 };
      (profileStatisticsService.getWatchingVelocity as jest.Mock).mockResolvedValue(mockVelocity);

      req.params = { profileId: '1' };
      req.query = { days: '7' };

      await getWatchingVelocity(req, res, next);

      expect(profileStatisticsService.getWatchingVelocity).toHaveBeenCalledWith('1', 7);
    });
  });

  describe('getDailyActivity', () => {
    it('should return daily activity with default days', async () => {
      const mockActivity = { activity: [{ date: '2025-01-01', episodes: 3 }] };
      (profileStatisticsService.getDailyActivity as jest.Mock).mockResolvedValue(mockActivity);

      req.params = { profileId: '1' };
      req.query = {};

      await getDailyActivity(req, res, next);

      expect(profileStatisticsService.getDailyActivity).toHaveBeenCalledWith('1', 30);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved daily activity',
        results: mockActivity,
      });
    });

    it('should return daily activity with custom days', async () => {
      const mockActivity = { activity: [] };
      (profileStatisticsService.getDailyActivity as jest.Mock).mockResolvedValue(mockActivity);

      req.params = { profileId: '1' };
      req.query = { days: '14' };

      await getDailyActivity(req, res, next);

      expect(profileStatisticsService.getDailyActivity).toHaveBeenCalledWith('1', 14);
    });
  });

  describe('getWeeklyActivity', () => {
    it('should return weekly activity with default weeks', async () => {
      const mockActivity = { activity: [{ week: 1, episodes: 20 }] };
      (profileStatisticsService.getWeeklyActivity as jest.Mock).mockResolvedValue(mockActivity);

      req.params = { profileId: '1' };
      req.query = {};

      await getWeeklyActivity(req, res, next);

      expect(profileStatisticsService.getWeeklyActivity).toHaveBeenCalledWith('1', 12);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved weekly activity',
        results: mockActivity,
      });
    });

    it('should return weekly activity with custom weeks', async () => {
      const mockActivity = { activity: [] };
      (profileStatisticsService.getWeeklyActivity as jest.Mock).mockResolvedValue(mockActivity);

      req.params = { profileId: '1' };
      req.query = { weeks: '4' };

      await getWeeklyActivity(req, res, next);

      expect(profileStatisticsService.getWeeklyActivity).toHaveBeenCalledWith('1', 4);
    });
  });

  describe('getMonthlyActivity', () => {
    it('should return monthly activity with default months', async () => {
      const mockActivity = { activity: [{ month: 'January', episodes: 100 }] };
      (profileStatisticsService.getMonthlyActivity as jest.Mock).mockResolvedValue(mockActivity);

      req.params = { profileId: '1' };
      req.query = {};

      await getMonthlyActivity(req, res, next);

      expect(profileStatisticsService.getMonthlyActivity).toHaveBeenCalledWith('1', 12);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved monthly activity',
        results: mockActivity,
      });
    });

    it('should return monthly activity with custom months', async () => {
      const mockActivity = { activity: [] };
      (profileStatisticsService.getMonthlyActivity as jest.Mock).mockResolvedValue(mockActivity);

      req.params = { profileId: '1' };
      req.query = { months: '6' };

      await getMonthlyActivity(req, res, next);

      expect(profileStatisticsService.getMonthlyActivity).toHaveBeenCalledWith('1', 6);
    });
  });

  describe('getActivityTimeline', () => {
    it('should return comprehensive activity timeline', async () => {
      const mockTimeline = { timeline: [{ date: '2025-01-01', episodes: 5 }] };
      (profileStatisticsService.getActivityTimeline as jest.Mock).mockResolvedValue(mockTimeline);

      req.params = { profileId: '1' };

      await getActivityTimeline(req, res, next);

      expect(profileStatisticsService.getActivityTimeline).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved activity timeline',
        results: mockTimeline,
      });
    });
  });

  describe('getBingeWatchingStats', () => {
    it('should return binge watching statistics', async () => {
      const mockStats = { totalBingeSessions: 10, avgEpisodesPerBinge: 5 };
      (profileStatisticsService.getBingeWatchingStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getBingeWatchingStats(req, res, next);

      expect(profileStatisticsService.getBingeWatchingStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved binge-watching statistics',
        results: mockStats,
      });
    });
  });

  describe('getWatchStreakStats', () => {
    it('should return watch streak statistics', async () => {
      const mockStats = { currentStreak: 5, longestStreak: 15 };
      (profileStatisticsService.getWatchStreakStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getWatchStreakStats(req, res, next);

      expect(profileStatisticsService.getWatchStreakStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved watch streak statistics',
        results: mockStats,
      });
    });
  });

  describe('getTimeToWatchStats', () => {
    it('should return time-to-watch statistics', async () => {
      const mockStats = { avgTimeToWatch: 90, totalMinutes: 3600 };
      (profileStatisticsService.getTimeToWatchStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getTimeToWatchStats(req, res, next);

      expect(profileStatisticsService.getTimeToWatchStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved time-to-watch statistics',
        results: mockStats,
      });
    });
  });

  describe('getSeasonalViewingStats', () => {
    it('should return seasonal viewing statistics', async () => {
      const mockStats = { spring: 50, summer: 75, fall: 60, winter: 90 };
      (profileStatisticsService.getSeasonalViewingStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getSeasonalViewingStats(req, res, next);

      expect(profileStatisticsService.getSeasonalViewingStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved seasonal viewing statistics',
        results: mockStats,
      });
    });
  });

  describe('getMilestoneStats', () => {
    it('should return milestone statistics', async () => {
      const mockStats = { milestones: [{ type: '50 episodes', date: '2025-01-10' }] };
      (profileStatisticsService.getMilestoneStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getMilestoneStats(req, res, next);

      expect(profileStatisticsService.getMilestoneStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved milestone statistics',
        results: mockStats,
      });
    });
  });

  describe('getContentDepthStats', () => {
    it('should return content depth statistics', async () => {
      const mockStats = { avgSeasonsWatched: 2.5, completionRate: 0.65 };
      (profileStatisticsService.getContentDepthStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getContentDepthStats(req, res, next);

      expect(profileStatisticsService.getContentDepthStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved content depth statistics',
        results: mockStats,
      });
    });
  });

  describe('getContentDiscoveryStats', () => {
    it('should return content discovery statistics', async () => {
      const mockStats = { newShowsPerMonth: 3, explorationRate: 0.5 };
      (profileStatisticsService.getContentDiscoveryStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getContentDiscoveryStats(req, res, next);

      expect(profileStatisticsService.getContentDiscoveryStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved content discovery statistics',
        results: mockStats,
      });
    });
  });

  describe('getAbandonmentRiskStats', () => {
    it('should return abandonment risk statistics', async () => {
      const mockStats = { atRiskShows: 3, abandonmentRate: 0.12 };
      (profileStatisticsService.getAbandonmentRiskStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getAbandonmentRiskStats(req, res, next);

      expect(profileStatisticsService.getAbandonmentRiskStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved abandonment risk statistics',
        results: mockStats,
      });
    });
  });

  describe('getUnairedContentStats', () => {
    it('should return unaired content statistics', async () => {
      const mockStats = { unairedEpisodes: 8, upcomingShows: 2 };
      (profileStatisticsService.getUnairedContentStats as jest.Mock).mockResolvedValue(mockStats);

      req.params = { profileId: '1' };

      await getUnairedContentStats(req, res, next);

      expect(profileStatisticsService.getUnairedContentStats).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved unaired content statistics',
        results: mockStats,
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors via next middleware', async () => {
      const error = new Error('Service error');
      (profileStatisticsService.getProfileStatistics as jest.Mock).mockRejectedValue(error);

      req.params = { profileId: '1' };

      await getProfileStatistics(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
