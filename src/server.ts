import 'dotenv/config';

import { logger } from './logger/logger';
import accountRouter from './routes/accountManagementRouter';
import contentRouter from './routes/contentRouter';
import logRouter from './routes/logRouter';
import systemNotificationRouter from './routes/systemNotificationsRouter';
import { errorHandler } from '@ajgifford/keepwatching-common-server/middleware/errorMiddleware';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import compression from 'compression';
import cors from 'cors';
import { EventEmitter } from 'events';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import { createServer } from 'http';
import path from 'path';
import { Tail } from 'tail';
import { promisify } from 'util';

// Increase max listeners to handle multiple SSE connections
EventEmitter.defaultMaxListeners = 30;

const EXPRESS_LOG_DIRECTORY = path.resolve(process.env.EXPRESS_LOG_DIR || '/var/log');
const PM2_LOG_DIRECTORY = path.resolve(process.env.PM2_LOG_DIR || '/var/log/.pm2');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(bodyParser.json());
app.use(logger.logRequest.bind(logger));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Type definitions
interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  memory: string;
  cpu: string;
}

interface LogEntry {
  timestamp: string;
  service: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  logFile?: string;
}

interface LogFilter {
  service?: string;
  level?: string;
  startDate?: string | null;
  endDate?: string | null;
  searchTerm?: string;
  limit?: number;
}

