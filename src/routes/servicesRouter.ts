import { getDBHealth, getDBQueryHistory, getDBQueryStats, getServicesHealth } from '../controllers/servicesController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/services/health', getServicesHealth);
router.get('/api/v1/services/db-health', getDBHealth);
router.get('/api/v1/services/db/query-stats', getDBQueryStats);
router.get('/api/v1/services/db/query-history', getDBQueryHistory);

export default router;
