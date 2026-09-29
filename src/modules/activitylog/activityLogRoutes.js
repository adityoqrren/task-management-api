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
 *     description: Returns the activity logs of a project the authenticated user is an active member of. Results are ordered newest first and paginated with a cursor.
 *     tags: [ActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *         example: "uuid-project-id"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Opaque pagination cursor returned as `pagination.nextCursor` in the previous page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of logs per page (capped at 100)
 *     responses:
 *       200:
 *         description: Project activity logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         example: task.created
 *                       message:
 *                         type: string
 *                         nullable: true
 *                         example: "John Doe created task 'Fix Bug'"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       actorId:
 *                         type: string
 *                       actorName:
 *                         type: string
 *                         nullable: true
 *                       targetUserId:
 *                         type: string
 *                         nullable: true
 *                       targetUserName:
 *                         type: string
 *                         nullable: true
 *                       projectId:
 *                         type: string
 *                       projectName:
 *                         type: string
 *                         nullable: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *                       example: "eyJjcmVhdGVkQXQiOi..."
 *       400:
 *         description: Invalid cursor
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "Invalid cursor"
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "Unauthorized: No token provided"
 *       403:
 *         description: User is not an active member of the project
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "User is not a member of this project"
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "Project is not found"
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
 *     description: Returns all activity logs linked to a task (task events, comments and attachments), including soft-deleted tasks. Results are ordered newest first and paginated with a cursor.
 *     tags: [ActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "uuid-task-id"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Opaque pagination cursor returned as `pagination.nextCursor` in the previous page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of logs per page (capped at 100)
 *     responses:
 *       200:
 *         description: Task activity logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         example: task.updated
 *                       message:
 *                         type: string
 *                         nullable: true
 *                         example: "Jane Doe moved task to 'In Progress'"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       actorId:
 *                         type: string
 *                       actorName:
 *                         type: string
 *                         nullable: true
 *                       targetUserId:
 *                         type: string
 *                         nullable: true
 *                       targetUserName:
 *                         type: string
 *                         nullable: true
 *                       taskId:
 *                         type: string
 *                         nullable: true
 *                       taskTitle:
 *                         type: string
 *                         nullable: true
 *                       projectId:
 *                         type: string
 *                       projectName:
 *                         type: string
 *                         nullable: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *                       example: "eyJjcmVhdGVkQXQiOi..."
 *       400:
 *         description: Invalid cursor
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "Invalid cursor"
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "Unauthorized: No token provided"
 *       403:
 *         description: User is not an active member of the task's project
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "Inactive member of this project"
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "Task is not found"
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
 *     description: Returns activity logs where the authenticated user is the actor or the target, newest first. Each log indicates whether its project/task still exists so the client can decide if it is navigable.
 *     tags: [ActivityLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Opaque pagination cursor returned as `pagination.nextCursor` in the previous page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of logs per page (capped at 100)
 *     responses:
 *       200:
 *         description: User activity logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         example: project.member.added
 *                       message:
 *                         type: string
 *                         nullable: true
 *                         example: "You joined project 'Project A'"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       actorId:
 *                         type: string
 *                       actorName:
 *                         type: string
 *                         nullable: true
 *                       targetUserId:
 *                         type: string
 *                         nullable: true
 *                       targetUserName:
 *                         type: string
 *                         nullable: true
 *                       project:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                             nullable: true
 *                           isActive:
 *                             type: boolean
 *                       task:
 *                         type: object
 *                         nullable: true
 *                         description: Present only for task-scoped logs
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                             nullable: true
 *                           isActive:
 *                             type: boolean
 *                       canNavigate:
 *                         type: boolean
 *                         description: True when the referenced project (and task, if any) still exists
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     nextCursor:
 *                       type: string
 *                       nullable: true
 *                       example: "eyJjcmVhdGVkQXQiOi..."
 *       400:
 *         description: Invalid cursor
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "Invalid cursor"
 *       401:
 *         description: Missing or invalid access token
 *         content:
 *           application/json:
 *             example:
 *               status: "fail"
 *               message: "Unauthorized: No token provided"
 */
router.get(
  '/',
  handleGetUserActivityLogs
);

export default router;
