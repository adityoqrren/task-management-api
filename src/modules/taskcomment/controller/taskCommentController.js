import { BadRequestError } from "../../../exceptions/errors.js";
import { successPaginationResponse, successResponse } from "../../../shared/utils/response.js";
import {
  createTaskCommentService,
  deleteTaskCommentService,
  getTaskCommentsService,
  updateTaskCommentService,
} from "../service/taskCommentService.js";


export const handleGetTaskComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const limit = parseInt(req.query.limit, 10) || 5;
    const cursor = req.query.cursor || null;

    const { comments, total: totalComments, nextCursor } = await getTaskCommentsService({
      taskId,
      limit,
      cursor
    });

    return successPaginationResponse(res, null, comments, {
      total: totalComments,
      limit,
      nextCursor
    });
  } catch (error) {
    next(error);
  }
};

export const handlePostTaskComment = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { taskId } = req.params;
    const { content } = req.body;

    const comment = await createTaskCommentService({
      userId,
      taskId,
      content,
    });

    return successResponse(res, "comment created", {
      id: comment.id,
      taskId: comment.taskId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user,
    }, 201);
  } catch (error) {
    next(error);
  }
};

export const handleUpdateTaskComment = async (req, res, next) => {
  try {
    const { id: actorId } = req.user;
    const { commentId } = req.params;
    const { content } = req.body;

    const updatedComment = await updateTaskCommentService({
      actorId,
      commentId,
      content,
    });

    return successResponse(res, "success updating task comment", updatedComment);
  } catch (error) {
    next(error);
  }
};

export const handleDeleteTaskComment = async (req, res, next) => {
  try {
    const { id: actorId } = req.user;
    const { commentId } = req.params;

    await deleteTaskCommentService({
      actorId,
      commentId,
    });

    return successResponse(res, "comment deleted successfully");
  } catch (error) {
    next(error);
  }
};