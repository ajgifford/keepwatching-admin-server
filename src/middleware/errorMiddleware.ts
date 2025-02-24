import { logger } from '../logger/logger';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Custom error types
export class CustomError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public errorCode: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export class BadRequestError extends CustomError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string) {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string) {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class NoAffectedRowsError extends CustomError {
  constructor(message: string) {
    super(message, 400, 'NO_AFFECTED_ROWS');
  }
}

export class DatabaseError extends CustomError {
  constructor(message: string, originalError: any) {
    super(message, 500, 'DATABASE_ERROR');
    logger.error('Database Error:', {
      message,
      originalError,
      stack: originalError.stack,
    });
  }
}

// Global error handler middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = uuidv4();

  // Log error details
  logger.error('Error occurred:', {
    requestId,
    path: req.path,
    method: req.method,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (error instanceof CustomError) {
    res.status(error.statusCode).json({
      status: 'error',
      requestId,
      error: {
        code: error.errorCode,
        message: error.message,
      },
    });
  } else {
    res.status(500).json({
      status: 'error',
      requestId,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
};
