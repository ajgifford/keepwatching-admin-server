import { LogEntry, LogFilter, LogLevel } from '@ajgifford/keepwatching-types';

/**
 * Determine log level from service name and log line content
 * @param service - Service name (e.g., 'KeepWatching-App-Error')
 * @param logLine - Log line content
 * @returns LogLevel enum value
 */
export function determineLogLevel(service: string, logLine: string): LogLevel {
  // If the log is from an error log file, mark it as error level
  if (service.toLowerCase().includes('error')) {
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

/**
 * Check if a log entry matches filter criteria
 * @param log - Log entry to check
 * @param filter - Filter criteria
 * @returns true if log matches all filter criteria
 */
export function matchesFilter(log: LogEntry, filter: LogFilter): boolean {
  if (filter.service && log.service !== filter.service) return false;
  if (filter.level && log.level !== filter.level) return false;
  if (filter.startDate && new Date(log.timestamp) <= new Date(filter.startDate)) return false;
  if (filter.endDate && new Date(log.timestamp) >= new Date(filter.endDate)) return false;
  if (filter.searchTerm && !log.message.includes(filter.searchTerm)) return false;
  return true;
}

/**
 * Sort logs by timestamp
 * @param logs - Array of log entries
 * @param order - Sort order ('asc' or 'desc')
 * @returns Sorted array of log entries
 */
export function sortLogsByTimestamp(logs: LogEntry[], order: 'asc' | 'desc' = 'desc'): LogEntry[] {
  return [...logs].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return order === 'desc' ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Apply limit to log results
 * @param logs - Array of log entries
 * @param limit - Maximum number of results (default 100)
 * @returns Limited array of log entries
 */
export function limitLogs(logs: LogEntry[], limit: number = 100): LogEntry[] {
  return logs.slice(0, limit);
}

/**
 * Filter logs based on provided criteria
 * Applies filtering, sorting, and limiting in one operation
 * @param logs - Array of log entries to filter
 * @param filter - Filter criteria
 * @returns Filtered, sorted, and limited array of log entries
 */
export function filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
  // Filter logs based on criteria
  const filtered = logs.filter((log) => matchesFilter(log, filter));

  // Sort by timestamp (newest first)
  const sorted = sortLogsByTimestamp(filtered, 'desc');

  // Apply limit
  const limited = limitLogs(sorted, filter.limit || 100);

  return limited;
}
