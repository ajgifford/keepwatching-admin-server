import {
  deleteAccount,
  deleteProfile,
  editAccount,
  editProfile,
  getAccountPreferences,
  getAccounts,
  getProfileMoviesList,
  getProfileShowsList,
  getProfiles,
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
