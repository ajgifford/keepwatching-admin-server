import { mockNext, mockRequest, mockResponse } from '../helpers/mockRequest';
import {
  accountService,
  adminMovieService,
  adminShowService,
  preferencesService,
  profileService,
} from '@ajgifford/keepwatching-common-server/services';
import {
  deleteAccount,
  deleteProfile,
  editAccount,
  editProfile,
  getAccountPreferences,
  getAccounts,
  getProfileMoviesList,
  getProfileShowsList,
  getProfiles,
  verifyEmail,
} from '@controllers/accountManagementController';
import { beforeEach, describe, expect, it } from '@jest/globals';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  accountService: {
    getAccounts: jest.fn(),
    editAccount: jest.fn(),
    deleteAccount: jest.fn(),
    getCombinedAccountByEmail: jest.fn(),
    verifyEmail: jest.fn(),
  },
  profileService: {
    getAdminProfilesByAccount: jest.fn(),
    updateProfileName: jest.fn(),
    deleteProfile: jest.fn(),
  },
  adminShowService: {
    getAllShowsByProfile: jest.fn(),
  },
  adminMovieService: {
    getAllMoviesByProfile: jest.fn(),
  },
  preferencesService: {
    getAccountPreferences: jest.fn(),
  },
}));

describe('AccountManagementController', () => {
  let req: any, res: any, next: jest.Mock;

  const mockAccount = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    uid: 'test-uid-123',
    defaultProfileId: 101,
    image: 'account-image.png',
  };

  beforeEach(() => {
    req = {
      params: { accountId: 1, profileId: 123 },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('getAccounts', () => {
    it('should return all accounts successfully', async () => {
      const mockAccounts = [
        { id: 1, email: 'test1@example.com', name: 'Test User 1' },
        { id: 2, email: 'test2@example.com', name: 'Test User 2' },
      ];

      (accountService.getAccounts as jest.Mock).mockResolvedValue(mockAccounts);

      await getAccounts(req, res, next);

      expect(accountService.getAccounts).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved 2 accounts',
        results: mockAccounts,
      });
    });

    it('should handle errors via next middleware', async () => {
      const error = new Error('Database error');
      (accountService.getAccounts as jest.Mock).mockRejectedValue(error);

      await getAccounts(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('editAccount', () => {
    it('should edit account successfully and return updated account', async () => {
      const mockEditedAccount = { id: 1, email: 'test@example.com', name: 'Updated Name' };
      const mockUpdatedAccount = { ...mockEditedAccount, profiles: [] };

      (accountService.editAccount as jest.Mock).mockResolvedValue(mockEditedAccount);
      (accountService.getCombinedAccountByEmail as jest.Mock).mockResolvedValue(mockUpdatedAccount);

      req.params = { accountId: '1' };
      req.body = { name: 'Updated Name', defaultProfileId: 2 };

      await editAccount(req, res, next);

      expect(accountService.editAccount).toHaveBeenCalledWith('1', 'Updated Name', 2);
      expect(accountService.getCombinedAccountByEmail).toHaveBeenCalledWith('test@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Updated account 1',
        result: mockUpdatedAccount,
      });
    });

    it('should return message when no updates made', async () => {
      (accountService.editAccount as jest.Mock).mockResolvedValue(null);

      req.params = { accountId: '1' };
      req.body = { name: 'Same Name' };

      await editAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No updates made to account 1',
      });
    });

    it('should handle errors via next middleware', async () => {
      const error = new Error('Update failed');
      (accountService.editAccount as jest.Mock).mockRejectedValue(error);

      req.params = { accountId: '1' };
      req.body = { name: 'Name' };

      await editAccount(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      (accountService.deleteAccount as jest.Mock).mockResolvedValue(undefined);

      req.params = { accountId: '1' };

      await deleteAccount(req, res, next);

      expect(accountService.deleteAccount).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Account deleted successfully' });
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed');
      (accountService.deleteAccount as jest.Mock).mockRejectedValue(error);

      req.params = { accountId: '1' };

      await deleteAccount(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getProfiles', () => {
    it('should return all profiles for an account', async () => {
      const mockProfiles = [
        { id: 1, name: 'Profile 1', accountId: 1 },
        { id: 2, name: 'Profile 2', accountId: 1 },
      ];

      (profileService.getAdminProfilesByAccount as jest.Mock).mockResolvedValue(mockProfiles);

      req.params = { accountId: '1' };

      await getProfiles(req, res, next);

      expect(profileService.getAdminProfilesByAccount).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved profiles',
        results: mockProfiles,
      });
    });
  });

  describe('editProfile', () => {
    it('should update profile name successfully', async () => {
      const mockUpdatedProfile = { id: 1, name: 'New Name', accountId: 1 };

      (profileService.updateProfileName as jest.Mock).mockResolvedValue(mockUpdatedProfile);

      req.params = { profileId: '1' };
      req.body = { name: 'New Name' };

      await editProfile(req, res, next);

      expect(profileService.updateProfileName).toHaveBeenCalledWith('1', 'New Name');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Profile edited successfully',
        result: mockUpdatedProfile,
      });
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      (profileService.deleteProfile as jest.Mock).mockResolvedValue(undefined);

      req.params = { profileId: '1' };

      await deleteProfile(req, res, next);

      expect(profileService.deleteProfile).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Profile deleted successfully' });
    });
  });

  describe('getProfileShowsList', () => {
    it('should return paginated shows for a profile', async () => {
      const mockShowsResult = {
        shows: [{ id: 1, title: 'Show 1' }],
        pagination: { page: 1, limit: 50, total: 100, totalPages: 2 },
      };

      (adminShowService.getAllShowsByProfile as jest.Mock).mockResolvedValue(mockShowsResult);

      req.params = { profileId: '1' };
      req.query = { page: '1', limit: '50' };

      await getProfileShowsList(req, res, next);

      expect(adminShowService.getAllShowsByProfile).toHaveBeenCalledWith('1', 1, 0, 50);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved page 1 of shows for profile 1',
        pagination: mockShowsResult.pagination,
        results: mockShowsResult.shows,
      });
    });

    it('should use default pagination values when not provided', async () => {
      const mockShowsResult = {
        shows: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      };

      (adminShowService.getAllShowsByProfile as jest.Mock).mockResolvedValue(mockShowsResult);

      req.params = { profileId: '1' };
      req.query = {};

      await getProfileShowsList(req, res, next);

      expect(adminShowService.getAllShowsByProfile).toHaveBeenCalledWith('1', 1, 0, 50);
    });

    it('should cap limit at 100', async () => {
      const mockShowsResult = {
        shows: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
      };

      (adminShowService.getAllShowsByProfile as jest.Mock).mockResolvedValue(mockShowsResult);

      req.params = { profileId: '1' };
      req.query = { limit: '200' };

      await getProfileShowsList(req, res, next);

      expect(adminShowService.getAllShowsByProfile).toHaveBeenCalledWith('1', 1, 0, 100);
    });
  });

  describe('getProfileMoviesList', () => {
    it('should return paginated movies for a profile', async () => {
      const mockMoviesResult = {
        movies: [{ id: 1, title: 'Movie 1' }],
        pagination: { page: 1, limit: 50, total: 100, totalPages: 2 },
      };

      (adminMovieService.getAllMoviesByProfile as jest.Mock).mockResolvedValue(mockMoviesResult);

      req.params = { profileId: '1' };
      req.query = { page: '2', limit: '25' };

      await getProfileMoviesList(req, res, next);

      expect(adminMovieService.getAllMoviesByProfile).toHaveBeenCalledWith('1', 2, 25, 25);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved page 2 of movies for profile 1',
        pagination: mockMoviesResult.pagination,
        results: mockMoviesResult.movies,
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      (accountService.verifyEmail as jest.Mock).mockResolvedValue(undefined);

      req.params = { accountUid: 'abc123' };

      await verifyEmail(req, res, next);

      expect(accountService.verifyEmail).toHaveBeenCalledWith('abc123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email verified for account',
      });
    });
  });

  describe('getAccountPreferences', () => {
    it('should return account preferences', async () => {
      const mockPreferences = { theme: 'dark', notifications: true };

      (preferencesService.getAccountPreferences as jest.Mock).mockResolvedValue(mockPreferences);

      req.params = { accountId: '1' };

      await getAccountPreferences(req, res, next);

      expect(preferencesService.getAccountPreferences).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Retrieved account preferences',
        preferences: mockPreferences,
      });
    });
  });
});
