import {
  getAbandonmentRiskStats,
  getActivityTimeline,
  getBingeWatchingStats,
  getContentDepthStats,
  getContentDiscoveryStats,
  getDailyActivity,
  getMilestoneStats,
  getMonthlyActivity,
  getProfileStatistics,
  getSeasonalViewingStats,
  getTimeToWatchStats,
  getUnairedContentStats,
  getWatchStreakStats,
  getWatchingVelocity,
  getWeeklyActivity,
} from '../../controllers/profileStatisticsController';
import { validateSchema } from '@ajgifford/keepwatching-common-server';
import { logRequestContext } from '@ajgifford/keepwatching-common-server/middleware';
import { accountAndProfileIdsParamSchema } from '@ajgifford/keepwatching-common-server/schema';
import express from 'express';

const router = express.Router();

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getProfileStatistics,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/velocity',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getWatchingVelocity,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/daily',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getDailyActivity,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/weekly',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getWeeklyActivity,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/monthly',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getMonthlyActivity,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/timeline',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getActivityTimeline,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/binge',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getBingeWatchingStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/streaks',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getWatchStreakStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/time-to-watch',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getTimeToWatchStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/seasonal',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getSeasonalViewingStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/milestones',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getMilestoneStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/content-depth',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getContentDepthStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/content-discovery',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getContentDiscoveryStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/abandonment-risk',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getAbandonmentRiskStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/unaired-content',
  logRequestContext,
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getUnairedContentStats,
);

export default router;
