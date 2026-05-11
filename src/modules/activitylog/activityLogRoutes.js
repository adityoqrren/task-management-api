import express from 'express';
import {
  handleGetProjectActivityLogs,
  handleGetTaskActivityLogs,
  handleGetUserActivityLogs
} from './controller/activityLogController.js';
import { checkProjectRole, checkProjectRoleForTask } from '../../shared/middlewares/checkProjectRole.js';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/activity-logs/projects/{projectId}:
 *   get:
 *     summary: Get activity logs for a project
 *     tags: [ActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
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
 *         description: Project activity logs retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 - id: "uuid-log-1"
 *                   message: "John Doe created task 'Fix Bug'"
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *               pagination:
 *                 limit: 20
 *                 nextCursor: "next-cursor-id"
 */
router.get(
  '/projects/:projectId',
  checkProjectRole(['LEADER', 'MEMBER'], true),
  handleGetProjectActivityLogs
);

/**
 * @swagger
 * /api/activity-logs/tasks/{taskId}:
 *   get:
 *     summary: Get activity logs for a task
 *     tags: [ActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
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
 *         description: Task activity logs retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 - id: "uuid-log-2"
 *                   message: "Jane Doe moved task to 'In Progress'"
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *               pagination:
 *                 limit: 20
 *                 nextCursor: "next-cursor-id"
 */
router.get(
  '/tasks/:taskId',
  checkProjectRoleForTask(['LEADER', 'MEMBER'], true),
  handleGetTaskActivityLogs
);

/**
 * @swagger
 * /api/activity-logs:
 *   get:
 *     summary: Get activity logs for current user
 *     tags: [ActivityLogs]
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
 *         description: User activity logs retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 - id: "uuid-log-3"
 *                   message: "You joined project 'Project A'"
 *                   createdAt: "2024-01-01T00:00:00.000Z"
 *               pagination:
 *                 limit: 20
 *                 nextCursor: "next-cursor-id"
 */
router.get(
  '/',
  handleGetUserActivityLogs
);

export default router;
