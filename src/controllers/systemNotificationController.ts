import { BadRequestError } from '@ajgifford/keepwatching-common-server';
import { notificationsService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';

const notificationBodySchema = z
  .object({
    message: z.string().min(5, 'Message must be at least 5 characters long'),
    startDate: z.string().datetime({ message: 'Start date must be ISO format' }),
    endDate: z.string().datetime({ message: 'End date must be ISO format' }),
    sendToAll: z.boolean(),
    accountId: z.nullable(z.number()),
  })
  .superRefine((data, ctx) => {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const now = new Date();

    if (startDate <= now) {
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
  });

const notificationIdQuerySchema = z.object({
  notificationId: z.string().regex(/^\d+$/, 'Notification ID must be numeric').transform(Number),
});

const getExpiredParamSchema = z.object({
  expired: z.coerce.boolean(),
});

// GET /api/v1/systemNotifications
export const getAllSystemNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { expired } = getExpiredParamSchema.parse(req.query);
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
    const { message, startDate, endDate, sendToAll, accountId } = notificationBodySchema.parse(req.body);
    await notificationsService.addNotification(message, startDate, endDate, sendToAll, accountId);
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
    const { message, startDate, endDate, sendToAll, accountId } = notificationBodySchema.parse(req.body);
    const notification = await notificationsService.updateNotification(
      message,
      startDate,
      endDate,
      sendToAll,
      accountId,
      notificationId,
    );
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
