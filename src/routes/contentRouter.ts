import { checkMovieUpdates, checkShowUpdates, getMovies, getShows } from '../controllers/contentController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/movies', getMovies);
router.get('/api/v1/shows', getShows);
router.post('/api/v1/shows/checkUpdates', checkShowUpdates);
router.post('/api/v1/movies/checkUpdates', checkMovieUpdates);

export default router;
