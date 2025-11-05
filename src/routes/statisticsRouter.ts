import accountRouter from './statistics/accountStatisticsRouter';
import adminRouter from './statistics/adminStatisticsRouter';
import profileRouter from './statistics/profileStatisticsRouter';
import express from 'express';

const router = express.Router();
router.use(accountRouter);
router.use(profileRouter);
router.use(adminRouter);

export default router;
