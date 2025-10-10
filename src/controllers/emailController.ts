import { isEmailEnabled } from '@ajgifford/keepwatching-common-server/config';
import { cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import { emailService } from '@ajgifford/keepwatching-common-server/services';
import { generateDiscoveryEmailHTML, generateWeeklyDigestHTML } from '@ajgifford/keepwatching-common-server/utils';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { off } from 'process';
import { z } from 'zod';

const emailTemplateIdQuerySchema = z.object({
  templateId: z.string().regex(/^\d+$/, 'Email Template ID must be numeric').transform(Number),
});

const createEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
});

const emailIdQuerySchema = z.object({
  emailId: z.string().regex(/^\d+$/, 'Email ID must be numeric').transform(Number),
});

const emailActionEnum = z.enum(['draft', 'send', 'schedule']);

const emailSchema = z
  .object({
    subject: z.string().min(1, 'Subject is required'),
    message: z.string().min(1, 'Message is required'),
    sendToAll: z.boolean(),
    recipients: z.array(z.number().int('Recipient ID must be an integer')),
    scheduledDate: z.string().nullable(),
    action: emailActionEnum,
  })
  .superRefine((data, ctx) => {
    // Validate recipients based on sendToAll
    if (data.sendToAll && data.recipients && data.recipients.length > 0) {
      ctx.addIssue({
        path: ['recipients'],
        code: z.ZodIssueCode.custom,
        message: 'Recipients must be empty when sendToAll is true',
      });
    }

    if (!data.sendToAll && (!data.recipients || data.recipients.length === 0)) {
      ctx.addIssue({
        path: ['recipients'],
        code: z.ZodIssueCode.custom,
        message: 'Recipients must not be empty when sendToAll is false',
      });
    }

    // Validate scheduledDate based on action
    if (data.action === 'schedule') {
      if (!data.scheduledDate) {
        ctx.addIssue({
          path: ['scheduledDate'],
          code: z.ZodIssueCode.custom,
          message: 'scheduledDate is required when action is "schedule"',
        });
      }
    } else if (data.scheduledDate !== null) {
      ctx.addIssue({
        path: ['scheduledDate'],
        code: z.ZodIssueCode.custom,
        message: 'scheduledDate must be null unless action is "schedule"',
      });
    }
  });

/**
 * Manually send the weekly digest email to an account.
 *
 * @route POST /api/v1/admin/email/digest/send-account
 */
export const sendWeeklyDigestEmailByAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isEmailEnabled()) {
      res.status(400).json({ error: 'Email service is disabled' });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    await emailService.sendDigestEmailToAccount(email);

    res.json({
      message: 'Weekly digest email sent successfully to account',
      accountEmail: email,
      note: 'This account had upcoming content and received a digest email',
    });
  } catch (error: any) {
    cliLogger.error('Send digest to account failed:', error);

    if (error.message.includes('Account not found')) {
      res.status(404).json({ error: 'Account not found' });
      return;
    } else if (error.message.includes('has no profiles')) {
      res.status(400).json({ error: 'Account has no profiles' });
      return;
    } else if (error.message.includes('no upcoming content')) {
      res.status(400).json({
        error: 'Account has no upcoming content this week',
        suggestion: 'Use /api/admin/send-discovery-to-account instead',
      });
      return;
    }

    res.status(500).json({ error: 'Failed to send digest email' });
  }
});

/**
 * Manually send the weekly discover email to an account.
 *
 * @route POST /api/v1/admin/email/discover/send-account
 */
export const sendWeeklyDiscoverEmailByAccount = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isEmailEnabled()) {
        res.status(400).json({ error: 'Email service is disabled' });
        return;
      }

      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Email address is required' });
        return;
      }

      await emailService.sendDiscoveryEmailToAccount(email);

      res.json({
        message: 'Weekly discover email sent successfully to account',
        accountEmail: email,
        note: 'This account did not have upcoming content and received a discover email',
      });
    } catch (error: any) {
      cliLogger.error('Send discover to account failed:', error);

      if (error.message.includes('Account not found')) {
        res.status(404).json({ error: 'Account not found' });
        return;
      } else if (error.message.includes('has no profiles')) {
        res.status(400).json({ error: 'Account has no profiles' });
        return;
      } else if (error.message.includes('no upcoming content')) {
        res.status(400).json({
          error: 'Account has no upcoming content this week',
          suggestion: 'Use /api/admin/send-discovery-to-account instead',
        });
        return;
      }

      res.status(500).json({ error: 'Failed to send discover email' });
    }
  },
);

/**
 * Manually send the weekly email to an account, will detect the type of email based on account data.
 *
 * @route POST /api/v1/admin/email/weekly/send-account
 */
export const sendWeeklyEmailByAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isEmailEnabled()) {
      res.status(400).json({ error: 'Email service is disabled' });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    const result = await emailService.sendWeeklyEmailToAccount(email);

    res.json({
      message: `${result.emailType === 'digest' ? 'Weekly digest' : 'Discovery email'} sent successfully`,
      accountEmail: email,
      emailType: result.emailType,
      hasUpcomingContent: result.hasContent,
      description:
        result.emailType === 'digest'
          ? 'Account had upcoming content and received a digest email'
          : 'Account had no upcoming content and received a discovery email',
    });
  } catch (error: any) {
    cliLogger.error('Send email to account failed:', error);

    if (error.message.includes('Account not found')) {
      res.status(404).json({ error: 'Account not found' });
      return;
    } else if (error.message.includes('has no profiles')) {
      res.status(400).json({ error: 'Account has no profiles' });
      return;
    }

    res.status(500).json({ error: 'Failed to send email to account' });
  }
});