function getCurrentDate(): string {
  const date = new Date();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

const LOG_PATHS = {
  'express-rotating': `${EXPRESS_LOG_DIRECTORY}/rotating-logs-${getCurrentDate()}.log`,
  'express-error': `${EXPRESS_LOG_DIRECTORY}/keepwatching-error.log`,
  nginx: '/var/log/nginx/access.log',
  'pm2-out': `${PM2_LOG_DIRECTORY}/keepwatching-server-out-0.log`,
  'pm2-error': `${PM2_LOG_DIRECTORY}/keepwatching-server-error-0.log`,
};

const SERVICE_MAPPING: { [key: string]: string } = {
  'express-rotating': 'express',
  'express-error': 'express',
  nginx: 'nginx',
  'pm2-out': 'pm2',
  'pm2-error': 'pm2',
};

app.use(accountRouter);
app.use(contentRouter);
app.use(logRouter);
app.use(systemNotificationRouter);

app.get('/api/services/status', async (req, res) => {
  try {
    const statuses = await checkServicesStatus();
    res.json(statuses);
  } catch (error) {
    console.error('Error retrieving service statuses:', error);
    res.status(500).json({ error: 'Failed to retrieve service statuses' });
  }
});

// Helper function to check if a file exists
function fileExists(path: string): boolean {
  try {
    fs.accessSync(path, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}

// Helper function to find all available rotating log files
function findAllRotatingLogs(basePath: string): string[] {
  try {
    const dir = path.dirname(basePath);
    const baseFileName = path.basename(basePath);
    const prefix = baseFileName.split('-')[0] + '-' + baseFileName.split('-')[1];

    const files = fs.readdirSync(dir);
    const rotatingLogs = files.filter((file) => file.startsWith(prefix));

    // Sort by modification time (most recent first)
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

// Helper function to find the most recent rotating log file
function findLatestRotatingLog(basePath: string): string | null {
  const logs = findAllRotatingLogs(basePath);
  return logs.length > 0 ? logs[0] : null;
}

// Parse a log line into a structured LogEntry
function parseLogLine(line: string, service: string, filePath: string): LogEntry | null {
  try {
    // Try to parse JSON logs (Winston format)
    try {
      const parsed = JSON.parse(line);
      if (parsed.timestamp || parsed.time || parsed.date) {
        return {
          timestamp: parsed.timestamp || parsed.time || parsed.date,
          service: SERVICE_MAPPING[service] || service,
          message: parsed.message || line,
          level: parsed.level || determineLogLevel(service, line),
          logFile: path.basename(filePath),
        };
      }
    } catch (e) {
      // Not JSON, continue with regular parsing
    }

    // Extract timestamp if possible (common formats)
    let timestamp = new Date().toISOString();

    // PM2 format: [Feb-23-2025 02:00:00]
    const pm2TimestampMatch = line.match(
      /\[(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2}\]/,
    );
    if (pm2TimestampMatch) {
      // Convert PM2 format to ISO string
      const dateStr = pm2TimestampMatch[0].slice(1, -1); // Remove the brackets
      timestamp = new Date(dateStr).toISOString();
    }
    // Nginx format: [26/Feb/2025:13:09:48 -0600]
    else if (line.includes('/')) {
      const nginxTimestampMatch = line.match(
        /\[(\d{2}\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\/\d{4}:\d{2}:\d{2}:\d{2}\s[+-]\d{4})\]/,
      );
      if (nginxTimestampMatch) {
        // Convert Nginx format to ISO string
        const dateStr = nginxTimestampMatch[1];
        // Parse with a custom function since this format is non-standard
        const parsedDate = parseNginxDate(dateStr);
        if (parsedDate) {
          timestamp = parsedDate.toISOString();
        }
      }
    }
    // Standard ISO or similar formats
    else {
      const standardTimestampMatch =
        line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/) || line.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

      if (standardTimestampMatch) {
        timestamp = standardTimestampMatch[0];
      }
    }

    // Enhanced error detection
    const level = determineLogLevel(service, line);

    return {
      timestamp,
      service: SERVICE_MAPPING[service] || service,
      message: line,
      level,
      logFile: path.basename(filePath),
    };
  } catch (error) {
    console.error('Error parsing log line:', error);
    return null;
  }
}

// Read recent logs from a file
async function readRecentLogs(filePath: string, service: string, limit: number = 100): Promise<LogEntry[]> {
  if (!fileExists(filePath)) {
    return [];
  }

  const logs: LogEntry[] = [];
  try {
    // Use a reverse line reader for efficiency (read from end of file)
    const exec = promisify(require('child_process').exec);
    const { stdout } = await exec(`tail -n ${limit * 2} ${filePath}`);

    const lines = stdout
      .split('\n')
      .filter((line: { trim: () => { (): any; new (): any; length: number } }) => line.trim().length > 0);

    // Special handling for JSON logs
    let currentErrorEntry: LogEntry | null = null;
    let isCollectingStackTrace = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // First, try to detect if this is a complete JSON log entry
      let isCompleteJson = false;
      try {
        // If we can parse it as JSON, it's a complete log entry
        JSON.parse(line);
        isCompleteJson = true;
      } catch (e) {
        // Not a complete JSON object
      }

      // If it's a complete JSON, process it normally
      if (isCompleteJson) {
        // If we were collecting an error, finalize it first
        if (currentErrorEntry) {
          logs.push(currentErrorEntry);
          currentErrorEntry = null;
          isCollectingStackTrace = false;
        }

        const entry = parseLogLine(line, service, filePath);
        if (entry) {
          logs.push(entry);
        }
        continue;
      }

      // Check if this is the start of an actual error (contains Error: or ValidationError:)
      // Be more specific to avoid false positives
      const errorStartPattern = /(?:^|\s)(?:[A-Z][a-zA-Z]*)?Error:|\bException:/;
      if (!isCollectingStackTrace && errorStartPattern.test(line)) {
        // Start a new error entry
        currentErrorEntry = parseLogLine(line, service, filePath);
        isCollectingStackTrace = true;
        continue;
      }

      // If we're collecting a stack trace
      if (isCollectingStackTrace) {
        // More specific pattern for stack trace lines
        const isStackTraceLine =
          /^\s+at\s/.test(line) || // Indented 'at' line
          line.includes('node:') || // Node.js internal reference
          /^\s*\{/.test(line) || // Start of JSON object
          /^\s*\}/.test(line) || // End of JSON object
          line.includes('code:') || // Error code
          line.includes('help:'); // Help URL

        if (isStackTraceLine) {
          // Append to the current error message
          if (currentErrorEntry) {
            currentErrorEntry.message += '\n' + line;
          }

          // Check if this might be the end of the stack trace
          const isEndOfStackTrace =
            /^\s*\}\s*$/.test(line) || // Line with just a closing brace
            (line.trim().startsWith('at ') && (i === lines.length - 1 || !lines[i + 1].trim().startsWith('at ')));

          if (isEndOfStackTrace) {
            // End of stack trace
            if (currentErrorEntry) {
              logs.push(currentErrorEntry);
              currentErrorEntry = null;
              isCollectingStackTrace = false;
            }
          }

          continue;
        } else {
          // Not part of stack trace anymore, add the collected error entry and reset
          if (currentErrorEntry) {
            logs.push(currentErrorEntry);
            currentErrorEntry = null;
            isCollectingStackTrace = false;
          }
        }
      }

      // Process regular line
      const entry = parseLogLine(line, service, filePath);
      if (entry) {
        logs.push(entry);
      }
    }

    // If we ended while still collecting an error, add it
    if (currentErrorEntry) {
      logs.push(currentErrorEntry);
    }

    return logs;
  } catch (error) {
    console.error(`Error reading logs from ${filePath}:`, error);
    return [];
  }
}

// Filter logs based on criteria
function filterLogs(logs: LogEntry[], filters: LogFilter): LogEntry[] {
  return logs.filter((log) => {
    // Filter by service
    if (filters.service && filters.service !== 'all' && log.service !== filters.service) {
      return false;
    }

    // Filter by level
    if (filters.level && filters.level !== 'all' && log.level !== filters.level) {
      return false;
    }

    // Filter by date range
    if (filters.startDate) {
      const logDate = new Date(log.timestamp);
      const startDate = new Date(filters.startDate);
      if (logDate < startDate) {
        return false;
      }
    }

    if (filters.endDate) {
      const logDate = new Date(log.timestamp);
      const endDate = new Date(filters.endDate);
      // Set to end of day
      endDate.setHours(23, 59, 59, 999);
      if (logDate > endDate) {
        return false;
      }
    }

    // Filter by search term
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const searchLower = filters.searchTerm.toLowerCase();
      return (
        log.message.toLowerCase().includes(searchLower) ||
        log.service.toLowerCase().includes(searchLower) ||
        log.level.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });
}

// API endpoint to retrieve filtered logs
app.get('/api/logs', async (req, res) => {
  try {
    const filters: LogFilter = {
      service: (req.query.service as string) || 'all',
      level: (req.query.level as string) || 'all',
      startDate: req.query.startDate ? String(req.query.startDate) : null,
      endDate: req.query.endDate ? String(req.query.endDate) : null,
      searchTerm: req.query.searchTerm ? String(req.query.searchTerm) : '',
      limit: req.query.limit ? parseInt(String(req.query.limit)) : 1000,
    };

    // Get available log files
    const logFiles: { [key: string]: string } = { ...LOG_PATHS };

    // Find the latest rotating log for express
    const latestRotatingLog = findLatestRotatingLog(logFiles['express-rotating']);
    if (latestRotatingLog) {
      logFiles['express-rotating'] = latestRotatingLog;
    }

    // Find additional rotating logs if date filters are applied
    if (filters.startDate || filters.endDate) {
      const allRotatingLogs = findAllRotatingLogs(LOG_PATHS['express-rotating']);

      // Add each rotating log with its own key
      allRotatingLogs.forEach((logPath, index) => {
        if (index > 0) {
          // Skip the first one as it's already included
          logFiles[`express-rotating-${index}`] = logPath;
        }
      });
    }

    // Gather logs from all available files
    const allLogs: LogEntry[] = [];

    for (const [service, filePath] of Object.entries(logFiles)) {
      const serviceLogs = await readRecentLogs(
        filePath,
        service,
        // Use a higher limit for initial read when filtering
        filters.searchTerm || filters.startDate || filters.endDate ? 5000 : filters.limit || 1000,
      );

      allLogs.push(...serviceLogs);
    }

    // Apply filters
    const filteredLogs = filterLogs(allLogs, filters);

    // Sort by timestamp (newest first) and limit results
    const sortedLogs = filteredLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, filters.limit || 1000);

    res.json(sortedLogs);
  } catch (error) {
    console.error('Error retrieving logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// SSE endpoint for log streaming
app.get('/api/logs/stream', (req, res) => {
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

// Service status check
async function checkServicesStatus(): Promise<ServiceStatus[]> {
  const services = ['express', 'nginx', 'pm2'];
  const statuses: ServiceStatus[] = [];

  for (const service of services) {
    try {
      const status = await checkServiceStatus(service);
      statuses.push(status);
    } catch (error) {
      console.error(`Error checking ${service} status:`, error);
      statuses.push({
        name: service,
        status: 'error',
        uptime: 'N/A',
        memory: 'N/A',
        cpu: 'N/A',
      });
    }
  }

  return statuses;
}

// Check individual service status
async function checkServiceStatus(service: string): Promise<ServiceStatus> {
  return new Promise((resolve, reject) => {
    let cmd = '';
    switch (service) {
      case 'nginx':
        cmd = 'systemctl status nginx';
        break;
      case 'pm2':
        cmd = 'pm2 jlist';
        break;
      case 'express':
        cmd = 'ps aux | grep node';
        break;
      default:
        reject(new Error('Invalid service'));
        return;
    }

    exec(cmd, (error, stdout, stderr) => {
      if (error && service !== 'express') {
        resolve({
          name: service,
          status: 'stopped',
          uptime: 'N/A',
          memory: 'N/A',
          cpu: 'N/A',
        });
        return;
      }

      // Parse command output based on service
      let status: ServiceStatus;
      switch (service) {
        case 'nginx':
          status = parseNginxStatus(stdout);
          break;
        case 'pm2':
          status = parsePM2Status(stdout);
          break;
        case 'express':
          status = parseExpressStatus(stdout);
          break;
        default:
          reject(new Error('Invalid service'));
          return;
      }

      resolve(status);
    });
  });
}

// Status parsing functions
function parseNginxStatus(stdout: string): ServiceStatus {
  const isActive = stdout.includes('active (running)');
  const uptime = stdout.match(/; ([^;]+) ago/)?.[1] || 'N/A';

  return {
    name: 'nginx',
    status: isActive ? 'running' : 'stopped',
    uptime,
    memory: extractMemoryUsage(stdout),
    cpu: extractCPUUsage(stdout),
  };
}

function extractMemoryUsage(stdout: string): string {
  // Look for memory usage pattern in systemctl status output
  // Typically appears as "Memory: 34.2M" or similar
  const memoryMatch = stdout.match(/Memory:\s*([\d.]+[KMGT]?)/i);
  return memoryMatch ? memoryMatch[1] : '0';
}

function extractCPUUsage(stdout: string): string {
  // Look for CPU usage pattern in systemctl status output
  // Typically appears as "CPU: 2.3%" or similar
  const cpuMatch = stdout.match(/CPU:\s*([\d.]+%)/i);
  return cpuMatch ? cpuMatch[1] : '0%';
}

function parsePM2Status(stdout: string): ServiceStatus {
  try {
    const processes = JSON.parse(stdout);
    const process = processes[0];

    return {
      name: 'pm2',
      status: process?.pm2_env?.status === 'online' ? 'running' : 'stopped',
      uptime: formatUptime(process?.pm2_env?.pm_uptime),
      memory: formatBytes(process?.monit?.memory),
      cpu: `${process?.monit?.cpu}%`,
    };
  } catch {
    return {
      name: 'pm2',
      status: 'error',
      uptime: 'N/A',
      memory: 'N/A',
      cpu: 'N/A',
    };
  }
}

function parseExpressStatus(stdout: string): ServiceStatus {
  const processLines = stdout.split('\n').filter((line) => line.includes('node') && !line.includes('grep'));

  if (processLines.length === 0) {
    return {
      name: 'express',
      status: 'stopped',
      uptime: 'N/A',
      memory: 'N/A',
      cpu: 'N/A',
    };
  }

  const parts = processLines[0].split(/\s+/);
  return {
    name: 'express',
    status: 'running',
    uptime: 'N/A', // Need to get from process start time
    memory: `${Math.round(parseInt(parts[5]) / 1024)}MB`,
    cpu: `${parts[2]}%`,
  };
}

// Helper functions
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

function formatUptime(timestamp: number): string {
  if (!timestamp) return 'N/A';

  // Calculate duration in milliseconds between now and the uptime timestamp
  const uptimeMs = Date.now() - timestamp;

  if (uptimeMs < 0) return 'N/A'; // Invalid timestamp

  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return 'N/A';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)}${units[unitIndex]}`;
}

function parseNginxDate(dateStr: string): Date | null {
  try {
    // Format example: 26/Feb/2025:13:09:48 -0600
    const parts = dateStr.match(
      /(\d{2})\/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s([+-]\d{4})/,
    );

    if (!parts) return null;

    const day = parts[1];
    const month = {
      Jan: '01',
      Feb: '02',
      Mar: '03',
      Apr: '04',
      May: '05',
      Jun: '06',
      Jul: '07',
      Aug: '08',
      Sep: '09',
      Oct: '10',
      Nov: '11',
      Dec: '12',
    }[parts[2]];
    const year = parts[3];
    const hour = parts[4];
    const minute = parts[5];
    const second = parts[6];
    const timezone = parts[7];

    // Construct ISO string
    const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}${timezone.replace(':', '')}`;
    return new Date(isoString);
  } catch (error) {
    console.error('Error parsing Nginx date:', error, dateStr);
    return null;
  }
}

// Start server
const PORT = process.env.PORT || 3001;
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  httpServer.close(() => {
    console.log('Server shutdown complete');
  });
});
