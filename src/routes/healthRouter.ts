import {
  archiveDailyPerformance,
  getArchiveLogs,
  getArchiveStatistics,
  getDBHealth,
  getDBQueryHistory,
  getDBQueryStats,
  getHistoricalPerformanceTrends,
  getHistoricalSlowestQueries,
  getMonthlyPerformanceSummary,
  getPerformanceOverview,
} from '../controllers/healthController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/admin/health/db', getDBHealth);
router.get('/api/v1/admin/health/db/query-stats', getDBQueryStats);
router.get('/api/v1/admin/health/db/query-history', getDBQueryHistory);
router.get('/api/v1/admin/health/db/performance-trends', getHistoricalPerformanceTrends);
router.get('/api/v1/admin/health/db/slowest-queries', getHistoricalSlowestQueries);
router.get('/api/v1/admin/health/db/archive-logs', getArchiveLogs);
router.get('/api/v1/admin/health/db/archive-statistics', getArchiveStatistics);
router.get('/api/v1/admin/health/db/performance-overview', getPerformanceOverview);
router.get('/api/v1/admin/health/db/monthly-performance', getMonthlyPerformanceSummary);
router.post('/api/v1/admin/health/db/archive-performance', archiveDailyPerformance);

export default router;
