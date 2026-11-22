import {
  countTaskComments,
  createTaskComment,
  deleteTaskComment,
  getTaskCommentById,
  getTaskComments,
  updateTaskComment,
} from "../repository/taskCommentRepository.js";

import { updateProjectLastActivityService } from "../../project/service/projectService.js";
import { getTaskById } from "../../task/repository/taskRepository.js";
import { getProjectByIdfromAll } from "../../project/repository/projectRepository.js";
import { assertTaskMutable } from "../../../shared/utils/lifecycle.js";
import { NotFoundError } from "../../../exceptions/errors.js";
import publishEvent from "../../../queue/event/eventPublisher.js";
import { generateEventId } from "../../../shared/utils/uuid.js";
import { decodeCursor, encodeCursor } from "../../../shared/utils/cursor.js";

const COMMENT_PREVIEW_LENGTH = 100;

const assertTaskCommentMutable = async (taskId) => {
  if (!taskId) throw new NotFoundError('Comment not found');
  const task = await getTaskById(taskId, false);
  const project = await getProjectByIdfromAll(task?.projectId);
  assertTaskMutable(task, project);
};

const getCommentPreview = (content) => {
  if (content.length <= COMMENT_PREVIEW_LENGTH) {
    return content;
  }

  return `${content.substring(0, COMMENT_PREVIEW_LENGTH)}...`;
};

export const getTaskCommentsService = async ({
  taskId,
  cursor,
  limit,
}) => {
  const decodedCursor = cursor
    ? decodeCursor(cursor)
    : null;

  const [getTaskCommentResult, total] = await Promise.all([
    getTaskComments({ taskId, cursor: decodedCursor, limit }),
    countTaskComments(taskId),
  ]);

  const { comments, hasNext } = getTaskCommentResult;

  const nextCursor =
    comments.length > 0 && hasNext
      ? encodeCursor({
        createdAt: comments[comments.length - 1].createdAt,
        id: comments[comments.length - 1].id,
      })
      : null;

  return {
    comments,
    total,
    nextCursor
  };
};

export const createTaskCommentService = async ({
  userId,
  taskId,
  content,
}) => {
  await assertTaskCommentMutable(taskId);

  const comment = await createTaskComment({
    taskId,
    userId,
    content,
  });

  //publish task.comment.created event to queue
  await publishEvent({
    id: `event-${generateEventId()}`,
    type: "task.comment.created",
    actorId: userId,
    occurredAt: new Date().toISOString(),
    payload: {
      commentId: comment.id,
      taskId: comment.task.id,
      taskTitle: comment.task.title,
      projectId: comment.task.project.id,
      projectName: comment.task.project.name,
      commentOwnerId: comment.user.id,
      assignedUserId: comment.task.assignee?.userId ?? null,
      ownerId: comment.task.project.owner,
      commentPreview: getCommentPreview(comment.content),
    },
  });

  await updateProjectLastActivityService(comment.task.projectId);

  return comment;
};

export const updateTaskCommentService = async ({
  actorId,
  commentId,
  content,
}) => {
  const existingComment = await getTaskCommentById(commentId);
  await assertTaskCommentMutable(existingComment?.taskId);

  const comment = await updateTaskComment({
    commentId,
    data: {
      content,
    },
  });

  //publish task.comment.updated event to queue
  await publishEvent({
    id: `event-${generateEventId()}`,
    type: "task.comment.updated",
    actorId,
    occurredAt: new Date().toISOString(),
    payload: {
      commentId: comment.id,
      taskId: comment.task.id,
      taskTitle: comment.task.title,
      projectId: comment.task.project.id,
      projectName: comment.task.project.name,
      commentOwnerId: comment.user.id,
      assignedUserId: comment.task.assignee?.userId ?? null,
      ownerId: comment.task.project.owner,
      commentPreview: getCommentPreview(comment.content),
    },
  });

  await updateProjectLastActivityService(comment.task.projectId);

  return comment;
};

export const deleteTaskCommentService = async ({
  actorId,
  commentId,
}) => {
  const existingComment = await getTaskCommentById(commentId);
  await assertTaskCommentMutable(existingComment?.taskId);

  const comment = await deleteTaskComment(commentId);

  //publish task.comment.deleted event to queue
  await publishEvent({
    id: `event-${generateEventId()}`,
    type: "task.comment.deleted",
    actorId,
    occurredAt: new Date().toISOString(),
    payload: {
      commentId: comment.id,
      taskId: comment.task.id,
      taskTitle: comment.task.title,
      projectId: comment.task.project.id,
      projectName: comment.task.project.name,
      commentOwnerId: comment.user.id,
      assignedUserId: comment.task.assignee?.userId ?? null,
      ownerId: comment.task.project.owner,
      commentPreview: getCommentPreview(comment.content),
    },
  });

  await updateProjectLastActivityService(comment.task.projectId);

  return comment;
};