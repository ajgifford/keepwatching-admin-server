import { executeJob, getSchedule, getStatus, pauseAll, resumeAll, updateSchedule } from '../controllers/jobsController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/admin/jobs/status', getStatus);
router.post('/api/v1/admin/jobs/pause', pauseAll);
router.post('/api/v1/admin/jobs/resume', resumeAll);
router.post('/api/v1/admin/jobs/execute', executeJob);
router.put('/api/v1/admin/jobs/update-schedule', updateSchedule);
router.get('/api/v1/admin/jobs/schedule', getSchedule);

export default router;
