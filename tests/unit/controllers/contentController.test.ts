import {
  getFullMovieDetails,
  getMovieDetails,
  getMovieProfiles,
  getFullShowDetails,
  getShowDetails,
  getShowSeasons,
  getShowSeasonsAndEpisodes,
  getShowProfiles,
  getShowWatchProgress,
  getMovies,
  getPeople,
  getPersonDetails,
  getShows,
  updateAllMovies,
  updateAllShows,
  updateMovie,
  updatePerson,
  updateShow,
} from '@controllers/contentController';
import {
  adminMovieService,
  adminShowService,
  personService,
} from '@ajgifford/keepwatching-common-server/services';
import { beforeEach, describe, expect, it } from '@jest/globals';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  adminMovieService: {
    getAllMovies: jest.fn(),
    getCompleteMovieInfo: jest.fn(),
    getMovieDetails: jest.fn(),
    getMovieProfiles: jest.fn(),
    updateMovieById: jest.fn(),
    updateAllMovies: jest.fn(),
  },
  adminShowService: {
    getAllShows: jest.fn(),
    getCompleteShowInfo: jest.fn(),
    getShowDetails: jest.fn(),
    getShowSeasons: jest.fn(),
    getShowSeasonsWithEpisodes: jest.fn(),
    getShowProfiles: jest.fn(),
    getShowWatchProgress: jest.fn(),
    updateShowById: jest.fn(),
    updateAllShows: jest.fn(),
  },
  personService: {
    getPersons: jest.fn(),
    getPersonDetails: jest.fn(),
    updatePerson: jest.fn(),
  },
}));

