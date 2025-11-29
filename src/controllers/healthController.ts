import { healthService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

/**
 * Get DB query health
 * @route GET /api/v1/admin/health/db
 */
export const getDBHealth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbHealth = await healthService.getDatabaseHealth();
    res.status(200).json(dbHealth);
  } catch (error) {
    next(error);
  }
});

/**
 * Get the database query statistics
 * @route GET /api/v1/admin/health/db/query-stats?limit=undefined
 */
export const getDBQueryStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const queryHistory = await healthService.getQueryStats(limit);
    res.status(200).json(queryHistory);
  } catch (error) {
    next(error);
  }
});

/**
 * Get the history of an individual DB query
 * @route GET /api/v1/admin/health/db/query-history?queryName=<query>&limit=100
 */
export const getDBQueryHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryName = req.query.queryName as string;
    if (!queryName) {
      res.status(400).json({ error: 'queryName query parameter is required' });
      return;
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const queryHistory = await healthService.getQueryHistory(queryName, limit);
    res.status(200).json(queryHistory);
  } catch (error) {
    next(error);
  }
});

/**
 * Get historical performance trends for a specific query
 * @route GET /api/v1/admin/health/db/performance-trends?queryHash=<hash>&startDate=<date>&endDate=<date>
 */
export const getHistoricalPerformanceTrends = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryHash = req.query.queryHash as string;
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    if (!queryHash) {
      res.status(400).json({ error: 'queryHash query parameter is required' });
      return;
    }
    if (!startDateStr) {
      res.status(400).json({ error: 'startDate query parameter is required' });
      return;
    }
    if (!endDateStr) {
      res.status(400).json({ error: 'endDate query parameter is required' });
      return;
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime())) {
      res.status(400).json({ error: 'Invalid startDate format' });
      return;
    }
    if (isNaN(endDate.getTime())) {
      res.status(400).json({ error: 'Invalid endDate format' });
      return;
    }

    const trends = await healthService.getHistoricalPerformanceTrends(queryHash, startDate, endDate);
    res.status(200).json(trends);
  } catch (error) {
    next(error);
  }
});

/**
 * Get the slowest queries from archived data
 * @route GET /api/v1/admin/health/db/slowest-queries?startDate=<date>&endDate=<date>&limit=10
 */
export const getHistoricalSlowestQueries = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    if (!startDateStr) {
      res.status(400).json({ error: 'startDate query parameter is required' });
      return;
    }
    if (!endDateStr) {
      res.status(400).json({ error: 'endDate query parameter is required' });
      return;
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime())) {
      res.status(400).json({ error: 'Invalid startDate format' });
      return;
    }
    if (isNaN(endDate.getTime())) {
      res.status(400).json({ error: 'Invalid endDate format' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const slowestQueries = await healthService.getHistoricalSlowestQueries(startDate, endDate, limit);
    res.status(200).json(slowestQueries);
  } catch (error) {
    next(error);
  }
});

/**
 * Get archive execution logs
 * @route GET /api/v1/admin/health/db/archive-logs?limit=10
 */
export const getArchiveLogs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const archiveLogs = await healthService.getArchiveLogs(limit);
    res.status(200).json(archiveLogs);
  } catch (error) {
    next(error);
  }
});

/**
 * Get aggregate statistics from archived performance data
 * @route GET /api/v1/admin/health/db/archive-statistics?days=7
 */
export const getArchiveStatistics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
    const statistics = await healthService.getArchiveStatistics(days);
    res.status(200).json(statistics);
  } catch (error) {
    next(error);
  }
});

/**
 * Get comprehensive performance overview
 * @route GET /api/v1/admin/health/db/performance-overview?days=7
 */
export const getPerformanceOverview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
    const overview = await healthService.getPerformanceOverview(days);
    res.status(200).json(overview);
  } catch (error) {
    next(error);
  }
});

/**
 * Get comprehensive performance overview
 * @route POST /api/v1/admin/health/db/archive-performance
 */
export const archiveDailyPerformance = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await healthService.archiveDailyPerformanceNow();
    res.status(200);
  } catch (error) {
    next(error);
  }
});
