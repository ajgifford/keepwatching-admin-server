import request from 'supertest';
import express, { Express } from 'express';
import jobsRouter from '@routes/jobsRouter';
import * as jobsController from '@controllers/jobsController';

// Mock the controllers
jest.mock('@controllers/jobsController');

describe('Jobs Router', () => {
  let app: Express;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(jobsRouter);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/jobs/status', () => {
    it('should call getStatus controller', async () => {
      const mockStatus = {
        showsUpdate: { status: 'idle', lastRun: null, nextRun: '2024-01-01T02:00:00Z' },
        moviesUpdate: { status: 'idle', lastRun: null, nextRun: '2024-01-01T02:00:00Z' },
      };

      (jobsController.getStatus as jest.Mock).mockImplementation((_req, res) => {
        res.status(200).json(mockStatus);
      });

      const response = await request(app).get('/api/v1/admin/jobs/status');

      expect(jobsController.getStatus).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
    });

    it('should handle errors from getStatus controller', async () => {
      const errorMessage = 'Failed to get status';
      (jobsController.getStatus as jest.Mock).mockImplementation((_req, _res, next) => {
        next(new Error(errorMessage));
      });

      const response = await request(app).get('/api/v1/admin/jobs/status');

      expect(jobsController.getStatus).toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/v1/admin/jobs/pause', () => {
    it('should call pauseAll controller', async () => {
      (jobsController.pauseAll as jest.Mock).mockImplementation((_req, res) => {
        res.status(200).json({ message: 'Jobs paused' });
      });

      const response = await request(app).post('/api/v1/admin/jobs/pause');

      expect(jobsController.pauseAll).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should handle errors from pauseAll controller', async () => {
      const errorMessage = 'Failed to pause jobs';
      (jobsController.pauseAll as jest.Mock).mockImplementation((_req, _res, next) => {
        next(new Error(errorMessage));
      });

      const response = await request(app).post('/api/v1/admin/jobs/pause');

      expect(jobsController.pauseAll).toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/v1/admin/jobs/resume', () => {
    it('should call resumeAll controller', async () => {
      (jobsController.resumeAll as jest.Mock).mockImplementation((_req, res) => {
        res.status(200).json({ message: 'Jobs resumed' });
      });

      const response = await request(app).post('/api/v1/admin/jobs/resume');

      expect(jobsController.resumeAll).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should handle errors from resumeAll controller', async () => {
      const errorMessage = 'Failed to resume jobs';
      (jobsController.resumeAll as jest.Mock).mockImplementation((_req, _res, next) => {
        next(new Error(errorMessage));
      });

      const response = await request(app).post('/api/v1/admin/jobs/resume');

      expect(jobsController.resumeAll).toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/v1/admin/jobs/execute', () => {
    it('should call executeJob controller with valid job name', async () => {
      (jobsController.executeJob as jest.Mock).mockImplementation((_req, res) => {
        res.status(202).json({ message: 'Job showsUpdate started' });
      });

      const response = await request(app)
        .post('/api/v1/admin/jobs/execute')
        .query({ jobName: 'showsUpdate' });

      expect(jobsController.executeJob).toHaveBeenCalled();
      expect(response.status).toBe(202);
    });

    it('should handle missing jobName query parameter', async () => {
      (jobsController.executeJob as jest.Mock).mockImplementation((_req, res) => {
        res.status(400).json({ error: 'Invalid job name' });
      });

      const response = await request(app).post('/api/v1/admin/jobs/execute');

      expect(jobsController.executeJob).toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle invalid job name', async () => {
      (jobsController.executeJob as jest.Mock).mockImplementation((_req, res) => {
        res.status(400).json({ error: 'Invalid job name' });
      });

      const response = await request(app)
        .post('/api/v1/admin/jobs/execute')
        .query({ jobName: 'invalidJobName' });

      expect(jobsController.executeJob).toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle errors from executeJob controller', async () => {
      const errorMessage = 'Failed to execute job';
      (jobsController.executeJob as jest.Mock).mockImplementation((_req, _res, next) => {
        next(new Error(errorMessage));
      });

      const response = await request(app)
        .post('/api/v1/admin/jobs/execute')
        .query({ jobName: 'showsUpdate' });

      expect(jobsController.executeJob).toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/v1/admin/jobs/update-schedule', () => {
    it('should call updateSchedule controller with valid parameters', async () => {
      (jobsController.updateSchedule as jest.Mock).mockImplementation((_req, res) => {
        res.status(200).json({ message: 'Schedule updated' });
      });

      const response = await request(app)
        .put('/api/v1/admin/jobs/update-schedule')
        .query({ jobName: 'showsUpdate' })
        .send({ cronExpression: '0 2 * * *' });

      expect(jobsController.updateSchedule).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should handle missing jobName query parameter', async () => {
      (jobsController.updateSchedule as jest.Mock).mockImplementation((_req, res) => {
        res.status(400).json({ error: 'Invalid job name' });
      });

      const response = await request(app)
        .put('/api/v1/admin/jobs/update-schedule')
        .send({ cronExpression: '0 2 * * *' });

      expect(jobsController.updateSchedule).toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle invalid job name', async () => {
      (jobsController.updateSchedule as jest.Mock).mockImplementation((_req, res) => {
        res.status(400).json({ error: 'Invalid job name' });
      });

      const response = await request(app)
        .put('/api/v1/admin/jobs/update-schedule')
        .query({ jobName: 'invalidJobName' })
        .send({ cronExpression: '0 2 * * *' });

      expect(jobsController.updateSchedule).toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle missing cronExpression in body', async () => {
      (jobsController.updateSchedule as jest.Mock).mockImplementation((_req, res) => {
        res.status(400).json({ error: 'Invalid cron expression' });
      });

      const response = await request(app)
        .put('/api/v1/admin/jobs/update-schedule')
        .query({ jobName: 'showsUpdate' })
        .send({});

      expect(jobsController.updateSchedule).toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle invalid cronExpression type', async () => {
      (jobsController.updateSchedule as jest.Mock).mockImplementation((_req, res) => {
        res.status(400).json({ error: 'Invalid cron expression' });
      });

      const response = await request(app)
        .put('/api/v1/admin/jobs/update-schedule')
        .query({ jobName: 'showsUpdate' })
        .send({ cronExpression: 123 });

      expect(jobsController.updateSchedule).toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle errors from updateSchedule controller', async () => {
      const errorMessage = 'Failed to update schedule';
      (jobsController.updateSchedule as jest.Mock).mockImplementation((_req, _res, next) => {
        next(new Error(errorMessage));
      });

      const response = await request(app)
        .put('/api/v1/admin/jobs/update-schedule')
        .query({ jobName: 'showsUpdate' })
        .send({ cronExpression: '0 2 * * *' });

      expect(jobsController.updateSchedule).toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/v1/admin/jobs/schedule', () => {
    it('should call getSchedule controller with valid job name', async () => {
      const mockSchedule = {
        jobName: 'showsUpdate',
        cronExpression: '0 2 * * *',
        nextRun: '2024-01-01T02:00:00Z',
      };

      (jobsController.getSchedule as jest.Mock).mockImplementation((_req, res) => {
        res.status(200).json(mockSchedule);
      });

      const response = await request(app)
        .get('/api/v1/admin/jobs/schedule')
        .query({ jobName: 'showsUpdate' });

      expect(jobsController.getSchedule).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSchedule);
    });

    it('should handle missing jobName query parameter', async () => {
      (jobsController.getSchedule as jest.Mock).mockImplementation((_req, res) => {
        res.status(400).json({ error: 'Invalid job name' });
      });

      const response = await request(app).get('/api/v1/admin/jobs/schedule');

      expect(jobsController.getSchedule).toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle invalid job name', async () => {
      (jobsController.getSchedule as jest.Mock).mockImplementation((_req, res) => {
        res.status(400).json({ error: 'Invalid job name' });
      });

      const response = await request(app)
        .get('/api/v1/admin/jobs/schedule')
        .query({ jobName: 'invalidJobName' });

      expect(jobsController.getSchedule).toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle errors from getSchedule controller', async () => {
      const errorMessage = 'Failed to get schedule';
      (jobsController.getSchedule as jest.Mock).mockImplementation((_req, _res, next) => {
        next(new Error(errorMessage));
      });

      const response = await request(app)
        .get('/api/v1/admin/jobs/schedule')
        .query({ jobName: 'showsUpdate' });

      expect(jobsController.getSchedule).toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });

  describe('Route Registration', () => {
    it('should have all routes registered', () => {
      const routes = jobsRouter.stack
        .filter((layer: any) => layer.route)
        .map((layer: any) => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods),
        }));

      expect(routes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/api/v1/admin/jobs/status', methods: ['get'] }),
          expect.objectContaining({ path: '/api/v1/admin/jobs/pause', methods: ['post'] }),
          expect.objectContaining({ path: '/api/v1/admin/jobs/resume', methods: ['post'] }),
          expect.objectContaining({ path: '/api/v1/admin/jobs/execute', methods: ['post'] }),
          expect.objectContaining({ path: '/api/v1/admin/jobs/update-schedule', methods: ['put'] }),
          expect.objectContaining({ path: '/api/v1/admin/jobs/schedule', methods: ['get'] }),
        ]),
      );
    });

    it('should not accept GET requests on POST-only routes', async () => {
      const response = await request(app).get('/api/v1/admin/jobs/pause');

      expect(response.status).toBe(404);
    });

    it('should not accept POST requests on GET-only routes', async () => {
      const response = await request(app).post('/api/v1/admin/jobs/status');

      expect(response.status).toBe(404);
    });

    it('should not accept DELETE requests on any route', async () => {
      const response = await request(app).delete('/api/v1/admin/jobs/status');

      expect(response.status).toBe(404);
    });
  });
});
