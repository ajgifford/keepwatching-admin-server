import { summaryService } from '@ajgifford/keepwatching-common-server/services';
import { ServiceStatus } from '@ajgifford/keepwatching-types';
import { getServicesHealth, getSiteStatus, getSummaryCounts, restartService } from '@controllers/adminController';

// Mock child_process exec to control service health check responses
const mockExec = jest.fn();
jest.mock('child_process', () => ({
  exec: (cmd: string, callback: any) => {
    mockExec(cmd, callback);
  },
}));

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  summaryService: {
    getSummaryCounts: jest.fn(),
  },
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch as any;

describe('AdminController', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = { params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
    mockExec.mockClear();
    mockFetch.mockClear();
  });

  describe('getServicesHealth', () => {
    it('should return services health status with all running services', async () => {
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
          callback(null, 'user  1234  0.5 1.2 1048576 125952 ?   Ss   Jan01   1:23 node server.mjs', '');
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

    it('should return running status and parsed metrics for nginx', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running); 5h 30m ago\nMemory: 128.0M\nCPU: 3.2%', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: Date.now() - 3600000 }, monit: { memory: 52428800, cpu: 1.0 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const nginx = response.find((s: any) => s.name === 'nginx');
      expect(nginx.status).toBe(ServiceStatus.RUNNING);
      expect(nginx.memory).toBe('128.0M');
      expect(nginx.cpu).toBe('3.2%');
    });

    it('should return nginx uptime parsed from systemctl output', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running); 3 weeks 2 days ago\nMemory: 10M\nCPU: 0.5%', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: Date.now() - 1000 }, monit: { memory: 1024, cpu: 0 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const nginx = response.find((s: any) => s.name === 'nginx');
      expect(nginx.uptime).toBe('3 weeks 2 days');
    });

    it('should return N/A for nginx memory/cpu when not present in output', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: Date.now() - 1000 }, monit: { memory: 1024, cpu: 0 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const nginx = response.find((s: any) => s.name === 'nginx');
      expect(nginx.memory).toBe('0');
      expect(nginx.cpu).toBe('0%');
    });

    it('should handle service check errors gracefully', async () => {
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
      expect(response.length).toBe(3);

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

    it('should handle PM2 with missing process data', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('pm2')) {
          callback(null, JSON.stringify([]), '');
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const pm2 = response.find((s: any) => s.name === 'pm2');
      expect(pm2.status).toBe(ServiceStatus.STOPPED);
      expect(pm2.uptime).toBe('N/A');
      expect(pm2.memory).toBe('N/A');
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
          callback(null, '', '');
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

    it('should return express RUNNING with parsed cpu and memory', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: Date.now() - 60000 }, monit: { memory: 2048, cpu: 0.1 } },
            ]),
            '',
          );
        } else if (cmd.includes('node')) {
          // ps aux output format: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
          callback(null, 'deploy  999  1.2  2.5 512000 256000 ? Ss 10:00 0:30 node server.mjs\n', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const express = response.find((s: any) => s.name === 'express');
      expect(express.status).toBe(ServiceStatus.RUNNING);
      expect(express.cpu).toBe('1.2%');
    });

    it('should format pm2 uptime in hours and minutes', async () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000 - 15 * 60 * 1000; // 2h 15m ago
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: twoHoursAgo }, monit: { memory: 1048576, cpu: 0.5 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const pm2 = response.find((s: any) => s.name === 'pm2');
      expect(pm2.uptime).toMatch(/^2h \d+m$/);
    });

    it('should format pm2 uptime in minutes and seconds', async () => {
      const threeMinutesAgo = Date.now() - 3 * 60 * 1000 - 45 * 1000; // 3m 45s ago
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: threeMinutesAgo }, monit: { memory: 1024, cpu: 0 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const pm2 = response.find((s: any) => s.name === 'pm2');
      expect(pm2.uptime).toMatch(/^3m \d+s$/);
    });

    it('should format pm2 uptime in seconds only', async () => {
      const thirtySecondsAgo = Date.now() - 30000;
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: thirtySecondsAgo }, monit: { memory: 512, cpu: 0 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const pm2 = response.find((s: any) => s.name === 'pm2');
      expect(pm2.uptime).toMatch(/^\d+s$/);
    });

    it('should format pm2 uptime in days and hours', async () => {
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000; // 2d 3h ago
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: twoDaysAgo }, monit: { memory: 2097152, cpu: 1.5 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const pm2 = response.find((s: any) => s.name === 'pm2');
      expect(pm2.uptime).toMatch(/^2d \dh$/);
    });

    it('should format pm2 memory in bytes', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: Date.now() - 1000 }, monit: { memory: 512, cpu: 0 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const pm2 = response.find((s: any) => s.name === 'pm2');
      expect(pm2.memory).toBe('512.0B');
    });

    it('should format pm2 memory in KB', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: Date.now() - 1000 }, monit: { memory: 2048, cpu: 0 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const pm2 = response.find((s: any) => s.name === 'pm2');
      expect(pm2.memory).toBe('2.0KB');
    });

    it('should format pm2 memory in GB', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('nginx')) {
          callback(null, 'active (running)', '');
        } else if (cmd.includes('pm2')) {
          callback(
            null,
            JSON.stringify([
              { pm2_env: { status: 'online', pm_uptime: Date.now() - 1000 }, monit: { memory: 2147483648, cpu: 0 } },
            ]),
            '',
          );
        } else {
          callback(null, '', '');
        }
      });

      await getServicesHealth(req, res, next);

      const response = res.json.mock.calls[0][0];
      const pm2 = response.find((s: any) => s.name === 'pm2');
      expect(pm2.memory).toBe('2.0GB');
    });
  });

  describe('getSummaryCounts', () => {
    it('should return summary counts successfully', async () => {
      const mockCounts = {
        accounts: 10,
        profiles: 20,
        shows: 50,
        seasons: 100,
        episodes: 500,
        movies: 30,
        people: 200,
        favoritedShows: 15,
        favoritedMovies: 8,
      };
      jest.mocked(summaryService.getSummaryCounts).mockResolvedValue(mockCounts);

      await getSummaryCounts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Successfully retrieved summary counts',
        counts: mockCounts,
      });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      jest.mocked(summaryService.getSummaryCounts).mockRejectedValue(error);

      await getSummaryCounts(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getSiteStatus', () => {
    it('should return up status when site responds with ok', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      await getSiteStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const siteStatus = res.json.mock.calls[0][0];
      expect(siteStatus.status).toBe('up');
      expect(siteStatus.statusCode).toBe(200);
      expect(siteStatus.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(siteStatus.lastChecked).toBeDefined();
      expect(siteStatus.url).toBeDefined();
    });

    it('should return down status when site responds with non-ok status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      } as Response);

      await getSiteStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const siteStatus = res.json.mock.calls[0][0];
      expect(siteStatus.status).toBe('down');
      expect(siteStatus.statusCode).toBe(503);
    });

    it('should return down status with error message when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await getSiteStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const siteStatus = res.json.mock.calls[0][0];
      expect(siteStatus.status).toBe('down');
      expect(siteStatus.statusCode).toBeNull();
      expect(siteStatus.error).toBe('ECONNREFUSED');
    });

    it('should return down status with unknown error when fetch throws non-Error', async () => {
      mockFetch.mockRejectedValue('some string error');

      await getSiteStatus(req, res, next);

      const siteStatus = res.json.mock.calls[0][0];
      expect(siteStatus.status).toBe('down');
      expect(siteStatus.error).toBe('Unknown error');
    });

    it('should use SITE_URL env variable when set', async () => {
      process.env.SITE_URL = 'https://custom.example.com';
      mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response);

      await getSiteStatus(req, res, next);

      const siteStatus = res.json.mock.calls[0][0];
      expect(siteStatus.url).toBe('https://custom.example.com');

      delete process.env.SITE_URL;
    });

    it('should use default URL when SITE_URL env is not set', async () => {
      delete process.env.SITE_URL;
      mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response);

      await getSiteStatus(req, res, next);

      const siteStatus = res.json.mock.calls[0][0];
      expect(siteStatus.url).toBe('https://keepwatching.giffordfamilydev.us');
    });
  });

  describe('restartService', () => {
    it('should return 400 for an invalid service name', async () => {
      req.params.service = 'apache';

      await restartService(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid service. Must be one of: nginx, pm2',
      });
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should restart nginx successfully', async () => {
      req.params.service = 'nginx';
      mockExec.mockImplementation((cmd: string, callback: any) => {
        expect(cmd).toBe('sudo systemctl reload nginx');
        callback(null, '', '');
      });

      await restartService(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        service: 'nginx',
        message: 'nginx reloaded successfully',
      });
    });

    it('should restart pm2 successfully', async () => {
      req.params.service = 'pm2';
      mockExec.mockImplementation((cmd: string, callback: any) => {
        expect(cmd).toBe('pm2 reload keepwatching-api-server');
        callback(null, '', '');
      });

      await restartService(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        service: 'pm2',
        message: 'pm2 reloaded successfully',
      });
    });

    it('should call next with error when exec fails with stderr', async () => {
      req.params.service = 'nginx';
      mockExec.mockImplementation((_cmd: unknown, callback: any) => {
        callback(new Error('exec failed'), '', 'permission denied');
      });

      await restartService(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'permission denied' }));
    });

    it('should call next with error when exec fails without stderr', async () => {
      req.params.service = 'pm2';
      mockExec.mockImplementation((_cmd: unknown, callback: any) => {
        callback(new Error('pm2 not found'), '', '');
      });

      await restartService(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'pm2 not found' }));
    });
  });
});
