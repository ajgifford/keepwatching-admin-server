import { describe, expect, it } from '@jest/globals';
import router from '@routes/adminRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/adminController', () => ({
  getServicesHealth: jest.fn((_req, res) => res.status(200).send('retrieved admin health')),
  getAdminStats: jest.fn((_req, res) => res.status(200).send('retrieved admin stats')),
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

  it('GET /api/v1/admin/stats', async () => {
    const res = await request(app).get('/api/v1/admin/stats').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved admin stats');
  });
});
