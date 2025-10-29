import {
  deleteAccount,
  deleteProfile,
  editAccount,
  editProfile,
  getAccountPreferences,
  getAccountStatistics,
  getAccounts,
  getActivityTimeline,
  getDailyActivity,
  getMonthlyActivity,
  getProfileMoviesList,
  getProfileShowsList,
  getProfileStatistics,
  getProfiles,
  getWatchingVelocity,
  getWeeklyActivity,
  verifyEmail,
} from '../controllers/accountManagementController';
import { validateRequest, validateSchema } from '@ajgifford/keepwatching-common-server';
import {
  accountAndProfileIdsParamSchema,
  accountIdParamSchema,
  accountUIDParamSchema,
  profileNameBodySchema,
  updateAccountBodySchema,
} from '@ajgifford/keepwatching-common-server/schema';
import express from 'express';

const router = express.Router();

router.get('/api/v1/accounts', getAccounts);
router.put(
  '/api/v1/accounts/:accountId',
  validateSchema(accountIdParamSchema, 'params'),
  validateRequest(updateAccountBodySchema),
  editAccount,
);
router.delete('/api/v1/accounts/:accountId', validateSchema(accountIdParamSchema, 'params'), deleteAccount);
router.get('/api/v1/accounts/:accountId/profiles', validateSchema(accountIdParamSchema, 'params'), getProfiles);
router.put(
  '/api/v1/accounts/:accountId/profiles/:profileId',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  validateRequest(profileNameBodySchema),
  editProfile,
);
router.delete(
  '/api/v1/accounts/:accountId/profiles/:profileId',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  deleteProfile,
);
router.get(
  '/api/v1/accounts/:accountId/statistics',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountStatistics,
);
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
  '/api/v1/accounts/:accountId/profiles/:profileId/shows',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getProfileShowsList,
);
router.get(
  '/api/v1/accounts/:accountId/profiles/:profileId/movies',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  getProfileMoviesList,
);
router.post('/api/v1/accounts/:accountUid/verify-email', validateSchema(accountUIDParamSchema, 'params'), verifyEmail);
router.get(
  '/api/v1/accounts/:accountId/preferences',
  validateSchema(accountIdParamSchema, 'params'),
  getAccountPreferences,
);

export default router;
