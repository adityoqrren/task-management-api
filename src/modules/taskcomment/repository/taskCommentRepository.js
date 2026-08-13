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
  page,
  limit,
}) => {
  const skip = limit > 0 ? (page - 1) * limit : undefined;

  return prisma.taskComments.findMany({
    where: {
      taskId,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: limit || undefined,
  });
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