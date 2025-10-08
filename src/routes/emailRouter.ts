import {
  createEmailTemplate,
  deleteEmail,
  deleteEmailTemplate,
  getEmailTemplates,
  getEmails,
  previewWeeklyEmailByAccount,
  sendEmail,
  sendWeeklyDigestEmailByAccount,
  sendWeeklyDiscoverEmailByAccount,
  sendWeeklyEmailByAccount,
  sendWeeklyEmailToAll,
  updateEmailTemplate,
} from '../controllers/emailController';
import express from 'express';

const router = express.Router();

router.post('/api/v1/admin/email/digest/preview-account', previewWeeklyEmailByAccount);
router.post('/api/v1/admin/email/digest/send-account', sendWeeklyDigestEmailByAccount);
router.post('/api/v1/admin/email/discover/send-account', sendWeeklyDiscoverEmailByAccount);
router.post('/api/v1/admin/email/weekly/send-account', sendWeeklyEmailByAccount);
router.post('/api/v1/admin/email/weekly/send-all', sendWeeklyEmailToAll);
router.get('/api/v1/admin/email/templates', getEmailTemplates);
router.post('/api/v1/admin/email/templates', createEmailTemplate);
router.put('/api/v1/admin/email/templates/:templateId', updateEmailTemplate);
router.delete('/api/v1/admin/email/templates/:templateId', deleteEmailTemplate);
router.get('/api/v1/admin/email/emails', getEmails);
router.post('/api/v1/admin/email/emails', sendEmail);
router.delete('/api/v1/admin/email/emails/:emailId', deleteEmail);

export default router;
