import {
  getJobSchedule,
  getJobsStatus,
  manuallyExecuteJob,
  pauseJobs,
  resumeJobs,
  updateJobSchedule,
} from '@ajgifford/keepwatching-common-server/services';
import { executeJob, getSchedule, getStatus, pauseAll, resumeAll, updateSchedule } from '@controllers/jobsController';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  getJobsStatus: jest.fn(),
  pauseJobs: jest.fn(),
  resumeJobs: jest.fn(),
  manuallyExecuteJob: jest.fn(),
  updateJobSchedule: jest.fn(),
  getJobSchedule: jest.fn(),
}));

describe('JobsController', () => {
  let req: any, res: any, next: jest.Mock<any, any>;

  beforeEach(() => {
    req = {
      query: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return job statuses', async () => {
      const mockStatuses = [
        { name: 'showsUpdate', status: 'running', lastRun: '2025-01-01T00:00:00Z' },
        { name: 'moviesUpdate', status: 'idle', lastRun: '2025-01-01T00:00:00Z' },
      ];

      (getJobsStatus as jest.Mock).mockReturnValue(mockStatuses);

      await getStatus(req, res, next);

      expect(getJobsStatus).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStatuses);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to get job statuses');
      (getJobsStatus as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await getStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('pauseAll', () => {
    it('should pause all jobs', async () => {
      (pauseJobs as jest.Mock).mockReturnValue(undefined);

      await pauseAll(req, res, next);

      expect(pauseJobs).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to pause jobs');
      (pauseJobs as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await pauseAll(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('resumeAll', () => {
    it('should resume all jobs', async () => {
      (resumeJobs as jest.Mock).mockReturnValue(undefined);

      await resumeAll(req, res, next);

      expect(resumeJobs).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to resume jobs');
      (resumeJobs as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await resumeAll(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('executeJob', () => {
    it('should execute a valid job', async () => {
      req.query = { jobName: 'showsUpdate' };
      (manuallyExecuteJob as jest.Mock).mockReturnValue(undefined);

      await executeJob(req, res, next);

      expect(manuallyExecuteJob).toHaveBeenCalledWith('showsUpdate');
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ message: 'Job showsUpdate started' });
    });

    it('should execute moviesUpdate job', async () => {
      req.query = { jobName: 'moviesUpdate' };
      (manuallyExecuteJob as jest.Mock).mockReturnValue(undefined);

      await executeJob(req, res, next);

      expect(manuallyExecuteJob).toHaveBeenCalledWith('moviesUpdate');
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ message: 'Job moviesUpdate started' });
    });

    it('should execute peopleUpdate job', async () => {
      req.query = { jobName: 'peopleUpdate' };
      (manuallyExecuteJob as jest.Mock).mockReturnValue(undefined);

      await executeJob(req, res, next);

      expect(manuallyExecuteJob).toHaveBeenCalledWith('peopleUpdate');
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ message: 'Job peopleUpdate started' });
    });

    it('should execute emailDigest job', async () => {
      req.query = { jobName: 'emailDigest' };
      (manuallyExecuteJob as jest.Mock).mockReturnValue(undefined);

      await executeJob(req, res, next);

      expect(manuallyExecuteJob).toHaveBeenCalledWith('emailDigest');
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ message: 'Job emailDigest started' });
    });

    it('should execute performanceArchive job', async () => {
      req.query = { jobName: 'performanceArchive' };
      (manuallyExecuteJob as jest.Mock).mockReturnValue(undefined);

      await executeJob(req, res, next);

      expect(manuallyExecuteJob).toHaveBeenCalledWith('performanceArchive');
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ message: 'Job performanceArchive started' });
    });

    it('should return 400 when jobName is missing', async () => {
      req.query = {};

      await executeJob(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid job name' });
      expect(manuallyExecuteJob).not.toHaveBeenCalled();
    });

    it('should return 400 when jobName is invalid', async () => {
      req.query = { jobName: 'invalidJob' };

      await executeJob(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid job name' });
      expect(manuallyExecuteJob).not.toHaveBeenCalled();
    });

    it('should return 400 when jobName is not a string', async () => {
      req.query = { jobName: 123 };

      await executeJob(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid job name' });
      expect(manuallyExecuteJob).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = { jobName: 'showsUpdate' };
      const error = new Error('Failed to execute job');
      (manuallyExecuteJob as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await executeJob(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateSchedule', () => {
    it('should update job schedule with valid parameters', async () => {
      req.query = { jobName: 'showsUpdate' };
      req.body = { cronExpression: '0 2 * * *' };
      (updateJobSchedule as jest.Mock).mockReturnValue(undefined);

      await updateSchedule(req, res, next);

      expect(updateJobSchedule).toHaveBeenCalledWith('showsUpdate', '0 2 * * *');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update schedule for moviesUpdate job', async () => {
      req.query = { jobName: 'moviesUpdate' };
      req.body = { cronExpression: '0 3 * * 0' };
      (updateJobSchedule as jest.Mock).mockReturnValue(undefined);

      await updateSchedule(req, res, next);

      expect(updateJobSchedule).toHaveBeenCalledWith('moviesUpdate', '0 3 * * 0');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when jobName is missing', async () => {
      req.query = {};
      req.body = { cronExpression: '0 2 * * *' };

      await updateSchedule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid job name' });
      expect(updateJobSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 when jobName is invalid', async () => {
      req.query = { jobName: 'invalidJob' };
      req.body = { cronExpression: '0 2 * * *' };

      await updateSchedule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid job name' });
      expect(updateJobSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 when jobName is not a string', async () => {
      req.query = { jobName: 123 };
      req.body = { cronExpression: '0 2 * * *' };

      await updateSchedule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid job name' });
      expect(updateJobSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 when cronExpression is missing', async () => {
      req.query = { jobName: 'showsUpdate' };
      req.body = {};

      await updateSchedule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid cron expression' });
      expect(updateJobSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 when cronExpression is not a string', async () => {
      req.query = { jobName: 'showsUpdate' };
      req.body = { cronExpression: 123 };

      await updateSchedule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid cron expression' });
      expect(updateJobSchedule).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = { jobName: 'showsUpdate' };
      req.body = { cronExpression: '0 2 * * *' };
      const error = new Error('Failed to update schedule');
      (updateJobSchedule as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await updateSchedule(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getSchedule', () => {
    it('should get job schedule for valid job name', async () => {
      req.query = { jobName: 'showsUpdate' };
      (getJobSchedule as jest.Mock).mockReturnValue('0 2 * * *');

      await getSchedule(req, res, next);

      expect(getJobSchedule).toHaveBeenCalledWith('showsUpdate');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should get schedule for moviesUpdate job', async () => {
      req.query = { jobName: 'moviesUpdate' };
      (getJobSchedule as jest.Mock).mockReturnValue('0 3 * * 0');

      await getSchedule(req, res, next);

      expect(getJobSchedule).toHaveBeenCalledWith('moviesUpdate');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should get schedule for peopleUpdate job', async () => {
      req.query = { jobName: 'peopleUpdate' };
      (getJobSchedule as jest.Mock).mockReturnValue('0 3 * * *');

      await getSchedule(req, res, next);

      expect(getJobSchedule).toHaveBeenCalledWith('peopleUpdate');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should get schedule for emailDigest job', async () => {
      req.query = { jobName: 'emailDigest' };
      (getJobSchedule as jest.Mock).mockReturnValue('0 9 * * 0');

      await getSchedule(req, res, next);

      expect(getJobSchedule).toHaveBeenCalledWith('emailDigest');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should get schedule for performanceArchive job', async () => {
      req.query = { jobName: 'performanceArchive' };
      (getJobSchedule as jest.Mock).mockReturnValue('0 1 * * *');

      await getSchedule(req, res, next);

      expect(getJobSchedule).toHaveBeenCalledWith('performanceArchive');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when jobName is missing', async () => {
      req.query = {};

      await getSchedule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid job name' });
      expect(getJobSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 when jobName is invalid', async () => {
      req.query = { jobName: 'invalidJob' };

      await getSchedule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid job name' });
      expect(getJobSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 when jobName is not a string', async () => {
      req.query = { jobName: 123 };

      await getSchedule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid job name' });
      expect(getJobSchedule).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      req.query = { jobName: 'showsUpdate' };
      const error = new Error('Failed to get schedule');
      (getJobSchedule as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await getSchedule(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