/**
 * Preview the weekly email to an account, will detect the type of email based on account data.
 *
 * @route POST /api/v1/admin/email/digest/preview-account
 */
export const previewWeeklyEmailByAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isEmailEnabled()) {
      res.status(400).json({ error: 'Email service is disabled' });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    const preview = await emailService.previewWeeklyDigestForAccount(email);

    let htmlContent: string;

    if (preview.emailType === 'digest' && preview.digestData) {
      htmlContent = generateWeeklyDigestHTML(preview.digestData);
    } else if (preview.emailType === 'discovery' && preview.discoveryData) {
      htmlContent = generateDiscoveryEmailHTML(preview.discoveryData);
    } else {
      res.status(500).json({ error: 'Unable to generate email content' });
      return;
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error: any) {
    cliLogger.error('Preview account email HTML failed:', error);

    if (error.message.includes('Account not found')) {
      res.status(404).json({ error: 'Account not found' });
      return;
    } else if (error.message.includes('has no profiles')) {
      res.status(400).json({ error: 'Account has no profiles' });
      return;
    }

    res.status(500).json({ error: 'Failed to generate email preview' });
  }
});

/**
 * Manually send the weekly email for all accounts
 *
 * @route POST /api/v1/admin/email/weekly/send-all
 */
export const sendWeeklyEmailToAll = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isEmailEnabled()) {
      res.status(400).json({ error: 'Email service is disabled' });
      return;
    }

    await emailService.sendWeeklyDigests();

    res.json({ message: 'Weekly digest emails triggered successfully' });
  } catch (error) {
    cliLogger.error('Manual email digest failed:', error);
    res.status(500).json({ error: 'Failed to send weekly digest emails' });
  }
});

/**
 * Get email templates
 *
 * @route GET /api/v1/admin/email/templates
 */
export const getEmailTemplates = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await emailService.getEmailTemplates();
    res.json({ message: 'Email templates retrieved successfully', templates });
  } catch (error) {
    cliLogger.error('Email template retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve email templates' });
  }
});

/**
 * Create a new email template
 *
 * @route POST /api/v1/admin/email/templates
 */
export const createEmailTemplate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, subject, message } = createEmailTemplateSchema.parse(req.body);
    const created = await emailService.createEmailTemplate({ name, subject, message });

    if (!created) {
      res.status(400).json({ error: 'Failed to create an email template' });
      return;
    }

    const templates = await emailService.getEmailTemplates();
    res.json({ message: 'Email template created', templates });
  } catch (error) {
    cliLogger.error('Email template creation failed:', error);
    res.status(500).json({ error: 'Failed to create an email template' });
  }
});

/**
 * Update an email template
 *
 * @route PUT /api/v1/admin/email/templates/:templateId
 */
export const updateEmailTemplate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId } = emailTemplateIdQuerySchema.parse(req.params);
    const { name, subject, message } = createEmailTemplateSchema.parse(req.body);

    const updated = await emailService.updateEmailTemplate({ id: templateId, name, subject, message });
    if (!updated) {
      res.status(400).json({ error: 'Failed to update an email template' });
      return;
    }
    const templates = await emailService.getEmailTemplates();
    res.json({ message: 'Email template updated', templates });
  } catch (error) {
    cliLogger.error('Email template update failed:', error);
    res.status(500).json({ error: 'Failed to update an email templates' });
  }
});

/**
 * Delete an email template
 *
 * @route DELETE /api/v1/admin/email/templates/:templateId
 */
export const deleteEmailTemplate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId } = emailTemplateIdQuerySchema.parse(req.params);
    const deleted = await emailService.deleteEmailTemplate(templateId);
    if (!deleted) {
      res.status(400).json({ error: 'Failed to delete an email template' });
      return;
    }
    const templates = await emailService.getEmailTemplates();
    res.json({ message: 'Email template deleted', templates });
  } catch (error) {
    cliLogger.error('Email template deletion failed:', error);
    res.status(500).json({ error: 'Failed to delete an email template' });
  }
});

/**
 * Get emails
 *
 * @route GET /api/v1/admin/email/emails
 */
export const getEmails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const sentEmails = await emailService.getAllEmails(page, offset, limit);
    res.json({ message: 'Emails retrieved successfully', sentEmails });
  } catch (error) {
    cliLogger.error('Emails retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve emails' });
  }
});

/**
 * Send an email (can be saving a draft, sending an email now or scheduling an email for a future time)
 *
 * @route POST /api/v1/admin/email/emails
 */
export const sendEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, message, sendToAll, recipients, scheduledDate, action } = emailSchema.parse(req.body);
    await emailService.sendScheduleOrSaveEmail({
      subject,
      message,
      sendToAll,
      recipients,
      scheduledDate,
      action,
    });
    res.json({ message: `Email action completed successfully` });
  } catch (error) {
    cliLogger.error(`Email action completed failed`, error);
    res.status(500).json({ error: 'Failed to take email action' });
  }
});

/**
 * Delete an email
 *
 * @route DELETE /api/v1/admin/email/emails/:emailId
 */
export const deleteEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { emailId } = emailIdQuerySchema.parse(req.params);
    const deleted = await emailService.deleteEmail(emailId);
    if (!deleted) {
      res.status(400).json({ error: 'Failed to delete an email' });
      return;
    }
    const emails = await emailService.getEmailTemplates();
    res.json({ message: 'Email deleted', emails });
  } catch (error) {
    cliLogger.error('Email deletion failed:', error);
    res.status(500).json({ error: 'Failed to delete an email' });
  }
});
