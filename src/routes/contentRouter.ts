import {
  getFullMovieDetails,
  getFullShowDetails,
  getMovieDetails,
  getMovieProfiles,
  getMovies,
  getPeople,
  getPersonDetails,
  getShowDetails,
  getShowProfiles,
  getShowSeasons,
  getShowSeasonsAndEpisodes,
  getShowWatchProgress,
  getShows,
  updateAllMovies,
  updateAllShows,
  updateMovie,
  updatePerson,
  updateShow,
} from '../controllers/contentController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/shows', getShows);
router.get('/api/v1/shows/:showId', getFullShowDetails);
router.get('/api/v1/shows/:showId/details', getShowDetails);
router.get('/api/v1/shows/:showId/seasons', getShowSeasons);
router.get('/api/v1/shows/:showId/seasonsEpisodes', getShowSeasonsAndEpisodes);
router.get('/api/v1/shows/:showId/profiles', getShowProfiles);
router.get('/api/v1/shows/:showId/watchProgress', getShowWatchProgress);
router.post('/api/v1/shows/update', updateShow);
router.post('/api/v1/shows/updateAll', updateAllShows);
router.get('/api/v1/movies', getMovies);
router.get('/api/v1/movies/:movieId', getFullMovieDetails);
router.get('/api/v1/movies/:movieId/details', getMovieDetails);
router.get('/api/v1/movies/:movieId/profiles', getMovieProfiles);
router.post('/api/v1/movies/update', updateMovie);
router.post('/api/v1/movies/updateAll', updateAllMovies);
router.get('/api/v1/people', getPeople);
router.get('/api/v1/people/:personId', getPersonDetails);
router.post('/api/v1/people/update', updatePerson);

export default router;
