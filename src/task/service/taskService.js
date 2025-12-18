import { ta } from "zod/locales";
import { redis } from "../../config/redis.js";
import { BadRequestError, NotFoundError } from "../../exceptions/errors.js";
import { getProjectMemberByMemberIdService, getProjectMembersService } from "../../project/service/projectService.js";
import { makeError } from "../../utils/response.js";
import { bulkMarkTasksCompleted, bulkSoftDeleteTasks, addTask, deleteTask, findValidTasksByIds, getAllTasks, getTaskById, softDeleteTask, editTask, softDeleteTasksByProjectId, restoreSoftDeletedTasksByProjectId, addTaskImage, getTaskImageById, deleteTaskImage } from "../repository/taskRepository.js";
import StorageService from "../../storage/storageService.js";
import CacheService from "../../cache/cacheService.js";
import { sendEmailMessage } from "../../queue/emailProducer.js";

const storageService = new StorageService();
const redisClient = new CacheService();

export const addTaskService = async (data) => {
  const addedTask = await addTask(data);

  //TODO: invalidate project task
  const cacheGroupKey = `project_cache_group:project:${addedTask.projectId}:tasks`;
  const keys = await redisClient.getCacheGroup(cacheGroupKey);
  if (keys.length) {
    await redisClient.delete(keys); // hapus semua cache project list
    await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
  }

  return addedTask;
};

export const addTaskImageService = async ({ taskId, imageTitle, fileBuffer, objectKey, fileMimeType }) => {
  try {
    // upload to bucket
    const presignedUrlFromBucket = await storageService.writeFile(fileBuffer, objectKey, fileMimeType);
    // add image info to db
    const addImageToDb = await addTaskImage({
      taskId,
      imageTitle,
      objectKey,
      bucketKey: process.env.R2_BUCKET_NAME,
    });
    return {
      taskId,
      projectId: addImageToDb.task.projectId,
      taskTitle: addImageToDb.task.title,
      imageTitle,
      imageUrl: presignedUrlFromBucket,
    }
  } catch (error) {
    throw error;
  }
};

//TODO: if getAllTasksByProjectIdService and getAllTasksByUserIdService have many similar code, refactor it
export const getAllTasksService = async (status, queryParams) => {
  const { tasks, totalTasks } = await getAllTasks(status, queryParams);

  return { tasks, totalTasks };
};

export const getAllTasksByProjectIdService = async ({ isSimpleQuery, status, queryParams }) => {
  const { page, limit } = queryParams;
  const projectId = queryParams.filter.projectId;
  const cacheKey = `tasks:project:${projectId}:tasks:page:${page}:limit:${limit}`;
  const cacheGroupKey = `project_cache_group:project:${projectId}:tasks`;
  if (isSimpleQuery) {
    const cached = await redisClient.get(cacheKey);
    console.log(`isSimpleQuery: ${isSimpleQuery}`);

    if (cached) {
      console.log('🟢 Cache hit:', cacheKey);
      const { tasks, totalTasks } = JSON.parse(cached);
      return { isFromCache: true, tasks, totalTasks };
    }
  }

  const { tasks, totalTasks } = await getAllTasks(status, queryParams);

  if (isSimpleQuery) {
    console.log('🔴 Cache miss:', cacheKey);
    //send to user task cache
    await redisClient.set(cacheKey, JSON.stringify({ tasks, totalTasks }), 60); // Cache for 60 seconds
    //save to cache group
    await redisClient.saveToCacheGroup(cacheGroupKey, cacheKey);
  }

  return { isFromCache: false, tasks, totalTasks };
}

