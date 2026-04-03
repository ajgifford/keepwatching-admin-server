import { describe, expect, it } from '@jest/globals';
import router from '@routes/statisticsRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@routes/statistics/accountStatisticsRouter', () => {
  const express = require('express');
  const r = express.Router();
  r.get('/api/v1/accounts/:accountId/statistics', (_req: any, res: any) =>
    res.status(200).send('account statistics router'),
  );
  return { default: r, __esModule: true };
});

jest.mock('@routes/statistics/profileStatisticsRouter', () => {
  const express = require('express');
  const r = express.Router();
  r.get('/api/v1/accounts/:accountId/profiles/:profileId/statistics', (_req: any, res: any) =>
    res.status(200).send('profile statistics router'),
  );
  return { default: r, __esModule: true };
});

jest.mock('@routes/statistics/adminStatisticsRouter', () => {
  const express = require('express');
  const r = express.Router();
  r.get('/api/v1/admin/statistics/dashboard', (_req: any, res: any) =>
    res.status(200).send('admin statistics router'),
  );
  return { default: r, __esModule: true };
});

const app = express();
app.use(express.json());
app.use(router);

describe('StatisticsRouter', () => {
  it('mounts the account statistics router', async () => {
    const res = await request(app).get('/api/v1/accounts/123/statistics').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('account statistics router');
  });

  it('mounts the profile statistics router', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/456/statistics').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('profile statistics router');
  });

  it('mounts the admin statistics router', async () => {
    const res = await request(app).get('/api/v1/admin/statistics/dashboard').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('admin statistics router');
  });
});
