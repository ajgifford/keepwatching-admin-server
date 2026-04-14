import {
  adminCommunityRecommendationsService,
  adminRatingsService,
} from '@ajgifford/keepwatching-common-server/services';
import { RatingContentType } from '@ajgifford/keepwatching-types';
import { NextFunction, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';

// GET /api/v1/shows/:showId/ratings
// GET /api/v1/movies/:movieId/ratings
export const getContentRatingSummary = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentType: RatingContentType = req.path.includes('/movies/') ? 'movie' : 'show';
    const contentId = Number(req.params.showId ?? req.params.movieId);
    const summary = await adminRatingsService.getAggregateRatingsForContent(contentType, contentId);
    res.status(200).json({ message: 'Retrieved rating summary for content', results: summary });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/ratings?contentType=&profileId=&accountId=
export const getRatings = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: { contentType?: RatingContentType; profileId?: number; accountId?: number } = {};
    if (req.query.contentType) filters.contentType = req.query.contentType as RatingContentType;
    if (req.query.profileId) filters.profileId = Number(req.query.profileId);
    if (req.query.accountId) filters.accountId = Number(req.query.accountId);

    const ratings = await adminRatingsService.getAllRatings(filters);
    res.status(200).json({ message: 'Retrieved ratings', results: ratings });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/ratings/:ratingId
export const deleteRating = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ratingId } = req.params;
    await adminRatingsService.adminDeleteRating(Number(ratingId));
    res.status(200).json({ message: `Rating ${ratingId} deleted successfully` });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/recommendations?contentType=&profileId=&accountId=
export const getRecommendationsWithAttribution = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: { contentType?: RatingContentType; profileId?: number; accountId?: number } = {};
      if (req.query.contentType) filters.contentType = req.query.contentType as RatingContentType;
      if (req.query.profileId) filters.profileId = Number(req.query.profileId);
      if (req.query.accountId) filters.accountId = Number(req.query.accountId);

      const recommendations = await adminCommunityRecommendationsService.getAllRecommendationsWithAttribution(filters);
      res.status(200).json({ message: 'Retrieved recommendations with attribution', results: recommendations });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/v1/recommendations/top?contentType=&limit=
export const getTopRecommendedContent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentType = req.query.contentType as RatingContentType | undefined;
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const recommendations = await adminCommunityRecommendationsService.getTopRecommendedContent(contentType, limit);
    res.status(200).json({ message: 'Retrieved top recommended content', results: recommendations });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/recommendations/:id
export const deleteRecommendation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await adminCommunityRecommendationsService.adminDeleteRecommendation(Number(id));
    res.status(200).json({ message: `Recommendation ${id} deleted successfully` });
  } catch (error) {
    next(error);
  }
});
