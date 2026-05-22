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
        name: true
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

  const baseQuery = {
    where,
    skip,
    take: (limit > 0) ? limit : undefined,
    orderBy: { [sortBy]: order },
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
      completed: res.completed
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
      assignee: {
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              email: true,
            }
          }
        }
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
  return prisma.task.findMany({
    where: {
      id: { in: taskIds },
      userId,
      deletedAt: null,
      ...condition
    },
    select: { id: true },
  });
};