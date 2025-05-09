import { adminShowService, moviesService, showService } from '@ajgifford/keepwatching-common-server/services';
import { updateMovies, updateShows } from '@ajgifford/keepwatching-common-server/services';
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

    const allShowsResult = await adminShowService.getAllShows(page, offset, limit);

    res.status(200).json({
      message: `Retrieved page ${page} of shows`,
      pagination: allShowsResult.pagination,
      results: allShowsResult.shows,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/:showId
export const getShowDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId } = req.params;
    const showDetails = await adminShowService.getShowDetails(Number(showId));

    res.status(200).json({ message: 'Retrieved details for show', results: showDetails });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/:showId/full
export const getFullShowDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId } = req.params;
    const showDetails = await adminShowService.getCompleteShowInfo(Number(showId));

    res.status(200).json({ message: 'Retrieved details for show', results: showDetails });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/:showId/seasons
export const getShowSeasons = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId } = req.params;
    const seasons = await adminShowService.getShowSeasons(Number(showId));

    res.status(200).json({ message: 'Retrieved seasons for show', results: seasons });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/:showId/seasonsEpisodes
export const getShowSeasonsAndEpisodes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId } = req.params;
    const seasons = await adminShowService.getShowSeasonsWithEpisodes(Number(showId));

    res.status(200).json({ message: 'Retrieved seasons and episodes for show', results: seasons });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/:showId/profiles
export const getShowProfiles = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId } = req.params;
    const profiles = await adminShowService.getShowProfiles(Number(showId));

    res.status(200).json({ message: 'Retrieved profiles for show', results: profiles });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/:showId/watchProgress
export const getShowWatchProgress = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId } = req.params;
    const watchProgress = await adminShowService.getShowWatchProgress(Number(showId));

    res.status(200).json({ message: 'Retrieved watch progress for show', results: watchProgress });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/seasons/:seasonId/episodes
export const getSeasonEpisodes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { seasonId } = req.params;
    const episodes = await adminShowService.getSeasonEpisodes(Number(seasonId));

    res.status(200).json({ message: 'Retrieved episodes for season', results: episodes });
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

// POST /api/v1/shows/updateAll
export const updateAllShows = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    updateShows();
    res.status(200).json({ message: `Show update process started successfully` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/movies/update?movieId={}
export const updateMovie = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { movieId, tmdbId } = req.body;
    await moviesService.updateMovieById(Number(movieId), Number(tmdbId));
    res.status(200).json({ message: `Movie with TMDB Id ${tmdbId} was updated` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/movies/updateAll
export const updateAllMovies = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    updateMovies();
    res.status(200).json({ message: 'Movie update process started successfully' });
  } catch (error) {
    next(error);
  }
});
