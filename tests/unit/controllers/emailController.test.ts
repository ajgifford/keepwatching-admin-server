import {
  sendWeeklyDigestEmailByAccount,
  sendWeeklyDiscoverEmailByAccount,
  sendWeeklyEmailByAccount,
  previewWeeklyEmailByAccount,
  sendWeeklyEmailToAll,
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getEmails,
  sendEmail,
  deleteEmail,
} from '@controllers/emailController';
import { emailService } from '@ajgifford/keepwatching-common-server/services';
import { isEmailEnabled } from '@ajgifford/keepwatching-common-server/config';
import { cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  emailService: {
    sendDigestEmailToAccount: jest.fn(),
    sendDiscoveryEmailToAccount: jest.fn(),
    sendWeeklyEmailToAccount: jest.fn(),
    previewWeeklyDigestForAccount: jest.fn(),
    sendWeeklyDigests: jest.fn(),
    getEmailTemplates: jest.fn(),
    createEmailTemplate: jest.fn(),
    updateEmailTemplate: jest.fn(),
    deleteEmailTemplate: jest.fn(),
    getAllEmails: jest.fn(),
    sendScheduleOrSaveEmail: jest.fn(),
    deleteEmail: jest.fn(),
  },
}));

jest.mock('@ajgifford/keepwatching-common-server/config', () => ({
  isEmailEnabled: jest.fn(),
}));

jest.mock('@ajgifford/keepwatching-common-server/logger', () => ({
  cliLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@ajgifford/keepwatching-common-server/utils', () => ({
  generateWeeklyDigestHTML: jest.fn().mockReturnValue('<html>Digest Email</html>'),
  generateDiscoveryEmailHTML: jest.fn().mockReturnValue('<html>Discovery Email</html>'),
}));

