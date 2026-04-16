// Mock implementations for services from @ajgifford/keepwatching-common-server
export const mockAccountService = {
  getAccounts: jest.fn(),
  editAccount: jest.fn(),
  deleteAccount: jest.fn(),
  getCombinedAccountByEmail: jest.fn(),
  verifyEmail: jest.fn(),
};

export const mockProfileService = {
  getAdminProfilesByAccount: jest.fn(),
  updateProfileName: jest.fn(),
  deleteProfile: jest.fn(),
};

export const mockNotificationsService = {
  getAllNotifications: jest.fn(),
  addNotification: jest.fn(),
  updateNotification: jest.fn(),
  deleteNotification: jest.fn(),
};

export const mockEmailService = {
  sendEmail: jest.fn(),
};

export const mockContentService = {
  getShows: jest.fn(),
  getMovies: jest.fn(),
  searchContent: jest.fn(),
};

export const mockAdminShowService = {
  getAllShowsByProfile: jest.fn(),
};

export const mockAdminMovieService = {
  getAllMoviesByProfile: jest.fn(),
};

export const mockPreferencesService = {
  getAccountPreferences: jest.fn(),
};

export const mockLogService = {
  getLogs: jest.fn(),
  getLogFiles: jest.fn(),
};

export const mockServicesService = {
  getServices: jest.fn(),
  getServiceById: jest.fn(),
  addService: jest.fn(),
  updateService: jest.fn(),
  deleteService: jest.fn(),
};

export const mockStatisticsService = {
  getAccountStatistics: jest.fn(),
  getProfileStatistics: jest.fn(),
  getAdminStatistics: jest.fn(),
};
