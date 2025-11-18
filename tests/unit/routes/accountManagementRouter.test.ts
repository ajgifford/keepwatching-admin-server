import { describe, expect, it } from '@jest/globals';
import router from '@routes/accountManagementRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/accountManagementController', () => ({
  getAccounts: jest.fn((_req, res) => res.status(200).send('retrieved account')),
  editAccount: jest.fn((_req, res) => res.status(200).send('account edited')),
  deleteAccount: jest.fn((_req, res) => res.status(200).send('account deleted')),
  getProfiles: jest.fn((_req, res) => res.status(200).send('retrieved profile')),
  editProfile: jest.fn((_req, res) => res.status(200).send('profile edited')),
  deleteProfile: jest.fn((_req, res) => res.status(200).send('profile deleted')),
  getProfileShowsList: jest.fn((_req, res) => res.status(200).send('retrieved profile shows')),
  getProfileMoviesList: jest.fn((_req, res) => res.status(200).send('retrieved profile movies')),
  verifyEmail: jest.fn((_req, res) => res.status(200).send('email verified')),
  getAccountPreferences: jest.fn((_req, res) => res.status(200).send('retrieved account preferences')),
}));

jest.mock('@ajgifford/keepwatching-common-server', () => ({
  validateSchema: () => (_req: any, _res: any, next: () => any) => next(),
  validateRequest: () => (_req: any, _res: any, next: () => any) => next(),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('AccountManagementRouter', () => {
  it('GET /api/v1/accounts', async () => {
    const res = await request(app).get('/api/v1/accounts').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved account');
  });

  it('PUT /api/v1/accounts/:accountId', async () => {
    const res = await request(app).put('/api/v1/accounts/123').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('account edited');
  });

  it('DELETE /api/v1/accounts/:accountId', async () => {
    const res = await request(app).delete('/api/v1/accounts/123').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('account deleted');
  });

  it('GET /api/v1/accounts/:accountId/profiles', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved profile');
  });

  it('PUT /api/v1/accounts/:accountId/profiles/:profileId', async () => {
    const res = await request(app).put('/api/v1/accounts/123/profiles/1001').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('profile edited');
  });

  it('DELETE /api/v1/accounts/:accountId/profiles/:profileId', async () => {
    const res = await request(app).delete('/api/v1/accounts/123/profiles/1001').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('profile deleted');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/shows', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/1001/shows').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved profile shows');
  });

  it('GET /api/v1/accounts/:accountId/profiles/:profileId/movies', async () => {
    const res = await request(app).get('/api/v1/accounts/123/profiles/1001/movies').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved profile movies');
  });

  it('POST /api/v1/accounts/:accountUid/verify-email', async () => {
    const res = await request(app).post('/api/v1/accounts/u123/verify-email').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('email verified');
  });

  it('GET /api/v1/accounts/:accountId/preferences', async () => {
    const res = await request(app).get('/api/v1/accounts/123/preferences').send({});
    expect(res.status).toBe(200);
    expect(res.text).toBe('retrieved account preferences');
  });
});
