import 'dotenv/config';

import accountRouter from './routes/accountManagementRouter';
import contentRouter from './routes/contentRouter';
import emailRouter from './routes/emailRouter';
import logRouter from './routes/logRouter';
import notificationRouter from './routes/notificationsRouter';
import servicesRouter from './routes/servicesRouter';
import { errorHandler } from '@ajgifford/keepwatching-common-server';
import {
  getLogDirectory,
  getPort,
  getRateLimitMax,
  getRateLimitTimeWindow,
  getServiceAccountPath,
  getServiceName,
  getUploadDirectory,
  isEmailEnabled,
  validateEmailConfig,
} from '@ajgifford/keepwatching-common-server/config';
import { ErrorMessages, appLogger, cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import { responseInterceptor } from '@ajgifford/keepwatching-common-server/middleware';
import { databaseService, emailService, shutdownJobs } from '@ajgifford/keepwatching-common-server/services';
import {
  GlobalErrorHandler,
  initializeFirebase,
  loadStreamingService,
  shutdownFirebase,
} from '@ajgifford/keepwatching-common-server/utils';
import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import { EventEmitter } from 'events';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createServer } from 'http';

GlobalErrorHandler.initialize();

// Increase max listeners to handle multiple SSE connections
EventEmitter.defaultMaxListeners = 30;

const SERVICE_ACCOUNT_PATH = getServiceAccountPath();
const UPLOADS_DIRECTORY = getUploadDirectory();
const LOG_DIRECTORY = getLogDirectory();
const PORT = getPort();
const SERVICE_NAME = getServiceName();

const app = express();
const httpServer = createServer(app);

const serviceAccount: object = require(SERVICE_ACCOUNT_PATH);
initializeFirebase(serviceAccount, SERVICE_NAME);

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(bodyParser.json());
app.use(responseInterceptor);
app.use('/uploads', express.static(UPLOADS_DIRECTORY));

// Rate limiting
const limiter = rateLimit({
  windowMs: getRateLimitTimeWindow(),
  max: getRateLimitMax(),
});

app.use('/api/', limiter);
app.use(accountRouter);
app.use(contentRouter);
app.use(emailRouter);
app.use(logRouter);
app.use(servicesRouter);
app.use(notificationRouter);

app.use(errorHandler);

const startServer = async () => {
  try {
    cliLogger.info('Fetching initial data from the database...');
    await loadStreamingService();
    cliLogger.info('Data fetched and cached successfully.');

    if (isEmailEnabled()) {
      const emailValidation = validateEmailConfig();

      if (!emailValidation.isValid) {
        cliLogger.error('Email configuration is invalid:', emailValidation.errors);
        cliLogger.warn('Email service will be disabled due to configuration errors');
        process.env.EMAIL_ENABLED = 'false';
      } else {
        // Verify email connection on startup
        const isConnected = await emailService.verifyConnection();
        if (!isConnected) {
          cliLogger.warn('Email service connection failed, but continuing startup');
        }
      }
    } else {
      cliLogger.info('Email service is disabled via configuration');
    }

    httpServer.listen(PORT, () => {
      cliLogger.info(`Server is running on https://localhost:${PORT}`);
      cliLogger.info(`Serving uploads from: ${UPLOADS_DIRECTORY}`);
      cliLogger.info(`Writing logs to: ${LOG_DIRECTORY}`);
      cliLogger.info(`Reading service account from: ${SERVICE_ACCOUNT_PATH}`);
    });
  } catch (error) {
    cliLogger.error('Error starting the server!');
    appLogger.error(ErrorMessages.AppStartupFail, { error });
    process.exit(1);
  }
};

startServer();

const gracefulShutdown = (signal: string) => {
  cliLogger.info(`Received ${signal}, starting graceful shutdown...`);

  httpServer.close(async () => {
    cliLogger.info('HTTP server closed');

    shutdownJobs();

    try {
      await databaseService.shutdown();
    } catch (err) {
      cliLogger.error('Error during database shutdown', err);
    }

    try {
      await shutdownFirebase(SERVICE_NAME);
    } catch (error) {
      cliLogger.error('Error during Firebase shutdown', error);
    }

    cliLogger.info('Graceful shutdown complete, exiting process');
    process.exit(0);
  });

  setTimeout(() => {
    cliLogger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
