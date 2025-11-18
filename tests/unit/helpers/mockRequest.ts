import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

export const mockRequest = (options: {
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: Record<string, any>;
  headers?: Record<string, any>;
} = {}): Partial<Request> => {
  return {
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || {},
  };
};

export const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn<any>().mockReturnThis(),
    json: jest.fn<any>().mockReturnThis(),
    send: jest.fn<any>().mockReturnThis(),
    sendStatus: jest.fn<any>().mockReturnThis(),
  };
  return res;
};

export const mockNext = (): NextFunction => {
  return jest.fn<any>() as NextFunction;
};
