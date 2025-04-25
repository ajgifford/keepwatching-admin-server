import { moviesService, showService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

// GET /api/v1/movies
export const getMovies = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const allMoviesResult = await moviesService.getAllMovies(page, offset, limit);

    res.status(200).json({
      message: `Retrieved page ${page} of movies`,
      pagination: allMoviesResult.pagination,
      results: allMoviesResult.movies,
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

    const allShowsResult = await showService.getAllShows(page, offset, limit);

    res.status(200).json({
      message: `Retrieved page ${page} of shows`,
      pagination: allShowsResult.pagination,
      results: allShowsResult.shows,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shows/update?tmdbId={}
export const updateShow = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId, tmdbId } = req.body;
    await showService.updateShowById(Number(showId), Number(tmdbId), 'all');
    res.status(200).json({ message: `Show with TMDB Id ${tmdbId} was updated` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/movies/update?movieId={}
export const updateMovie = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const movieId = req.query.movieId;
    res.status(200).json({ message: 'Checked for movie changes' });
  } catch (error) {
    next(error);
  }
});
