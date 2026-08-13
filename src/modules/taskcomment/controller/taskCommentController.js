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

    const limit = parseInt(req.query.limit, 10) || 0;
    const page = parseInt(req.query.page, 10) || 1;

    const { comments, total: totalComments } = await getTaskCommentsService({
      taskId,
      page,
      limit
    });

    const totalPages = (limit) ? Math.ceil(totalComments / limit) : (totalComments > 0) ? 1 : 0;
    if (totalPages > 0 && page > totalPages) throw new BadRequestError("Page is over from limit");

    return successPaginationResponse(res, null, comments, {
      total: totalComments,
      page: page,
      totalPages,
      limit,
      hasPrev: (limit > 0) ? (page > 1) : false,
      hasNext: (limit > 0) ? (page < totalPages) : false
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
      commentId: comment.id,
      taskId: comment.taskId,
      content: comment.content
    },201);
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