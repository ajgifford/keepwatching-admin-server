import { describe, expect, it } from '@jest/globals';
import router from '@routes/contentRouter';
import express from 'express';
import request from 'supertest';

jest.mock('@controllers/contentController', () => ({
  getShows: jest.fn((_req, res) => res.status(200).send('retrieved shows')),
  getFullShowDetails: jest.fn((_req, res) => res.status(200).send('retrieved show details')),
  getShowDetails: jest.fn((_req, res) => res.status(200).send('retrieved show info')),
  getShowSeasons: jest.fn((_req, res) => res.status(200).send('retrieved show seasons')),
  getShowSeasonsAndEpisodes: jest.fn((_req, res) => res.status(200).send('retrieved seasons and episodes')),
  getShowProfiles: jest.fn((_req, res) => res.status(200).send('retrieved show profiles')),
  getShowWatchProgress: jest.fn((_req, res) => res.status(200).send('retrieved watch progress')),
  updateShow: jest.fn((_req, res) => res.status(200).send('show updated')),
  updateAllShows: jest.fn((_req, res) => res.status(200).send('all shows updated')),
  getMovies: jest.fn((_req, res) => res.status(200).send('retrieved movies')),
  getFullMovieDetails: jest.fn((_req, res) => res.status(200).send('retrieved movie details')),
  getMovieDetails: jest.fn((_req, res) => res.status(200).send('retrieved movie info')),
  getMovieProfiles: jest.fn((_req, res) => res.status(200).send('retrieved movie profiles')),
  updateMovie: jest.fn((_req, res) => res.status(200).send('movie updated')),
  updateAllMovies: jest.fn((_req, res) => res.status(200).send('all movies updated')),
  getPeople: jest.fn((_req, res) => res.status(200).send('retrieved people')),
  getPersonDetails: jest.fn((_req, res) => res.status(200).send('retrieved person details')),
  updatePerson: jest.fn((_req, res) => res.status(200).send('person updated')),
}));

const app = express();
app.use(express.json());
app.use(router);

describe('ContentRouter', () => {
  describe('Shows Routes', () => {
    it('GET /api/v1/shows', async () => {
      const res = await request(app).get('/api/v1/shows').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved shows');
    });

    it('GET /api/v1/shows/:showId', async () => {
      const res = await request(app).get('/api/v1/shows/123').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved show details');
    });

    it('GET /api/v1/shows/:showId/details', async () => {
      const res = await request(app).get('/api/v1/shows/123/details').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved show info');
    });

    it('GET /api/v1/shows/:showId/seasons', async () => {
      const res = await request(app).get('/api/v1/shows/123/seasons').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved show seasons');
    });

    it('GET /api/v1/shows/:showId/seasonsEpisodes', async () => {
      const res = await request(app).get('/api/v1/shows/123/seasonsEpisodes').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved seasons and episodes');
    });

    it('GET /api/v1/shows/:showId/profiles', async () => {
      const res = await request(app).get('/api/v1/shows/123/profiles').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved show profiles');
    });

    it('GET /api/v1/shows/:showId/watchProgress', async () => {
      const res = await request(app).get('/api/v1/shows/123/watchProgress').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved watch progress');
    });

    it('POST /api/v1/shows/update', async () => {
      const res = await request(app).post('/api/v1/shows/update').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('show updated');
    });

    it('POST /api/v1/shows/updateAll', async () => {
      const res = await request(app).post('/api/v1/shows/updateAll').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('all shows updated');
    });
  });

  describe('Movies Routes', () => {
    it('GET /api/v1/movies', async () => {
      const res = await request(app).get('/api/v1/movies').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved movies');
    });

    it('GET /api/v1/movies/:movieId', async () => {
      const res = await request(app).get('/api/v1/movies/456').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved movie details');
    });

    it('GET /api/v1/movies/:movieId/details', async () => {
      const res = await request(app).get('/api/v1/movies/456/details').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved movie info');
    });

    it('GET /api/v1/movies/:movieId/profiles', async () => {
      const res = await request(app).get('/api/v1/movies/456/profiles').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved movie profiles');
    });

    it('POST /api/v1/movies/update', async () => {
      const res = await request(app).post('/api/v1/movies/update').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('movie updated');
    });

    it('POST /api/v1/movies/updateAll', async () => {
      const res = await request(app).post('/api/v1/movies/updateAll').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('all movies updated');
    });
  });

  describe('People Routes', () => {
    it('GET /api/v1/people', async () => {
      const res = await request(app).get('/api/v1/people').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved people');
    });

    it('GET /api/v1/people/:personId', async () => {
      const res = await request(app).get('/api/v1/people/789').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('retrieved person details');
    });

    it('POST /api/v1/people/update', async () => {
      const res = await request(app).post('/api/v1/people/update').send({});
      expect(res.status).toBe(200);
      expect(res.text).toBe('person updated');
    });
  });
});
