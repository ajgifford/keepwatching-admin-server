import {
  getFullShowDetails,
  getMovies,
  getSeasonEpisodes,
  getShowDetails,
  getShowProfiles,
  getShowSeasons,
  getShowSeasonsAndEpisodes,
  getShowWatchProgress,
  getShows,
  updateAllMovies,
  updateAllShows,
  updateMovie,
  updateShow,
} from '../controllers/contentController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/movies', getMovies);
router.get('/api/v1/shows', getShows);
router.get('/api/v1/shows/:showId', getShowDetails);
router.get('/api/v1/shows/:showId/full', getFullShowDetails);
router.get('/api/v1/shows/:showId/seasons', getShowSeasons);
router.get('/api/v1/shows/:showId/seasonsEpisodes', getShowSeasonsAndEpisodes);
router.get('/api/v1/shows/:showId/profiles', getShowProfiles);
router.get('/api/v1/shows/:showId/watchProgress', getShowWatchProgress);
router.get('/api/v1/shows/seasons/:seasonId/episodes', getSeasonEpisodes);
router.post('/api/v1/shows/update', updateShow);
router.post('/api/v1/shows/updateAll', updateAllShows);
router.post('/api/v1/movies/update', updateMovie);
router.post('/api/v1/movies/updateAll', updateAllMovies);

export default router;
