import express from 'express';
import {
  previewWeeklyEmailByAccount,
  sendWeeklyDigestEmailByAccount,
  sendWeeklyDiscoverEmailByAccount,
  sendWeeklyEmailByAccount,
  sendWeeklyEmailToAll,
} from 'src/controllers/emailController';

const router = express.Router();

router.post('/api/v1/admin/preview-weekly-email-account', previewWeeklyEmailByAccount);
router.post('/api/v1/admin/send-weekly-digest-account', sendWeeklyDigestEmailByAccount);
router.post('/api/v1/admin/send-weekly-discover-account', sendWeeklyDiscoverEmailByAccount);
router.post('/api/v1/admin/send-weekly-email-account', sendWeeklyEmailByAccount);
router.post('/api/v1/admin/send-weekly-email-all', sendWeeklyEmailToAll);

export default router;
