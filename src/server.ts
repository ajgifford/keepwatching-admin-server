import dotenv from 'dotenv';
import 'dotenv/config';

import accountRouter from './routes/accountManagementRouter';
import contentRouter from './routes/contentRouter';
import logRouter from './routes/logRouter';
import servicesRouter from './routes/servicesRouter';
import systemNotificationRouter from './routes/systemNotificationsRouter';
import { errorHandler } from '@ajgifford/keepwatching-common-server';
import {
  getLogDirectory,
  getPort,
  getRateLimitMax,
  getRateLimitTimeWindow,
  getServiceAccountPath,
  getUploadDirectory,
} from '@ajgifford/keepwatching-common-server/config';
import { ErrorMessages, appLogger, cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import { responseInterceptor } from '@ajgifford/keepwatching-common-server/middleware';
import { databaseService } from '@ajgifford/keepwatching-common-server/services';
import { shutdownJobs } from '@ajgifford/keepwatching-common-server/services';
import { initializeFirebase } from '@ajgifford/keepwatching-common-server/utils';
import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import { EventEmitter } from 'events';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createServer } from 'http';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

// Increase max listeners to handle multiple SSE connections
EventEmitter.defaultMaxListeners = 30;

const serviceAccount: object = require(getServiceAccountPath());
const UPLOADS_DIRECTORY = getUploadDirectory();
const LOG_DIRECTORY = getLogDirectory();
const PORT = getPort();

const app = express();
const httpServer = createServer(app);

initializeFirebase(serviceAccount);

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
app.use(logRouter);
app.use(servicesRouter);
app.use(systemNotificationRouter);

app.use(errorHandler);

const startServer = async () => {
  try {
    httpServer.listen(PORT, () => {
      cliLogger.info(`Server is running on https://localhost:${PORT}`);
      cliLogger.info(`Serving uploads from: ${UPLOADS_DIRECTORY}`);
      cliLogger.info(`Writing logs to: ${LOG_DIRECTORY}`);
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
