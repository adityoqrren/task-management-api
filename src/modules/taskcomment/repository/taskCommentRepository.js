import prisma from "../../../db/db.js";

const taskCommentInclude = {
  task: {
    select: {
      id: true,
      title: true,
      projectId: true,
      project: {
        select: {
          id: true,
          name: true,
          owner: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

export const getTaskComments = async ({
  taskId,
  cursor,
  limit,
}) => {
  const where = {
    taskId,
  };

  if (cursor) {
    where.OR = [
      {
        createdAt: {
          lt: new Date(cursor.createdAt),
        },
      },
      {
        createdAt: new Date(cursor.createdAt),
        id: {
          lt: cursor.id,
        },
      },
    ];
  }

  const comments = await prisma.taskComments.findMany({
    where,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const hasNext = comments.length > limit;

  if (hasNext) {
    comments.pop();
  }

  return {
    comments,
    hasNext
  };
};

export const countTaskComments = async (taskId) => {
  return prisma.taskComments.count({
    where: {
      taskId,
    },
  });
};

export const getTaskCommentById = async (commentId) => {
  return prisma.taskComments.findUnique({
    where: {
      id: commentId,
    },
    include: taskCommentInclude,
  });
};

export const createTaskComment = async (data) => {
  return prisma.taskComments.create({
    data,
    include: taskCommentInclude,
  });
};

export const updateTaskComment = async ({
  commentId,
  data,
}) => {
  return prisma.taskComments.update({
    where: {
      id: commentId,
    },
    data,
    include: taskCommentInclude,
  });
};

export const deleteTaskComment = async (commentId) => {
  return prisma.taskComments.delete({
    where: {
      id: commentId,
    },
    include: taskCommentInclude,
  });
};