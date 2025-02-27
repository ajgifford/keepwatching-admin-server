import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';

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

const EXPRESS_LOG_DIRECTORY = path.resolve(process.env.EXPRESS_LOG_DIR || '/var/log');
const PM2_LOG_DIRECTORY = path.resolve(process.env.PM2_LOG_DIR || '/var/log/.pm2');

function getCurrentDate(): string {
  const date = new Date();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

const LOG_FILES: Record<string, string> = {
  nginx: '/var/log/nginx/access.log',
  'KeepWatching-HTTP': `${EXPRESS_LOG_DIRECTORY}/keepwatching-${getCurrentDate()}.log`,
  'KeepWatching-HTTP-Error': `${EXPRESS_LOG_DIRECTORY}/keepwatching-error.log`,
  'KeepWatching-Console': `${PM2_LOG_DIRECTORY}/keepwatching-server-out-0.log`,
  'KeepWatching-Console-Error': `${PM2_LOG_DIRECTORY}/keepwatching-server-error-0.log`,
};

const parseLogLine = (line: string, service: string, logFile: string): LogEntry | null => {
  const logRegex = /\[(.*?)\] (\w+) .*?: (.*)/;
  const match = line.match(logRegex);
  if (match) {
    return {
      timestamp: match[1],
      level: match[2] as 'info' | 'warn' | 'error',
      message: match[3],
      service,
      logFile,
    };
  }
  return null;
};

const loadLogs = (logFile: string, service: string): LogEntry[] => {
  const filePath = path.join('/mnt/data', logFile);
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  return lines.map((line) => parseLogLine(line, service, logFile)).filter((entry): entry is LogEntry => entry !== null);
};

const filterLogs = (logs: LogEntry[], filter: LogFilter): LogEntry[] => {
  return logs
    .filter((log) => {
      if (filter.service && log.service !== filter.service) return false;
      if (filter.level && log.level !== filter.level) return false;
      if (filter.startDate && new Date(log.timestamp) < new Date(filter.startDate)) return false;
      if (filter.endDate && new Date(log.timestamp) > new Date(filter.endDate)) return false;
      if (filter.searchTerm && !log.message.includes(filter.searchTerm)) return false;
      return true;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(0, filter.limit || 100);
};

export const getLogs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const filter: LogFilter = {
    service: req.query.service as string,
    level: req.query.level as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    searchTerm: req.query.searchTerm as string,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  };

  let logs: LogEntry[] = [];
  for (const [service, file] of Object.entries(LOG_FILES)) {
    logs = logs.concat(loadLogs(file, service));
  }

  res.json(filterLogs(logs, filter));
});
