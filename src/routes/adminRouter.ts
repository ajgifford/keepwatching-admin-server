import { getServicesHealth } from '../controllers/adminController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/admin/health', getServicesHealth);

export default router;
