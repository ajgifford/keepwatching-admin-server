import { getServicesHealth, getSummaryCounts } from '../controllers/adminController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/admin/health', getServicesHealth);
router.get('/api/v1/admin/summary-counts', getSummaryCounts);

export default router;
