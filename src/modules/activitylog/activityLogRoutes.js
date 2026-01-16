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

router.get(
  '/projects/:projectId',
  checkProjectRole(['LEADER','MEMBER'], true),
  handleGetProjectActivityLogs
);

router.get(
  '/tasks/:taskId',
  checkProjectRoleForTask(['LEADER','MEMBER'], true),
  handleGetTaskActivityLogs
);

router.get(
  '/',
  handleGetUserActivityLogs
);

export default router;
