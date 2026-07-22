import prisma from "../../../db/db.js";

export const countUserProjects = async (userId) => {
  return await prisma.projectMembers.count({
    where: {
      userId,
      isActive: true,
      project: {
        deletedAt: null,
      },
    },
  });
};

export const getDashboardTaskStats = async (userId) => {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const [assignedTasks, dueSoon, overdue] = await Promise.all([
    // count assignedTasks (uncompleted)
    prisma.tasks.count({
      where: {
        assignee: {
          userId,
          isActive: true,
        },
        completed: false,
        deletedAt: null,
      },
    }),
    // count dueSoon (uncompleted, due date between now and now + 3 days)
    prisma.tasks.count({
      where: {
        assignee: {
          userId,
          isActive: true,
        },
        completed: false,
        deletedAt: null,
        dueDate: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
    }),
    // count overdue (uncompleted, due date < now)
    prisma.tasks.count({
      where: {
        assignee: {
          userId,
          isActive: true,
        },
        completed: false,
        deletedAt: null,
        dueDate: {
          lt: now,
        },
      },
    }),
  ]);

  return {
    assignedTasks,
    dueSoon,
    overdue,
  };
};
