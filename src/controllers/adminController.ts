import { summaryService } from '@ajgifford/keepwatching-common-server/services';
import { ServiceHealth, ServiceStatus, SiteStatus } from '@ajgifford/keepwatching-types';
import { exec } from 'child_process';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

const ALLOWED_SERVICES = ['nginx', 'pm2'] as const;
type RestartableService = (typeof ALLOWED_SERVICES)[number];

/**
 * Get service health
 * @route GET /api/v1/admin/health
 */
export const getServicesHealth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statuses = await checkServicesHealth();
    res.status(200).json(statuses);
  } catch (error) {
    next(error);
  }
});

/**
 * Get summary counts such as total accounts, shows, movies
 * @route GET /api/v1/admin/summary-counts
 */
export const getSummaryCounts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const counts = await summaryService.getSummaryCounts();
    res.status(200).json({
      message: 'Successfully retrieved summary counts',
      counts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Probe the public-facing site URL to verify end-to-end reachability.
 * @route GET /api/v1/admin/site-status
 */
export const getSiteStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = process.env.SITE_URL ?? 'https://keepwatching.giffordfamilydev.us';
    const lastChecked = new Date().toISOString();
    const start = Date.now();

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const responseTimeMs = Date.now() - start;
      const siteStatus: SiteStatus = {
        url,
        status: response.ok ? 'up' : 'down',
        statusCode: response.status,
        responseTimeMs,
        lastChecked,
      };
      res.status(200).json(siteStatus);
    } catch (fetchError) {
      const responseTimeMs = Date.now() - start;
      const siteStatus: SiteStatus = {
        url,
        status: 'down',
        statusCode: null,
        responseTimeMs,
        lastChecked,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
      };
      res.status(200).json(siteStatus);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Restart a named service (nginx or pm2).
 * Note: restarting nginx requires a passwordless sudoers entry for this process user:
 *   <user> ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
 * @route POST /api/v1/admin/services/:service/restart
 */
export const restartService = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { service } = req.params;

    if (!ALLOWED_SERVICES.includes(service as RestartableService)) {
      res.status(400).json({ message: `Invalid service. Must be one of: ${ALLOWED_SERVICES.join(', ')}` });
      return;
    }

    const cmd = service === 'nginx' ? 'sudo systemctl reload nginx' : 'pm2 reload keepwatching-api-server';

    await new Promise<void>((resolve, reject) => {
      exec(cmd, (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve();
        }
      });
    });

    res.status(200).json({ success: true, service, message: `${service} reloaded successfully` });
  } catch (error) {
    next(error);
  }
});

async function checkServicesHealth(): Promise<ServiceHealth[]> {
  const services = ['express', 'nginx', 'pm2'];
  const statuses: ServiceHealth[] = [];

  for (const service of services) {
    try {
      const status = await checkServiceHealth(service);
      statuses.push(status);
    } catch (error) {
      console.error(`Error checking ${service} status:`, error);
      statuses.push({
        name: service,
        status: ServiceStatus.ERROR,
        uptime: 'N/A',
        memory: 'N/A',
        cpu: 'N/A',
      });
    }
  }

  return statuses;
}

async function checkServiceHealth(service: string): Promise<ServiceHealth> {
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

    exec(cmd, (error, stdout, _stderr) => {
      if (error && service !== 'express') {
        resolve({
          name: service,
          status: ServiceStatus.STOPPED,
          uptime: 'N/A',
          memory: 'N/A',
          cpu: 'N/A',
        });
        return;
      }

      // Parse command output based on service
      let status: ServiceHealth;
      switch (service) {
        case 'nginx':
          status = parseNginxHealth(stdout);
          break;
        case 'pm2':
          status = parsePM2Health(stdout);
          break;
        case 'express':
          status = parseExpressHealth(stdout);
          break;
        default:
          reject(new Error('Invalid service'));
          return;
      }

      resolve(status);
    });
  });
}

function parseNginxHealth(stdout: string): ServiceHealth {
  const isActive = stdout.includes('active (running)');
  const uptime = stdout.match(/; ([^;]+) ago/)?.[1] || 'N/A';

  return {
    name: 'nginx',
    status: isActive ? ServiceStatus.RUNNING : ServiceStatus.STOPPED,
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

function parsePM2Health(stdout: string): ServiceHealth {
  try {
    const processes = JSON.parse(stdout);
    const process = processes[0];

    return {
      name: 'pm2',
      status: process?.pm2_env?.status === 'online' ? ServiceStatus.RUNNING : ServiceStatus.STOPPED,
      uptime: formatUptime(process?.pm2_env?.pm_uptime),
      memory: formatBytes(process?.monit?.memory),
      cpu: `${process?.monit?.cpu}%`,
    };
  } catch {
    return {
      name: 'pm2',
      status: ServiceStatus.ERROR,
      uptime: 'N/A',
      memory: 'N/A',
      cpu: 'N/A',
    };
  }
}

function parseExpressHealth(stdout: string): ServiceHealth {
  const processLines = stdout.split('\n').filter((line) => line.includes('node') && !line.includes('grep'));

  if (processLines.length === 0) {
    return {
      name: 'express',
      status: ServiceStatus.STOPPED,
      uptime: 'N/A',
      memory: 'N/A',
      cpu: 'N/A',
    };
  }

  const parts = processLines[0].split(/\s+/);
  return {
    name: 'express',
    status: ServiceStatus.RUNNING,
    uptime: 'N/A', // Need to get from process start time
    memory: `${Math.round(parseInt(parts[5]) / 1024)}MB`,
    cpu: `${parts[2]}%`,
  };
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
