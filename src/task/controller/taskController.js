import { is } from 'zod/locales';
import { BadRequestError } from '../../exceptions/errors.js';
import { makeError, successPaginationResponse, successResponse } from '../../utils/response.js';
import { deleteTaskImage } from '../repository/taskRepository.js';
import {
  addTaskService,
  getAllTasksService,
  getTaskByIdService,
  editTaskService,
  deleteTaskService,
  softDeleteTaskService,
  getTaskByIdWithDeletedDataService,
  restoreSoftDeletedTaskService,
  bulkSoftDeleteTasksService,
  bulkMarkCompletedService,
  softDeleteTasksByProjectService,
  assignActiveTaskService,
  addTaskImageService,
  deleteTaskImageService,
  getAllTasksByUserIdService
} from '../service/taskService.js';
import path from 'path';

export const handlePostTask = async (req, res, next) => {
  try {
    const { title, description = "", projectId } = req.body;

    const task = await addTaskService({
      title,
      description,
      projectId,
    });

    return successResponse(res, "task created", {
      taskId: task.id,
      projectId
    }, 201);
  } catch (error) {
    next(error);
  }
};

export const handlePostImageTask = async (req, res, next) => {
  try {
    const taskId = req.params.taskId;
    const { imageTitle } = req.body;

    // console.log(`taskId : ${taskId} | imageTitle : ${imageTitle}`);

    const file = req.file;
    if (!file) {
      return new BadRequestError("Image file is required");
    }

    // Cek MIME type
    const allowedMime = ["image/jpeg", "image/png", "image/webp"];
    const fileMimeType = file.mimetype;

    if (!allowedMime.includes(fileMimeType)) {
      throw new BadRequestError("Invalid file type");
    }

    // Cek ukuran file
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new BadRequestError("File too large (max 2MB)");
    }

    const originalName = file.originalname;
    const fileBuffer = file.buffer;
    const ext = path.extname(originalName);
    // buat key / nama objek di bucket
    const objectKey = `uploads/${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`;

    const taskImage = await addTaskImageService({
      taskId,
      imageTitle,
      fileBuffer,
      objectKey,
      fileMimeType
    });

    return successResponse(res, "task created", taskImage, 201);
  } catch (error) {
    next(error);
  }
};

export const handleAssignActiveTask = async (req, res, next) => {
  const { taskId } = req.params;
  const { memberId } = req.body;
  const asigneeUserId = req.asigneeUserId;
  const projectId = req.taskProjectId;

  console.log(`taskId : ${taskId} - memberId: ${memberId}`);

  try {
    const result = await assignActiveTaskService({ taskId, projectId, asigneeUserId, memberId });
    return successResponse(res, "member has been assigned to task", {
      taskId: result.id,
      memberId: result.asigneeId,
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
     */
    const { status = 'active', projectId, completed, search, sortBy, order } = req.query;
    const userId = req.user.id;

    const limit = parseInt(req.query.limit, 10) || 0;
    const page = parseInt(req.query.page, 10) || 1;

    const filter = {};

    // Validasi sorting
    const validSortFields = ['createdAt', 'title', 'priority', 'completed'];
    const validOrders = ['asc', 'desc'];

    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = validOrders.includes(order) ? order : 'desc';

    if (projectId) {
      filter.projectId = projectId;
    }

    if (completed !== undefined) {
      filter.completed = completed === 'true';
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
      !search &&
      (!sortBy || sortBy === 'createdAt') &&
      (!order || order === 'desc');

    const queryParams = { userId, page, limit, filter, sortBy: sortField, order: sortOrder };
    const { isFromCache, tasks, totalTasks } = await getAllTasksByUserIdService(isSimpleQuery, status, queryParams);
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

export const handleGetTaskById = async (req, res, next) => {
  try {
    //task id
    const taskId = req.params.taskId;
    const task = await getTaskByIdService({ taskId, withDeleted: false });

    // if (!task) return res.status(404).json({ message: 'Task not found' });

    return successResponse(res, null, task);
  } catch (error) {
    next(error);
  }
};

export const handleGetTaskByIdFromAll = async (req, res, next) => {
  try {
    //task id
    const taskId = req.params.taskId;
    const task = await getTaskByIdService({ taskId, withDeleted: true });

    // if (!task) return res.status(404).json({ message: 'Task not found' });

    return successResponse(res, null, task);
  } catch (error) {
    next(error);
  }
};

export const handleUpdateTask = async (req, res, next) => {
  try {
    // const userId = req.user.id;
    const taskId = req.params.taskId;
    const asigneeUserId = req.asigneeUserId;
    // const projectId = req.taskProjectId;
    const updatedTask = await editTaskService({ taskId, asigneeUserId, data: req.body });
    return successResponse(res, "success updating task", updatedTask);
  } catch (error) {
    next(error);
  }
};

export const handleStatusUpdateTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.taskId;
    const updatedTask = await editTaskService({ userId, taskId, data: req.body });
    return successResponse(res, "task status success changed", updatedTask);
  } catch (error) {
    next(error);
  }
};

export const handleSoftDeleteTask = async (req, res, next) => {
  try {
    // const userId = req.user.id;
    const taskId = req.params.taskId;
    const asigneeUserId = req.asigneeUserId;
    const projectId = req.taskProjectId;
    // console.log(id);
    await softDeleteTaskService({ taskId, asigneeUserId, projectId });
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

export const handleDeleteTaskImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;

    if (!imageId) {
      throw new BadRequestError({ message: 'imageId are required' });
    }

    // You should implement deleteTaskImageService in your service layer
    await deleteTaskImageService(imageId);

    return successResponse(res, "Task image deleted successfully");
  } catch (error) {
    next(error);
  }
};

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

