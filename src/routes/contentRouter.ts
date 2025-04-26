import {
  getMovies,
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
router.post('/api/v1/shows/update', updateShow);
router.post('/api/v1/shows/updateAll', updateAllShows);
router.post('/api/v1/movies/update', updateMovie);
router.post('/api/v1/movies/updateAll', updateAllMovies);

export default router;
