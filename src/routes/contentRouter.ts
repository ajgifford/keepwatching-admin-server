import {
  deleteEpisode,
  deletePerson,
  getDuplicateEpisodes,
  getFullMovieDetails,
  getFullShowDetails,
  getMovieDetails,
  getMovieProfiles,
  getMovies,
  getPeople,
  getPersonByTmdbId,
  getPersonDetails,
  mergeAndDeletePerson,
  getPersonFailure,
  getPersonFailures,
  getShowDetails,
  getShowProfiles,
  getShowSeasons,
  getShowSeasonsAndEpisodes,
  getShowsWithDuplicates,
  getShowWatchProgress,
  getShows,
  resolvePersonFailure,
  updateAllMovies,
  updateAllShows,
  updateMovie,
  updatePerson,
  updatePersonTmdbId,
  updateShow,
} from '../controllers/contentController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/shows', getShows);
router.get('/api/v1/shows/duplicates', getShowsWithDuplicates);
router.get('/api/v1/shows/:showId', getFullShowDetails);
router.get('/api/v1/shows/:showId/details', getShowDetails);
router.get('/api/v1/shows/:showId/seasons', getShowSeasons);
router.get('/api/v1/shows/:showId/seasonsEpisodes', getShowSeasonsAndEpisodes);
router.get('/api/v1/shows/:showId/profiles', getShowProfiles);
router.get('/api/v1/shows/:showId/watchProgress', getShowWatchProgress);
router.get('/api/v1/shows/:showId/duplicateEpisodes', getDuplicateEpisodes);
router.delete('/api/v1/shows/:showId/episodes/:episodeId', deleteEpisode);
router.post('/api/v1/shows/update', updateShow);
router.post('/api/v1/shows/updateAll', updateAllShows);
router.get('/api/v1/movies', getMovies);
router.get('/api/v1/movies/:movieId', getFullMovieDetails);
router.get('/api/v1/movies/:movieId/details', getMovieDetails);
router.get('/api/v1/movies/:movieId/profiles', getMovieProfiles);
router.post('/api/v1/movies/update', updateMovie);
router.post('/api/v1/movies/updateAll', updateAllMovies);
// People — static sub-paths must come before /:personId to avoid route collision
router.get('/api/v1/people', getPeople);
router.get('/api/v1/people/failures', getPersonFailures);
router.get('/api/v1/people/failures/:failureId', getPersonFailure);
router.put('/api/v1/people/failures/:personId/resolve', resolvePersonFailure);
router.post('/api/v1/people/update', updatePerson);
router.get('/api/v1/people/by-tmdb/:tmdbId', getPersonByTmdbId);
router.get('/api/v1/people/:personId', getPersonDetails);
router.post('/api/v1/people/:personId/merge/:targetPersonId', mergeAndDeletePerson);
router.delete('/api/v1/people/:personId', deletePerson);
router.put('/api/v1/people/:personId/tmdb-id', updatePersonTmdbId);

export default router;
