import {
  countTaskComments,
  createTaskComment,
  deleteTaskComment,
  getTaskComments,
  updateTaskComment,
} from "../repository/taskCommentRepository.js";

import { updateProjectLastActivityService } from "../../project/service/projectService.js";
import publishEvent from "../../../queue/event/eventPublisher.js";
import { generateEventId } from "../../../shared/utils/uuid.js";

const COMMENT_PREVIEW_LENGTH = 100;

const getCommentPreview = (content) => {
  if (content.length <= COMMENT_PREVIEW_LENGTH) {
    return content;
  }

  return `${content.substring(0, COMMENT_PREVIEW_LENGTH)}...`;
};

export const getTaskCommentsService = async ({
  taskId,
  page,
  limit,
}) => {
  const [comments, total] = await Promise.all([
    getTaskComments({ taskId, page, limit }),
    countTaskComments(taskId),
  ]);

  return {
    comments,
    total,
  };
};

export const createTaskCommentService = async ({
  userId,
  taskId,
  content,
}) => {
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