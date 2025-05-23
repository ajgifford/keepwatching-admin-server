import { getExpressLogDir, getPM2LogDir } from '@ajgifford/keepwatching-common-server/config';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { Tail } from 'tail';

interface LogEntry {
  timestamp: string;
  service: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  version?: string;
  logFile?: string;
}

interface HTTPLogEntry extends LogEntry {
  logId: string;
  request?: {
    url?: string;
    method?: string;
    body?: object;
    params?: object;
    query?: object;
  };
  response?: {
    statusCode?: number;
    body?: string;
  };
}

interface NginxLogEntry extends LogEntry {
  remoteAddr: string;
  remoteUser: string;
  request: string;
  status: number;
  bytesSent: number;
  httpReferer: string;
  httpUserAgent: string;
  gzipRatio?: string;
}

interface ErrorLogEntry extends LogEntry {
  stack: string[];
  fullText: string;
  details?: string;
}

interface LogFilter {
  service?: string;
  level?: string;
  startDate?: string | null;
  endDate?: string | null;
  searchTerm?: string;
  limit?: number;
}

const EXPRESS_LOG_DIRECTORY = getExpressLogDir();
const PM2_LOG_DIRECTORY = getPM2LogDir();
const nginxLogPattern = /^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\d+) "([^"]*)" "([^"]*)"$/;
const logRegex = /\[([\w\-]+ [\d:]+)\] (?:\x1b?\[\d+m)?(\w+)(?:\x1b?\s?\[\d+m)? \(([\d\.]+)\): (.+)/;

const LOG_PATHS: Record<string, string> = {
  nginx: '/var/log/nginx/access.log',
  'KeepWatching-HTTP': `${EXPRESS_LOG_DIRECTORY}/keepwatching-${getCurrentDate()}.log`,
  'KeepWatching-HTTP-Error': `${EXPRESS_LOG_DIRECTORY}/keepwatching-error.log`,
  'KeepWatching-Console': `${PM2_LOG_DIRECTORY}/keepwatching-server-out-0.log`,
  'KeepWatching-Console-Error': `${PM2_LOG_DIRECTORY}/keepwatching-server-error-0.log`,
};

const SERVICE_MAPPING: { [key: string]: string } = {
  'KeepWatching-HTTP': 'HTTP',
  'KeepWatching-HTTP-Error': 'HTTP',
  nginx: 'nginx',
  'KeepWatching-Console': 'Console',
  'KeepWatching-Console-Error': 'Console-Error',
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
    const latestRotatingLog = findLatestRotatingLog(logFiles['KeepWatching-HTTP']);
    if (latestRotatingLog) {
      logFiles['KeepWatching-HTTP'] = latestRotatingLog;
    }

    // Find additional rotating logs if date filters are applied
    if (filters.startDate || filters.endDate) {
      const allRotatingLogs = findAllRotatingLogs(LOG_PATHS['KeepWatching-HTTP']);

      // Add each rotating log with its own key
      allRotatingLogs.forEach((logPath, index) => {
        if (index > 0) {
          // Skip the first one as it's already included
          logFiles[`KeepWatching-HTTP-${index}`] = logPath;
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
              level: 'error',
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
        service: service.includes('express') ? 'express' : service.includes('pm2') ? 'pm2' : service,
        message: `Log file not found: ${logPath}`,
        level: 'warn',
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
    service: 'system',
    message: `Log streaming started. Available logs: [${availableLogs.join(', ')}]${
      unavailableLogs.length > 0 ? `, Unavailable logs: [${unavailableLogs.join(', ')}]` : ''
    }`,
    level: 'info',
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

function loadLogs(logFile: string, service: string): LogEntry[] {
  if (!fileExists(logFile)) {
    console.log('File does not exist', logFile);
    return [];
  }

  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n');
  if (service === 'HTTP') {
    return lines
      .map((line) => parseHTTPLogLine(line, service, logFile))
      .filter((entry): entry is HTTPLogEntry => entry !== null);
  } else if (service === 'nginx') {
    return lines
      .map((line) => parseNginxLogLine(line, logFile))
      .filter((entry): entry is NginxLogEntry => entry !== null);
  } else if (service === 'Console') {
    return lines
      .map((line) => parseLogLine(line, service, logFile))
      .filter((entry): entry is LogEntry => entry !== null);
  } else if (service === 'Console-Error') {
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

function determineLogLevel(service: string, logLine: string): 'info' | 'warn' | 'error' {
  // If the log is from an error log file, mark it as error level
  if (service.includes('error')) {
    return 'error';
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
    return 'error';
  }
  if (line.includes('warn') || line.includes('warning')) {
    return 'warn';
  }
  return 'info';
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
      level: logLevel as 'info' | 'warn' | 'error',
      message: message,
      service,
      version,
      logFile: path.basename(logFile),
    };
  }
  return null;
}

function parseHTTPLogLine(line: string, service: string, logFile: string): HTTPLogEntry | null {
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
            url: parsed.data.request.url || 'N/A',
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
    service: 'nginx',
    level: 'info',
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

function parseErrorLogFile(logContent: string, service: string, logFile: string): ErrorLogEntry[] {
  const errors: ErrorLogEntry[] = [];
  let currentError: ErrorLogEntry | null = null;
  const lines: string[] = logContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line is the start of a new error
    if (line.includes('Error:') || line.includes('ValidationError:') || line.includes('FirebaseAuthError:')) {
      // If we were tracking a previous error, push it to results before starting a new one
      if (currentError) {
        errors.push(currentError);
      }

      // Start tracking a new error
      currentError = {
        message: line.trim(),
        stack: [],
        fullText: line.trim(),
        level: 'error',
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
        level: 'error',
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
