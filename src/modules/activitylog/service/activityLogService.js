import { BadRequestError } from '../../../exceptions/errors.js';
import { getProjectsByIdsService } from '../../project/service/projectService.js';
import { getTasksByIdsService } from '../../task/service/taskService.js';
import {
  findActivityLogsByProjectId,
  findActivityLogsByTaskId,
  findActivityLogsByUserId
} from '../repository/activityLogRepository.js';

function encodeCursor(log) {
  return Buffer.from(
    JSON.stringify({
      createdAt: log.createdAt,
      id: log.id
    })
  ).toString('base64');
}

function decodeCursor(cursor) {
  let parsed;
  try {
    parsed = JSON.parse(
      Buffer.from(cursor, 'base64').toString('utf8')
    );
  } catch {
    throw new BadRequestError('Invalid cursor');
  }

  const { createdAt, id } = parsed ?? {};

  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    typeof createdAt !== 'string' ||
    Number.isNaN(Date.parse(createdAt))
  ) {
    throw new BadRequestError('Invalid cursor');
  }

  return { createdAt, id };
}

function paginate(rows, limit) {
  const hasNext = rows.length > limit;
  const pageRows = hasNext ? rows.slice(0, limit) : rows;
  const lastLog = hasNext ? pageRows[pageRows.length - 1] : null;

  return {
    pageRows,
    nextCursor: lastLog ? encodeCursor(lastLog) : null,
  };
}

const resolveTaskId = (log) =>
  log.taskId ?? (log.entityType === 'task' ? log.entityId : null);

export const getProjectActivityLogsService = async ({
  projectId,
  cursor,
  limit = 20
}) => {
  const logs = await findActivityLogsByProjectId({
    projectId,
    cursor: cursor ? decodeCursor(cursor) : null,
    limit
  });

  const { pageRows, nextCursor } = paginate(logs, limit);

  return {
    data: pageRows.map((log) => ({
      id: log.id,
      type: log.type,
      message: log.message,
      createdAt: log.createdAt,
      actorId: log.actorId,
      actorName: log.actor?.name ?? null,
      targetUserId: log.targetUserId,
      targetUserName: log.targetUser?.name ?? null,
      projectId: log.projectId,
      projectName: log.projectName,
    })),
    nextCursor,
  };
};

export const getTaskActivityLogsService = async ({
  taskId,
  cursor,
  limit = 20
}) => {
  const logs = await findActivityLogsByTaskId({
    taskId,
    cursor: cursor ? decodeCursor(cursor) : null,
    limit
  });

  const { pageRows, nextCursor } = paginate(logs, limit);

  return {
    data: pageRows.map((log) => ({
      id: log.id,
      type: log.type,
      message: log.message,
      createdAt: log.createdAt,
      actorId: log.actorId,
      actorName: log.actor?.name ?? null,
      targetUserId: log.targetUserId,
      targetUserName: log.targetUser?.name ?? null,
      taskId: resolveTaskId(log),
      taskTitle: log.entityTitle,
      projectId: log.projectId,
      projectName: log.projectName,
    })),
    nextCursor,
  };
};

export const getUserActivityLogsService = async ({
  userId,
  cursor,
  limit = 20
}) => {
  const logs = await findActivityLogsByUserId({
    userId,
    cursor: cursor ? decodeCursor(cursor) : null,
    limit
  });

  const { pageRows, nextCursor } = paginate(logs, limit);

  const projectIds = [...new Set(pageRows.map(l => l.projectId).filter(Boolean))];
  const taskIds = [...new Set(pageRows.map(resolveTaskId).filter(Boolean))];

  const projects = await getProjectsByIdsService({ projectIds, withDeleted: true });

  const tasks = await getTasksByIdsService({ taskIds, withDeleted: true });

  // get only active project ids
  const projectMap = new Map(
    projects.map(p => [p.id, !p.deletedAt])
  );

  // get only active task ids
  const taskMap = new Map(
    tasks.map(t => [t.id, !t.deletedAt])
  );

  const formattedLogs = pageRows.map(log => {
    const projectActive = log.projectId
      ? projectMap.get(log.projectId) ?? false
      : null;

    const taskId = resolveTaskId(log);

    const taskActive = taskId
      ? taskMap.get(taskId) ?? false
      : null;

    return {
      id: log.id,
      type: log.type,
      message: log.message,
      createdAt: log.createdAt,
      actorId: log.actorId,
      actorName: log.actor?.name ?? null,
      targetUserId: log.targetUserId,
      targetUserName: log.targetUser?.name ?? null,
      project: log.projectId && {
        id: log.projectId,
        name: log.projectName,
        isActive: projectActive
      },
      ...(taskId && {
        task: {
          id: taskId,
          title: log.entityTitle,
          isActive: taskActive
        }
      }),
      canNavigate: projectActive && (taskActive ?? true)
    };
  });

  return {
    data: formattedLogs,
    nextCursor,
  };
};
