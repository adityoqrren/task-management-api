import express from "express";

import {
  handleGetTaskComments,
  handlePostTaskComment,
  handleUpdateTaskComment,
  handleDeleteTaskComment,
} from "./controller/taskCommentController.js";

import { validateRequest } from '../../shared/middlewares/validateRequest.js';

import {
  createTaskCommentSchema,
  updateTaskCommentSchema,
} from "./taskCommentValidation.js";
import { checkProjectRoleForTask, checkTaskCommentPermission } from "../../shared/middlewares/checkProjectRole.js";


const router = express.Router();

router.get(
  "/:taskId/comments",
  checkProjectRoleForTask(["LEADER", "MEMBER"]),
  handleGetTaskComments
);

router.post(
  "/:taskId/comments",
  checkProjectRoleForTask(["LEADER", "MEMBER"]),
  validateRequest(createTaskCommentSchema),
  handlePostTaskComment
);

router.patch(
  "/:taskId/comments/:commentId",
  checkTaskCommentPermission({
    allowCommentOwner: true,
  }),
  validateRequest(updateTaskCommentSchema),
  handleUpdateTaskComment
);

router.delete(
  "/:taskId/comments/:commentId",
  checkTaskCommentPermission({
    allowLeader: true,
    allowCommentOwner: true,
  }),
  handleDeleteTaskComment
);

export default router;