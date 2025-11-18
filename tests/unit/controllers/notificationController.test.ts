import {
  addNotification,
  deleteNotification,
  getAllNotifications,
  updateNotification,
} from '@controllers/notificationController';
import { notificationsService } from '@ajgifford/keepwatching-common-server/services';
import { beforeEach, describe, expect, it } from '@jest/globals';

jest.mock('@ajgifford/keepwatching-common-server/services', () => ({
  notificationsService: {
    getAllNotifications: jest.fn(),
    addNotification: jest.fn(),
    updateNotification: jest.fn(),
    deleteNotification: jest.fn(),
  },
}));

const mockSafeParse = jest.fn();
const mockNotificationBodyParse = jest.fn();
const mockUpdateNotificationBodyParse = jest.fn();
const mockNotificationIdParamParse = jest.fn();

jest.mock('@ajgifford/keepwatching-common-server/schema', () => ({
  getAllNotificationsQuerySchema: {
    get safeParse() {
      return mockSafeParse;
    },
  },
  notificationBodySchema: {
    get parse() {
      return mockNotificationBodyParse;
    },
  },
  updateNotificationBodySchema: {
    get parse() {
      return mockUpdateNotificationBodyParse;
    },
  },
  notificationIdParamSchema: {
    get parse() {
      return mockNotificationIdParamParse;
    },
  },
}));

describe('NotificationController', () => {
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

  describe('getAllNotifications', () => {
    it('should return paginated notifications with valid query params', async () => {
      const mockResponse = {
        message: 'Retrieved notifications',
        notifications: [{ id: 1, title: 'Test Notification', message: 'Test message' }],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      };

      mockSafeParse.mockReturnValue({
        success: true,
        data: { page: 1, pageSize: 10 },
      });

      (notificationsService.getAllNotifications as jest.Mock).mockResolvedValue(mockResponse);

      req.query = { page: '1', pageSize: '10' };

      await getAllNotifications(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle invalid query parameters', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: { errors: [{ message: 'Invalid query parameters' }] },
      });

      req.query = { page: 'invalid', pageSize: '-5' };

      await getAllNotifications(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('addNotification', () => {
    it('should add notification successfully with valid data', async () => {
      const validData = {
        title: 'New Notification',
        message: 'Test message',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        sendToAll: true,
        type: 'info',
      };

      mockNotificationBodyParse.mockReturnValue(validData);
      (notificationsService.addNotification as jest.Mock).mockResolvedValue(undefined);

      req.body = validData;

      await addNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification added' });
    });

    it('should handle validation errors', async () => {
      const error = { errors: [{ message: 'Required fields missing' }] };
      mockNotificationBodyParse.mockImplementation(() => {
        throw error;
      });

      req.body = { title: 'Test' };

      await addNotification(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('updateNotification', () => {
    it('should update notification successfully', async () => {
      const validParams = { notificationId: '1' };
      const validBody = {
        title: 'Updated Title',
        message: 'Updated message',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        sendToAll: false,
        accountId: 1,
        type: 'warning',
      };

      mockNotificationIdParamParse.mockReturnValue(validParams);
      mockUpdateNotificationBodyParse.mockReturnValue(validBody);
      (notificationsService.updateNotification as jest.Mock).mockResolvedValue(undefined);

      req.params = validParams;
      req.body = validBody;

      await updateNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification updated successfully' });
    });

    it('should handle missing notification ID', async () => {
      const error = { errors: [{ message: 'notificationId is required' }] };
      mockNotificationIdParamParse.mockImplementation(() => {
        throw error;
      });

      req.params = {};
      req.body = { title: 'Updated Title' };

      await updateNotification(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const validParams = { notificationId: '1' };

      mockNotificationIdParamParse.mockReturnValue(validParams);
      (notificationsService.deleteNotification as jest.Mock).mockResolvedValue(undefined);

      req.params = validParams;

      await deleteNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification deleted successfully' });
    });

    it('should handle errors when deleting', async () => {
      const validParams = { notificationId: '1' };
      const error = new Error('Delete failed');

      mockNotificationIdParamParse.mockReturnValue(validParams);
      (notificationsService.deleteNotification as jest.Mock).mockRejectedValue(error);

      req.params = validParams;

      await deleteNotification(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
