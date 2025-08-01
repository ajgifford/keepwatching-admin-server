import {
  addNotification,
  deleteNotification,
  getAllNotifications,
  updateNotification,
} from '../controllers/notificationController';
import express from 'express';

const router = express.Router();

router.get('/api/v1/notifications', getAllNotifications);
router.post('/api/v1/notifications', addNotification);
router.put('/api/v1/notifications/:notificationId', updateNotification);
router.delete('/api/v1/notifications/:notificationId', deleteNotification);

export default router;
