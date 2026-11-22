import prisma from "../../../db/db.js";

export const addTask = async (data) => {
  return await prisma.tasks.create({
    data,
    include: {
      project: {
        select: {
          name: true,
        }
      }
    }
  });
};

export const addTaskAttachment = async (data) => {
  return await prisma.taskAttachments.create({
    data,
    include: {
      task: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              owner: true,
            },
          },
        }
      },
    }
  });
};

export const addTaskImage = addTaskAttachment;

export const getAllTasks = async (status, { userId, page, limit, filter = {}, sortBy, order, include, excludeArchivedProjects = false }) => {
  //console.log(`userId : ${userId} | status ${status} | page ${page} | limit ${limit} | filter ${filter} | sortBy ${sortBy} | order ${order} | include ${include} | excludeArchivedProjects ${excludeArchivedProjects}`);
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

  // Handle lifecycle status.
  // 'active' means "not manually archived"; tasks archived only because their
  // parent project was archived (archiveSource = PROJECT) still count as active.
  // (Note: This 'status' parameter is NOT the task progress state / TaskStatus enum.)
  const lifecycleFilters = [];
  if (status === "active") {
    lifecycleFilters.push(
      { deletedAt: null },
      {
        OR: [
          { archiveSource: null },
          { archiveSource: { not: 'MANUAL' } },
        ],
      },
    );
  } else if (status === "archived") {
    lifecycleFilters.push(
      { deletedAt: null },
      { archiveSource: 'MANUAL' },
    );
  } else if (status === "deleted") {
    lifecycleFilters.push({ deletedAt: { not: null } });
  }

  // /tasks/me only shows tasks whose parent project is not archived.
  if (excludeArchivedProjects) {
    lifecycleFilters.push({ project: { archivedAt: null } });
  }

  if (lifecycleFilters.length > 0) {
    where.AND = [...(where.AND || []), ...lifecycleFilters];
  }

  const includeRelations = {
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

  baseQuery.include = includeRelations;

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
      dueDate: res.dueDate,
      archivedAt: res.archivedAt,
      archiveSource: res.archiveSource,
      deletedAt: res.deletedAt,
      deleteSource: res.deleteSource,
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

export const getTaskById = async (id, withDeleted, includeAttachments = false) => {
  const where = {
    id,
    ...(withDeleted ? {} : { deletedAt: null }), // hanya tambah filter jika tidak withDeleted
  };

  const result = await prisma.tasks.findFirst({
    where,
    include: {
      ...(includeAttachments ? { taskAttachments: true } : {}),
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


export const getTaskAttachmentFilenamesByTaskId = async (taskId) => {
  const rows = await prisma.taskAttachments.findMany({
    where: { taskId },
    select: { fileName: true },
  });
  return rows.map((row) => row.fileName);
};

export const getTaskAttachmentById = async (taskId, attachmentId) => {
  const where = {
    id: attachmentId,
    taskId,
  };

  const result = await prisma.taskAttachments.findFirst({
    where,
    include: {
      task: true,
      user: true
    },
  });

  return result;
};

export const getTaskImageById = getTaskAttachmentById;

export const getTaskAttachmentsByTaskId = async (taskId, type = 'all') => {
  const where = { taskId };
  if (type === 'image') {
    where.mimeType = { startsWith: 'image/' };
  } else if (type === 'file') {
    where.NOT = { mimeType: { startsWith: 'image/' } };
  }

  return await prisma.taskAttachments.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const editTask = async (id, data) => {
  // console.log(`data : ${data}`);
  return await prisma.tasks.update({
    where: { id }, data, include: {
      taskAttachments: true,
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

export const archiveTask = async (id) => {
  return await prisma.tasks.update({
    where: { id, deletedAt: null, archivedAt: null },
    data: { archivedAt: new Date(), archiveSource: 'MANUAL' },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          owner: true,
        }
      },
      assignee: {
        select: {
          userId: true,
        }
      },
    }
  });
};

export const unarchiveTask = async (id, data = {}) => {
  return await prisma.tasks.update({
    where: { id, deletedAt: null, archivedAt: { not: null } },
    data: { archivedAt: null, archiveSource: null, ...data },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          owner: true,
        }
      },
      assignee: {
        select: {
          userId: true,
        }
      },
    }
  });
};

export const softDeleteTask = async (id) => {
  return await prisma.tasks.update({
    where: { id },
    data: { deletedAt: new Date(), deleteSource: 'MANUAL' },
    include: {
      project: {
        select: {
          name: true,
        }
      }
    }
  });
};


export const softDeleteTasksByProjectId = async (projectId) => {
  return await prisma.tasks.updateMany({
    where: {
      projectId,
      deletedAt: null, // only tasks that have not been soft deleted
    },
    data: {
      deletedAt: new Date(),
      deleteSource: 'PROJECT',
    },
  });
};

export const restoreSoftDeletedTasksByProjectId = async (projectId) => {
  const totalUpdated = await prisma.tasks.updateMany({
    where: {
      projectId,
      deleteSource: 'PROJECT',
    },
    data: {
      deletedAt: null,
      deleteSource: null,
    },
  });

  return totalUpdated;
}

export const getProjectAssigneeUserIds = async (projectId) => {
  const rows = await prisma.tasks.findMany({
    where: {
      projectId,
      assigneeId: { not: null },
    },
    select: {
      assignee: {
        select: {
          userId: true,
        }
      }
    }
  });

  return [...new Set(rows.map((row) => row.assignee?.userId).filter(Boolean))];
};

export const deleteTaskAttachment = async (id) => {
  return await prisma.taskAttachments.delete({
    where: { id }, include: {
      task: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              owner: true,
            },
          },
        }
      },
    }
  });
};

export const deleteTaskImage = deleteTaskAttachment;

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
  //console.log(taskIds);
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

export const getTaskStatusCountsByAssignee = async (projectId, assigneeId) => {
  const groups = await prisma.tasks.groupBy({
    by: ['status'],
    where: {
      projectId,
      assigneeId,
      deletedAt: null,
    },
    _count: {
      status: true,
    },
  });

  return groups.reduce((counts, group) => {
    counts[group.status] = group._count.status;
    return counts;
  }, {});
};

export const getTaskStatisticsByProjectId = async (projectId, { includeArchived = false } = {}) => {
  const groups = await prisma.tasks.groupBy({
    by: ['status'],
    where: {
      projectId,
      deletedAt: null,
      ...(includeArchived ? {} : { archivedAt: null }),
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
    archivedAt: null,
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