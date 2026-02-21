import { describe, expect, it } from '@jest/globals';
import router from '@routes/adminRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/adminController', () => ({
  getServicesHealth: jest.fn((_req, res) => res.status(200).send('retrieved admin health')),
  getSummaryCounts: jest.fn((_req, res) => res.status(200).send('retrieved summary counts')),
  getSiteStatus: jest.fn((_req, res) => res.status(200).send('retrieved site status')),
  restartService: jest.fn((_req, res) => res.status(200).send('restarted server')),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('AdminRouter', () => {
  it('GET /api/v1/admin/health', async () => {
    const res = await request(app).get('/api/v1/admin/health').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved admin health');
  });

  it('GET /api/v1/admin/site-status', async () => {
    const res = await request(app).get('/api/v1/admin/site-status').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved site status');
  });

  it('GET /api/v1/admin/stats', async () => {
    const res = await request(app).get('/api/v1/admin/summary-counts').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved summary counts');
  });

  it('POST /api/v1/admin/services/:service/restart', async () => {
    const res = await request(app).post('/api/v1/admin/services/pm2/restart').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('restarted server');
  });
});
