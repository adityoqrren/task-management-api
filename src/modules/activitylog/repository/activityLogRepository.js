import prisma from "../../../db/db.js";

export const findActivityLogsByProjectId = async ({
  projectId,
  cursor,
  limit
}) => {
  return prisma.activityLogs.findMany({
    where: {
      projectId,
      ...(cursor && {
        OR: [
          {
            createdAt: { lt: cursor.createdAt }
          },
          {
            createdAt: cursor.createdAt,
            id: { lt: cursor.id }
          }
        ]
      })
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: limit
  });
};

export const findActivityLogsByTaskId = async ({
  taskId,
  cursor,
  limit
}) => {
  return prisma.activityLogs.findMany({
    where: {
      entityType: 'task',
      entityId: taskId,
      ...(cursor && {
        OR: [
          {
            createdAt: { lt: cursor.createdAt }
          },
          {
            createdAt: cursor.createdAt,
            id: { lt: cursor.id }
          }
        ]
      })
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: limit
  });
};

export const findActivityLogsByUserId = async ({
  userId,
  cursor,
  limit
}) => {
  return prisma.activityLogs.findMany({
    where: {
      OR: [
        { actorId: userId },
        { targetUserId: userId }
      ],
      ...(cursor && {
        OR: [
          {
            createdAt: { lt: cursor.createdAt }
          },
          {
            createdAt: cursor.createdAt,
            id: { lt: cursor.id }
          }
        ]
      })
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: limit
  });
};
