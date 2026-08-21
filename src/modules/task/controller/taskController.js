import { is } from 'zod/locales';
import { makeError, successPaginationResponse, successResponse } from '../../../shared/utils/response.js';
import { deleteTaskImage } from '../repository/taskRepository.js';
import {
  addTaskService,
  getTaskByIdService,
  editTaskService,
  deleteTaskService,
  softDeleteTaskService,
  restoreSoftDeletedTaskService,
  bulkSoftDeleteTasksService,
  bulkMarkCompletedService,
  softDeleteTasksByProjectService,
  assignActiveTaskService,
  addTaskAttachmentService,
  addTaskImageService,
  getTaskAttachmentsService,
  deleteTaskAttachmentService,
  deleteTaskImageService,
  getAllTasksByUserIdService,
  getUserTaskCountsService
} from '../service/taskService.js';
import path from 'path';
import { BadRequestError } from '../../../exceptions/errors.js';

export const handlePostTask = async (req, res, next) => {
  try {
    const { title, description = "", projectId, status, priority, startDate, dueDate } = req.body;
    const userId = req.user.id;

    const task = await addTaskService(userId, { title, description, projectId, status, priority, startDate, dueDate });

    return successResponse(res, "task created", {
      taskId: task.id,
      projectId,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate,
      dueDate: task.dueDate
    }, 201);
  } catch (error) {
    next(error);
  }
};

// task attachment handling (post)
export const handlePostTaskAttachment = async (req, res, next) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user.id;
    const { fileName, imageTitle } = req.body;

    const file = req.file;
    if (!file) {
      throw new BadRequestError("File is required");
    }

    const fileMimeType = file.mimetype;
    const size = file.size;
    const originalName = file.originalname;
    const finalFileName = fileName || imageTitle || originalName;
    const fileBuffer = file.buffer;
    const ext = path.extname(originalName);
    const objectKey = `uploads/${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`;

    const attachment = await addTaskAttachmentService({
      taskId,
      userId,
      fileName: finalFileName,
      fileBuffer,
      objectKey,
      fileMimeType,
      size,
    });

    return successResponse(res, "Task attachment uploaded successfully", attachment, 201);
  } catch (error) {
    next(error);
  }
};

export const handlePostImageTask = handlePostTaskAttachment;

export const handleAssignActiveTask = async (req, res, next) => {
  const ownerEmail = req.user.email;
  const { taskId } = req.params;
  const { memberId } = req.body;
  const assigneeUserId = req.assigneeUserId;
  const assigneeEmail = req.assigneeEmail;
  const projectId = req.taskProjectId;

  console.log(`taskId : ${taskId} - memberId: ${memberId}`);

  try {
    const result = await assignActiveTaskService({ taskId, projectId, ownerEmail, assigneeUserId, assigneeEmail, memberId });
    return successResponse(res, "member has been assigned to task", {
      taskId: result.id,
      memberId: result.assigneeId,
    })
  } catch (error) {
    next(error);
  }

};

// export const handleGetActiveTasks = async (req, res, next) => {
//   return handleGetAllTasksBase(req, res, next, false);
// };

// export const handleGetAllTasksIncludingDeleted = async (req, res, next) => {
//   const role = req.user.role;
//   if (role == "admin") {
//     return handleGetAllTasksBase(req, res, next, true);
//   } else {
//     throw makeError("access denied", 404)
//   }
// };

// export const handleGetUserTasks = async (req, res, next) => {
//   const loggedInUserId = req.user.id;
//   return handleGetAllTasksBase(req, res, next, loggedInUserId);
// }

