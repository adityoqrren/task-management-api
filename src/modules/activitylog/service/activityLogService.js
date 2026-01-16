import {
  findByProjectId,
  findByTaskId,
  findByUserId
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
  const logs = await findByProjectId({
    projectId,
    cursor: cursor ? decodeCursor(cursor) : null,
    limit
  });

  const lastLog = logs[logs.length - 1];

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
  const logs = await findByTaskId({
    taskId,
    cursor: cursor ? decodeCursor(cursor) : null,
    limit
  });

  const lastLog = logs[logs.length - 1];

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
  const logs = await findByUserId({
    userId,
    cursor,
    limit
  });

  const lastLog = logs[logs.length - 1];

  return {
    data: logs.map((log) => ({
      id: log.id,
      action: log.action,
      message: log.message,
      createdAt: log.createdAt,
      projectId: log.projectId,
      taskId: log.taskId
    })),
    pageInfo: {
      hasNextPage: logs.length === limit,
      nextCursor: lastLog ? lastLog.createdAt : null
    }
  };
};
