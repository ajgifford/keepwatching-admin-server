import { BadRequestError } from './errorMiddleware';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Profile name must be at least 2 characters')
    .max(50, 'Profile name must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s-_]+$/, 'Profile name can only contain letters, numbers, spaces, hyphens, and underscores'),
});

const accountSchema = z.object({
  account_name: z
    .string()
    .min(2, 'Account name must be at least 2 characters')
    .max(100, 'Account name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s-_]+$/, 'Account name can only contain letters, numbers, spaces, hyphens, and underscores'),
  default_profile_id: z.number().int().positive('Default profile ID must be a positive integer'),
});

export const validateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await accountSchema.parseAsync(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors[0].message);
    }
    next(error);
  }
};

export const validateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await profileSchema.parseAsync(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError(error.errors[0].message);
    }
    next(error);
  }
};