export const getAllTasksByUserIdService = async ({ isSimpleQuery, status, queryParams }) => {
  const { userId, page, limit } = queryParams;
  const cacheKey = `tasks:user:${userId}:page:${page}:limit:${limit}`;
  const cacheGroupKey = `tasks_cache_group:user:${userId}`;
  if (isSimpleQuery) {
    const cached = await redisClient.get(cacheKey);
    console.log(`isSimpleQuery: ${isSimpleQuery}`);

    if (cached) {
      console.log('🟢 Cache hit:', cacheKey);
      const { tasks, totalTasks } = JSON.parse(cached);
      return { isFromCache: true, tasks, totalTasks };
    }
  }

  const { tasks, totalTasks } = await getAllTasks(status, queryParams);

  if (isSimpleQuery) {
    console.log('🔴 Cache miss:', cacheKey);
    //send to user task cache
    await redisClient.set(cacheKey, JSON.stringify({ tasks, totalTasks }), 60); // Cache for 60 seconds
    //save to cache group
    await redisClient.saveToCacheGroup(cacheGroupKey, cacheKey);
  }

  return { isFromCache: false, tasks, totalTasks };

}

export const getTaskByIdService = async ({ taskId, withDeleted }) => {
  const task = await getTaskById(taskId, withDeleted);
  if (!task) throw new NotFoundError('Task not found');
  const { id, assigneeId: picId, taskImages, ...rest } = task;
  const storageService = new StorageService();

  const taskImagesWithUrl = await Promise.all(taskImages.map(async (taskImage) => {
    const imageUrl = await storageService.createPreSignedUrl({
      bucket: taskImage.bucketKey,
      key: taskImage.objectKey,
    });
    return {
      ...taskImage,
      imageUrl
    };
  }));

  return {
    taskId: id,
    picId,
    ...rest,
    taskImages: taskImagesWithUrl
  };
};

export const getTaskByIdWithDeletedDataService = async (userId, id) => {
  const task = await getTaskById(id, true);
  if (!task || task.userId !== userId) throw makeError('Task not found', 400);
  return task;
};

/**
 * assigneeUserId : user id of member assigned to this task (if this task has been assigned)
 * memberId : member id of a user will be assigned to this task
 * @returns 
 */
export const assignActiveTaskService = async ({ taskId, projectId, ownerEmail, assigneeUserId, assigneeEmail, memberId }) => {
  // const taskExisting = await getTaskById(taskId);
  // if (!taskExisting) throw new NotFoundError('Task not found');

  let newAssigneeUsername;
  let newAssigneeEmail;

  const affectedUsers = new Set();
  if (assigneeUserId != null) {
    affectedUsers.add(assigneeUserId);
  }

  // only if it is not assigned to null
  if (memberId != null) {
    // check if memberId is id of member in task's project
    const { userId: newAssigneeUserId, user: { username: _newAssigneeUsername, email: _newAssigneeEmail } } = await getProjectMemberByMemberIdService({ projectId, memberId });

    // if new member is the same as assigned member
    if (assigneeUserId === newAssigneeUserId) {
      return {
        id: taskId,
        assigneeId: memberId,
      }
    }
    if (newAssigneeUserId != null) {
      affectedUsers.add(newAssigneeUserId);
    }
    newAssigneeUsername = _newAssigneeUsername;
    newAssigneeEmail = _newAssigneeEmail;
  }

  const editedTask = await editTask(taskId, {
    assigneeId: memberId
  });

  const { title, description } = editedTask;

  console.log(`${newAssigneeEmail} - ${newAssigneeUsername} - ${assigneeEmail} - ${ownerEmail} `);

  //TODO: email to old assigned user if this task is unassigned from him
  if (assigneeEmail != null) {
    await sendEmailMessage({
      to: assigneeEmail,
      subject: "Task Unassigned",
      text: `
        Task (id : ${taskId}) is unassigned from you.
        title : ${title}
        description : ${description}
      `
    });
  }

  if (memberId != null) {
    //TODO: email to newAssigneeUser if this task assigned to him
    await sendEmailMessage({
      to: newAssigneeEmail,
      subject: "Task Assigned",
      text: `
        Task (id : ${taskId}) is assigned to you.
        title : ${title}
        description : ${description}
      `
    });

    // email to owner if this task is assigned to new user
    await sendEmailMessage({
      to: ownerEmail,
      subject: "Task Assigned",
      text: `
        Task (id : ${taskId}) is assigned to ${newAssigneeUsername}.
        title : ${title}
        description : ${description}
      `
    });
  } else {
    // email to owner if this task is assigned to null
    await sendEmailMessage({
      to: ownerEmail,
      subject: "Task Deassigned",
      text: `
        Task (id : ${taskId}) is de-assigned from ${newAssigneeUsername}.
        title : ${title}
        description : ${description}
      `
    });
  }

  //invalidate user cache for both (assignee or new assignee)
  for (const userId of affectedUsers) {
    const cacheGroupKey = `tasks_cache_group:user:${userId}`;
    const keys = await redisClient.getCacheGroup(cacheGroupKey);
    if (keys.length) {
      await redisClient.delete(keys); // hapus semua cache task list user
      await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
    }
  }

  //TODO: invalidate project task
  const cacheGroupKey = `project_cache_group:project:${projectId}:tasks`;
  const keys = await redisClient.getCacheGroup(cacheGroupKey);
  if (keys.length) {
    await redisClient.delete(keys); // hapus semua cache project list
    await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
  }

  return editedTask;

}

