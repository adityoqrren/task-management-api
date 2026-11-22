import { BadRequestError, ForbiddenError, NotFoundError } from '../../exceptions/errors.js';

export const isProjectArchived = (project) => Boolean(project?.archivedAt);
export const isProjectDeleted = (project) => Boolean(project?.deletedAt);
export const isTaskArchived = (task) => Boolean(task?.archivedAt);
export const isTaskDeleted = (task) => Boolean(task?.deletedAt);

export const assertProjectExists = (project) => {
  if (!project) throw new NotFoundError('PROJECT_NOT_FOUND: project not found');
  return project;
};

export const assertProjectMutable = (project) => {
  assertProjectExists(project);
  if (isProjectDeleted(project)) throw new NotFoundError('PROJECT_DELETED: project not found');
  if (isProjectArchived(project)) throw new ForbiddenError('PROJECT_ARCHIVED: project is read-only');
  return project;
};

export const assertTaskExists = (task) => {
  if (!task) throw new NotFoundError('TASK_NOT_FOUND: task not found');
  return task;
};

export const assertTaskMutable = (task, project) => {
  assertTaskExists(task);
  if (isTaskDeleted(task)) throw new NotFoundError('TASK_DELETED: task not found');
  assertProjectMutable(project);
  if (isTaskArchived(task)) throw new BadRequestError('TASK_ARCHIVED: task is read-only');
  return task;
};

export const assertTaskArchivable = (task, project) => {
  assertTaskExists(task);
  if (isTaskDeleted(task)) throw new NotFoundError('TASK_DELETED: task not found');
  assertProjectMutable(project);
  if (isTaskArchived(task)) throw new BadRequestError('TASK_ALREADY_ARCHIVED');
  return task;
};

export const assertTaskUnarchivable = (task, project) => {
  assertTaskExists(task);
  if (isTaskDeleted(task)) throw new NotFoundError('TASK_DELETED: task not found');
  assertProjectMutable(project);
  if (!isTaskArchived(task)) throw new BadRequestError('TASK_NOT_ARCHIVED');
  return task;
};

export const assertTaskRestorable = (project) => {
  assertProjectExists(project);
  if (isProjectDeleted(project)) throw new NotFoundError('PROJECT_DELETED: project not found');
  if (isProjectArchived(project)) {
    throw new ForbiddenError('PROJECT_ARCHIVED: restore the project before restoring this task');
  }
  return project;
};

export const assertTaskReopenAllowed = (task, nextStatus) => {
  if (!task) return task;
  if (task.status !== 'DONE') return task;
  if (!nextStatus || nextStatus === 'DONE') return task;
  if (!task.assigneeId) return task;

  const assigneeIsInactive = task.assignee != null && task.assignee.isActive === false;
  if (assigneeIsInactive) {
    throw new BadRequestError(
      'TASK_ASSIGNEE_INACTIVE: cannot reopen a DONE task while its assignee is inactive; reactivate the member or assign another active member',
    );
  }

  return task;
};
