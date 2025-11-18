import { getDBHealth, getServicesHealth } from '@controllers/servicesController';
import { healthService } from '@ajgifford/keepwatching-common-server/services';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ServiceStatus } from '@ajgifford/keepwatching-types';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  healthService: {
    getDatabaseHealth: jest.fn(),
  },
}));

// Mock child_process exec to control service health check responses
const mockExec = jest.fn();
jest.mock('child_process', () => ({
  exec: (cmd: string, callback: any) => {
    mockExec(cmd, callback);
  },
}));

describe('ServicesController', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
    mockExec.mockClear();
  });

  describe('getServicesHealth', () => {
    it('should return services health status with all running services', async () => {
      // Mock exec to simulate all services running
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running); 2 days ago\nMemory: 34.2M\nCPU: 1.5%', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              {
                pm2_env: { status: 'online', pm_uptime: Date.now() - 86400000 },
                monit: { memory: 104857600, cpu: 2.5 },
              },
            ]),
            '',
          );
        } else if (cmd.includes('node')) {
          callback(null, 'user  1234  0.5 1.2 1048576 125952 ?   Ss   Jan01   1:23 node server.js', '');
        }
      });

      await getServicesHealth(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBe(3);
      expect(response.some((s: any) => s.name === 'nginx')).toBe(true);
      expect(response.some((s: any) => s.name === 'pm2')).toBe(true);
      expect(response.some((s: any) => s.name === 'express')).toBe(true);
    });

    it('should handle service check errors gracefully', async () => {
      // Mock exec to simulate service errors
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(new Error('Service not found'), '', '');
        } else if (cmd.includes('pm2')) {
          callback(new Error('PM2 not installed'), '', '');
        } else if (cmd.includes('node')) {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(Array.isArray(response)).toBe(true);
      // Should still return status for all services, even if some errored
      expect(response.length).toBe(3);

      // Check that errored services have ERROR or STOPPED status
      const nginxStatus = response.find((s: any) => s.name === 'nginx');
      expect([ServiceStatus.ERROR, ServiceStatus.STOPPED]).toContain(nginxStatus?.status);
    });

    it('should handle PM2 JSON parse errors', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('pm2')) {
          callback(null, 'invalid json', '');
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      const pm2Status = response.find((s: any) => s.name === 'pm2');
      expect(pm2Status?.status).toBe(ServiceStatus.ERROR);
    });

    it('should handle stopped services', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'inactive (dead)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              {
                pm2_env: { status: 'stopped', pm_uptime: 0 },
                monit: { memory: 0, cpu: 0 },
              },
            ]),
            '',
          );
        } else if (cmd.includes('node')) {
          callback(null, '', ''); // No node processes found
        }
      });

      await getServicesHealth(req, res, next);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];

      const nginxStatus = response.find((s: any) => s.name === 'nginx');
      expect(nginxStatus?.status).toBe(ServiceStatus.STOPPED);

      const expressStatus = response.find((s: any) => s.name === 'express');
      expect(expressStatus?.status).toBe(ServiceStatus.STOPPED);
    });
  });

  describe('getDBHealth', () => {
    it('should return database health status', async () => {
      const mockDbHealth = {
        status: 'healthy',
        connected: true,
        responseTime: 10,
      };

      (healthService.getDatabaseHealth as jest.Mock).mockResolvedValue(mockDbHealth);

      await getDBHealth(req, res, next);

      expect(healthService.getDatabaseHealth).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockDbHealth);
    });

    it('should handle database health check errors', async () => {
      const error = new Error('Database connection failed');
      (healthService.getDatabaseHealth as jest.Mock).mockRejectedValue(error);

      await getDBHealth(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle database timeout errors', async () => {
      const error = new Error('Connection timeout');
      (healthService.getDatabaseHealth as jest.Mock).mockRejectedValue(error);

      await getDBHealth(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