export const handleGetAllUserTasks = async (req, res, next) => {
  try {
    /**
     * completed : is task completed. viewed by completed variable.
     * status : active | all | deleted. viewed by deleted_at. deleted_at = null means active. deleted_at != null means inactive.
     * taskStatus : TODO | IN_PROGRESS | DONE | CANCELLED. The lifecycle state of the task.
     * 
     * Note: 'status' query param is used for the soft deletion state, 
     * while 'taskStatus' query param is used to filter by the task's progress state.
     */
    const { status = 'active', projectId, completed, search, sortBy, order, include, taskStatus, priority, dueFilter } = req.query;
    const userId = req.user.id;

    const limit = parseInt(req.query.limit, 10) || 0;
    const page = parseInt(req.query.page, 10) || 1;

    const filter = {};

    // Validasi sorting
    const validSortFields = ['createdAt', 'title', 'status', 'project_name', 'priority', 'startDate', 'dueDate'];
    const validOrders = ['asc', 'desc'];

    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = validOrders.includes(order) ? order : 'desc';

    if (projectId) {
      filter.projectId = projectId;
    }

    if (completed !== undefined) {
      filter.completed = completed === 'true';
    }

    if (taskStatus) {
      filter.status = taskStatus.toUpperCase();
    }

    if (priority) {
      filter.priority = priority.toUpperCase();
    }

    if (dueFilter === 'dueSoon') {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      filter.dueDate = {
        gte: now,
        lte: threeDaysFromNow,
      };
    } else if (dueFilter === 'overdue') {
      filter.dueDate = {
        lt: new Date(),
      };
    }

    if (search) {
      filter.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    //check if simple query for caching
    const isSimpleQuery =
      status === 'active' &&
      !projectId &&
      completed === undefined &&
      !taskStatus &&
      !priority &&
      !search &&
      !dueFilter &&
      (!sortBy || sortBy === 'createdAt') &&
      (!order || order === 'desc');
    //  && !include;

    const queryParams = { userId, page, limit, filter, sortBy: sortField, order: sortOrder, include };
    const { isFromCache, tasks, totalTasks } = await getAllTasksByUserIdService({ isSimpleQuery, status, queryParams });
    const totalPages = (limit) ? Math.ceil(totalTasks / limit) : (totalTasks > 0) ? 1 : 0;
    if (totalPages > 0 && page > totalPages) throw new BadRequestError("Page is over from limit");
    if (isFromCache) {
      res.header('X-Data-Source', 'cache');
    }
    return successPaginationResponse(res, null, tasks, {
      total: totalTasks,
      page: page,
      totalPages,
      limit,
      hasPrev: (limit > 0) ? (page > 1) : false,
      hasNext: (limit > 0) ? (page < totalPages) : false
    });
  } catch (error) {
    next(error);
  }
};

const mapTaskDetail = (task) => {
  const mapped = {
    taskId: task.id,
    projectId: task.projectId,
    project: task.project,
    title: task.title,
    description: task.description,
    picId: task.assigneeId,
    completed: task.completed,
    status: task.status,
    priority: task.priority,
    startDate: task.startDate,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    deletedAt: task.deletedAt,
  };

  if (task.taskAttachments !== undefined) {
    mapped.taskAttachments = task.taskAttachments;
  }

  if (task.assignee) {
    mapped.assignee = {
      memberId: task.assignee.id,
      userId: task.assignee.userId,
      name: task.assignee.user.name,
      email: task.assignee.user.email,
      role: task.assignee.role,
      isActive: task.assignee.isActive,
      joinedAt: task.assignee.joinedAt
    };
  } else {
    mapped.assignee = null;
  }

  return mapped;
};

export const handleGetTaskAttachments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { type = 'all' } = req.query;

    const attachments = await getTaskAttachmentsService({ taskId, type });
    return successResponse(res, "Task attachments retrieved successfully", attachments);
  } catch (error) {
    next(error);
  }
};

export const handleGetTaskById = async (req, res, next) => {
  try {
    //task id
    const taskId = req.params.taskId;
    const includeAttachments = req.query.includeAttachments === 'true' || req.query.include === 'attachments';
    const task = await getTaskByIdService({ taskId, withDeleted: false, includeAttachments });

    // if (!task) return res.status(404).json({ message: 'Task not found' });

    return successResponse(res, null, mapTaskDetail(task));
  } catch (error) {
    next(error);
  }
};

