import { getDBHealth, getServicesHealth } from '../controllers/servicesController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/services/health', getServicesHealth);
router.get('/api/v1/services/db-health', getDBHealth);

export default router;
