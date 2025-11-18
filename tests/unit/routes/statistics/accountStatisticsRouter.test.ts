import { describe, expect, it } from '@jest/globals';
import router from '@routes/statistics/accountStatisticsRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/accountStatisticsController', () => ({
  getAccountStatistics: jest.fn((_req, res) => res.status(200).send('retrieved account statistics')),
  getAccountWatchingVelocity: jest.fn((_req, res) => res.status(200).send('retrieved velocity')),
  getAccountActivityTimeline: jest.fn((_req, res) => res.status(200).send('retrieved activity timeline')),
  getAccountBingeWatchingStats: jest.fn((_req, res) => res.status(200).send('retrieved binge stats')),
  getAccountWatchStreakStats: jest.fn((_req, res) => res.status(200).send('retrieved streak stats')),
  getAccountTimeToWatchStats: jest.fn((_req, res) => res.status(200).send('retrieved time to watch')),
  getAccountSeasonalViewingStats: jest.fn((_req, res) => res.status(200).send('retrieved seasonal stats')),
  getAccountMilestoneStats: jest.fn((_req, res) => res.status(200).send('retrieved milestones')),
  getAccountContentDepthStats: jest.fn((_req, res) => res.status(200).send('retrieved content depth')),
  getAccountContentDiscoveryStats: jest.fn((_req, res) => res.status(200).send('retrieved content discovery')),
  getAccountAbandonmentRiskStats: jest.fn((_req, res) => res.status(200).send('retrieved abandonment risk')),
  getAccountUnairedContentStats: jest.fn((_req, res) => res.status(200).send('retrieved unaired content')),
  getProfileComparison: jest.fn((_req, res) => res.status(200).send('retrieved profile comparison')),
}));

jest.mock('@ajgifford/keepwatching-common-server', () => ({
  validateSchema: () => (_req: any, _res: any, next: () => any) => next(),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('AccountStatisticsRouter', () => {
  it('GET /api/v1/accounts/:accountId/statistics', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved account statistics');
  });

  it('GET /api/v1/accounts/:accountId/statistics/velocity', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/velocity').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved velocity');
  });

  it('GET /api/v1/accounts/:accountId/statistics/activity/timeline', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/activity/timeline').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved activity timeline');
  });

  it('GET /api/v1/accounts/:accountId/statistics/binge', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/binge').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved binge stats');
  });

  it('GET /api/v1/accounts/:accountId/statistics/streaks', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/streaks').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved streak stats');
  });

  it('GET /api/v1/accounts/:accountId/statistics/time-to-watch', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/time-to-watch').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved time to watch');
  });

  it('GET /api/v1/accounts/:accountId/statistics/seasonal', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/seasonal').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved seasonal stats');
  });

  it('GET /api/v1/accounts/:accountId/statistics/milestones', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/milestones').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved milestones');
  });

  it('GET /api/v1/accounts/:accountId/statistics/content-depth', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/content-depth').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved content depth');
  });

  it('GET /api/v1/accounts/:accountId/statistics/content-discovery', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/content-discovery').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved content discovery');
  });

  it('GET /api/v1/accounts/:accountId/statistics/abandonment-risk', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/abandonment-risk').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved abandonment risk');
  });

  it('GET /api/v1/accounts/:accountId/statistics/unaired-content', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/unaired-content').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved unaired content');
  });

  it('GET /api/v1/accounts/:accountId/statistics/profile-comparison', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics/profile-comparison').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved profile comparison');
  });
});