export const handleGetTaskByIdFromAll = async (req, res, next) => {
  try {
    //task id
    const taskId = req.params.taskId;
    const includeAttachments = req.query.includeAttachments === 'true' || req.query.include === 'attachments';
    const task = await getTaskByIdService({ taskId, withDeleted: true, includeAttachments });

    // if (!task) return res.status(404).json({ message: 'Task not found' });

    return successResponse(res, null, mapTaskDetail(task));
  } catch (error) {
    next(error);
  }
};

export const handleUpdateTask = async (req, res, next) => {
  try {
    const ownerEmail = req.user.email;
    const taskId = req.params.taskId;
    const assigneeUserId = req.assigneeUserId;
    // const projectId = req.taskProjectId;
    const updatedTask = await editTaskService({ userId: req.user.id, taskId, ownerEmail, assigneeUserId, data: req.body });
    return successResponse(res, "success updating task", updatedTask);
  } catch (error) {
    next(error);
  }
};

export const handleStatusUpdateTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;
    const updatedTask = await editTaskService({ userId, taskId, data: req.body, statusUpdate: true });
    return successResponse(res, "task status success changed", updatedTask);
  } catch (error) {
    next(error);
  }
};

export const handleProgressUpdateTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;
    const updatedTask = await editTaskService({ userId, taskId, data: req.body, statusUpdate: true });
    return successResponse(res, "task progress success changed", updatedTask);
  } catch (error) {
    next(error);
  }
};

export const handleSoftDeleteTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;
    const assigneeUserId = req.assigneeUserId;
    const projectId = req.taskProjectId;
    // console.log(id);
    await softDeleteTaskService({ taskId, assigneeUserId, projectId, actorId: userId });
    return successResponse(res, "task success deleted")
  } catch (error) {
    next(error);
  }
};

export const handleRestoreSoftDeletedTask = async (req, res, next) => {
  try {
    // const userId = req.user.id;
    const taskId = req.params.taskId;
    const restoredTask = await restoreSoftDeletedTaskService(taskId);
    return successResponse(res, "success restoring deleted task", restoredTask);
  } catch (error) {
    next(error);
  }
};

// task attachment handling (delete)
export const handleDeleteTaskAttachment = async (req, res, next) => {
  try {
    const { taskId, attachmentId, imageId } = req.params;
    const targetId = attachmentId || imageId;

    if (!targetId) {
      throw new BadRequestError('attachmentId is required');
    }

    await deleteTaskAttachmentService({ taskId, attachmentId: targetId });

    return successResponse(res, "Task attachment deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const handleDeleteTaskImage = handleDeleteTaskAttachment;

export const handleDeleteTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;

    await deleteTaskService({ userId, taskId });
    // res.status(200).send({
    //   message : "task success deleted"
    // });
    return successResponse(res, "task success deleted permanently");
  } catch (error) {
    next(error);
  }
};

export const handleBulkSoftDeleteTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { taskIds } = req.body;

    console.log("masuk handle");

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds must be a non-empty array' });
    }

    const result = await bulkSoftDeleteTasksService(userId, taskIds);

    return successResponse(res, "tasks success deleted", {
      count: result.count
    })
  } catch (error) {
    next(error);
  }
};

export const handleSoftDeleteTasksByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await softDeleteTasksByProjectService(projectId);
    return successResponse(res, `Soft delete tasks for project ${projectId} success`, {
      count: result.count,
    });
  } catch (err) {
    next(err);
  }
};

// controllers/task/task.controller.js
export const handleBulkMarkTasksCompleted = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds must be a non-empty array' });
    }

    // const result = await bulkMarkTasksCompletedService(userId, taskIds);
    // return successResponse(res, "tasks success marked as completed", {
    //   count: result.count
    // })

    //we use this because we want to know what ids success and not success
    const { successIds, failedIds } = await bulkMarkCompletedService(taskIds, userId);

    return successResponse(res, "Bulk update completed", {
      successCount: successIds.length,
      failedCount: failedIds.length,
      successIds,
      failedIds,
    })

  } catch (error) {
    next(error);
  }
};

export const handleGetUserTaskCounts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const counts = await getUserTaskCountsService(userId);
    return res.status(200).json({
      status: "success",
      counts,
    });
  } catch (error) {
    next(error);
  }
};


