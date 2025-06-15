import { getServicesHealth } from '../controllers/servicesController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/services/health', getServicesHealth);

export default router;
