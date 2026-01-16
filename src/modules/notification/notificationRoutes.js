import express from 'express';
import { handleGetNotifications, handleGetUnreadCount, handleMarkAllNotificationsAsRead, handleMarkNotificationAsRead } from './controller/notificationController.js';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';

const router = express.Router();

router.use(authenticate);

router.get('/', handleGetNotifications);
router.get('/unread-count', handleGetUnreadCount);
router.patch('/:id/read', handleMarkNotificationAsRead);
router.patch('/read-all', handleMarkAllNotificationsAsRead);

export default router;