import { describe, expect, it } from '@jest/globals';
import router from '@routes/statistics/adminStatisticsRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/adminStatisticsController', () => ({
  getPlatformOverview: jest.fn((_req, res) => res.status(200).send('retrieved platform overview')),
  getPlatformTrends: jest.fn((_req, res) => res.status(200).send('retrieved platform trends')),
  getAccountHealthMetrics: jest.fn((_req, res) => res.status(200).send('retrieved account health metrics')),
  getAccountHealth: jest.fn((_req, res) => res.status(200).send('retrieved account health')),
  getAccountRankings: jest.fn((_req, res) => res.status(200).send('retrieved account rankings')),
  getContentPopularity: jest.fn((_req, res) => res.status(200).send('retrieved content popularity')),
  getTrendingContent: jest.fn((_req, res) => res.status(200).send('retrieved trending content')),
  getContentEngagement: jest.fn((_req, res) => res.status(200).send('retrieved content engagement')),
  getAdminDashboard: jest.fn((_req, res) => res.status(200).send('retrieved admin dashboard')),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('AdminStatisticsRouter', () => {
  it('GET /api/v1/admin/statistics/platform/overview', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/platform/overview').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved platform overview');
  });

  it('GET /api/v1/admin/statistics/platform/trends', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/platform/trends').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved platform trends');
  });

  it('GET /api/v1/admin/statistics/accounts/health', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/accounts/health').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved account health metrics');
  });

  it('GET /api/v1/admin/statistics/accounts/:accountId/health', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/accounts/123/health').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved account health');
  });

  it('GET /api/v1/admin/statistics/accounts/rankings', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/accounts/rankings').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved account rankings');
  });

  it('GET /api/v1/admin/statistics/content/popular', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/content/popular').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved content popularity');
  });

  it('GET /api/v1/admin/statistics/content/trending', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/content/trending').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved trending content');
  });

  it('GET /api/v1/admin/statistics/content/:contentId/engagement', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/content/789/engagement').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved content engagement');
  });

  it('GET /api/v1/admin/statistics/dashboard', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/dashboard').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved admin dashboard');
  });
});
