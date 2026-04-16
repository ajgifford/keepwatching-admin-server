import {
  adminCommunityRecommendationsService,
  adminRatingsService,
} from '@ajgifford/keepwatching-common-server/services';
import {
  deleteRating,
  deleteRecommendation,
  getContentRatingSummary,
  getRatings,
  getRecommendationsWithAttribution,
  getTopRecommendedContent,
} from '@controllers/ratingsAndRecommendationsController';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  adminRatingsService: {
    getAggregateRatingsForContent: jest.fn(),
    getAllRatings: jest.fn(),
    adminDeleteRating: jest.fn(),
  },
  adminCommunityRecommendationsService: {
    getAllRecommendationsWithAttribution: jest.fn(),
    getTopRecommendedContent: jest.fn(),
    adminDeleteRecommendation: jest.fn(),
  },
}));

describe('ratingsAndRecommendationsController', () => {
  let req: any;
  let res: any;
  let next: jest.Mock;

  const mockRatingSummary = {
    contentType: 'show',
    contentId: 42,
    averageRating: 4.2,
    totalRatings: 15,
  };

  const mockRating = {
    id: 1,
    profileId: 456,
    contentType: 'show',
    contentId: 42,
    rating: 5,
    note: 'Great show',
    createdAt: '2026-04-01T00:00:00.000Z',
  };

  const mockRecommendation = {
    id: 1,
    profileId: 456,
    accountId: 123,
    profileName: 'Alice',
    contentType: 'show',
    contentId: 42,
    contentTitle: 'Breaking Bad',
    rating: 5,
    message: 'Must watch!',
    createdAt: '2026-04-01T00:00:00.000Z',
  };

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      path: '/api/v1/shows/42/ratings',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getContentRatingSummary', () => {
    it('should return 200 with rating summary for a show', async () => {
      req.params = { showId: '42' };
      req.path = '/api/v1/shows/42/ratings';
      (adminRatingsService.getAggregateRatingsForContent as jest.Mock).mockResolvedValue(mockRatingSummary);

      await getContentRatingSummary(req, res, next);

      expect(adminRatingsService.getAggregateRatingsForContent).toHaveBeenCalledWith('show', 42);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved rating summary for content',
        results: mockRatingSummary,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 200 with rating summary for a movie', async () => {
      req.params = { movieId: '99' };
      req.path = '/api/v1/movies/99/ratings';
      (adminRatingsService.getAggregateRatingsForContent as jest.Mock).mockResolvedValue(mockRatingSummary);

      await getContentRatingSummary(req, res, next);

      expect(adminRatingsService.getAggregateRatingsForContent).toHaveBeenCalledWith('movie', 99);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should call next(error) when service throws', async () => {
      req.params = { showId: '42' };
      req.path = '/api/v1/shows/42/ratings';
      const error = new Error('Service error');
      (adminRatingsService.getAggregateRatingsForContent as jest.Mock).mockRejectedValue(error);

      await getContentRatingSummary(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getRatings', () => {
    it('should return 200 with all ratings when no filters provided', async () => {
      (adminRatingsService.getAllRatings as jest.Mock).mockResolvedValue([mockRating]);

      await getRatings(req, res, next);

      expect(adminRatingsService.getAllRatings).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved ratings',
        results: [mockRating],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass contentType filter to the service', async () => {
      req.query = { contentType: 'show' };
      (adminRatingsService.getAllRatings as jest.Mock).mockResolvedValue([mockRating]);

      await getRatings(req, res, next);

      expect(adminRatingsService.getAllRatings).toHaveBeenCalledWith({ contentType: 'show' });
    });

    it('should pass profileId and accountId filters to the service', async () => {
      req.query = { profileId: '456', accountId: '123' };
      (adminRatingsService.getAllRatings as jest.Mock).mockResolvedValue([mockRating]);

      await getRatings(req, res, next);

      expect(adminRatingsService.getAllRatings).toHaveBeenCalledWith({ profileId: 456, accountId: 123 });
    });

    it('should call next(error) when service throws', async () => {
      const error = new Error('DB error');
      (adminRatingsService.getAllRatings as jest.Mock).mockRejectedValue(error);

      await getRatings(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteRating', () => {
    it('should return 200 on successful delete', async () => {
      req.params = { ratingId: '7' };
      (adminRatingsService.adminDeleteRating as jest.Mock).mockResolvedValue(undefined);

      await deleteRating(req, res, next);

      expect(adminRatingsService.adminDeleteRating).toHaveBeenCalledWith(7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Rating 7 deleted successfully' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next(error) when service throws', async () => {
      req.params = { ratingId: '7' };
      const error = new Error('Rating not found');
      (adminRatingsService.adminDeleteRating as jest.Mock).mockRejectedValue(error);

      await deleteRating(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getRecommendationsWithAttribution', () => {
    it('should return 200 with all recommendations when no filters provided', async () => {
      (adminCommunityRecommendationsService.getAllRecommendationsWithAttribution as jest.Mock).mockResolvedValue([
        mockRecommendation,
      ]);

      await getRecommendationsWithAttribution(req, res, next);

      expect(adminCommunityRecommendationsService.getAllRecommendationsWithAttribution).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved recommendations with attribution',
        results: [mockRecommendation],
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass contentType filter to the service', async () => {
      req.query = { contentType: 'movie' };
      (adminCommunityRecommendationsService.getAllRecommendationsWithAttribution as jest.Mock).mockResolvedValue([]);

      await getRecommendationsWithAttribution(req, res, next);

      expect(adminCommunityRecommendationsService.getAllRecommendationsWithAttribution).toHaveBeenCalledWith({
        contentType: 'movie',
      });
    });

    it('should pass profileId and accountId filters to the service', async () => {
      req.query = { profileId: '456', accountId: '123' };
      (adminCommunityRecommendationsService.getAllRecommendationsWithAttribution as jest.Mock).mockResolvedValue([]);

      await getRecommendationsWithAttribution(req, res, next);

      expect(adminCommunityRecommendationsService.getAllRecommendationsWithAttribution).toHaveBeenCalledWith({
        profileId: 456,
        accountId: 123,
      });
    });

    it('should call next(error) when service throws', async () => {
      const error = new Error('Service error');
      (adminCommunityRecommendationsService.getAllRecommendationsWithAttribution as jest.Mock).mockRejectedValue(error);

      await getRecommendationsWithAttribution(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getTopRecommendedContent', () => {
    const mockTopContent = [
      { contentType: 'show', contentId: 42, contentTitle: 'Breaking Bad', recommendationCount: 10 },
    ];

    it('should return 200 with top recommended content using defaults', async () => {
      (adminCommunityRecommendationsService.getTopRecommendedContent as jest.Mock).mockResolvedValue(mockTopContent);

      await getTopRecommendedContent(req, res, next);

      expect(adminCommunityRecommendationsService.getTopRecommendedContent).toHaveBeenCalledWith(undefined, 50);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved top recommended content',
        results: mockTopContent,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass contentType and limit to the service', async () => {
      req.query = { contentType: 'show', limit: '20' };
      (adminCommunityRecommendationsService.getTopRecommendedContent as jest.Mock).mockResolvedValue(mockTopContent);

      await getTopRecommendedContent(req, res, next);

      expect(adminCommunityRecommendationsService.getTopRecommendedContent).toHaveBeenCalledWith('show', 20);
    });

    it('should cap limit at 100', async () => {
      req.query = { limit: '999' };
      (adminCommunityRecommendationsService.getTopRecommendedContent as jest.Mock).mockResolvedValue(mockTopContent);

      await getTopRecommendedContent(req, res, next);

      expect(adminCommunityRecommendationsService.getTopRecommendedContent).toHaveBeenCalledWith(undefined, 100);
    });

    it('should call next(error) when service throws', async () => {
      const error = new Error('Service error');
      (adminCommunityRecommendationsService.getTopRecommendedContent as jest.Mock).mockRejectedValue(error);

      await getTopRecommendedContent(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteRecommendation', () => {
    it('should return 200 on successful delete', async () => {
      req.params = { id: '3' };
      (adminCommunityRecommendationsService.adminDeleteRecommendation as jest.Mock).mockResolvedValue(undefined);

      await deleteRecommendation(req, res, next);

      expect(adminCommunityRecommendationsService.adminDeleteRecommendation).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Recommendation 3 deleted successfully' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next(error) when service throws', async () => {
      req.params = { id: '3' };
      const error = new Error('Recommendation not found');
      (adminCommunityRecommendationsService.adminDeleteRecommendation as jest.Mock).mockRejectedValue(error);

      await deleteRecommendation(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
