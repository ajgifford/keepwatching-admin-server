import { AccountIdParam } from '@ajgifford/keepwatching-common-server/schema';
import { accountStatisticsService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';

/**
 * Get statistics (shows, movies and watch progress) for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics
 */
export async function getAccountStatistics(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountStatistics(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get watching velocity statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/velocity
 */
export async function getAccountWatchingVelocity(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountWatchingVelocity(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account watching velocity statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get comprehensive activity timeline for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/activity/timeline
 */
export async function getAccountActivityTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountActivityTimeline(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account activity timeline statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get binge-watching statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/binge
 */
export async function getAccountBingeWatchingStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountBingeWatchingStats(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account binge watching statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get watch streak statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/streaks
 */
export async function getAccountWatchStreakStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountWatchStreakStats(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account watch streak statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get time-to-watch statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/time-to-watch
 */
export async function getAccountTimeToWatchStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountTimeToWatchStats(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account time to watch statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get seasonal viewing pattern statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/seasonal
 */
export async function getAccountSeasonalViewingStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountSeasonalViewingStats(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account seasonal viewing statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get milestone statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/milestones
 */
export async function getAccountMilestoneStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountMilestoneStats(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account milestone statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get content depth statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/content-depth
 */
export async function getAccountContentDepthStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountContentDepthStats(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account content depth statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get content discovery statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/content-discovery
 */
export async function getAccountContentDiscoveryStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountContentDiscoveryStats(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account content discovery statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get abandonment risk statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/abandonment-risk
 */
export async function getAccountAbandonmentRiskStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountAbandonmentRiskStats(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account abandonment risk statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get unaired content statistics for an account
 *
 * @route GET /api/v1/accounts/:accountId/statistics/unaired-content
 */
export async function getAccountUnairedContentStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await accountStatisticsService.getAccountUnairedContentStats(accountId);

    res.status(200).json({
      message: 'Successfully retrieved account unaired content statistics',
      results,
    });
  } catch (error) {
    next(error);
  }
}
