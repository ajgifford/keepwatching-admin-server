import { getExpressLogDir, getPM2LogDir } from '@ajgifford/keepwatching-common-server/config';
import {
  AppLogEntry,
  ErrorLogEntry,
  LogEntry,
  LogFilter,
  LogLevel,
  LogService,
  NginxLogEntry,
} from '@ajgifford/keepwatching-types';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { Tail } from 'tail';

const EXPRESS_LOG_DIRECTORY = getExpressLogDir();
const PM2_LOG_DIRECTORY = getPM2LogDir();
const nginxLogPattern = /^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\d+) "([^"]*)" "([^"]*)"$/;
const logRegex = /\[([\w\-]+ [\d:]+)\] (?:\x1b?\[\d+m)?(\w+)(?:\x1b?\s?\[\d+m)? \(([\d\.]+)\): (.+)/;

const LOG_PATHS: Record<string, string> = {
  nginx: '/var/log/nginx/access.log',
  'KeepWatching-App': `${EXPRESS_LOG_DIRECTORY}/keepwatching-${getCurrentDate()}.log`,
  'KeepWatching-App-Error': `${EXPRESS_LOG_DIRECTORY}/keepwatching-error.log`,
  'KeepWatching-Console': `${PM2_LOG_DIRECTORY}/keepwatching-api-server-out-0.log`,
  'KeepWatching-Console-Error': `${PM2_LOG_DIRECTORY}/keepwatching-api-server-error-0.log`,
};

const SERVICE_MAPPING: { [key: string]: LogService } = {
  'KeepWatching-App': LogService.APP,
  'KeepWatching-App-Error': LogService.APP,
  nginx: LogService.NGINX,
  'KeepWatching-Console': LogService.CONSOLE,
  'KeepWatching-Console-Error': LogService.CONSOLE_ERROR,
};

export const getLogs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: LogFilter = {
      service: req.query.service as string,
      level: req.query.level as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      searchTerm: req.query.searchTerm as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    const logFiles: { [key: string]: string } = { ...LOG_PATHS };

    // Find the latest rotating log for express
    const latestRotatingLog = findLatestRotatingLog(logFiles['KeepWatching-App']);
    if (latestRotatingLog) {
      logFiles['KeepWatching-App'] = latestRotatingLog;
    }

    // Find additional rotating logs if date filters are applied
    if (filters.startDate || filters.endDate) {
      const allRotatingLogs = findAllRotatingLogs(LOG_PATHS['KeepWatching-App']);

      // Add each rotating log with its own key
      allRotatingLogs.forEach((logPath, index) => {
        if (index > 0) {
          // Skip the first one as it's already included
          logFiles[`KeepWatching-App-${index}`] = logPath;
        }
      });
    }

    let logs: LogEntry[] = [];
    for (const [logType, file] of Object.entries(logFiles)) {
      const baseLogType = logType.replace(/-\d+$/, '');
      const service = SERVICE_MAPPING[baseLogType];
      logs = logs.concat(loadLogs(file, service));
    }

    res.json(filterLogs(logs, filters));
  } catch (error) {
    next(error);
  }
});

// SSE endpoint for log streaming
export const streamLogs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const tails: { [key: string]: Tail } = {};
  const availableLogs: string[] = [];
  const unavailableLogs: string[] = [];

  // Find the latest rotating log file for express
  const rotatingLogPath = findLatestRotatingLog(LOG_PATHS['express-rotating']);
  if (rotatingLogPath) {
    LOG_PATHS['express-rotating'] = rotatingLogPath;
  }

  const errorBuffers: { [key: string]: string[] } = {};
  const errorTimers: { [key: string]: NodeJS.Timeout } = {};
  const ERROR_BUFFER_TIMEOUT = 500; // ms to wait for more error lines

  // Start tailing each log file
  Object.entries(LOG_PATHS).forEach(([service, logPath]) => {
    errorBuffers[service] = [];

    if (fileExists(logPath)) {
      availableLogs.push(service);
      try {
        const tail = new Tail(logPath, { follow: true, logger: console });

        tail.on('line', (data) => {
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
            sendBufferedError(service);

            // Process normal JSON log line
            const logEntry: LogEntry = {
              timestamp: new Date().toISOString(),
              service: SERVICE_MAPPING[service] || service,
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
            sendBufferedError(service); // Send any previous buffered error
            errorBuffers[service] = [data];

            // Set a timer to send this error if no more lines come in
            if (errorTimers[service]) clearTimeout(errorTimers[service]);
            errorTimers[service] = setTimeout(() => sendBufferedError(service), ERROR_BUFFER_TIMEOUT);

            return;
          }

          // Add line to error if we're collecting an error and this looks like part of a stack trace
          if (errorBuffers[service].length > 0 && isStackTraceLine) {
            errorBuffers[service].push(data);

            // Reset the timer
            if (errorTimers[service]) clearTimeout(errorTimers[service]);
            errorTimers[service] = setTimeout(() => sendBufferedError(service), ERROR_BUFFER_TIMEOUT);

            // Check for end of stack trace
            if (/^\s*\}\s*$/.test(data)) {
              sendBufferedError(service);
            }

            return;
          }

          // If we have a buffered error and this isn't part of it, send the error
          if (errorBuffers[service].length > 0) {
            sendBufferedError(service);
          }

          // Process normal line
          const logEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            service: SERVICE_MAPPING[service] || service,
            message: data,
            level: determineLogLevel(service, data),
            logFile: path.basename(logPath),
          };

          res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
        });

        // Helper function to send buffered error
        function sendBufferedError(svc: string) {
          if (errorBuffers[svc].length > 0) {
            const combinedMessage = errorBuffers[svc].join('\n');
            const logEntry: LogEntry = {
              timestamp: new Date().toISOString(),
              service: SERVICE_MAPPING[svc] || svc,
              message: combinedMessage,
              level: LogLevel.ERROR,
              logFile: path.basename(logPath),
            };

            res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
            errorBuffers[svc] = [];
            if (errorTimers[svc]) {
              clearTimeout(errorTimers[svc]);
              delete errorTimers[svc];
            }
          }
        }
      } catch (error) {
        console.error(`Error setting up tail for ${service}:`, error);
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
  console.log(`Streaming logs: Available: [${availableLogs.join(', ')}], Unavailable: [${unavailableLogs.join(', ')}]`);

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
    Object.values(tails).forEach((tail) => {
      try {
        tail.unwatch();
      } catch (error) {
        console.error('Error unwatching tail:', error);
      }
    });
    Object.values(errorTimers).forEach((timer) => {
      clearTimeout(timer);
    });
  });
});

