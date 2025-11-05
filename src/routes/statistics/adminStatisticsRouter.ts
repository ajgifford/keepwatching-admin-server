import {
  getAccountHealth,
  getAccountHealthMetrics,
  getAccountRankings,
  getAdminDashboard,
  getContentEngagement,
  getContentPopularity,
  getPlatformOverview,
  getPlatformTrends,
  getTrendingContent,
} from '../../controllers/adminStatisticsController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/admin/statistics/platform/overview', getPlatformOverview);
router.get('/api/v1/admin/statistics/platform/trends', getPlatformTrends);
router.get('/api/v1/admin/statistics/accounts/health', getAccountHealthMetrics);
router.get('/api/v1/admin/statistics/accounts/:accountId/health', getAccountHealth);
router.get('/api/v1/admin/statistics/accounts/rankings', getAccountRankings);
router.get('/api/v1/admin/statistics/content/popular', getContentPopularity);
router.get('/api/v1/admin/statistics/content/trending', getTrendingContent);
router.get('/api/v1/admin/statistics/content/:contentId/engagement', getContentEngagement);
router.get('/api/v1/admin/statistics/dashboard', getAdminDashboard);

export default router;
