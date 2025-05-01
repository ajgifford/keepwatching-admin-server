import { getServiceStatuses } from '../controllers/servicesController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/services/status', getServiceStatuses);

export default router;
