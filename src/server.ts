import 'dotenv/config';

import { logger } from './logger/logger';
import { errorHandler } from './middleware/errorMiddleware';
import accountRouter from './routes/accountManagementRouter';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import compression from 'compression';
import cors from 'cors';
import { EventEmitter } from 'events';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createServer } from 'http';
import path from 'path';
import { Tail } from 'tail';

// Increase max listeners to handle multiple SSE connections
EventEmitter.defaultMaxListeners = 30;

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

// SSE client management
const clients = new Set<express.Response>();

function sendEventToAll(event: string, data: any) {
  clients.forEach((client) => {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });
}

// Log file paths
const LOG_PATHS = {
  express: '/var/log/express.log',
  nginx: '/var/log/nginx/access.log',
  pm2: '/var/log/.pm2/pm2.log',
};

app.use(accountRouter);

// SSE endpoint for service status updates
app.get('/api/status/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  clients.add(res);

  // Send initial status
  checkServicesStatus().then((status) => {
    res.write(`data: ${JSON.stringify(status)}\n\n`);
  });

  // Remove client on connection close
  req.on('close', () => {
    clients.delete(res);
  });
});

// SSE endpoint for log streaming
app.get('/api/logs/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const tails: { [key: string]: Tail } = {};

  // Start tailing each log file
  Object.entries(LOG_PATHS).forEach(([service, logPath]) => {
    try {
      const tail = new Tail(logPath);

      tail.on('line', (data) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          service,
          message: data,
          level: determineLogLevel(data),
        };

        res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
      });

      tail.on('error', (error) => {
        console.error(`Error tailing ${service} log:`, error);
      });

      tails[service] = tail;
    } catch (error) {
      console.error(`Error setting up tail for ${service}:`, error);
    }
  });

  // Cleanup on connection close
  req.on('close', () => {
    Object.values(tails).forEach((tail) => tail.unwatch());
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
function determineLogLevel(logLine: string): 'info' | 'warn' | 'error' {
  const line = logLine.toLowerCase();
  if (line.includes('error') || line.includes('err]') || line.includes('exception')) {
    return 'error';
  }
  if (line.includes('warn') || line.includes('warning')) {
    return 'warn';
  }
  return 'info';
}

function formatUptime(ms: number): string {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
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

// Start monitoring services
let monitoringInterval: NodeJS.Timeout;

function startMonitoring() {
  // Initial check
  checkServicesStatus().then((statuses) => {
    sendEventToAll('status', statuses);
  });

  // Regular checks
  monitoringInterval = setInterval(async () => {
    const statuses = await checkServicesStatus();
    sendEventToAll('status', statuses);
  }, 30000); // Check every 30 seconds
}

// Start server
const PORT = process.env.PORT || 3001;
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startMonitoring();
});

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  clearInterval(monitoringInterval);
  httpServer.close(() => {
    console.log('Server shutdown complete');
  });
});
