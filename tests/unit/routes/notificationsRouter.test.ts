import { describe, expect, it } from '@jest/globals';
import router from '@routes/notificationsRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/notificationController', () => ({
  getAllNotifications: jest.fn((_req, res) => res.status(200).send('retrieved notifications')),
  addNotification: jest.fn((_req, res) => res.status(200).send('notification added')),
  updateNotification: jest.fn((_req, res) => res.status(200).send('notification updated')),
  deleteNotification: jest.fn((_req, res) => res.status(200).send('notification deleted')),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('NotificationsRouter', () => {
  it('GET /api/v1/notifications', async () => {
    const res = await request(app).get('/api/v1/notifications').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved notifications');
  });

  it('POST /api/v1/notifications', async () => {
    const res = await request(app).post('/api/v1/notifications').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('notification added');
  });

  it('PUT /api/v1/notifications/:notificationId', async () => {
    const res = await request(app).put('/api/v1/notifications/456').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('notification updated');
  });

  it('DELETE /api/v1/notifications/:notificationId', async () => {
    const res = await request(app).delete('/api/v1/notifications/456').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('notification deleted');
  });
});