export const editTaskService = async ({ taskId, ownerEmail, assigneeUserId, data }) => {
  // console.log(`ini user id : ${userId}`)
  // console.log(`ini params id : ${id}`)
  // const taskExisting = await getTaskById(taskId, false)
  // const existingUserId = taskExisting.assignee?.userId ?? null;

  const taskEdited = await editTask(taskId, data);

  //invalidate user cache
  if (assigneeUserId) {
    const cacheGroupKey = `tasks_cache_group:user:${assigneeUserId}`;
    const keys = await redisClient.getCacheGroup(cacheGroupKey);
    if (keys.length) {
      await redisClient.delete(keys); // hapus semua cache task list user
      await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
    }
  }

  const { projectId, title, description, assigneeId: picId, completed } = taskEdited;
  const assigneeEmail = taskEdited.assignee?.user?.email ?? null;

  // send email to assignee (if has been assigned)
  if (assigneeEmail) {
    await sendEmailMessage({
      to: assigneeEmail,
      subject: "Task Updated",
      text: `
        Task assigned to you (id : ${taskId}) has been updated.
        title : ${title}
        description : ${description}
      `
    });
  }

  // send email to owner
  await sendEmailMessage({
    to: ownerEmail,
    subject: "Task Updated",
    text: `
        Task owned by you (id : ${taskId}) has been updated.
        title : ${title}
        description : ${description}
      `
  });

  //TODO: invalidate project task
  const cacheGroupKey = `project_cache_group:project:${projectId}:tasks`;
  const keys = await redisClient.getCacheGroup(cacheGroupKey);
  if (keys.length) {
    await redisClient.delete(keys); // hapus semua cache project list
    await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
  }

  return {
    taskId,
    projectId,
    title,
    description,
    picId,
    completed,
  };
};

export const softDeleteTaskService = async ({ taskId, assigneeUserId, projectId }) => {
  const softDeletedTask = await softDeleteTask(taskId);

  //invalidate user cache
  if (assigneeUserId) {
    const cacheGroupKey = `tasks_cache_group:user:${assigneeUserId}`;
    const keys = await redisClient.getCacheGroup(cacheGroupKey);
    if (keys.length) {
      await redisClient.delete(keys); // hapus semua cache task list user
      await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
    }
  }

  //TODO: invalidate project task
  const cacheGroupKey = `project_cache_group:project:${projectId}:tasks`;
  const keys = await redisClient.getCacheGroup(cacheGroupKey);
  if (keys.length) {
    await redisClient.delete(keys); // hapus semua cache project list
    await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
  }

  return softDeletedTask;
};

export const softDeleteTasksByProjectService = async (projectId) => {
  const result = await softDeleteTasksByProjectId(projectId);
  if (result == 0) {
    throw BadRequestError("Failed to delete tasks of this project");
  }
  //TODO : invalidate cache related to assignee of each task
  //TODO : invalidate project task
  return result;
};

