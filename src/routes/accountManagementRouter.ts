import {
  deleteAccount,
  deleteProfile,
  editAccount,
  editProfile,
  getAccounts,
  getProfiles,
} from '../controllers/accountManagementController';
import { validateRequest, validateSchema } from '@ajgifford/keepwatching-common-server';
import {
  accountAndProfileIdsParamSchema,
  accountIdParamSchema,
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

export default router;
