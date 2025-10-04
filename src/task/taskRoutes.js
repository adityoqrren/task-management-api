import express from 'express';
import {
  handleAssignActiveTask,
  handleDeleteTask,
  handleGetAllUserTasks,
  handleGetTaskById,
  handleGetTaskByIdFromAll,
  handlePostTask,
  handleRestoreSoftDeletedTask,
  handleSoftDeleteTask,
  handleStatusUpdateTask,
  handleUpdateTask,
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
import { authenticate } from '../middlewares/authMiddlewares.js';
import { cacheTasks } from '../middlewares/caching.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';
import { checkProjectRole, checkProjectRoleForTask } from '../middlewares/checkProjectRole.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { assignTaskSchema, updateTaskSchema, updateTaskStatusSchema, postTaskSchema } from './taskValidation.js';

const router = express.Router();

router.use(authenticate);
// router.use(apiLimiter);

router.post('/', validateRequest(postTaskSchema), checkProjectRole(['LEADER']), handlePostTask);
router.get('/me', handleGetAllUserTasks);
router.patch('/:taskId/assign', validateRequest(assignTaskSchema), checkProjectRoleForTask(['LEADER']), handleAssignActiveTask);
router.get('/:taskId', checkProjectRoleForTask(['LEADER','MEMBER']), handleGetTaskById);
router.get('/all/:taskId', checkProjectRoleForTask(['LEADER','MEMBER'], true), handleGetTaskByIdFromAll);
// router.patch('/bulk-soft-delete', handleBulkSoftDeleteTasks);
// router.patch('/bulk-complete', authenticate, handleBulkMarkTasksCompleted);
router.patch('/restore/:taskId', checkProjectRoleForTask(['LEADER'], true), handleRestoreSoftDeletedTask);
router.patch('/:taskId/soft-delete', checkProjectRoleForTask(['LEADER']), handleSoftDeleteTask);
router.patch('/:taskId/completed', validateRequest(updateTaskStatusSchema), checkProjectRoleForTask(['LEADER', 'MEMBER']), handleStatusUpdateTask);
router.patch('/:taskId', validateRequest(updateTaskSchema), checkProjectRoleForTask(['LEADER']), handleUpdateTask);
router.delete('/:taskId', checkProjectRoleForTask(['LEADER'], true), handleDeleteTask);

export default router;
