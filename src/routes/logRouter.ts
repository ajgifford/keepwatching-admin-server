import { getLogs, streamLogs } from '../controllers/logsController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/logs', getLogs);
router.get('/api/v1/logs/stream', streamLogs);

export default router;
