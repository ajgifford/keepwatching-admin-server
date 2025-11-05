import { AccountAndProfileIdsParams } from '@ajgifford/keepwatching-common-server/schema';
import { profileStatisticsService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';

/**
 * Get statistics (shows, movies and watch progress) for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics
 */
export async function getProfileStatistics(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getProfileStatistics(profileId);

    res.status(200).json({
      message: 'Successfully retrieved profile statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get watching velocity statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/velocity
 */
export async function getWatchingVelocity(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const results = await profileStatisticsService.getWatchingVelocity(profileId, days);

    res.status(200).json({
      message: 'Successfully retrieved watching velocity statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get daily activity timeline for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/daily
 */
export async function getDailyActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const results = await profileStatisticsService.getDailyActivity(profileId, days);

    res.status(200).json({
      message: 'Successfully retrieved daily activity',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get weekly activity timeline for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/weekly
 */
export async function getWeeklyActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const weeks = req.query.weeks ? parseInt(req.query.weeks as string, 10) : 12;
    const results = await profileStatisticsService.getWeeklyActivity(profileId, weeks);

    res.status(200).json({
      message: 'Successfully retrieved weekly activity',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get monthly activity timeline for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/monthly
 */
export async function getMonthlyActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const months = req.query.months ? parseInt(req.query.months as string, 10) : 12;
    const results = await profileStatisticsService.getMonthlyActivity(profileId, months);

    res.status(200).json({
      message: 'Successfully retrieved monthly activity',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get comprehensive activity timeline for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/timeline
 */
export async function getActivityTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getActivityTimeline(profileId);

    res.status(200).json({
      message: 'Successfully retrieved activity timeline',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get binge-watching statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/binge
 */
export async function getBingeWatchingStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getBingeWatchingStats(profileId);

    res.status(200).json({
      message: 'Successfully retrieved binge-watching statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get watch streak statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/streaks
 */
export async function getWatchStreakStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getWatchStreakStats(profileId);

    res.status(200).json({
      message: 'Successfully retrieved watch streak statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get time-to-watch statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/time-to-watch
 */
export async function getTimeToWatchStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getTimeToWatchStats(profileId);

    res.status(200).json({
      message: 'Successfully retrieved time-to-watch statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get seasonal viewing pattern statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/seasonal
 */
export async function getSeasonalViewingStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getSeasonalViewingStats(profileId);

    res.status(200).json({
      message: 'Successfully retrieved seasonal viewing statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get milestone statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/milestones
 */
export async function getMilestoneStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getMilestoneStats(profileId);

    res.status(200).json({
      message: 'Successfully retrieved milestone statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get content depth statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/content-depth
 */
export async function getContentDepthStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getContentDepthStats(profileId);

    res.status(200).json({
      message: 'Successfully retrieved content depth statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get content discovery statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/content-discovery
 */
export async function getContentDiscoveryStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getContentDiscoveryStats(profileId);

    res.status(200).json({
      message: 'Successfully retrieved content discovery statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get abandonment risk statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/abandonment-risk
 */
export async function getAbandonmentRiskStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getAbandonmentRiskStats(profileId);

    res.status(200).json({
      message: 'Successfully retrieved abandonment risk statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get unaired content statistics for a profile
 *
 * @route GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/unaired-content
 */
export async function getUnairedContentStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { profileId } = req.params as unknown as AccountAndProfileIdsParams;
    const results = await profileStatisticsService.getUnairedContentStats(profileId);

    res.status(200).json({
      message: 'Successfully retrieved unaired content statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}
