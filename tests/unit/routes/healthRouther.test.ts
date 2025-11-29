import { describe, expect, it } from '@jest/globals';
import router from '@routes/healthRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/healthController', () => ({
  archiveDailyPerformance: jest.fn((_req, res) => res.status(200).send('daily performance archived')),
  getArchiveLogs: jest.fn((_req, res) => res.status(200).send('retrieved archive logs')),
  getArchiveStatistics: jest.fn((_req, res) => res.status(200).send('retrieved archive stats')),
  getDBHealth: jest.fn((_req, res) => res.status(200).send('retrieved database health')),
  getDBQueryHistory: jest.fn((_req, res) => res.status(200).send('retrieved database query history')),
  getDBQueryStats: jest.fn((_req, res) => res.status(200).send('retrieved database query stats')),
  getHistoricalPerformanceTrends: jest.fn((_req, res) =>
    res.status(200).send('retrieved historical performance trends'),
  ),
  getHistoricalSlowestQueries: jest.fn((_req, res) => res.status(200).send('retrieved historical slowest queries')),
  getPerformanceOverview: jest.fn((_req, res) => res.status(200).send('retrieved performance overview')),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('HealthRouter', () => {
  it('GET /api/v1/admin/health/db', async () => {
    const res = await request(app).get('/api/v1/admin/health/db').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved database health');
  });

  it('GET /api/v1/admin/health/db/query-stats', async () => {
    const res = await request(app).get('/api/v1/admin/health/db/query-stats').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved database query stats');
  });

  it('GET /api/v1/admin/health/db/query-history', async () => {
    const res = await request(app).get('/api/v1/admin/health/db/query-history').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved database query history');
  });

  it('GET /api/v1/admin/health/db/performance-trends', async () => {
    const res = await request(app).get('/api/v1/admin/health/db/performance-trends').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved historical performance trends');
  });

  it('GET /api/v1/admin/health/db/slowest-queries', async () => {
    const res = await request(app).get('/api/v1/admin/health/db/slowest-queries').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved historical slowest queries');
  });

  it('GET /api/v1/admin/health/db/archive-logs', async () => {
    const res = await request(app).get('/api/v1/admin/health/db/archive-logs').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved archive logs');
  });

  it('GET /api/v1/admin/health/db/archive-statistics', async () => {
    const res = await request(app).get('/api/v1/admin/health/db/archive-statistics').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved archive stats');
  });

  it('GET /api/v1/admin/health/db/performance-overview', async () => {
    const res = await request(app).get('/api/v1/admin/health/db/performance-overview').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved performance overview');
  });

  it('POST /api/v1/admin/health/db/archive-performance', async () => {
    const res = await request(app).post('/api/v1/admin/health/db/archive-performance').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('daily performance archived');
  });
});
