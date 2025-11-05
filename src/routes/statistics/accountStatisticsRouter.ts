import {
  getAccountAbandonmentRiskStats,
  getAccountActivityTimeline,
  getAccountBingeWatchingStats,
  getAccountContentDepthStats,
  getAccountContentDiscoveryStats,
  getAccountMilestoneStats,
  getAccountSeasonalViewingStats,
  getAccountStatistics,
  getAccountTimeToWatchStats,
  getAccountUnairedContentStats,
  getAccountWatchStreakStats,
  getAccountWatchingVelocity,
} from '../../controllers/accountStatisticsController';
import { validateSchema } from '@ajgifford/keepwatching-common-server';
import { accountIdParamSchema } from '@ajgifford/keepwatching-common-server/schema';
import express from 'express';

const router = express.Router();

router.get(
  '/api/v1/accounts/:accountId/statistics',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountStatistics,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/velocity',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountWatchingVelocity,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/activity/timeline',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountActivityTimeline,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/binge',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountBingeWatchingStats,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/streaks',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountWatchStreakStats,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/time-to-watch',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountTimeToWatchStats,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/seasonal',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountSeasonalViewingStats,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/milestones',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountMilestoneStats,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/content-depth',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountContentDepthStats,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/content-discovery',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountContentDiscoveryStats,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/abandonment-risk',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountAbandonmentRiskStats,
);

router.get(
  '/api/v1/accounts/:accountId/statistics/unaired-content',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountUnairedContentStats,
);

export default router;
