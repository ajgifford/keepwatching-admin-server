import { describe, expect, it } from '@jest/globals';
import router from '@routes/emailRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/emailController', () => ({
  previewWeeklyEmailByAccount: jest.fn((_req, res) => res.status(200).send('email preview generated')),
  sendWeeklyDigestEmailByAccount: jest.fn((_req, res) => res.status(200).send('digest email sent')),
  sendWeeklyDiscoverEmailByAccount: jest.fn((_req, res) => res.status(200).send('discover email sent')),
  sendWeeklyEmailByAccount: jest.fn((_req, res) => res.status(200).send('weekly email sent')),
  sendWeeklyEmailToAll: jest.fn((_req, res) => res.status(200).send('weekly email sent to all')),
  getEmailTemplates: jest.fn((_req, res) => res.status(200).send('retrieved email templates')),
  createEmailTemplate: jest.fn((_req, res) => res.status(200).send('email template created')),
  updateEmailTemplate: jest.fn((_req, res) => res.status(200).send('email template updated')),
  deleteEmailTemplate: jest.fn((_req, res) => res.status(200).send('email template deleted')),
  getEmails: jest.fn((_req, res) => res.status(200).send('retrieved emails')),
  sendEmail: jest.fn((_req, res) => res.status(200).send('email sent')),
  deleteEmail: jest.fn((_req, res) => res.status(200).send('email deleted')),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('EmailRouter', () => {
  describe('Weekly Email Routes', () => {
    it('POST /api/v1/admin/email/digest/preview-account', async () => {
      const res = await request(app).post('/api/v1/admin/email/digest/preview-account').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('email preview generated');
    });

    it('POST /api/v1/admin/email/digest/send-account', async () => {
      const res = await request(app).post('/api/v1/admin/email/digest/send-account').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('digest email sent');
    });

    it('POST /api/v1/admin/email/discover/send-account', async () => {
      const res = await request(app).post('/api/v1/admin/email/discover/send-account').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('discover email sent');
    });

    it('POST /api/v1/admin/email/weekly/send-account', async () => {
      const res = await request(app).post('/api/v1/admin/email/weekly/send-account').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('weekly email sent');
    });

    it('POST /api/v1/admin/email/weekly/send-all', async () => {
      const res = await request(app).post('/api/v1/admin/email/weekly/send-all').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('weekly email sent to all');
    });
  });

  describe('Email Template Routes', () => {
    it('GET /api/v1/admin/email/templates', async () => {
      const res = await request(app).get('/api/v1/admin/email/templates').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved email templates');
    });

    it('POST /api/v1/admin/email/templates', async () => {
      const res = await request(app).post('/api/v1/admin/email/templates').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('email template created');
    });

    it('PUT /api/v1/admin/email/templates/:templateId', async () => {
      const res = await request(app).put('/api/v1/admin/email/templates/123').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('email template updated');
    });

    it('DELETE /api/v1/admin/email/templates/:templateId', async () => {
      const res = await request(app).delete('/api/v1/admin/email/templates/123').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('email template deleted');
    });
  });

  describe('Email Management Routes', () => {
    it('GET /api/v1/admin/email/emails', async () => {
      const res = await request(app).get('/api/v1/admin/email/emails').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved emails');
    });

    it('POST /api/v1/admin/email/emails', async () => {
      const res = await request(app).post('/api/v1/admin/email/emails').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('email sent');
    });

    it('DELETE /api/v1/admin/email/emails/:emailId', async () => {
      const res = await request(app).delete('/api/v1/admin/email/emails/456').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('email deleted');
    });
  });
});
