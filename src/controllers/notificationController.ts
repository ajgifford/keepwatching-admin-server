import { BadRequestError } from '@ajgifford/keepwatching-common-server';
import {
  getAllNotificationsQuerySchema,
  notificationBodySchema,
  notificationIdParamSchema,
  updateNotificationBodySchema,
} from '@ajgifford/keepwatching-common-server/schema';
import { notificationsService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';

// GET /api/v1/notifications
export const getAllNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = getAllNotificationsQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      throw new BadRequestError(`Invalid query parameters: ${queryResult.error.errors[0].message}`);
    }

    const { page, pageSize, ...filterOptions } = queryResult.data;
    const offset = (page - 1) * pageSize;

    const response = await notificationsService.getAllNotifications(filterOptions, page, offset, pageSize);
    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors[0].message);
    }
    next(error);
  }
});

// POST /api/v1/notifications
export const addNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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

// PUT /api/v1/notifications/:notificationId
export const updateNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = notificationIdParamSchema.parse(req.params);
    const { title, message, startDate, endDate, sendToAll, accountId, type } = updateNotificationBodySchema.parse(
      req.body,
    );
    await notificationsService.updateNotification({
      title,
      message,
      startDate,
      endDate,
      sendToAll,
      accountId,
      type,
      id: notificationId,
    });
    res.status(200).json({ message: 'Notification updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors[0].message);
    }
    next(error);
  }
});

// DELETE /api/v1/notifications/:notificationId
export const deleteNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { notificationId } = notificationIdParamSchema.parse(req.params);
    await notificationsService.deleteNotification(notificationId);
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors[0].message);
    }
    next(error);
  }
});
