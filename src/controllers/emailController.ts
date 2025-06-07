import { isEmailEnabled } from '@ajgifford/keepwatching-common-server/config';
import { cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import { getEmailService } from '@ajgifford/keepwatching-common-server/services';
import { generateDiscoveryEmailHTML, generateWeeklyDigestHTML } from '@ajgifford/keepwatching-common-server/utils';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

/**
 * Manually send the weekly digest email to an account.
 *
 * @route POST /api/v1/admin/send-weekly-digest-account
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

    const emailService = getEmailService();
    await emailService.sendManualDigestEmailToAccount(email);

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
 * @route POST /api/v1/admin/send-weekly-discover-account
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

      const emailService = getEmailService();
      await emailService.sendManualDiscoveryEmailToAccount(email);

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
 * @route POST /api/v1/admin/send-weekly-email-account
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

    const emailService = getEmailService();
    const result = await emailService.sendManualEmailToAccount(email);

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
 * @route POST /api/v1/admin/preview-weekly-email-account
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

    const emailService = getEmailService();
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
 * @route POST /api/v1/admin/send-weekly-email-all
 */
export const sendWeeklyEmailToAll = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isEmailEnabled()) {
      res.status(400).json({ error: 'Email service is disabled' });
      return;
    }

    const emailService = getEmailService();
    await emailService.sendWeeklyDigests();

    res.json({ message: 'Weekly digest emails triggered successfully' });
  } catch (error) {
    cliLogger.error('Manual email digest failed:', error);
    res.status(500).json({ error: 'Failed to send weekly digest emails' });
  }
});
