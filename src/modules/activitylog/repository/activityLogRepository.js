import prisma from "../../../db/db.js";

const cursorFilter = (cursor) =>
  cursor
    ? [
        {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        },
      ]
    : [];

const withUserNames = {
  actor: { select: { name: true } },
  targetUser: { select: { name: true } },
};

export const findActivityLogsByProjectId = async ({
  projectId,
  cursor,
  limit
}) => {
  return prisma.activityLogs.findMany({
    where: {
      AND: [
        { projectId },
        ...cursorFilter(cursor),
      ],
    },
    include: withUserNames,
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: limit + 1
  });
};

export const findActivityLogsByTaskId = async ({
  taskId,
  cursor,
  limit
}) => {
  return prisma.activityLogs.findMany({
    where: {
      AND: [
        {
          OR: [
            { taskId },
            { entityType: 'task', entityId: taskId },
          ],
        },
        ...cursorFilter(cursor),
      ],
    },
    include: withUserNames,
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: limit + 1
  });
};

export const findActivityLogsByUserId = async ({
  userId,
  cursor,
  limit
}) => {
  return prisma.activityLogs.findMany({
    where: {
      AND: [
        {
          OR: [
            { actorId: userId },
            { targetUserId: userId },
          ],
        },
        ...cursorFilter(cursor),
      ],
    },
    include: withUserNames,
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    take: limit + 1
  });
};
