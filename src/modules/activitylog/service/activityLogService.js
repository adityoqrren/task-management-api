import { getProjectsByIdsService } from '../../project/service/projectService.js';
import { getTaskByIdService, getTasksByIdsService } from '../../task/service/taskService.js';
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
  return JSON.parse(
    Buffer.from(cursor, 'base64').toString('utf8')
  );
}


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

  const hasNext = logs.length === limit && logs.length > 0;
  const lastLog = hasNext ? logs[logs.length - 1] : null

  return {
    data: logs.map((log) => ({
      id: log.id,
      type: log.type,
      message: log.message,
      createdAt: log.createdAt,
      projectId: log.projectId,
    })),
    nextCursor: (lastLog) ? encodeCursor(lastLog) : null,
  };
};

export const getTaskActivityLogsService = async ({
  taskId,
  cursor,
  limit = 20
}) => {
  if (cursor) {
    console.log(`cursor : ${cursor}`);
    console.log(`decoded cursor: ${JSON.stringify(decodeCursor(cursor))}`);
  }
  const logs = await findActivityLogsByTaskId({
    taskId,
    cursor: cursor ? decodeCursor(cursor) : null,
    limit
  });

  const hasNext = logs.length === limit && logs.length > 0;
  const lastLog = hasNext ? logs[logs.length - 1] : null

  // console.log(`cusrsor lastLog: ${lastLog.createdAt.toISOString()}`);

  return {
    data: logs.map((log) => ({
      id: log.id,
      type: log.type,
      message: log.message,
      createdAt: log.createdAt,
      taskId: log.entityId,
      projectId: log.projectId,
    })),
    nextCursor: (lastLog) ? encodeCursor(lastLog) : null,
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

  const hasNext = logs.length === limit && logs.length > 0;
  const lastLog = hasNext ? logs[logs.length - 1] : null

  const projectIds = [...new Set(logs.map(l => l.projectId).filter(Boolean))];
  const taskIds = [...new Set(logs.filter(l => l.entityType == 'task').map(l => l.entityId))];

  const projects = await getProjectsByIdsService({ projectIds, withDeleted: true });

  const tasks = await getTasksByIdsService({ taskIds, withDeleted: true });

  const projectMap = new Map(
    projects.map(p => [p.id, !p.deletedAt])
  );

  const taskMap = new Map(
    tasks.map(t => [t.id, !t.deletedAt])
  );

  const formattedLogs = logs.map(log => {
    const projectActive = log.projectId
      ? projectMap.get(log.projectId) ?? false
      : null;

    const isTask = log.entityType === 'task';

    const taskActive = isTask
      ? taskMap.get(log.entityId) ?? false
      : null;

    return {
      id: log.id,
      type: log.type,
      message: log.message,
      createdAt: log.createdAt,
      project: log.projectId && {
        id: log.projectId,
        isActive: projectActive
      },
      ...(isTask && {
        task: {
          id: log.entityId,
          isActive: taskActive
        }
      }),
      canNavigate: projectActive && (taskActive ?? true)
    };
  });

  return {
    data: formattedLogs,
    nextCursor: (lastLog) ? encodeCursor(lastLog) : null,
  };

  // return {
  //   data: logs.map((log) => ({
  //     id: log.id,
  //     action: log.action,
  //     message: log.message,
  //     createdAt: log.createdAt,
  //     projectId: log.projectId,
  //     taskId: log.taskId
  //   })),
  //   pageInfo: {
  //     hasNextPage: logs.length === limit,
  //     nextCursor: lastLog ? lastLog.createdAt : null
  //   }
  // };
};
