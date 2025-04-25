import { getMovies, getShows, updateMovie, updateShow } from '../controllers/contentController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/movies', getMovies);
router.get('/api/v1/shows', getShows);
router.post('/api/v1/shows/update', updateShow);
router.post('/api/v1/movies/update', updateMovie);

export default router;
