import express from 'express';
import { handleGetNotifications, handleGetUnreadCount, handleMarkAllNotificationsAsRead, handleMarkNotificationAsRead } from './controller/notificationController.js';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of notifications retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 - id: "uuid-notif-1"
 *                   title: "New Task"
 *                   message: "You have been assigned a new task"
 *                   isRead: false
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *               pagination:
 *                 limit: 20
 *                 nextCursor: "next-cursor-id"
 */
router.get('/', handleGetNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 count: 5
 */
router.get('/unread-count', handleGetUnreadCount);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "Notification marked as read"
 */
router.patch('/:id/read', handleMarkNotificationAsRead);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "All notifications marked as read"
 */
router.patch('/read-all', handleMarkAllNotificationsAsRead);

export default router;