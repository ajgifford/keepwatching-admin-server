import { logFileService } from '../services/LogFileService';
import { logStreamService } from '../services/LogStreamService';
import { filterLogs } from '../utils/logFilters';
import { parseLogFile } from '../utils/logParsers';
import { LogEntry, LogFilter } from '@ajgifford/keepwatching-types';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

/**
 * Get logs with optional filtering
 * Query parameters:
 * - service: Filter by service (e.g., 'app', 'nginx')
 * - level: Filter by log level (e.g., 'error', 'warn', 'info')
 * - startDate: Filter logs after this date (ISO 8601)
 * - endDate: Filter logs before this date (ISO 8601)
 * - searchTerm: Search for logs containing this term
 * - limit: Maximum number of logs to return (default 100)
 */
export const getLogs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Parse query filters
    const filters: LogFilter = {
      service: req.query.service as string,
      level: req.query.level as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      searchTerm: req.query.searchTerm as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    // 2. Get log file paths (handles rotating logs based on date filters)
    const logFiles = logFileService.getLogFilePaths({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    });

    // 3. Load and parse all log files
    let logs: LogEntry[] = [];
    for (const [logType, filePath] of Object.entries(logFiles)) {
      const content = logFileService.readLogFile(filePath);
      if (content) {
        const service = logFileService.getServiceFromLogType(logType);
        const parsedLogs = parseLogFile(content, service, filePath);
        logs = logs.concat(parsedLogs);
      }
    }

    // 4. Filter and return
    const filteredLogs = filterLogs(logs, filters);
    res.json(filteredLogs);
  } catch (error) {
    next(error);
  }
});

/**
 * Stream logs in real-time via Server-Sent Events (SSE)
 * Opens a persistent connection and sends log entries as they are written
 */
export const streamLogs = asyncHandler(async (req: Request, res: Response) => {
  logStreamService.streamLogs(req, res);
});
