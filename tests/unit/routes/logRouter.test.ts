import { describe, expect, it } from '@jest/globals';
import router from '@routes/logRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/logsController', () => ({
  getLogs: jest.fn((_req, res) => res.status(200).send('retrieved logs')),
  streamLogs: jest.fn((_req, res) => res.status(200).send('streaming logs')),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('LogRouter', () => {
  it('GET /api/v1/logs', async () => {
    const res = await request(app).get('/api/v1/logs').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved logs');
  });

  it('GET /api/v1/logs/stream', async () => {
    const res = await request(app).get('/api/v1/logs/stream').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('streaming logs');
  });
});
