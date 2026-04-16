import router from '@routes/ratingsAndRecommendationsRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/ratingsAndRecommendationsController', () => ({
  getContentRatingSummary: jest.fn((_req, res) => res.status(200).send('rating summary')),
  getRatings: jest.fn((_req, res) => res.status(200).send('ratings')),
  deleteRating: jest.fn((_req, res) => res.status(200).send('rating deleted')),
  getRecommendationsWithAttribution: jest.fn((_req, res) => res.status(200).send('recommendations with attribution')),
  getTopRecommendedContent: jest.fn((_req, res) => res.status(200).send('top recommended content')),
  deleteRecommendation: jest.fn((_req, res) => res.status(200).send('recommendation deleted')),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('RatingsAndRecommendationsRouter', () => {
  it('GET /api/v1/shows/:showId/ratings', async () => {
    const res = await request(app).get('/api/v1/shows/42/ratings');
    expect(res.status).toBe(200);
    expect(res.text).toBe('rating summary');
  });

  it('GET /api/v1/movies/:movieId/ratings', async () => {
    const res = await request(app).get('/api/v1/movies/99/ratings');
    expect(res.status).toBe(200);
    expect(res.text).toBe('rating summary');
  });

  it('GET /api/v1/ratings', async () => {
    const res = await request(app).get('/api/v1/ratings');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ratings');
  });

  it('GET /api/v1/ratings with query filters', async () => {
    const res = await request(app).get('/api/v1/ratings?contentType=show&profileId=456');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ratings');
  });

  it('DELETE /api/v1/ratings/:ratingId', async () => {
    const res = await request(app).delete('/api/v1/ratings/7');
    expect(res.status).toBe(200);
    expect(res.text).toBe('rating deleted');
  });

  it('GET /api/v1/recommendations/top', async () => {
    const res = await request(app).get('/api/v1/recommendations/top');
    expect(res.status).toBe(200);
    expect(res.text).toBe('top recommended content');
  });

  it('GET /api/v1/recommendations/top with query params', async () => {
    const res = await request(app).get('/api/v1/recommendations/top?contentType=show&limit=20');
    expect(res.status).toBe(200);
    expect(res.text).toBe('top recommended content');
  });

  it('GET /api/v1/recommendations', async () => {
    const res = await request(app).get('/api/v1/recommendations');
    expect(res.status).toBe(200);
    expect(res.text).toBe('recommendations with attribution');
  });

  it('DELETE /api/v1/recommendations/:id', async () => {
    const res = await request(app).delete('/api/v1/recommendations/3');
    expect(res.status).toBe(200);
    expect(res.text).toBe('recommendation deleted');
  });
});
