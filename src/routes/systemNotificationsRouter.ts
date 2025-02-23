import {
  addSystemNotification,
  deleteSystemNotification,
  getAllSystemNotifications,
  updateSystemNotification,
} from '../controllers/systemNotificationController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/systemNotifications', getAllSystemNotifications);
router.post('/api/v1/systemNotifications', addSystemNotification);
router.put('/api/v1/systemNotifications/:notificationId', updateSystemNotification);
router.delete('/api/v1/systemNotifications/:notificationId', deleteSystemNotification);

export default router;