export const restoreSoftDeletedTaskService = async (taskId) => {
  // console.log(`ini user id : ${userId}`)
  // console.log(`ini params id : ${id}`)
  const existing = await getTaskById(taskId, true)
  if (!existing) throw new NotFoundError('Task not found');
  if (existing.deletedAt == null) throw new BadRequestError('Task not yet deleted');
  //console.log(`assignee id : ${existing.assigneeId}`);
  const projectMember = await getProjectMemberByMemberIdService({ projectId: existing.projectId, memberId: existing.assigneeId });
  const data = {
    deletedAt: null,
  }
  // if projectMember is not active and task has not been done yet
  //console.log(`isActive : ${projectMember.isActive} | completed : ${existing.completed}`);
  if (!projectMember.isActive && !existing.completed) {
    data.assigneeId = null;
  }
  //console.log(`data: ${data.assigneeId}`);
  const updatedTask = await editTask(taskId, data);

  //invalidate user cache
  if (projectMember.isActive) {
    const cacheGroupKey = `tasks_cache_group:user:${projectMember.userId}`;
    const keys = await redisClient.getCacheGroup(cacheGroupKey);
    if (keys.length) {
      await redisClient.delete(keys); // hapus semua cache task list user
      await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
    }
  }

  //TODO: invalidate project task
  const cacheGroupKey = `project_cache_group:project:${updatedTask.projectId}:tasks`;
  const keys = await redisClient.getCacheGroup(cacheGroupKey);
  if (keys.length) {
    await redisClient.delete(keys); // hapus semua cache project list
    await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
  }

  return updatedTask;
};

export const restoreSoftDeletedTasksByProjectIdService = async ({ userId, projectId }) => {
  const totalTasks = restoreSoftDeletedTasksByProjectId(projectId);
  if (totalTasks == 0) {
    throw BadRequestError("Failed to restore tasks");
  }
  return totalTasks;
}

export const deleteTaskImageService = async (imageId) => {
  const existing = await getTaskImageById(imageId);
  if (!existing) throw new NotFoundError('Image not found');
  const deleteFromBucket = await storageService.deleteFile(existing.objectKey);
  if (!deleteFromBucket.success) {
    throw new BadRequestError('Failed to delete image from storage');
  }
  const deletedImage = await deleteTaskImage(imageId);
  return deletedImage;
}

export const deleteTaskService = async ({ userId, taskId }) => {
  const existing = await getTaskById(taskId, true);
  if (!existing) throw new NotFoundError('Task not found');
  if (existing.deletedAt == null) throw new BadRequestError('Task not yet deleted');
  const deletedTask = await deleteTask(taskId);
  // Invalidate cache: delete cache
  // const deleteOnRedis = await redis.del(
  //   `tasks:${deletedTask.userId}`,
  // );
  // const deleteOnRedis2 = await redis.del(`tasks:${deletedTask.userId}:${deletedTask.projectId}`);
  // console.log(`deleted data on redis : ${deleteOnRedis} - ${deleteOnRedis2}`);
  return deletedTask;
};


/*-------------Bulk Operations----------------*/

export const bulkSoftDeleteTasksService = async (userId, taskIds) => {
  const result = await bulkSoftDeleteTasks(userId, taskIds);

  if (result.count === 0) {
    throw makeError('No tasks were soft deleted', 400);
  }

  return result;
};

// export const bulkMarkTasksCompletedService = async (userId, taskIds) => {
//   const result = await bulkMarkTasksCompleted(userId, taskIds);

//   if (result.count === 0) {
//     throw makeError('No tasks were marked as completed', 400);
//   }

//   return result;
// };

// Mark tasks completed but we check the valid ids before
// Perform bulk update: mark tasks as completed
export const bulkMarkCompletedService = async (taskIds, userId) => {
  // Step 1: Retrieve valid task IDs
  const validTasks = await findValidTasksByIds(taskIds, userId, { completed: false });
  const validIds = validTasks.map(task => task.id);

  if (validIds.length === 0) {
    throw makeError('No valid tasks found to update. Maybe status has been completed', 400);
  }

  // Step 2: Perform bulk update
  await bulkMarkTasksCompleted(userId, validIds);

  // Step 3: Identify failed task IDs (not found or invalid)
  const failedIds = taskIds.filter(id => !validIds.includes(id));

  return {
    successIds: validIds,
    failedIds,
  };
};



