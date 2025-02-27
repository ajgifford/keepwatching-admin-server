import { getLogs } from '../controllers/logsController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/logs', getLogs);

export default router;
