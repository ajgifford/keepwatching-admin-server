import { cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import { LogEntry, LogLevel, LogService } from '@ajgifford/keepwatching-types';
import { Request, Response } from 'express';
import path from 'path';
import { Tail } from 'tail';
import { determineLogLevel } from '../utils/logFilters';
import { LogFileService } from './LogFileService';

const ERROR_BUFFER_TIMEOUT = 500; // ms to wait for more error lines

/**
 * Service for streaming logs via Server-Sent Events (SSE)
 */
export class LogStreamService {
  private logFileService: LogFileService;

  constructor(logFileService: LogFileService) {
    this.logFileService = logFileService;
  }

  /**
   * Start streaming logs via Server-Sent Events
   * @param req - Express request object
   * @param res - Express response object
   */
  streamLogs(req: Request, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const tails: { [key: string]: Tail } = {};
    const availableLogs: string[] = [];
    const unavailableLogs: string[] = [];

    const errorBuffers: { [key: string]: string[] } = {};
    const errorTimers: { [key: string]: NodeJS.Timeout } = {};

    const logPaths = this.logFileService.getLogPathsConfig();
    const serviceMapping = this.logFileService.getServiceMapping();

    // Start tailing each log file
    Object.entries(logPaths).forEach(([service, logPath]) => {
      errorBuffers[service] = [];

      if (this.logFileService.fileExists(logPath)) {
        availableLogs.push(service);
        try {
          const tail = new Tail(logPath, { follow: true, logger: console });
          tails[service] = tail;

          tail.on('line', (data) => {
            this.handleLogLine(data, service, logPath, res, errorBuffers, errorTimers, serviceMapping);
          });
        } catch (error) {
          cliLogger.error(`Error setting up tail for ${service}:`, error);
        }
      } else {
        unavailableLogs.push(service);
        // Notify client that this log file is not available
        const notFoundEntry: LogEntry = {
          timestamp: new Date().toISOString(),
          service: service.includes('express')
            ? LogService.APP
            : service.includes('pm2')
              ? LogService.CONSOLE
              : LogService.SYSTEM,
          message: `Log file not found: ${logPath}`,
          level: LogLevel.WARN,
          logFile: path.basename(logPath),
        };
        res.write(`data: ${JSON.stringify(notFoundEntry)}\n\n`);
      }
    });

    // Log summary of available/unavailable logs
    cliLogger.info(
      `Streaming logs: Available: [${availableLogs.join(', ')}], Unavailable: [${unavailableLogs.join(', ')}]`,
    );

    // Initial status message
    const statusEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      service: LogService.SYSTEM,
      message: `Log streaming started. Available logs: [${availableLogs.join(', ')}]${
        unavailableLogs.length > 0 ? `, Unavailable logs: [${unavailableLogs.join(', ')}]` : ''
      }`,
      level: LogLevel.INFO,
    };
    res.write(`data: ${JSON.stringify(statusEntry)}\n\n`);

    // Cleanup on connection close
    req.on('close', () => {
      this.cleanup(tails, errorTimers);
    });
  }

  /**
   * Handle a single log line from tail
   * @param data - Log line data
   * @param service - Service name
   * @param logPath - Path to log file
   * @param res - Express response object
   * @param errorBuffers - Error buffer map
   * @param errorTimers - Error timer map
   * @param serviceMapping - Service name to LogService mapping
   */
  private handleLogLine(
    data: string,
    service: string,
    logPath: string,
    res: Response,
    errorBuffers: { [key: string]: string[] },
    errorTimers: { [key: string]: NodeJS.Timeout },
    serviceMapping: { [key: string]: LogService },
  ): void {
    // Check if this is a complete JSON first
    let isCompleteJson = false;
    try {
      JSON.parse(data);
      isCompleteJson = true;
    } catch (e) {
      // Not a complete JSON object
    }

    if (isCompleteJson) {
      // If we had a pending error, send it first
      this.sendBufferedError(service, logPath, res, errorBuffers, errorTimers, serviceMapping);

      // Process normal JSON log line
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        service: serviceMapping[service] || service,
        message: data,
        level: determineLogLevel(service, data),
        logFile: path.basename(logPath),
      };

      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
      return;
    }

    // More specific error detection
    const errorStartPattern = /(?:^|\s)(?:[A-Z][a-zA-Z]*)?Error:|\bException:/;
    const isStartOfError = errorStartPattern.test(data);

    // More specific stack trace line detection
    const isStackTraceLine =
      /^\s+at\s/.test(data) ||
      data.includes('node:') ||
      /^\s*\{/.test(data) ||
      /^\s*\}/.test(data) ||
      data.includes('code:') ||
      data.includes('help:');

    // Reset buffer on new error start
    if (isStartOfError) {
      this.sendBufferedError(service, logPath, res, errorBuffers, errorTimers, serviceMapping); // Send any previous buffered error
      errorBuffers[service] = [data];

      // Set a timer to send this error if no more lines come in
      if (errorTimers[service]) clearTimeout(errorTimers[service]);
      errorTimers[service] = setTimeout(
        () => this.sendBufferedError(service, logPath, res, errorBuffers, errorTimers, serviceMapping),
        ERROR_BUFFER_TIMEOUT,
      );

      return;
    }

    // Add line to error if we're collecting an error and this looks like part of a stack trace
    if (errorBuffers[service].length > 0 && isStackTraceLine) {
      errorBuffers[service].push(data);

      // Reset the timer
      if (errorTimers[service]) clearTimeout(errorTimers[service]);
      errorTimers[service] = setTimeout(
        () => this.sendBufferedError(service, logPath, res, errorBuffers, errorTimers, serviceMapping),
        ERROR_BUFFER_TIMEOUT,
      );

      // Check for end of stack trace
      if (/^\s*\}\s*$/.test(data)) {
        this.sendBufferedError(service, logPath, res, errorBuffers, errorTimers, serviceMapping);
      }

      return;
    }

    // If we have a buffered error and this isn't part of it, send the error
    if (errorBuffers[service].length > 0) {
      this.sendBufferedError(service, logPath, res, errorBuffers, errorTimers, serviceMapping);
    }

    // Process normal line
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      service: serviceMapping[service] || service,
      message: data,
      level: determineLogLevel(service, data),
      logFile: path.basename(logPath),
    };

    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  }

  /**
   * Send buffered error log entry
   * @param service - Service name
   * @param logPath - Path to log file
   * @param res - Express response object
   * @param errorBuffers - Error buffer map
   * @param errorTimers - Error timer map
   * @param serviceMapping - Service name to LogService mapping
   */
  private sendBufferedError(
    service: string,
    logPath: string,
    res: Response,
    errorBuffers: { [key: string]: string[] },
    errorTimers: { [key: string]: NodeJS.Timeout },
    serviceMapping: { [key: string]: LogService },
  ): void {
    if (errorBuffers[service].length > 0) {
      const combinedMessage = errorBuffers[service].join('\n');
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        service: serviceMapping[service] || service,
        message: combinedMessage,
        level: LogLevel.ERROR,
        logFile: path.basename(logPath),
      };

      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
      errorBuffers[service] = [];
      if (errorTimers[service]) {
        clearTimeout(errorTimers[service]);
        delete errorTimers[service];
      }
    }
  }

  /**
   * Clean up tail connections and timers
   * @param tails - Map of service to Tail instances
   * @param errorTimers - Map of service to timeout handles
   */
  private cleanup(tails: { [key: string]: Tail }, errorTimers: { [key: string]: NodeJS.Timeout }): void {
    Object.values(tails).forEach((tail) => {
      try {
        tail.unwatch();
      } catch (error) {
        cliLogger.error('Error unwatching tail:', error);
      }
    });
    Object.values(errorTimers).forEach((timer) => {
      clearTimeout(timer);
    });
  }
}

// Export a singleton instance
export const logStreamService = new LogStreamService(new LogFileService());
