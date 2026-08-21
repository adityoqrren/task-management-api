import express from 'express';
import {
  handleAssignActiveTask,
  handleDeleteTask,
  handleDeleteTaskImage,
  handleDeleteTaskAttachment,
  handleGetAllUserTasks,
  handleGetTaskById,
  handleGetTaskByIdFromAll,
  handlePostImageTask,
  handlePostTaskAttachment,
  handleGetTaskAttachments,
  handlePostTask,
  handleRestoreSoftDeletedTask,
  handleSoftDeleteTask,
  handleStatusUpdateTask,
  handleProgressUpdateTask,
  handleUpdateTask,
  handleGetUserTaskCounts,
} from './controller/taskController.js';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';
// import { cacheTasks } from '../../shared/middlewares/caching.js';
import { apiLimiter } from '../../shared/middlewares/rateLimiter.js';
import { checkProjectRole, checkProjectRoleForTask, checkProjectRoleForUpdateStatusTask } from '../../shared/middlewares/checkProjectRole.js';
import { validateRequest } from '../../shared/middlewares/validateRequest.js';
import { assignTaskSchema, updateTaskSchema, updateTaskStatusSchema, updateTaskProgressSchema, postTaskSchema, postTaskImageSchema, postTaskAttachmentSchema, getTaskAttachmentsQuerySchema } from './taskValidation.js';
import taskCommentRoutes from "../taskcomment/taskCommentRoutes.js";
import { uploadImage, uploadDocument } from '../../shared/middlewares/uploadMiddleware.js';

const router = express.Router();

router.use(authenticate);
// router.use(apiLimiter);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - projectId
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Detailed Task"
 *               description:
 *                 type: string
 *                 example: "Task description here"
 *               projectId:
 *                 type: string
 *                 example: "uuid-project-id"
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "task created"
 *               data:
 *                 taskId: "uuid-task-id"
 *                 projectId: "uuid-project-id"
 */
router.post('/', validateRequest(postTaskSchema), checkProjectRole(['LEADER']), handlePostTask);

/**
 * @swagger
 * /api/tasks/{taskId}/attachments/images:
 *   post:
 *     summary: Upload an image attachment for a task (JPEG, PNG, WEBP max 2MB)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               fileName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 */
router.post('/:taskId/attachments/images', checkProjectRoleForTask(['LEADER', 'MEMBER']), uploadImage.single('file'), validateRequest(postTaskAttachmentSchema), handlePostTaskAttachment);

/**
 * @swagger
 * /api/tasks/{taskId}/attachments/files:
 *   post:
 *     summary: Upload a document/file attachment for a task (PDF, Word, Excel, CSV, TXT max 10MB)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               fileName:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/:taskId/attachments/files', checkProjectRoleForTask(['LEADER', 'MEMBER']), uploadDocument.single('file'), validateRequest(postTaskAttachmentSchema), handlePostTaskAttachment);

/**
 * @swagger
 * /api/tasks/{taskId}/attachments:
 *   get:
 *     summary: Get attachments for a task filter by type
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, image, file]
 *           default: all
 *     responses:
 *       200:
 *         description: Task attachments retrieved successfully
 */
router.get('/:taskId/attachments', checkProjectRoleForTask(['LEADER', 'MEMBER']), validateRequest(getTaskAttachmentsQuerySchema), handleGetTaskAttachments);

/**
 * @swagger
 * /api/tasks/{taskId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete a task attachment
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *       - in: path
 *         name: attachmentId
 *         required: true
 *     responses:
 *       200:
 *         description: Task attachment deleted successfully
 */
router.delete('/:taskId/attachments/:attachmentId', checkProjectRoleForTask(['LEADER', 'MEMBER']), handleDeleteTaskAttachment);

// Legacy routes for backward compatibility
router.post('/:taskId/image', checkProjectRoleForTask(['LEADER', 'MEMBER']), uploadImage.single('imageFile'), validateRequest(postTaskImageSchema), handlePostImageTask);
router.delete('/:taskId/image/:imageId', checkProjectRoleForTask(['LEADER', 'MEMBER']), handleDeleteTaskImage);

router.get('/me', handleGetAllUserTasks);
router.get('/me/counts', handleGetUserTaskCounts);

