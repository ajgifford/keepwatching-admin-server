import {
  deleteAccount,
  deleteProfile,
  editAccount,
  editProfile,
  getAccounts,
  getProfiles,
} from '../controllers/accountManagementController';
import { validateRequest, validateSchema } from '@ajgifford/keepwatching-common-server/middleware/validationMiddleware';
import {
  accountAndProfileIdsParamSchema,
  accountIdParamSchema,
  accountUpdateSchema,
  profileNameSchema,
} from '@ajgifford/keepwatching-common-server/schema/accountSchema';
import express from 'express';

const router = express.Router();

router.get('/api/v1/accounts', getAccounts);
router.put(
  '/api/v1/accounts/:accountId',
  validateSchema(accountIdParamSchema, 'params'),
  validateRequest(accountUpdateSchema),
  editAccount,
);
router.delete('/api/v1/accounts/:accountId', validateSchema(accountIdParamSchema, 'params'), deleteAccount);
router.get('/api/v1/accounts/:accountId/profiles', validateSchema(accountIdParamSchema, 'params'), getProfiles);
router.put(
  '/api/v1/accounts/:accountId/profiles/:profileId',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  validateRequest(profileNameSchema),
  editProfile,
);
router.delete(
  '/api/v1/accounts/:accountId/profiles/:profileId',
  validateSchema(accountAndProfileIdsParamSchema, 'params'),
  deleteProfile,
);

export default router;
