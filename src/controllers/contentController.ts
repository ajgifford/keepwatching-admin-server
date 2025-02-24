import { getAllMovies, getMoviesCount } from '../model/movie';
import { getAllShows, getShowsCount } from '../model/show';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

// GET /api/v1/movies
export const getMovies = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const [totalCount, movies] = await Promise.all([getMoviesCount(), getAllMovies(limit, offset)]);

    const totalPages = Math.ceil(totalCount / limit);
    res.status(200).json({
      message: `Retrieved page ${page} of movies`,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      results: movies,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows
export const getShows = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const [totalCount, movies] = await Promise.all([getShowsCount(), getAllShows(limit, offset)]);

    const totalPages = Math.ceil(totalCount / limit);
    res.status(200).json({
      message: `Retrieved page ${page} of shows`,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      results: movies,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shows/checkUpdates
export const checkShowUpdates = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ message: 'Checked for show changes' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/movies/checkUpdates
export const checkMovieUpdates = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ message: 'Checked for movie changes' });
  } catch (error) {
    next(error);
  }
});
