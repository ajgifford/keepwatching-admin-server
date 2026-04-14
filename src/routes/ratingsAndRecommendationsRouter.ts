import {
  deleteRating,
  deleteRecommendation,
  getContentRatingSummary,
  getRecommendationsWithAttribution,
  getRatings,
  getTopRecommendedContent,
} from '../controllers/ratingsAndRecommendationsController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/shows/:showId/ratings', getContentRatingSummary);
router.get('/api/v1/movies/:movieId/ratings', getContentRatingSummary);
router.get('/api/v1/ratings', getRatings);
router.delete('/api/v1/ratings/:ratingId', deleteRating);
router.get('/api/v1/recommendations/top', getTopRecommendedContent);
router.get('/api/v1/recommendations', getRecommendationsWithAttribution);
router.delete('/api/v1/recommendations/:id', deleteRecommendation);

export default router;