describe('EmailController', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
    (isEmailEnabled as jest.Mock).mockReturnValue(true);
  });

  describe('sendWeeklyDigestEmailByAccount', () => {
    it('should send weekly digest email successfully', async () => {
      (emailService.sendDigestEmailToAccount as jest.Mock).mockResolvedValue(undefined);

      req.body = { email: 'test@example.com' };

      await sendWeeklyDigestEmailByAccount(req, res, next);

      expect(emailService.sendDigestEmailToAccount).toHaveBeenCalledWith('test@example.com');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Weekly digest email sent successfully to account',
        accountEmail: 'test@example.com',
        note: 'This account had upcoming content and received a digest email',
      });
    });

    it('should return error when email service is disabled', async () => {
      (isEmailEnabled as jest.Mock).mockReturnValue(false);
      req.body = { email: 'test@example.com' };

      await sendWeeklyDigestEmailByAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email service is disabled' });
    });

    it('should return error when email is not provided', async () => {
      req.body = {};

      await sendWeeklyDigestEmailByAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email address is required' });
    });

    it('should handle Account not found error', async () => {
      const error = new Error('Account not found');
      (emailService.sendDigestEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'notfound@example.com' };

      await sendWeeklyDigestEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send digest to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
    });

    it('should handle Account has no profiles error', async () => {
      const error = new Error('Account has no profiles');
      (emailService.sendDigestEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'test@example.com' };

      await sendWeeklyDigestEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send digest to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account has no profiles' });
    });

    it('should handle no upcoming content error', async () => {
      const error = new Error('Account has no upcoming content');
      (emailService.sendDigestEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'test@example.com' };

      await sendWeeklyDigestEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send digest to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Account has no upcoming content this week',
        suggestion: 'Use /api/admin/send-discovery-to-account instead',
      });
    });

    it('should handle generic errors', async () => {
      const error = new Error('Unknown error');
      (emailService.sendDigestEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'test@example.com' };

      await sendWeeklyDigestEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send digest to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to send digest email' });
    });
  });

  describe('sendWeeklyDiscoverEmailByAccount', () => {
    it('should send weekly discover email successfully', async () => {
      (emailService.sendDiscoveryEmailToAccount as jest.Mock).mockResolvedValue(undefined);

      req.body = { email: 'test@example.com' };

      await sendWeeklyDiscoverEmailByAccount(req, res, next);

      expect(emailService.sendDiscoveryEmailToAccount).toHaveBeenCalledWith('test@example.com');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Weekly discover email sent successfully to account',
        accountEmail: 'test@example.com',
        note: 'This account did not have upcoming content and received a discover email',
      });
    });

    it('should return error when email service is disabled', async () => {
      (isEmailEnabled as jest.Mock).mockReturnValue(false);
      req.body = { email: 'test@example.com' };

      await sendWeeklyDiscoverEmailByAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email service is disabled' });
    });

    it('should return error when email is not provided', async () => {
      req.body = {};

      await sendWeeklyDiscoverEmailByAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email address is required' });
    });

    it('should handle Account not found error', async () => {
      const error = new Error('Account not found');
      (emailService.sendDiscoveryEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'notfound@example.com' };

      await sendWeeklyDiscoverEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send discover to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
    });

    it('should handle Account has no profiles error', async () => {
      const error = new Error('Account has no profiles');
      (emailService.sendDiscoveryEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'test@example.com' };

      await sendWeeklyDiscoverEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send discover to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account has no profiles' });
    });

    it('should handle generic errors', async () => {
      const error = new Error('Unknown error');
      (emailService.sendDiscoveryEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'test@example.com' };

      await sendWeeklyDiscoverEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send discover to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to send discover email' });
    });
  });

  describe('sendWeeklyEmailByAccount', () => {
    it('should send appropriate weekly email based on account data', async () => {
      (emailService.sendWeeklyEmailToAccount as jest.Mock).mockResolvedValue({
        emailType: 'digest',
        hasContent: true,
      });

      req.body = { email: 'test@example.com' };

      await sendWeeklyEmailByAccount(req, res, next);

      expect(emailService.sendWeeklyEmailToAccount).toHaveBeenCalledWith('test@example.com');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'digest',
          hasUpcomingContent: true,
        }),
      );
    });

    it('should return error when email service is disabled', async () => {
      (isEmailEnabled as jest.Mock).mockReturnValue(false);
      req.body = { email: 'test@example.com' };

      await sendWeeklyEmailByAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email service is disabled' });
    });

    it('should return error when email is not provided', async () => {
      req.body = {};

      await sendWeeklyEmailByAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email address is required' });
    });

    it('should handle Account not found error', async () => {
      const error = new Error('Account not found');
      (emailService.sendWeeklyEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'notfound@example.com' };

      await sendWeeklyEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send email to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
    });

    it('should handle Account has no profiles error', async () => {
      const error = new Error('Account has no profiles');
      (emailService.sendWeeklyEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'test@example.com' };

      await sendWeeklyEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send email to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account has no profiles' });
    });

    it('should handle generic errors', async () => {
      const error = new Error('Unknown error');
      (emailService.sendWeeklyEmailToAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'test@example.com' };

      await sendWeeklyEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Send email to account failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to send email to account' });
    });
  });

  describe('previewWeeklyEmailByAccount', () => {
    it('should preview digest email with HTML content', async () => {
      (emailService.previewWeeklyDigestForAccount as jest.Mock).mockResolvedValue({
        emailType: 'digest',
        digestData: {
          accountEmail: 'test@example.com',
          shows: [],
          profileData: [],
        },
      });

      req.body = { email: 'test@example.com' };

      await previewWeeklyEmailByAccount(req, res, next);

      expect(emailService.previewWeeklyDigestForAccount).toHaveBeenCalledWith('test@example.com');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(res.send).toHaveBeenCalledWith('<html>Digest Email</html>');
    });

    it('should preview discovery email with HTML content', async () => {
      (emailService.previewWeeklyDigestForAccount as jest.Mock).mockResolvedValue({
        emailType: 'discovery',
        discoveryData: {
          accountEmail: 'test@example.com',
          popularShows: [],
        },
      });

      req.body = { email: 'test@example.com' };

      await previewWeeklyEmailByAccount(req, res, next);

      expect(emailService.previewWeeklyDigestForAccount).toHaveBeenCalledWith('test@example.com');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(res.send).toHaveBeenCalledWith('<html>Discovery Email</html>');
    });

    it('should return error when email service is disabled', async () => {
      (isEmailEnabled as jest.Mock).mockReturnValue(false);
      req.body = { email: 'test@example.com' };

      await previewWeeklyEmailByAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email service is disabled' });
    });

    it('should return error when email is not provided', async () => {
      req.body = {};

      await previewWeeklyEmailByAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email address is required' });
    });

    it('should handle unable to generate email content', async () => {
      (emailService.previewWeeklyDigestForAccount as jest.Mock).mockResolvedValue({
        emailType: 'unknown',
      });
      req.body = { email: 'test@example.com' };

      await previewWeeklyEmailByAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unable to generate email content' });
    });

    it('should handle Account not found error', async () => {
      const error = new Error('Account not found');
      (emailService.previewWeeklyDigestForAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'notfound@example.com' };

      await previewWeeklyEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Preview account email HTML failed:', error);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
    });

    it('should handle Account has no profiles error', async () => {
      const error = new Error('Account has no profiles');
      (emailService.previewWeeklyDigestForAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'test@example.com' };

      await previewWeeklyEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Preview account email HTML failed:', error);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account has no profiles' });
    });

    it('should handle generic errors', async () => {
      const error = new Error('Unknown error');
      (emailService.previewWeeklyDigestForAccount as jest.Mock).mockRejectedValue(error);
      req.body = { email: 'test@example.com' };

      await previewWeeklyEmailByAccount(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Preview account email HTML failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to generate email preview' });
    });
  });

  describe('sendWeeklyEmailToAll', () => {
    it('should trigger weekly emails for all accounts', async () => {
      (emailService.sendWeeklyDigests as jest.Mock).mockResolvedValue(undefined);

      await sendWeeklyEmailToAll(req, res, next);

      expect(emailService.sendWeeklyDigests).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Weekly digest emails triggered successfully',
      });
    });

    it('should return error when email service is disabled', async () => {
      (isEmailEnabled as jest.Mock).mockReturnValue(false);

      await sendWeeklyEmailToAll(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email service is disabled' });
    });

    it('should handle errors when sending weekly emails', async () => {
      const error = new Error('Send failed');
      (emailService.sendWeeklyDigests as jest.Mock).mockRejectedValue(error);

      await sendWeeklyEmailToAll(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Manual email digest failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to send weekly digest emails' });
    });
  });

  describe('getEmailTemplates', () => {
    it('should return email templates', async () => {
      const mockTemplates = [
        { id: 1, name: 'Template 1', subject: 'Subject 1' },
        { id: 2, name: 'Template 2', subject: 'Subject 2' },
      ];
      (emailService.getEmailTemplates as jest.Mock).mockResolvedValue(mockTemplates);

      await getEmailTemplates(req, res, next);

      expect(emailService.getEmailTemplates).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email templates retrieved successfully',
        templates: mockTemplates,
      });
    });

    it('should handle errors when retrieving templates', async () => {
      const error = new Error('Database error');
      (emailService.getEmailTemplates as jest.Mock).mockRejectedValue(error);

      await getEmailTemplates(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Email template retrieval failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve email templates' });
    });
  });

  describe('createEmailTemplate', () => {
    it('should create email template successfully', async () => {
      (emailService.createEmailTemplate as jest.Mock).mockResolvedValue(true);
      (emailService.getEmailTemplates as jest.Mock).mockResolvedValue([]);

      req.body = {
        name: 'New Template',
        subject: 'New Subject',
        message: 'New Message',
      };

      await createEmailTemplate(req, res, next);

      expect(emailService.createEmailTemplate).toHaveBeenCalledWith({
        name: 'New Template',
        subject: 'New Subject',
        message: 'New Message',
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email template created',
        templates: [],
      });
    });

    it('should handle template creation failure', async () => {
      (emailService.createEmailTemplate as jest.Mock).mockResolvedValue(false);

      req.body = {
        name: 'New Template',
        subject: 'New Subject',
        message: 'New Message',
      };

      await createEmailTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create an email template' });
    });

    it('should handle errors during template creation', async () => {
      const error = new Error('Database error');
      (emailService.createEmailTemplate as jest.Mock).mockRejectedValue(error);

      req.body = {
        name: 'New Template',
        subject: 'New Subject',
        message: 'New Message',
      };

      await createEmailTemplate(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Email template creation failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create an email template' });
    });
  });

  describe('updateEmailTemplate', () => {
    it('should update email template successfully', async () => {
      (emailService.updateEmailTemplate as jest.Mock).mockResolvedValue(true);
      (emailService.getEmailTemplates as jest.Mock).mockResolvedValue([]);

      req.params = { templateId: '1' };
      req.body = {
        name: 'Updated Template',
        subject: 'Updated Subject',
        message: 'Updated Message',
      };

      await updateEmailTemplate(req, res, next);

      expect(emailService.updateEmailTemplate).toHaveBeenCalledWith({
        id: 1,
        name: 'Updated Template',
        subject: 'Updated Subject',
        message: 'Updated Message',
      });
    });

    it('should handle template update failure', async () => {
      (emailService.updateEmailTemplate as jest.Mock).mockResolvedValue(false);

      req.params = { templateId: '1' };
      req.body = {
        name: 'Updated Template',
        subject: 'Updated Subject',
        message: 'Updated Message',
      };

      await updateEmailTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update an email template' });
    });

    it('should handle errors during template update', async () => {
      const error = new Error('Database error');
      (emailService.updateEmailTemplate as jest.Mock).mockRejectedValue(error);

      req.params = { templateId: '1' };
      req.body = {
        name: 'Updated Template',
        subject: 'Updated Subject',
        message: 'Updated Message',
      };

      await updateEmailTemplate(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Email template update failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update an email templates' });
    });
  });

  describe('deleteEmailTemplate', () => {
    it('should delete email template successfully', async () => {
      (emailService.deleteEmailTemplate as jest.Mock).mockResolvedValue(true);
      (emailService.getEmailTemplates as jest.Mock).mockResolvedValue([]);

      req.params = { templateId: '1' };

      await deleteEmailTemplate(req, res, next);

      expect(emailService.deleteEmailTemplate).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email template deleted',
        templates: [],
      });
    });

    it('should handle template deletion failure', async () => {
      (emailService.deleteEmailTemplate as jest.Mock).mockResolvedValue(false);

      req.params = { templateId: '1' };

      await deleteEmailTemplate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete an email template' });
    });

    it('should handle errors during template deletion', async () => {
      const error = new Error('Database error');
      (emailService.deleteEmailTemplate as jest.Mock).mockRejectedValue(error);

      req.params = { templateId: '1' };

      await deleteEmailTemplate(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Email template deletion failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete an email template' });
    });
  });

  describe('getEmails', () => {
    it('should return emails with default pagination', async () => {
      const mockEmails = {
        emails: [
          { id: 1, subject: 'Email 1', sentAt: '2025-01-01' },
          { id: 2, subject: 'Email 2', sentAt: '2025-01-02' },
        ],
        total: 2,
      };
      (emailService.getAllEmails as jest.Mock).mockResolvedValue(mockEmails);

      req.query = {};

      await getEmails(req, res, next);

      expect(emailService.getAllEmails).toHaveBeenCalledWith(1, 0, 50);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Emails retrieved successfully',
        sentEmails: mockEmails,
      });
    });

    it('should return emails with custom pagination', async () => {
      const mockEmails = {
        emails: [{ id: 3, subject: 'Email 3', sentAt: '2025-01-03' }],
        total: 10,
      };
      (emailService.getAllEmails as jest.Mock).mockResolvedValue(mockEmails);

      req.query = { page: '2', limit: '10' };

      await getEmails(req, res, next);

      expect(emailService.getAllEmails).toHaveBeenCalledWith(2, 10, 10);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Emails retrieved successfully',
        sentEmails: mockEmails,
      });
    });

    it('should handle errors when retrieving emails', async () => {
      const error = new Error('Database error');
      (emailService.getAllEmails as jest.Mock).mockRejectedValue(error);

      req.query = {};

      await getEmails(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Emails retrieval failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve emails' });
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      (emailService.sendScheduleOrSaveEmail as jest.Mock).mockResolvedValue(undefined);

      req.body = {
        subject: 'Test Subject',
        message: 'Test Message',
        sendToAll: true,
        recipients: [],
        scheduledDate: null,
        action: 'send',
      };

      await sendEmail(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Email action completed successfully',
      });
    });

    it('should handle errors when sending email', async () => {
      const error = new Error('Send failed');
      (emailService.sendScheduleOrSaveEmail as jest.Mock).mockRejectedValue(error);

      req.body = {
        subject: 'Test Subject',
        message: 'Test Message',
        sendToAll: true,
        recipients: [],
        scheduledDate: null,
        action: 'send',
      };

      await sendEmail(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Email action completed failed', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to take email action' });
    });
  });

  describe('deleteEmail', () => {
    it('should delete email successfully', async () => {
      (emailService.deleteEmail as jest.Mock).mockResolvedValue(true);
      (emailService.getEmailTemplates as jest.Mock).mockResolvedValue([]);

      req.params = { emailId: '5' };

      await deleteEmail(req, res, next);

      expect(emailService.deleteEmail).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email deleted',
        emails: [],
      });
    });

    it('should handle deletion failure', async () => {
      (emailService.deleteEmail as jest.Mock).mockResolvedValue(false);

      req.params = { emailId: '5' };

      await deleteEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete an email' });
    });

    it('should handle errors during email deletion', async () => {
      const error = new Error('Database error');
      (emailService.deleteEmail as jest.Mock).mockRejectedValue(error);

      req.params = { emailId: '5' };

      await deleteEmail(req, res, next);

      expect(cliLogger.error).toHaveBeenCalledWith('Email deletion failed:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete an email' });
    });
  });
});
