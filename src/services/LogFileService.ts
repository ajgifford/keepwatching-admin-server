import { getExpressLogDir, getPM2LogDir } from '@ajgifford/keepwatching-common-server/config';
import { cliLogger } from '@ajgifford/keepwatching-common-server/logger';
import { LogService } from '@ajgifford/keepwatching-types';
import fs from 'fs';
import path from 'path';
import { getCurrentDate } from '../utils/dateHelpers';

const EXPRESS_LOG_DIRECTORY = getExpressLogDir();
const PM2_LOG_DIRECTORY = getPM2LogDir();

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
   * Find all rotating log files matching a base path pattern
   * @param basePath - Base path pattern (e.g., /logs/app-YYYY-MM-DD.log)
   * @returns Array of file paths sorted by modification time (newest first)
   */
  findRotatingLogs(basePath: string): string[] {
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
    } catch (err) {
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

    // Find the latest rotating log for express
    const latestRotatingLog = this.findLatestRotatingLog(logFiles['KeepWatching-App']);
    if (latestRotatingLog) {
      logFiles['KeepWatching-App'] = latestRotatingLog;
    }

    // Find additional rotating logs if date filters are applied
    if (filters?.startDate || filters?.endDate) {
      const allRotatingLogs = this.findRotatingLogs(LOG_PATHS['KeepWatching-App']);

      // Add each rotating log with its own key
      allRotatingLogs.forEach((logPath, index) => {
        if (index > 0) {
          // Skip the first one as it's already included
          logFiles[`KeepWatching-App-${index}`] = logPath;
        }
      });
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
