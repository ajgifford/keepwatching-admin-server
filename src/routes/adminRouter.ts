import { getServicesHealth, getSiteStatus, getSummaryCounts, restartService } from '../controllers/adminController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/admin/health', getServicesHealth);
router.get('/api/v1/admin/site-status', getSiteStatus);
router.get('/api/v1/admin/summary-counts', getSummaryCounts);
router.post('/api/v1/admin/services/:service/restart', restartService);

export default router;
