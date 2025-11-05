import { AccountIdParam } from '@ajgifford/keepwatching-common-server/schema';
import { adminStatisticsService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';

/**
 * Get platform overview statistics
 * @route GET /api/v1/admin/statistics/platform/overview
 */
export async function getPlatformOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await adminStatisticsService.getPlatformOverview();
    res.status(200).json({
      message: 'Successfully retrieved platform overview',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get platform trends
 * @route GET /api/v1/admin/statistics/platform/trends?days=30
 */
export async function getPlatformTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const results = await adminStatisticsService.getPlatformTrends(days);
    res.status(200).json({
      message: 'Successfully retrieved platform trends',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get account rankings by metric
 * @route GET /api/v1/admin/statistics/accounts/rankings?metric=engagement&limit=50
 */
export async function getAccountRankings(req: Request, res: Response, next: NextFunction) {
  try {
    const metric =
      (req.query.metric as 'episodesWatched' | 'moviesWatched' | 'hoursWatched' | 'engagement') || 'engagement';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const results = await adminStatisticsService.getAccountRankings(metric, limit);
    res.status(200).json({
      message: 'Successfully retrieved account rankings',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all account health metrics
 * @route GET /api/v1/admin/statistics/accounts/health
 */
export async function getAccountHealthMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await adminStatisticsService.getAccountHealthMetrics();
    res.status(200).json({
      message: 'Successfully retrieved account health metrics',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get specific account health
 * @route GET /api/v1/admin/statistics/accounts/:accountId/health
 */
export async function getAccountHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = req.params as unknown as AccountIdParam;
    const results = await adminStatisticsService.getAccountHealth(accountId);
    res.status(200).json({
      message: 'Successfully retrieved account health',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get popular content
 * @route GET /api/v1/admin/statistics/content/popular?type=all&limit=20
 */
export async function getContentPopularity(req: Request, res: Response, next: NextFunction) {
  try {
    const contentType = (req.query.type as 'show' | 'movie' | 'all') || 'all';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const results = await adminStatisticsService.getContentPopularity(contentType, limit);
    res.status(200).json({
      message: 'Successfully retrieved popular content',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get trending content
 * @route GET /api/v1/admin/statistics/content/trending?days=30
 */
export async function getTrendingContent(req: Request, res: Response, next: NextFunction) {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const results = await adminStatisticsService.getTrendingContent(days);
    res.status(200).json({
      message: 'Successfully retrieved trending content',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get content engagement metrics
 * @route GET /api/v1/admin/statistics/content/:contentId/engagement?type=show
 */
export async function getContentEngagement(req: Request, res: Response, next: NextFunction) {
  try {
    const contentId = parseInt(req.params.contentId, 10);
    const contentType = (req.query.type as 'show' | 'movie') || 'show';
    const results = await adminStatisticsService.getContentEngagement(contentId, contentType);
    res.status(200).json({
      message: 'Successfully retrieved content engagement',
      results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get admin dashboard with combined stats
 * @route GET /api/v1/admin/statistics/dashboard
 */
export async function getAdminDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await adminStatisticsService.getAdminDashboard();
    res.status(200).json({
      message: 'Successfully retrieved admin dashboard',
      results,
    });
  } catch (error) {
    next(error);
  }
}
