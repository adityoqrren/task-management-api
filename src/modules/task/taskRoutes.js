import express from 'express';
import {
  handleAssignActiveTask,
  handleDeleteTask,
  handleDeleteTaskImage,
  handleGetAllUserTasks,
  handleGetTaskById,
  handleGetTaskByIdFromAll,
  handlePostImageTask,
  handlePostTask,
  handleRestoreSoftDeletedTask,
  handleSoftDeleteTask,
  handleStatusUpdateTask,
  handleProgressUpdateTask,
  handleUpdateTask,
  handleGetUserTaskCounts,
  // handleGetTaskById,
  // handleUpdateTask,
  // handleDeleteTask,
  // handleSoftDeleteTask,
  // handleGetTaskByIdFromAll,
  // handleGetActiveTasks,
  // handleGetAllTasksIncludingDeleted,
  // handleRestoreSoftDeletedTask,
  // handleBulkSoftDeleteTasks,
  // handleBulkMarkTasksCompleted,
  // handleAssignActiveTask
} from '../task/controller/taskController.js';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';
// import { cacheTasks } from '../../shared/middlewares/caching.js';
import { apiLimiter } from '../../shared/middlewares/rateLimiter.js';
import { checkProjectRole, checkProjectRoleForTask, checkProjectRoleForUpdateStatusTask } from '../../shared/middlewares/checkProjectRole.js';
import { validateRequest } from '../../shared/middlewares/validateRequest.js';
import { assignTaskSchema, updateTaskSchema, updateTaskStatusSchema, updateTaskProgressSchema, postTaskSchema, postTaskImageSchema } from './taskValidation.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });  // simpan file in memory buffer before processing

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
 * /api/tasks/{taskId}/image:
 *   post:
 *     summary: Upload an image for a task
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
 *               imageFile:
 *                 type: string
 *                 format: binary
 *               imageTitle:
 *                 type: string
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "task created"
 *               data:
 *                 taskId: "uuid-task-id"
 *                 projectId: "uuid-project-id"
 *                 taskTitle: "Fix Login Bug"
 *                 imageTitle: "Screenshot 1"
 *                 imageUrl: "https://bucket-url..."
 *       400:
 *         description: Invalid file or input
 */
router.post('/:taskId/image', checkProjectRoleForTask(['LEADER', 'MEMBER']), upload.single('imageFile'), validateRequest(postTaskImageSchema), handlePostImageTask);

/**
 * @swagger
 * /api/tasks/{taskId}/image/{imageId}:
 *   delete:
 *     summary: Delete a task image
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *       - in: path
 *         name: imageId
 *         required: true
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "Task image deleted successfully"
 */
router.delete('/:taskId/image/:imageId', checkProjectRoleForTask(['LEADER', 'MEMBER']), upload.single('imageFile'), handleDeleteTaskImage);
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

export default router;