describe('ContentController', () => {
  let req: any, res: any, next: jest.Mock;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('getMovies', () => {
    it('should return paginated movies', async () => {
      const mockMoviesResult = {
        movies: [{ id: 1, title: 'Test Movie' }],
        pagination: { page: 1, limit: 50, total: 100, totalPages: 2 },
      };

      (adminMovieService.getAllMovies as jest.Mock).mockResolvedValue(mockMoviesResult);

      req.query = { page: '1', limit: '50' };

      await getMovies(req, res, next);

      expect(adminMovieService.getAllMovies).toHaveBeenCalledWith(1, 0, 50);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved page 1 of movies',
        pagination: mockMoviesResult.pagination,
        results: mockMoviesResult.movies,
      });
    });
  });

  describe('getShows', () => {
    it('should return paginated shows', async () => {
      const mockShowsResult = {
        shows: [{ id: 1, title: 'Test Show' }],
        pagination: { page: 1, limit: 50, total: 100, totalPages: 2 },
      };

      (adminShowService.getAllShows as jest.Mock).mockResolvedValue(mockShowsResult);

      req.query = { page: '1', limit: '50' };

      await getShows(req, res, next);

      expect(adminShowService.getAllShows).toHaveBeenCalledWith(1, 0, 50);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getFullShowDetails', () => {
    it('should return complete show information', async () => {
      const mockShowDetails = { id: 1, title: 'Test Show', seasons: [] };
      (adminShowService.getCompleteShowInfo as jest.Mock).mockResolvedValue(mockShowDetails);

      req.params = { showId: '1' };

      await getFullShowDetails(req, res, next);

      expect(adminShowService.getCompleteShowInfo).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved details for show',
        results: mockShowDetails,
      });
    });
  });

  describe('getShowDetails', () => {
    it('should return show details', async () => {
      const mockShowDetails = { id: 1, title: 'Test Show', overview: 'Test overview' };
      (adminShowService.getShowDetails as jest.Mock).mockResolvedValue(mockShowDetails);

      req.params = { showId: '1' };

      await getShowDetails(req, res, next);

      expect(adminShowService.getShowDetails).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved details for show',
        results: mockShowDetails,
      });
    });
  });

  describe('getShowSeasons', () => {
    it('should return show seasons', async () => {
      const mockSeasons = [
        { seasonNumber: 1, episodeCount: 10 },
        { seasonNumber: 2, episodeCount: 12 },
      ];
      (adminShowService.getShowSeasons as jest.Mock).mockResolvedValue(mockSeasons);

      req.params = { showId: '1' };

      await getShowSeasons(req, res, next);

      expect(adminShowService.getShowSeasons).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved seasons for show',
        results: mockSeasons,
      });
    });
  });

  describe('getShowSeasonsAndEpisodes', () => {
    it('should return show seasons with episodes', async () => {
      const mockSeasonsWithEpisodes = [
        { seasonNumber: 1, episodes: [{ episodeNumber: 1, title: 'Pilot' }] },
      ];
      (adminShowService.getShowSeasonsWithEpisodes as jest.Mock).mockResolvedValue(mockSeasonsWithEpisodes);

      req.params = { showId: '1' };

      await getShowSeasonsAndEpisodes(req, res, next);

      expect(adminShowService.getShowSeasonsWithEpisodes).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved seasons and episodes for show',
        results: mockSeasonsWithEpisodes,
      });
    });
  });

  describe('getShowProfiles', () => {
    it('should return profiles watching the show', async () => {
      const mockProfiles = [
        { profileId: 1, profileName: 'Profile 1', episodesWatched: 5 },
        { profileId: 2, profileName: 'Profile 2', episodesWatched: 3 },
      ];
      (adminShowService.getShowProfiles as jest.Mock).mockResolvedValue(mockProfiles);

      req.params = { showId: '1' };

      await getShowProfiles(req, res, next);

      expect(adminShowService.getShowProfiles).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved profiles for show',
        results: mockProfiles,
      });
    });
  });

  describe('getShowWatchProgress', () => {
    it('should return watch progress for the show', async () => {
      const mockWatchProgress = {
        totalEpisodes: 24,
        watchedEpisodes: 12,
        progress: 0.5,
      };
      (adminShowService.getShowWatchProgress as jest.Mock).mockResolvedValue(mockWatchProgress);

      req.params = { showId: '1' };

      await getShowWatchProgress(req, res, next);

      expect(adminShowService.getShowWatchProgress).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved watch progress for show',
        results: mockWatchProgress,
      });
    });
  });

  describe('updateShow', () => {
    it('should update a show successfully', async () => {
      (adminShowService.updateShowById as jest.Mock).mockResolvedValue(undefined);

      req.body = { showId: 1, tmdbId: 12345 };

      await updateShow(req, res, next);

      expect(adminShowService.updateShowById).toHaveBeenCalledWith(1, 12345, 'all');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Show with TMDB Id 12345 was updated',
      });
    });
  });

  describe('updateAllShows', () => {
    it('should trigger update for all shows', async () => {
      (adminShowService.updateAllShows as jest.Mock).mockResolvedValue(undefined);

      await updateAllShows(req, res, next);

      expect(adminShowService.updateAllShows).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Show update process started successfully',
      });
    });
  });

  describe('updateMovie', () => {
    it('should update a movie successfully', async () => {
      (adminMovieService.updateMovieById as jest.Mock).mockResolvedValue(undefined);

      req.body = { movieId: 1, tmdbId: 67890 };

      await updateMovie(req, res, next);

      expect(adminMovieService.updateMovieById).toHaveBeenCalledWith(1, 67890);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateAllMovies', () => {
    it('should trigger update for all movies', async () => {
      (adminMovieService.updateAllMovies as jest.Mock).mockResolvedValue(undefined);

      await updateAllMovies(req, res, next);

      expect(adminMovieService.updateAllMovies).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getFullMovieDetails', () => {
    it('should return complete movie information', async () => {
      const mockMovieDetails = { id: 1, title: 'Test Movie', runtime: 120 };
      (adminMovieService.getCompleteMovieInfo as jest.Mock).mockResolvedValue(mockMovieDetails);

      req.params = { movieId: '1' };

      await getFullMovieDetails(req, res, next);

      expect(adminMovieService.getCompleteMovieInfo).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMovieDetails', () => {
    it('should return movie details', async () => {
      const mockMovieDetails = { id: 1, title: 'Test Movie', overview: 'Test overview' };
      (adminMovieService.getMovieDetails as jest.Mock).mockResolvedValue(mockMovieDetails);

      req.params = { movieId: '1' };

      await getMovieDetails(req, res, next);

      expect(adminMovieService.getMovieDetails).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved details for movie',
        results: mockMovieDetails,
      });
    });
  });

  describe('getMovieProfiles', () => {
    it('should return profiles that watched the movie', async () => {
      const mockProfiles = [
        { profileId: 1, profileName: 'Profile 1', watchedAt: '2025-01-01' },
        { profileId: 2, profileName: 'Profile 2', watchedAt: '2025-01-05' },
      ];
      (adminMovieService.getMovieProfiles as jest.Mock).mockResolvedValue(mockProfiles);

      req.params = { movieId: '1' };

      await getMovieProfiles(req, res, next);

      expect(adminMovieService.getMovieProfiles).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved profiles for movie',
        results: mockProfiles,
      });
    });
  });

  describe('getPeople', () => {
    it('should return paginated people with first letter filter', async () => {
      const mockPeopleResult = {
        persons: [{ id: 1, name: 'Test Person' }],
        pagination: { page: 1, limit: 50, total: 10, totalPages: 1 },
      };

      (personService.getPersons as jest.Mock).mockResolvedValue(mockPeopleResult);

      req.query = { firstLetter: 'A', page: '1', limit: '50' };

      await getPeople(req, res, next);

      expect(personService.getPersons).toHaveBeenCalledWith('A', 1, 0, 50);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getPersonDetails', () => {
    it('should return person details', async () => {
      const mockPerson = { id: 1, name: 'Test Person', biography: 'Bio' };
      (personService.getPersonDetails as jest.Mock).mockResolvedValue(mockPerson);

      req.params = { personId: '1' };

      await getPersonDetails(req, res, next);

      expect(personService.getPersonDetails).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updatePerson', () => {
    it('should update a person successfully', async () => {
      (personService.updatePerson as jest.Mock).mockResolvedValue(undefined);

      req.body = { personId: 1, tmdbId: 111 };

      await updatePerson(req, res, next);

      expect(personService.updatePerson).toHaveBeenCalledWith(1, 111);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
