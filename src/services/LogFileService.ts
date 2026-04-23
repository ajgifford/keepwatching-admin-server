import { getAdminServerName, getExpressLogDir, getPM2LogDir } from '@ajgifford/keepwatching-common-server/config';
import { cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import { LogService } from '@ajgifford/keepwatching-types';
import fs from 'fs';
import path from 'path';
import { getCurrentDate } from '../utils/dateHelpers';

const EXPRESS_LOG_DIRECTORY = getExpressLogDir();
const PM2_LOG_DIRECTORY = getPM2LogDir();
const NGINX_LOG_DIR = process.env.NGINX_LOG_DIR || '/var/log/nginx';

const adminServiceName = getAdminServerName() || 'keepwatching-admin';
const adminPm2Name = `${adminServiceName}-server`;

// Matches the date portion appended by winston-daily-rotate-file (MMMM-DD-YYYY)
const ROTATING_DATE_PATTERN =
  /-(January|February|March|April|May|June|July|August|September|October|November|December)-\d{2}-\d{4}\.log$/;

const LOG_PATHS: Record<string, string> = {
  nginx: `${NGINX_LOG_DIR}/access.log`,
  'nginx-client': `${NGINX_LOG_DIR}/keepwatching.access.log`,
  'nginx-admin': `${NGINX_LOG_DIR}/keepwatching-admin.access.log`,
  'KeepWatching-App': `${EXPRESS_LOG_DIRECTORY}/keepwatching-${getCurrentDate()}.log`,
  'KeepWatching-App-Error': `${EXPRESS_LOG_DIRECTORY}/keepwatching-error.log`,
  'KeepWatching-Console': `${PM2_LOG_DIRECTORY}/keepwatching-api-server-out-0.log`,
  'KeepWatching-Console-Error': `${PM2_LOG_DIRECTORY}/keepwatching-api-server-error-0.log`,
  'KeepWatching-Admin-App': `${EXPRESS_LOG_DIRECTORY}/${adminServiceName}-${getCurrentDate()}.log`,
  'KeepWatching-Admin-App-Error': `${EXPRESS_LOG_DIRECTORY}/${adminServiceName}-error.log`,
  'KeepWatching-Admin-Console': `${PM2_LOG_DIRECTORY}/${adminPm2Name}-out-0.log`,
  'KeepWatching-Admin-Console-Error': `${PM2_LOG_DIRECTORY}/${adminPm2Name}-error-0.log`,
};

const SERVICE_MAPPING: { [key: string]: LogService } = {
  'KeepWatching-App': LogService.APP,
  'KeepWatching-App-Error': LogService.APP,
  nginx: LogService.NGINX,
  'nginx-client': LogService.NGINX,
  'nginx-admin': LogService.NGINX,
  'KeepWatching-Console': LogService.CONSOLE,
  'KeepWatching-Console-Error': LogService.CONSOLE_ERROR,
  'KeepWatching-Admin-App': LogService.ADMIN_APP,
  'KeepWatching-Admin-App-Error': LogService.ADMIN_APP,
  'KeepWatching-Admin-Console': LogService.ADMIN_CONSOLE,
  'KeepWatching-Admin-Console-Error': LogService.ADMIN_CONSOLE_ERROR,
};

/**
 * Service for managing log file operations
 * Encapsulates all file system access for log files
 */
export class LogFileService {
  /**
   * Read the entire content of a log file
   * @param filePath - Absolute path to log file
   * @returns File content as string, or empty string if file doesn't exist
   */
  readLogFile(filePath: string): string {
    if (!this.fileExists(filePath)) {
      cliLogger.info('File does not exist', filePath);
      return '';
    }

    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      cliLogger.error(`Error reading log file ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Find all rotating log files matching a service name prefix in the same directory.
   * Extracts the prefix by stripping the date portion (MMMM-DD-YYYY) from the base filename
   * so that 'keepwatching' and 'keepwatching-admin' are handled as distinct prefixes.
   * @param basePath - Base path of a dated log file (e.g., /logs/keepwatching-April-22-2026.log)
   * @returns Array of file paths sorted by modification time (newest first)
   */
  findRotatingLogs(basePath: string): string[] {
    try {
      const dir = path.dirname(basePath);
      const baseFileName = path.basename(basePath);
      const prefix = baseFileName.replace(ROTATING_DATE_PATTERN, '');

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
      cliLogger.error('Error finding rotating logs:', err);
      return [];
    }
  }

  /**
   * Find the most recent rotating log file
   * @param basePath - Base path pattern
   * @returns Path to latest log file, or null if none found
   */
  findLatestRotatingLog(basePath: string): string | null {
    const logs = this.findRotatingLogs(basePath);
    return logs.length > 0 ? logs[0] : null;
  }

  /**
   * Check if a file exists and is readable
   * @param filePath - Path to check
   * @returns true if file exists and is readable
   */
  fileExists(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch (_err) {
      return false;
    }
  }

  /**
   * Get all configured log file paths
   * @param filters - Optional date filters to include rotating logs
   * @returns Record mapping log type to file path
   */
  getLogFilePaths(filters?: { startDate?: string; endDate?: string }): Record<string, string> {
    const logFiles: { [key: string]: string } = { ...LOG_PATHS };

    // Resolve the latest rotating log for each app log type
    for (const key of ['KeepWatching-App', 'KeepWatching-Admin-App']) {
      const latestRotatingLog = this.findLatestRotatingLog(logFiles[key]);
      if (latestRotatingLog) {
        logFiles[key] = latestRotatingLog;
      }
    }

    // Include all historical rotating logs when date filters are applied
    if (filters?.startDate || filters?.endDate) {
      for (const [baseKey, basePath] of [
        ['KeepWatching-App', LOG_PATHS['KeepWatching-App']],
        ['KeepWatching-Admin-App', LOG_PATHS['KeepWatching-Admin-App']],
      ]) {
        const allRotatingLogs = this.findRotatingLogs(basePath);
        allRotatingLogs.forEach((logPath, index) => {
          if (index > 0) {
            logFiles[`${baseKey}-${index}`] = logPath;
          }
        });
      }
    }

    return logFiles;
  }

  /**
   * Get the service type for a log file key
   * @param logType - Log type key (e.g., 'KeepWatching-App')
   * @returns LogService enum value
   */
  getServiceFromLogType(logType: string): LogService {
    const baseLogType = logType.replace(/-\d+$/, '');
    return SERVICE_MAPPING[baseLogType] || LogService.SYSTEM;
  }

  /**
   * Get the base log paths configuration
   * @returns Record of log type to path
   */
  getLogPathsConfig(): Record<string, string> {
    return { ...LOG_PATHS };
  }

  /**
   * Get the service mapping configuration
   * @returns Record of log type to service
   */
  getServiceMapping(): { [key: string]: LogService } {
    return { ...SERVICE_MAPPING };
  }
}

// Export a singleton instance
export const logFileService = new LogFileService();
