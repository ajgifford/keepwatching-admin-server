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
import { accountAndProfileIdsParamSchema } from '@ajgifford/keepwatching-common-server/schema';
import express from 'express';

const router = express.Router();

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getProfileStatistics,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/velocity',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getWatchingVelocity,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/daily',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getDailyActivity,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/weekly',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getWeeklyActivity,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/monthly',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getMonthlyActivity,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/timeline',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getActivityTimeline,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/binge',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getBingeWatchingStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/streaks',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getWatchStreakStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/time-to-watch',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getTimeToWatchStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/seasonal',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getSeasonalViewingStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/milestones',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getMilestoneStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/content-depth',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getContentDepthStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/content-discovery',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getContentDiscoveryStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/abandonment-risk',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getAbandonmentRiskStats,
);

router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/statistics/unaired-content',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getUnairedContentStats,
);

export default router;
