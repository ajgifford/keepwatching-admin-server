import { describe, expect, it } from '@jest/globals';
import router from '@routes/servicesRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/servicesController', () => ({
  getServicesHealth: jest.fn((_req, res) => res.status(200).send('retrieved services health')),
  getDBHealth: jest.fn((_req, res) => res.status(200).send('retrieved database health')),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('ServicesRouter', () => {
  it('GET /api/v1/services/health', async () => {
    const res = await request(app).get('/api/v1/services/health').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved services health');
  });

  it('GET /api/v1/services/db-health', async () => {
    const res = await request(app).get('/api/v1/services/db-health').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved database health');
  });
});
