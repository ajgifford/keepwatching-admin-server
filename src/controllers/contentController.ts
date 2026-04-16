import { adminMovieService, adminShowService, personService } from '@ajgifford/keepwatching-common-server/services';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

// GET /api/v1/movies
export const getMovies = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const filters: { streamingService?: string; year?: string } = {};
    if (req.query.streamingService) filters.streamingService = req.query.streamingService as string;
    if (req.query.year) filters.year = req.query.year as string;

    const allMoviesResult = await adminMovieService.getAllMoviesFiltered(filters, page, offset, limit);

    res.status(200).json({
      message: `Retrieved page ${page} of movies`,
      pagination: allMoviesResult.pagination,
      filters: allMoviesResult.filters,
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

    const filters: { type?: string; status?: string; network?: string; streamingService?: string } = {};
    if (req.query.type) filters.type = req.query.type as string;
    if (req.query.status) filters.status = req.query.status as string;
    if (req.query.network) filters.network = req.query.network as string;
    if (req.query.streamingService) filters.streamingService = req.query.streamingService as string;

    const allShowsResult = await adminShowService.getAllShowsFiltered(filters, page, offset, limit);

    res.status(200).json({
      message: `Retrieved page ${page} of shows`,
      pagination: allShowsResult.pagination,
      filters: allShowsResult.filters,
      results: allShowsResult.shows,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/:showId
export const getFullShowDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId } = req.params;
    const showDetails = await adminShowService.getCompleteShowInfo(Number(showId));

    res.status(200).json({ message: 'Retrieved details for show', results: showDetails });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/:showId/details
export const getShowDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId } = req.params;
    const showDetails = await adminShowService.getShowDetails(Number(showId));

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

// GET /api/v1/shows/duplicates
export const getShowsWithDuplicates = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shows = await adminShowService.getShowsWithDuplicates();
    res.status(200).json({ message: 'Retrieved shows with duplicate episodes', results: shows });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/shows/:showId/duplicateEpisodes
export const getDuplicateEpisodes = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId } = req.params;
    const episodes = await adminShowService.getDuplicateEpisodes(Number(showId));
    res.status(200).json({ message: 'Retrieved duplicate episodes for show', results: episodes });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/shows/:showId/episodes/:episodeId
export const deleteEpisode = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId, episodeId } = req.params;
    await adminShowService.deleteEpisode(Number(episodeId), Number(showId));
    res.status(200).json({ message: `Episode ${episodeId} deleted successfully` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shows/update
export const updateShow = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { showId, tmdbId } = req.body;
    await adminShowService.updateShowById(Number(showId), Number(tmdbId), 'all');
    res.status(200).json({ message: `Show with TMDB Id ${tmdbId} was updated` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/shows/updateAll
export const updateAllShows = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    adminShowService.updateAllShows();
    res.status(200).json({ message: `Show update process started successfully` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/movies/update
export const updateMovie = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { movieId, tmdbId } = req.body;
    await adminMovieService.updateMovieById(Number(movieId), Number(tmdbId));
    res.status(200).json({ message: `Movie with TMDB Id ${tmdbId} was updated` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/movies/updateAll
export const updateAllMovies = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    adminMovieService.updateAllMovies();
    res.status(200).json({ message: 'Movie update process started successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/movies/:movieId
export const getFullMovieDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { movieId } = req.params;
    const movieDetails = await adminMovieService.getCompleteMovieInfo(Number(movieId));

    res.status(200).json({ message: 'Retrieved details for movie', results: movieDetails });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/movies/:movieId/details
export const getMovieDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { movieId } = req.params;
    const movieDetails = await adminMovieService.getMovieDetails(Number(movieId));

    res.status(200).json({ message: 'Retrieved details for movie', results: movieDetails });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/movies/:movieId/profiles
export const getMovieProfiles = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { movieId } = req.params;
    const profiles = await adminMovieService.getMovieProfiles(Number(movieId));

    res.status(200).json({ message: 'Retrieved profiles for movie', results: profiles });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/people
export const getPeople = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const firstLetter = req.query.firstLetter as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const peopleResult = await personService.getPersons(firstLetter, page, offset, limit);

    res.status(200).json({
      message: `Retrieved page ${page} of people starting with ${firstLetter}`,
      pagination: peopleResult.pagination,
      results: peopleResult.persons,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/people/by-tmdb/:tmdbId
export const getPersonByTmdbId = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tmdbId } = req.params;
    const person = await personService.getPersonByTmdbId(Number(tmdbId));
    res.status(200).json({ message: person ? 'Person found' : 'Person not found', results: person });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/people/:personId
export const getPersonDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { personId } = req.params;
    const person = await personService.getPersonDetails(Number(personId));

    res.status(200).json({ message: 'Retrieved details for person', results: person });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/people/update
export const updatePerson = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { personId, tmdbId } = req.body;
    await personService.updatePerson(Number(personId), Number(tmdbId));
    res.status(200).json({ message: `Person with TMDB Id ${tmdbId} was updated` });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/people/failures
export const getPersonFailures = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as 'pending' | 'resolved' | 'removed' | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const offset = (page - 1) * limit;

    const [failures, total] = await Promise.all([
      personService.getPersonFailures(status, limit, offset),
      personService.getPersonFailureCount(status),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      message: `Retrieved page ${page} of person update failures`,
      pagination: {
        totalCount: total,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      results: failures,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/people/failures/:failureId
export const getPersonFailure = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { failureId } = req.params;
    const failure = await personService.getPersonFailureById(Number(failureId));
    if (!failure) {
      res.status(404).json({ message: `Person failure with id ${failureId} not found` });
      return;
    }
    res.status(200).json({ message: 'Retrieved person failure', results: failure });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/people/failures/:personId/resolve
export const resolvePersonFailure = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { personId } = req.params;
    const { notes } = req.body;
    await personService.resolvePersonFailure(Number(personId), notes);
    res.status(200).json({ message: `Person failure for person ${personId} marked as resolved` });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/people/:personId/merge/:targetPersonId
export const mergeAndDeletePerson = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { personId, targetPersonId } = req.params;
    const result = await personService.mergeAndDeletePerson(Number(personId), Number(targetPersonId));
    res.status(200).json({
      message: `Person ${personId} merged into ${targetPersonId} and deleted (shows: ${result.showsMerged}, movies: ${result.moviesMerged})`,
      results: result,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/people/:personId
export const deletePerson = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { personId } = req.params;
    await personService.deletePersonAndReferences(Number(personId));
    res.status(200).json({ message: `Person ${personId} and all references deleted successfully` });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/people/:personId/tmdb-id
export const updatePersonTmdbId = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { personId } = req.params;
    const { newTmdbId } = req.body;
    const result = await personService.updatePersonTmdbId(Number(personId), Number(newTmdbId));
    res.status(200).json({ message: `Person ${personId} TMDB ID updated to ${newTmdbId}`, results: result });
  } catch (error) {
    next(error);
  }
});
