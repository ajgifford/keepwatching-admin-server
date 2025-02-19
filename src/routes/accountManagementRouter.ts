import {
  deleteAccount,
  deleteProfile,
  editAccount,
  editProfile,
  getAccounts,
  getProfiles,
} from '../controllers/accountManagementController';
import { validateAccount, validateProfile } from '../middleware/accountManagementMiddleware';
import express from 'express';

const router = express.Router();

router.get('/api/v1/accounts', getAccounts);
router.put('/api/v1/accounts/:accountId', validateAccount, editAccount);
router.delete('/api/v1/accounts/:accountId', deleteAccount);
router.get('/api/v1/accounts/:accountId/profiles', getProfiles);
router.put('/api/v1/accounts/:accountId/profiles/:profileId', validateProfile, editProfile);
router.delete('/api/v1/accounts/:accountId/profiles/:profileId', deleteProfile);

export default router;
