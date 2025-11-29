import {
  getJobSchedule,
  getJobsStatus,
  manuallyExecuteJob,
  pauseJobs,
  resumeJobs,
  updateJobSchedule,
} from '@ajgifford/keepwatching-common-server/services';
import { JobName } from '@ajgifford/keepwatching-types';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

const allowedJobs: JobName[] = ['showsUpdate', 'moviesUpdate', 'peopleUpdate', 'emailDigest', 'performanceArchive'];

/**
 * Get job statuses
 * @route GET /api/v1/admin/jobs/status
 */
export const getStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statuses = getJobsStatus();
    res.status(200).json(statuses);
  } catch (error) {
    next(error);
  }
});

/**
 * Pause jobs
 * @route POST /api/v1/admin/jobs/pause
 */
export const pauseAll = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    pauseJobs();
    res.status(200);
  } catch (error) {
    next(error);
  }
});

/**
 * Resume jobs
 * @route POST /api/v1/admin/jobs/resume
 */
export const resumeAll = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    resumeJobs();
    res.status(200);
  } catch (error) {
    next(error);
  }
});

/**
 * Manually execute a job
 * @route POST /api/v1/admin/jobs/execute?jobName=<name>
 */
export const executeJob = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobParam = req.query.jobName as string;
    if (typeof jobParam !== 'string' || !allowedJobs.includes(jobParam as JobName)) {
      res.status(400).json({ error: 'Invalid job name' });
      return;
    }
    const jobName: JobName = jobParam as JobName;
    manuallyExecuteJob(jobName);
    res.status(202).json({ message: `Job ${jobName} started` });
  } catch (error) {
    next(error);
  }
});

/**
 * Update the schedule for a job
 * @route PUT /api/v1/admin/jobs/update-schedule?jobName=<name>
 * @body { cronExpression: string }
 */
export const updateSchedule = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobParam = req.query.jobName as string;
    if (typeof jobParam !== 'string' || !allowedJobs.includes(jobParam as JobName)) {
      res.status(400).json({ error: 'Invalid job name' });
      return;
    }
    const { cronExpression } = req.body;
    if (typeof cronExpression !== 'string') {
      res.status(400).json({ error: 'Invalid cron expression' });
      return;
    }
    const jobName: JobName = jobParam as JobName;
    updateJobSchedule(jobName, cronExpression);
    res.status(200);
  } catch (error) {
    next(error);
  }
});

/**
 * Get the schedule for a job
 * @route GET /api/v1/admin/jobs/schedule?jobName=<name>
 */
export const getSchedule = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobParam = req.query.jobName as string;
    if (typeof jobParam !== 'string' || !allowedJobs.includes(jobParam as JobName)) {
      res.status(400).json({ error: 'Invalid job name' });
      return;
    }
    const jobName: JobName = jobParam as JobName;
    getJobSchedule(jobName);
    res.status(200);
  } catch (error) {
    next(error);
  }
});
