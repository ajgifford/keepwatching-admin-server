import { jest } from '@jest/globals';

// Mock implementations for services from @ajgifford/keepwatching-common-server
export const mockAccountService = {
  getAccounts: jest.fn<any>(),
  editAccount: jest.fn<any>(),
  deleteAccount: jest.fn<any>(),
  getCombinedAccountByEmail: jest.fn<any>(),
  verifyEmail: jest.fn<any>(),
};

export const mockProfileService = {
  getAdminProfilesByAccount: jest.fn<any>(),
  updateProfileName: jest.fn<any>(),
  deleteProfile: jest.fn<any>(),
};

export const mockNotificationsService = {
  getAllNotifications: jest.fn<any>(),
  addNotification: jest.fn<any>(),
  updateNotification: jest.fn<any>(),
  deleteNotification: jest.fn<any>(),
};

export const mockEmailService = {
  sendEmail: jest.fn<any>(),
};

export const mockContentService = {
  getShows: jest.fn<any>(),
  getMovies: jest.fn<any>(),
  searchContent: jest.fn<any>(),
};

export const mockAdminShowService = {
  getAllShowsByProfile: jest.fn<any>(),
};

export const mockAdminMovieService = {
  getAllMoviesByProfile: jest.fn<any>(),
};

export const mockPreferencesService = {
  getAccountPreferences: jest.fn<any>(),
};

export const mockLogService = {
  getLogs: jest.fn<any>(),
  getLogFiles: jest.fn<any>(),
};

export const mockServicesService = {
  getServices: jest.fn<any>(),
  getServiceById: jest.fn<any>(),
  addService: jest.fn<any>(),
  updateService: jest.fn<any>(),
  deleteService: jest.fn<any>(),
};

export const mockStatisticsService = {
  getAccountStatistics: jest.fn<any>(),
  getProfileStatistics: jest.fn<any>(),
  getAdminStatistics: jest.fn<any>(),
};
