import { BadRequestError } from '@ajgifford/keepwatching-common-server';
import { notificationsService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';

const baseNotificationBodySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long'),
  message: z.string().min(5, 'Message must be at least 5 characters long'),
  type: z.enum(['tv', 'movie', 'issue', 'general', 'feature'], {
    errorMap: () => ({ message: 'Type must be one of: tv, movie, issue, general, feature' }),
  }),
  startDate: z.string().datetime({ message: 'Start date must be ISO format' }),
  endDate: z.string().datetime({ message: 'End date must be ISO format' }),
  sendToAll: z.boolean(),
  accountId: z.nullable(z.number()),
});

const commonValidation = (data: any, ctx: any, requireFutureStartDate: boolean = true) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const now = new Date();

  if (requireFutureStartDate && startDate <= now) {
    ctx.addIssue({
      path: ['startDate'],
      code: z.ZodIssueCode.custom,
      message: 'Start date must be in the future',
    });
  }

  if (endDate <= startDate) {
    ctx.addIssue({
      path: ['endDate'],
      code: z.ZodIssueCode.custom,
      message: 'End date must be after start date',
    });
  }

  if (data.sendToAll && data.accountId !== null) {
    ctx.addIssue({
      path: ['accountId'],
      code: z.ZodIssueCode.custom,
      message: 'Account ID must be null if sendToAll is true',
    });
  }

  if (!data.sendToAll && (data.accountId === null || typeof data.accountId !== 'number')) {
    ctx.addIssue({
      path: ['accountId'],
      code: z.ZodIssueCode.custom,
      message: 'Account ID must be a number if sendToAll is false',
    });
  }
};

const notificationBodySchema = baseNotificationBodySchema.superRefine((data, ctx) => {
  commonValidation(data, ctx, true);
});

const updateNotificationBodySchema = baseNotificationBodySchema.superRefine((data, ctx) => {
  commonValidation(data, ctx, false);
});

const notificationIdQuerySchema = z.object({
  notificationId: z.string().regex(/^\d+$/, 'Notification ID must be numeric').transform(Number),
});

const getNotificationsQuerySchema = z.object({
  expired: z
    .union([z.string(), z.boolean(), z.undefined()])
    .transform((val) => {
      if (val === undefined) return false; // Default to false when not provided
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        const lower = val.toLowerCase();
        return lower === 'true' || lower === '1';
      }
      return false;
    })
    .optional()
    .default(false),
});

// GET /api/v1/systemNotifications
export const getAllSystemNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = getNotificationsQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      throw new BadRequestError(`Invalid query parameters: ${queryResult.error.errors[0].message}`);
    }

    const { expired } = queryResult.data;
    const notifications = await notificationsService.getAllNotifications(expired);
    res.status(200).json({ message: 'Retrieved all notifications', results: notifications });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors[0].message);
    }
    next(error);
  }
});

// POST /api/v1/systemNotifications
export const addSystemNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message, startDate, endDate, sendToAll, accountId, type } = notificationBodySchema.parse(req.body);
    await notificationsService.addNotification({ title, message, startDate, endDate, sendToAll, accountId, type });
    res.status(200).json({ message: 'Notification added' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors[0].message);
    }
    next(error);
  }
});

// PUT /api/v1/systemNotifications/:notificationId
export const updateSystemNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = notificationIdQuerySchema.parse(req.params);
    const { title, message, startDate, endDate, sendToAll, accountId, type } = updateNotificationBodySchema.parse(
      req.body,
    );
    const notification = await notificationsService.updateNotification({
      title,
      message,
      startDate,
      endDate,
      sendToAll,
      accountId,
      type,
      id: notificationId,
    });
    res.status(200).json({ message: 'Notification updated successfully', result: notification });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors[0].message);
    }
    next(error);
  }
});

// DELETE /api/v1/systemNotifications/:notificationId
export const deleteSystemNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = notificationIdQuerySchema.parse(req.params);
    await notificationsService.deleteNotification(notificationId);
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors[0].message);
    }
    next(error);
  }
});