function getCurrentDate(): string {
  const date = new Date();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

function findAllRotatingLogs(basePath: string): string[] {
  try {
    const dir = path.dirname(basePath);
    const baseFileName = path.basename(basePath);
    const prefix = baseFileName.split('-')[0];

    const rotatingLogs = fs
      .readdirSync(dir)
      .filter((filename) => filename.startsWith(prefix) && !filename.toLowerCase().includes('error'));

    rotatingLogs.sort((a, b) => {
      const statA = fs.statSync(path.join(dir, a));
      const statB = fs.statSync(path.join(dir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });

    return rotatingLogs.map((file) => path.join(dir, file));
  } catch (err) {
    console.error('Error finding rotating logs:', err);
    return [];
  }
}

function findLatestRotatingLog(basePath: string): string | null {
  const logs = findAllRotatingLogs(basePath);
  return logs.length > 0 ? logs[0] : null;
}

function loadLogs(logFile: string, service: LogService): LogEntry[] {
  if (!fileExists(logFile)) {
    console.log('File does not exist', logFile);
    return [];
  }

  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n');
  if (service === LogService.APP) {
    return lines
      .map((line) => parseAppLogLine(line, service, logFile))
      .filter((entry): entry is AppLogEntry => entry !== null);
  } else if (service === LogService.NGINX) {
    return lines
      .map((line) => parseNginxLogLine(line, logFile))
      .filter((entry): entry is NginxLogEntry => entry !== null);
  } else if (service === LogService.CONSOLE) {
    return lines
      .map((line) => parseLogLine(line, service, logFile))
      .filter((entry): entry is LogEntry => entry !== null);
  } else if (service === LogService.CONSOLE_ERROR) {
    return parseErrorLogFile(content, service, logFile);
  } else {
    return [];
  }
}

function fileExists(path: string): boolean {
  try {
    fs.accessSync(path, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}

function determineLogLevel(service: string, logLine: string): LogLevel {
  // If the log is from an error log file, mark it as error level
  if (service.includes('error')) {
    return LogLevel.ERROR;
  }

  const line = logLine.toLowerCase();
  if (
    line.includes('error') ||
    line.includes('err]') ||
    line.includes('exception') ||
    /\w+error:/.test(line.toLowerCase()) ||
    line.includes('stack trace') ||
    line.includes('code:') ||
    (line.startsWith('at ') && line.includes('/'))
  ) {
    return LogLevel.ERROR;
  }
  if (line.includes('warn') || line.includes('warning')) {
    return LogLevel.WARN;
  }
  return LogLevel.INFO;
}

function filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
  return logs
    .filter((log) => {
      if (filter.service && log.service !== filter.service) return false;
      if (filter.level && log.level !== filter.level) return false;
      if (filter.startDate && new Date(log.timestamp) < new Date(filter.startDate)) return false;
      if (filter.endDate && new Date(log.timestamp) > new Date(filter.endDate)) return false;
      if (filter.searchTerm && !log.message.includes(filter.searchTerm)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, filter.limit || 100);
}

function parseLogLine(line: string, service: string, logFile: string): LogEntry | null {
  const match = line.match(logRegex);
  if (match) {
    const [_fullMatch, dateTime, logLevel, version, message] = match;
    return {
      timestamp: dateTime,
      level: logLevel as LogLevel,
      message: message,
      service: service as LogService,
      version,
      logFile: path.basename(logFile),
    };
  }
  return null;
}

function parseAppLogLine(line: string, service: LogService, logFile: string): AppLogEntry | null {
  try {
    const parsed = JSON.parse(line);
    return {
      timestamp: parsed.timestamp,
      service: service,
      message: parsed.message,
      level: parsed.level,
      logId: parsed.logId,
      logFile: path.basename(logFile),
      request: parsed.data?.request
        ? {
            url: parsed.data.request.path || 'N/A',
            method: parsed.data.request.method || 'N/A',
            body: parsed.data.request.body || {},
            params: parsed.data.request.params || {},
            query: parsed.data.request.query || {},
          }
        : {},
      response: parsed.data?.response
        ? {
            statusCode: parsed.data.response.statusCode || 'N/A',
            body: parsed.data.response.body || {},
          }
        : {},
    };
  } catch (e) {}
  return null;
}

function parseNginxLogLine(line: string, logFile: string): NginxLogEntry | null {
  const match = line.match(nginxLogPattern);
  if (!match) return null;

  return {
    service: LogService.NGINX,
    level: LogLevel.INFO,
    message: `Request: ${match[5]} >>> Status: ${match[6]}`,
    logFile: path.basename(logFile),
    remoteAddr: match[1],
    remoteUser: match[2],
    timestamp: normalizeTimestamp(match[4]),
    request: match[5],
    status: parseInt(match[6], 10),
    bytesSent: parseInt(match[6], 10),
    httpReferer: match[8],
    httpUserAgent: match[9],
    gzipRatio: match[10] || undefined,
  };
}

function parseErrorLogFile(logContent: string, service: LogService, logFile: string): ErrorLogEntry[] {
  const errors: ErrorLogEntry[] = [];
  let currentError: ErrorLogEntry | null = null;
  const lines: string[] = logContent.split('\n');

  // Regex to match timestamp pattern [Jul-03-2025 12:49:28] ERROR:
  const timestampRegex = /^\[([A-Za-z]{3}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})\]\s+(\w+):\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for timestamp pattern first
    const timestampMatch = line.match(timestampRegex);

    if (timestampMatch) {
      const [dateTimeStr, logLevel, message] = timestampMatch;

      // If we were tracking a previous error, push it to results before starting a new one
      if (currentError) {
        errors.push(currentError);
      }

      // Parse the timestamp string to ISO format
      const timestamp = parseLogTimestamp(dateTimeStr);

      // Start tracking a new error
      currentError = {
        message: message.trim(),
        stack: [],
        fullText: message.trim(),
        level: logLevel.toLowerCase() as LogLevel,
        service: service,
        timestamp: timestamp,
        logFile: path.basename(logFile),
      };
    }
    // Check if this line is the start of a new error (fallback for lines without timestamps)
    else if (line.includes('Error:') || line.includes('ValidationError:') || line.includes('FirebaseAuthError:')) {
      // If we were tracking a previous error, push it to results before starting a new one
      if (currentError) {
        errors.push(currentError);
      }

      // Start tracking a new error
      currentError = {
        message: line.trim(),
        stack: [],
        fullText: line.trim(),
        level: LogLevel.ERROR,
        service: service,
        timestamp: new Date().toISOString(),
        logFile: path.basename(logFile),
      };
    }
    // Check if this is a stack trace line (usually starts with spaces or tabs followed by 'at')
    else if (line.trim().startsWith('at ') && currentError) {
      currentError.stack.push(line.trim());
      currentError.fullText += '\n' + line.trim();
    }
    // For error details that are part of the error object (like when an error is logged with JSON properties)
    else if (line.trim().startsWith('{') && currentError) {
      currentError.details = line.trim();
      currentError.fullText += '\n' + line.trim();

      // Look ahead for closing brackets or additional JSON structure
      let j = i + 1;
      while (
        j < lines.length &&
        (lines[j].includes('}') || lines[j].trim().startsWith('"') || lines[j].includes(':'))
      ) {
        currentError.details += '\n' + lines[j].trim();
        currentError.fullText += '\n' + lines[j].trim();
        i = j; // Skip these lines in the outer loop
        j++;
      }
    }
    // Empty lines or continuation of an error we're already tracking
    else if (line.trim() !== '' && currentError) {
      currentError.fullText += '\n' + line.trim();
    }
    // If we see a line that looks like a new non-error log entry and we're tracking an error
    else if (line.trim() !== '' && !currentError && !line.trim().startsWith('at ')) {
      // This could be a single line log entry or the start of something else
      errors.push({
        message: line.trim(),
        stack: [],
        fullText: line.trim(),
        level: LogLevel.ERROR,
        service: service,
        timestamp: new Date().toISOString(),
        logFile: path.basename(logFile),
      });
    }
  }

  if (currentError) {
    errors.push(currentError);
  }

  return errors;
}

/**
 * Parse timestamp from log format [Jul-03-2025 12:49:28] to ISO string
 */
function parseLogTimestamp(dateTimeStr: string): string {
  try {
    // Parse format: Jul-03-2025 12:49:28
    const [datePart, timePart] = dateTimeStr.split(' ');
    const [month, day, year] = datePart.split('-');
    const [hours, minutes, seconds] = timePart.split(':');

    // Convert month abbreviation to number
    const monthMap: { [key: string]: number } = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const monthNum = monthMap[month];
    if (monthNum === undefined) {
      throw new Error(`Invalid month: ${month}`);
    }

    // Create date object and convert to ISO string
    const date = new Date(
      parseInt(year),
      monthNum,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds),
    );

    return date.toISOString();
  } catch (error) {
    console.warn(`Failed to parse timestamp "${dateTimeStr}":`, error);
    // Fallback to current timestamp
    return new Date().toISOString();
  }
}

function normalizeTimestamp(timestamp: string): string {
  if (timestamp.includes('/') && timestamp.includes(':')) {
    // Parse Nginx format
    const regex = /(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([+-]\d+)/;
    const match = timestamp.match(regex);

    if (match) {
      const [, day, month, year, hours, minutes, seconds, timezone] = match;
      const months: { [key: string]: number } = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const date = new Date(
        Date.UTC(parseInt(year), months[month], parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds)),
      );

      return date.toISOString();
    }
  }

  // Already in ISO format or other standard format
  return new Date(timestamp).toISOString();
}