/**
 * @swagger
 * /api/tasks/{taskId}/assign:
 *   patch:
 *     summary: Assign a task to a user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberId
 *             properties:
 *               memberId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "member has been assigned to task"
 *               data:
 *                 taskId: "uuid-task"
 *                 memberId: "uuid-member"
 */
router.patch('/:taskId/assign', validateRequest(assignTaskSchema), checkProjectRoleForTask(['LEADER']), handleAssignActiveTask);

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   get:
 *     summary: Get a task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *       - in: query
 *         name: includeAttachments
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Set to true to include task attachments with presigned URLs
 *     responses:
 *       200:
 *         description: Task details retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 id: "uuid-task-1"
 *                 title: "My Task"
 *                 description: "Task description"
 *                 projectId: "uuid-project"
 *                 assigneeId: "uuid-member"
 *                 completed: false
 *                 createdAt: "2024-01-01T00:00:00.000Z"
 */
router.get('/:taskId', checkProjectRoleForTask(['LEADER', 'MEMBER']), handleGetTaskById);

/**
 * @swagger
 * /api/tasks/all/{taskId}:
 *   get:
 *     summary: Get a task by ID (including soft-deleted ones)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     responses:
 *       200:
 *         description: Task details retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 id: "uuid-task-1"
 *                 title: "Deleted Task"
 *                 description: "This task was soft deleted"
 *                 projectId: "uuid-project"
 *                 deletedAt: "2024-02-15T10:00:00.000Z"
 */
router.get('/all/:taskId', checkProjectRoleForTask(['LEADER', 'MEMBER'], true), handleGetTaskByIdFromAll);

// router.patch('/bulk-soft-delete', handleBulkSoftDeleteTasks);
// router.patch('/bulk-complete', authenticate, handleBulkMarkTasksCompleted);

/**
 * @swagger
 * /api/tasks/restore/{taskId}:
 *   patch:
 *     summary: Restore a soft-deleted task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     responses:
 *       200:
 *         description: Task restored successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "success restoring deleted task"
 *               data:
 *                 id: "uuid-task-1"
 *                 title: "Restored Task"
 *                 deletedAt: null
 */
router.patch('/restore/:taskId', checkProjectRoleForTask(['LEADER'], true), handleRestoreSoftDeletedTask);

/**
 * @swagger
 * /api/tasks/{taskId}/soft-delete:
 *   patch:
 *     summary: Soft delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     responses:
 *       200:
 *         description: Task soft-deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "task success deleted"
 */
router.patch('/:taskId/soft-delete', checkProjectRoleForTask(['LEADER']), handleSoftDeleteTask);

/**
 * @swagger
 * /api/tasks/{taskId}/completed:
 *   patch:
 *     summary: Update task completion status
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - completed
 *             properties:
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "task status success changed"
 *               data:
 *                 id: "uuid-task-1"
 *                 title: "Identify Bug"
 *                 completed: true
 */
router.patch('/:taskId/completed', validateRequest(updateTaskStatusSchema), checkProjectRoleForUpdateStatusTask(['LEADER', 'MEMBER']), handleStatusUpdateTask);

/**
 * @swagger
 * /api/tasks/{taskId}/progress:
 *   patch:
 *     summary: Update task progress (status and description)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, DONE]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task progress updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "task progress success changed"
 *               data:
 *                 id: "uuid-task-1"
 *                 title: "Identify Bug"
 *                 status: "IN_PROGRESS"
 *                 description: "working on it"
 *                 completed: false
 */
router.patch('/:taskId/progress', validateRequest(updateTaskProgressSchema), checkProjectRoleForUpdateStatusTask(['LEADER', 'MEMBER']), handleProgressUpdateTask);

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   patch:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "success updating task"
 *               data:
 *                 id: "uuid-task-1"
 *                 title: "New Title"
 *                 description: "New Description"
 */
router.patch('/:taskId', validateRequest(updateTaskSchema), checkProjectRoleForTask(['LEADER']), handleUpdateTask);

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   delete:
 *     summary: Permanently delete a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *     responses:
 *       200:
 *         description: Task deleted permanently
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "task success deleted permanently"
 */
router.delete('/:taskId', checkProjectRoleForTask(['LEADER'], true), handleDeleteTask);

// embed taskCommentRoutes as sub routes
router.use(taskCommentRoutes);
export default router;
