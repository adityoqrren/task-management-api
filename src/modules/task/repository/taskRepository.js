import prisma from "../../../db/db.js";

export const addTask = async (data) => {
  return await prisma.tasks.create({
    data,
  },);
};

export const addTaskImage = async (data) => {
  return await prisma.taskImages.create({
    data, include: {
      task: true,
    }
  });
}

export const getAllTasks = async (status, { userId, page, limit, filter = {}, sortBy, order, include }) => {
  console.log(`userId : ${userId} | status ${status} | page ${page} | limit ${limit} | filter ${filter} | sortBy ${sortBy} | order ${order} | include ${include}`);
  const skip = (page - 1) * limit;

  const where = {
    ...filter,
  };

  if (userId) {
    where.assignee = {
      is: {
        userId,
        isActive: true,
      }
    }
  }

  // Handle status 
  // (Note: This 'status' parameter refers to the soft-delete state: 'active' or 'deleted', 
  // and NOT the task progress state / TaskStatus enum like TODO or DONE)
  if (status === "active") {
    where.deletedAt = null;
  } else if (status === "deleted") {
    where.NOT = { deletedAt: null };
  }

  const includeRelations = {
    // user: {
    //   select: {
    //     id: true,
    //     name: true,
    //     email: true
    //   }
    // },
    project: {
      select: {
        id: true,
        name: true,
      }
    }
  }

  if (include === 'assignee') {
    includeRelations.assignee = {
      select: {
        id: true,
        role: true,
        isActive: true,
        joinedAt: true,
        user: {
          select: {
            name: true
          }
        }
      }
    }
  }

  let orderBy;
  if (sortBy === 'project_name') {
    orderBy = { project: { name: order } };
  } else if (sortBy === 'assignee_name') {
    orderBy = { assignee: { user: { name: order } } };
  } else {
    orderBy = { [sortBy]: order };
  }

  const baseQuery = {
    where,
    skip,
    take: (limit > 0) ? limit : undefined,
    orderBy,
  };

  //we only can use one between select and include    
  // if (select) {
  //   baseQuery.select = select
  // }
  // else {
  baseQuery.include = includeRelations
  // }

  const result = await prisma.tasks.findMany(baseQuery);

  const tasks = result.map((res) => {
    const task = {
      taskId: res.id,
      projectId: res.projectId,
      project: res.project,
      title: res.title,
      description: res.description,
      picId: res.assigneeId,
      completed: res.completed,
      status: res.status,
      priority: res.priority,
      startDate: res.startDate,
      dueDate: res.dueDate
    };

    if (res.assignee) {
      task.assignee = {
        memberId: res.assignee.id,
        name: res.assignee.user.name,
        role: res.assignee.role,
        isActive: res.assignee.isActive,
        joinedAt: res.assignee.joinedAt
      };
    }

    return task;
  });

  const totalTasks = await prisma.tasks.count({ where });

  return { tasks, totalTasks };
};

export const getTaskById = async (id, withDeleted) => {
  const where = {
    id,
    ...(withDeleted ? {} : { deletedAt: null }), // hanya tambah filter jika tidak withDeleted
  };

  const result = await prisma.tasks.findFirst({
    where,
    include: {
      taskImages: true,
      project: {
        select: {
          id: true,
          name: true,
        }
      },
      assignee: {
        select: {
          id: true,
          userId: true,
          role: true,
          isActive: true,
          joinedAt: true,
          user: {
            select: {
              name: true,
              email: true,
            }
          }
        },
      },
    }
  });

  return result;
};

// bulk operation. get many tasks by ids
export const getTasksByIds = async (taskIds, withDeleted) => await prisma.tasks.findMany({
  where: { id: { in: taskIds }, deletedAt: withDeleted ? {} : null },
  select: { id: true, deletedAt: true }
});


export const getTaskImageById = async (id) => {
  const where = {
    id,
  };

  const result = await prisma.taskImages.findFirst({
    where,
    include: {
      task: true,
    },
  });

  return result;
};

export const editTask = async (id, data) => {
  // console.log(`data : ${data}`);
  return await prisma.tasks.update({
    where: { id }, data, include: {
      taskImages: true,
      assignee: {
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              email: true,
            }
          }
        },
      },
      project: {
        select: {
          name: true,
          owner: true,
        }
      },
    }
  });
};

export const softDeleteTask = async (id) => {
  return await prisma.tasks.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};


export const softDeleteTasksByProjectId = async (projectId) => {
  return await prisma.tasks.updateMany({
    where: {
      projectId,
      deletedAt: null, // Optional: hanya yang belum soft delete
    },
    data: {
      deletedAt: new Date(),
    },
  });
};

export const restoreSoftDeletedTasksByProjectId = async (projectId) => {
  const totalUpdated = await prisma.tasks.updateMany({
    where: {
      projectId,
    },
    data: {
      deletedAt: null,
    },
  });

  return totalUpdated;
}

export const deleteTaskImage = async (id) => {
  return await prisma.taskImages.delete({ where: { id } });
};

export const deleteTask = async (id) => {
  return await prisma.tasks.delete({ where: { id } });
};

/*-------------Bulk Operations----------------*/

export const bulkSoftDeleteTasks = async (userId, taskIds) => {
  return await prisma.task.updateMany({
    where: {
      id: { in: taskIds },
      userId,
      deletedAt: null, // hanya soft delete yang belum dihapus
    },
    data: {
      deletedAt: new Date(),
    },
  });
};

export const bulkMarkTasksCompleted = async (userId, taskIds) => {
  console.log(taskIds);
  return await prisma.task.updateMany({
    where: {
      id: { in: taskIds },
      userId,
      deletedAt: null, // hanya task yang belum disoft-delete
    },
    data: {
      completed: true,
    },
  });
};

// Find all tasks that belong to the user, are not soft deleted, and match given IDs
export const findValidTasksByIds = async (taskIds, userId, condition = {}) => {
  return prisma.tasks.findMany({
    where: {
      id: { in: taskIds },
      deletedAt: null,
      ...condition
    },
    select: { id: true, projectId: true },
  });
};

export const getTaskStatisticsByProjectId = async (projectId) => {
  const groups = await prisma.tasks.groupBy({
    by: ['status'],
    where: {
      projectId,
      deletedAt: null
    },
    _count: {
      status: true
    }
  });

  const statistics = {
    totalTasks: 0,
    todo: 0,
    inProgress: 0,
    done: 0
  };

  groups.forEach(group => {
    const count = group._count.status;
    statistics.totalTasks += count;
    if (group.status === 'TODO') {
      statistics.todo = count;
    } else if (group.status === 'IN_PROGRESS') {
      statistics.inProgress = count;
    } else if (group.status === 'DONE') {
      statistics.done = count;
    }
  });

  return statistics;
};

export const getUserTaskCounts = async (userId) => {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const baseWhere = {
    assignee: {
      userId,
      isActive: true,
    },
    deletedAt: null,
  };

  const [all, todo, inProgress, done, dueSoon, overdue] = await Promise.all([
    prisma.tasks.count({ where: baseWhere }),
    prisma.tasks.count({ where: { ...baseWhere, status: 'TODO' } }),
    prisma.tasks.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
    prisma.tasks.count({ where: { ...baseWhere, status: 'DONE' } }),
    prisma.tasks.count({
      where: {
        ...baseWhere,
        dueDate: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
    }),
    prisma.tasks.count({
      where: {
        ...baseWhere,
        dueDate: {
          lt: now,
        },
      },
    }),
  ]);

  return { all, todo, inProgress, dueSoon, overdue, done };
};