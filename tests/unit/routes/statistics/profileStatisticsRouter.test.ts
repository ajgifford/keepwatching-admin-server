import { describe, expect, it } from '@jest/globals';
import router from '@routes/statistics/profileStatisticsRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/profileStatisticsController', () => ({
  getProfileStatistics: jest.fn((_req, res) => res.status(200).send('retrieved profile statistics')),
  getWatchingVelocity: jest.fn((_req, res) => res.status(200).send('retrieved velocity')),
  getDailyActivity: jest.fn((_req, res) => res.status(200).send('retrieved daily activity')),
  getWeeklyActivity: jest.fn((_req, res) => res.status(200).send('retrieved weekly activity')),
  getMonthlyActivity: jest.fn((_req, res) => res.status(200).send('retrieved monthly activity')),
  getActivityTimeline: jest.fn((_req, res) => res.status(200).send('retrieved activity timeline')),
  getBingeWatchingStats: jest.fn((_req, res) => res.status(200).send('retrieved binge stats')),
  getWatchStreakStats: jest.fn((_req, res) => res.status(200).send('retrieved streak stats')),
  getTimeToWatchStats: jest.fn((_req, res) => res.status(200).send('retrieved time to watch')),
  getSeasonalViewingStats: jest.fn((_req, res) => res.status(200).send('retrieved seasonal stats')),
  getMilestoneStats: jest.fn((_req, res) => res.status(200).send('retrieved milestones')),
  getContentDepthStats: jest.fn((_req, res) => res.status(200).send('retrieved content depth')),
  getContentDiscoveryStats: jest.fn((_req, res) => res.status(200).send('retrieved content discovery')),
  getAbandonmentRiskStats: jest.fn((_req, res) => res.status(200).send('retrieved abandonment risk')),
  getUnairedContentStats: jest.fn((_req, res) => res.status(200).send('retrieved unaired content')),
}));

jest.mock('@ajgifford/keepwatching-common-server', () => ({
  validateSchema: () => (_req: any, _res: any, next: () => any) => next(),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('ProfileStatisticsRouter', () => {
  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved profile statistics');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/velocity', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/velocity').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved velocity');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/daily', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/activity/daily').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved daily activity');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/weekly', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/activity/weekly').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved weekly activity');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/monthly', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/activity/monthly').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved monthly activity');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/activity/timeline', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/activity/timeline').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved activity timeline');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/binge', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/binge').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved binge stats');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/streaks', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/streaks').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved streak stats');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/time-to-watch', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/time-to-watch').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved time to watch');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/seasonal', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/seasonal').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved seasonal stats');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/milestones', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/milestones').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved milestones');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/content-depth', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/content-depth').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved content depth');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/content-discovery', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/content-discovery').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved content discovery');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/abandonment-risk', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/abandonment-risk').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved abandonment risk');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/statistics/unaired-content', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics/unaired-content').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved unaired content');
  });
});
