import { exec } from 'child_process';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

export const getServiceStatuses = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statuses = await checkServicesStatus();
    res.json(statuses);
  } catch (error) {
    next(error);
  }
});

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  memory: string;
  cpu: string;
}

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

    exec(cmd, (error, stdout, _stderr) => {
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
