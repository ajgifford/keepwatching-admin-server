import { ServiceHealth, ServiceStatus } from '@ajgifford/keepwatching-types';
import { exec } from 'child_process';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

export const getServicesHealth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statuses = await checkServicesHealth();
    res.json(statuses);
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
