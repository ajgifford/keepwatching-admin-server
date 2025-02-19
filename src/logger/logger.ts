import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

interface ErrorLog {
  message: string;
  stack?: string;
  timestamp: string;
  request?: {
    method: string;
    url: string;
    headers: any;
    body: any;
    query: any;
    params: any;
  };
}

// Add colors to Winston
winston.addColors(colors);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}${info.error ? `\n${JSON.stringify(info.error, null, 2)}` : ''}`,
  ),
);

// Custom format for production
const productionFormat = winston.format.combine(winston.format.timestamp(), winston.format.json());

class Logger {
  private logger: winston.Logger;

  constructor() {
    // Determine current environment
    const env = process.env.NODE_ENV || 'development';
    const logsDir = path.join(process.cwd(), 'logs');

    // Create rotating file transports
    const errorFileTransport = new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
    });

    const combinedFileTransport = new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    });

    // Create logger instance
    this.logger = winston.createLogger({
      level: env === 'development' ? 'debug' : 'info',
      levels,
      format: env === 'development' ? developmentFormat : productionFormat,
      transports: [
        // Always write to rotating files
        errorFileTransport,
        combinedFileTransport,
      ],
    });

    // Add console transport in development
    if (env === 'development') {
      this.logger.add(
        new winston.transports.Console({
          format: developmentFormat,
        }),
      );
    }

    // Handle transport errors
    [errorFileTransport, combinedFileTransport].forEach((transport) => {
      transport.on('error', (error) => {
        console.error('Logger transport error:', error);
      });
    });
  }

  error(message: string, meta?: any) {
    this.logger.error(message, { error: meta });
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, { meta });
  }

  info(message: string, meta?: any) {
    this.logger.info(message, { meta });
  }

  http(message: string, meta?: any) {
    this.logger.http(message, { meta });
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, { meta });
  }

  // Method to log API requests
  logRequest(req: any, res: any, next: any) {
    const startTime = Date.now();

    // Log request
    this.info(`Incoming ${req.method} request to ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.info(`Response sent for ${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });

    next();
  }

  // Method to log errors with stack traces
  logError(error: Error, request?: any) {
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    if (request) {
      errorLog.request = {
        method: request.method,
        url: request.originalUrl,
        headers: request.headers,
        body: request.body,
        query: request.query,
        params: request.params,
      };
    }

    this.error('Application error occurred', errorLog);
  }
}

// Create and export a singleton instance
export const logger = new Logger();

// Export the type for use in other files
export type LoggerType = Logger;
