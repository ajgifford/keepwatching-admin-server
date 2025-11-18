import { cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import {
  AppLogEntry,
  ErrorLogEntry,
  LogEntry,
  LogLevel,
  LogService,
  NginxLogEntry,
} from '@ajgifford/keepwatching-types';
import path from 'path';

// Regex patterns for log parsing
const NGINX_LOG_PATTERN = /^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\d+) "([^"]*)" "([^"]*)"$/;
const WINSTON_LOG_PATTERN = /\[([\w\-]+ [\d:]+)\] (?:\x1b?\[\d+m)?(\w+)(?:\x1b?\s?\[\d+m)? \(([\d\.]+)\): (.+)/;
const TIMESTAMP_PATTERN = /^\[([A-Za-z]{3}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})\]\s+(\w+):\s*(.*)$/;

/**
 * Parse a single line from an app log file (JSON format)
 * @param line - Log line to parse
 * @param service - Service type (e.g., LogService.APP)
 * @param logFile - Log file name for reference
 * @returns Parsed AppLogEntry or null if parsing fails
 */
export function parseAppLogLine(line: string, service: LogService, logFile: string): AppLogEntry | null {
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
  } catch (e) {
    return null;
  }
}

/**
 * Parse a single line from nginx access log
 * @param line - Log line to parse
 * @param logFile - Log file name for reference
 * @returns Parsed NginxLogEntry or null if parsing fails
 */
export function parseNginxLogLine(line: string, logFile: string): NginxLogEntry | null {
  const match = line.match(NGINX_LOG_PATTERN);
  if (!match) return null;

  return {
    service: LogService.NGINX,
    level: LogLevel.INFO,
    message: `Request: ${match[5]} >>> Status: ${match[6]}`,
    logFile: path.basename(logFile),
    remoteAddr: match[1],
    remoteUser: match[3],
    timestamp: normalizeTimestamp(match[4]),
    request: match[5],
    status: parseInt(match[6], 10),
    bytesSent: parseInt(match[7], 10),
    httpReferer: match[8],
    httpUserAgent: match[9],
    gzipRatio: match[10] || undefined,
  };
}

/**
 * Parse a single line from console log (winston format)
 * @param line - Log line to parse
 * @param service - Service type
 * @param logFile - Log file name for reference
 * @returns Parsed LogEntry or null if parsing fails
 */
export function parseConsoleLogLine(line: string, service: LogService, logFile: string): LogEntry | null {
  const match = line.match(WINSTON_LOG_PATTERN);
  if (match) {
    const [_fullMatch, dateTime, logLevel, version, message] = match;
    return {
      timestamp: dateTime,
      level: logLevel as LogLevel,
      message: message,
      service: service,
      version,
      logFile: path.basename(logFile),
    };
  }
  return null;
}

/**
 * Parse error log file content containing multiline stack traces
 * @param logContent - Raw log file content
 * @param service - Service type
 * @param logFile - Log file name for reference
 * @returns Array of parsed error log entries
 */
export function parseErrorLogFile(logContent: string, service: LogService, logFile: string): ErrorLogEntry[] {
  const errors: ErrorLogEntry[] = [];
  let currentError: ErrorLogEntry | null = null;
  const lines: string[] = logContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for timestamp pattern first
    const timestampMatch = line.match(TIMESTAMP_PATTERN);

    if (timestampMatch) {
      const [, dateTimeStr, logLevel, message] = timestampMatch;

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
 * Parse log timestamp from format [Jul-03-2025 12:49:28] to ISO string
 * @param dateTimeStr - Timestamp string to parse (e.g., "Jul-03-2025 12:49:28")
 * @returns ISO 8601 formatted timestamp string
 */
export function parseLogTimestamp(dateTimeStr: string): string {
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
    cliLogger.warn(`Failed to parse timestamp "${dateTimeStr}":`, error);
    // Fallback to current timestamp
    return new Date().toISOString();
  }
}

/**
 * Normalize various timestamp formats to ISO string
 * Handles nginx format: 02/Jul/2025:02:13:02 -0500
 * @param timestamp - Timestamp string to normalize
 * @returns ISO 8601 formatted timestamp string
 */
export function normalizeTimestamp(timestamp: string): string {
  // Check if already in ISO format (e.g., 2025-01-15T12:00:00Z)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(timestamp)) {
    return timestamp;
  }

  if (timestamp.includes('/') && timestamp.includes(':')) {
    // Parse Nginx format: 02/Jul/2025:02:13:02 -0500
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

      // Parse the timezone offset (-0500 means 5 hours behind UTC)
      const timezoneOffset = parseInt(timezone);
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 100);
      const offsetMinutes = Math.abs(timezoneOffset) % 100;
      const totalOffsetMinutes = offsetHours * 60 + offsetMinutes;

      // Create date in UTC first
      const utcDate = new Date(
        Date.UTC(parseInt(year), months[month], parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds)),
      );

      // Adjust for timezone offset
      // If timezone is -0500 (5 hours behind UTC), the local time needs to be converted to UTC
      // by adding 5 hours (because the logged time is 5 hours behind UTC)
      if (timezoneOffset < 0) {
        // Negative offset means behind UTC, so add the offset to get UTC
        utcDate.setUTCMinutes(utcDate.getUTCMinutes() + totalOffsetMinutes);
      } else {
        // Positive offset means ahead of UTC, so subtract the offset to get UTC
        utcDate.setUTCMinutes(utcDate.getUTCMinutes() - totalOffsetMinutes);
      }

      return utcDate.toISOString();
    }
  }

  // For timestamps that are already in a standard format
  try {
    return new Date(timestamp).toISOString();
  } catch (error) {
    // Fallback: return current time if parsing fails
    return new Date().toISOString();
  }
}

/**
 * Load and parse all logs from a file based on service type
 * This is a convenience function that calls the appropriate parser
 * @param content - Raw file content
 * @param service - Service type
 * @param logFile - Log file name
 * @returns Array of parsed log entries
 */
export function parseLogFile(content: string, service: LogService, logFile: string): LogEntry[] {
  const lines = content.split('\n');

  switch (service) {
    case LogService.APP:
      return lines
        .map((line) => parseAppLogLine(line, service, logFile))
        .filter((entry): entry is AppLogEntry => entry !== null);

    case LogService.NGINX:
      return lines
        .map((line) => parseNginxLogLine(line, logFile))
        .filter((entry): entry is NginxLogEntry => entry !== null);

    case LogService.CONSOLE:
      return lines
        .map((line) => parseConsoleLogLine(line, service, logFile))
        .filter((entry): entry is LogEntry => entry !== null);

    case LogService.CONSOLE_ERROR:
      return parseErrorLogFile(content, service, logFile);

    default:
      return [];
  }
}
