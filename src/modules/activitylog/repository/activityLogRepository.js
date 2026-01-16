import prisma from "../../../db/db.js";

export const findByProjectId = async ({
  projectId,
  cursor,
  limit
}) => {
  return prisma.activityLogs.findMany({
    where: {
      projectId,
      ...(cursor && {
        createdAt: {
          lt: cursor.createdAt
        },
      }),
      ...(cursor && {
        createdAt: cursor.createdAt,
        id: {
          lt: cursor.id
        }
      }),
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });
};

export const findByTaskId = async ({
  taskId,
  cursor,
  limit
}) => {
  return prisma.activityLogs.findMany({
    where: {
      entityType: 'task',
      entityId: taskId,
      ...(cursor && {
        createdAt: {
          lt: cursor.createdAt
        },
      }),
      ...(cursor && {
        createdAt: cursor.createdAt,
        id: {
          lt: cursor.id
        }
      }),
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });
};

export const findByUserId = async ({
  userId,
  cursor,
  limit
}) => {
  return prisma.activityLogs.findMany({
    where: {
      actorId: userId,
      ...(cursor && {
        createdAt: {
          lt: cursor.createdAt
        },
      }),
      ...(cursor && {
        createdAt: cursor.createdAt,
        id: {
          lt: cursor.id
        }
      }),
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });
};
