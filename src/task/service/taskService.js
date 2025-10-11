import { ta } from "zod/locales";
import { redis } from "../../config/redis.js";
import { BadRequestError, NotFoundError } from "../../exceptions/errors.js";
import { getProjectMemberByMemberIdService, getProjectMembersService } from "../../project/service/projectService.js";
import { makeError } from "../../utils/response.js";
import { bulkMarkTasksCompleted, bulkSoftDeleteTasks, addTask, deleteTask, findValidTasksByIds, getAllTasks, getTaskById, softDeleteTask, editTask, softDeleteTasksByProjectId, restoreSoftDeletedTasksByProjectId, addTaskImage, getTaskImageById, deleteTaskImage } from "../repository/taskRepository.js";
import StorageService from "../../storage/storageService.js";

const storageService = new StorageService();

export const addTaskService = async (data) => {
  // // Invalidate cache: delete cache
  // const deleteOnRedis = await redis.del(
  //     `tasks:${data.userId}`,
  // );
  // const deleteOnRedis2 = await redis.del(`tasks:${data.userId}:${data.projectId}`);
  // console.log(`deleted data on redis : ${deleteOnRedis} - ${deleteOnRedis2}`);
  return await addTask(data);
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

export const getAllTasksService = async (status, queryParams) => {
  const { tasks, totalTasks } = await getAllTasks(status, queryParams);

  return { tasks, totalTasks };
};

export const getTaskByIdService = async ({ taskId, withDeleted }) => {
  const task = await getTaskById(taskId, withDeleted);
  if (!task) throw new NotFoundError('Task not found');
  const { id, asigneeId: picId, taskImages, ...rest } = task;
  const storageService = new StorageService();
  //TODO: we have to generate url for each task images

  // console.log(taskImages[0]);

  // const forTesting = await storageService.createPreSignedUrl({
  //   bucket: taskImages[0].bucketKey,
  //   key: taskImages[0].objectKey,
  // });

  // console.log(forTesting);

  const taskImagesWithUrl = await Promise.all(taskImages.map(async(taskImage) => {
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
    taskImages : taskImagesWithUrl
  };
};

export const getTaskByIdWithDeletedDataService = async (userId, id) => {
  const task = await getTaskById(id, true);
  if (!task || task.userId !== userId) throw makeError('Task not found', 400);
  return task;
};

export const assignActiveTaskService = async ({ taskId, memberId }) => {
  const task = await getTaskById(taskId);
  if (!task) throw new NotFoundError('Task not found');
  if (memberId) {
    const member = await getProjectMemberByMemberIdService({ projectId: task.projectId, memberId });
  }
  return await editTask(taskId, {
    asigneeId: memberId
  });
}

export const editTaskService = async ({ userId, taskId, data }) => {
  // console.log(`ini user id : ${userId}`)
  // console.log(`ini params id : ${id}`)
  const taskEdited = await editTask(taskId, data);
  // Invalidate cache: delete cache
  //console.log(`tasks:${updatedTask.userId}:${updatedTask.projectId}`);
  // const deleteOnRedis = await redis.del(
  //   `tasks:${updatedTask.userId}`,
  // );
  // const deleteOnRedis2 = await redis.del(`tasks:${updatedTask.userId}:${updatedTask.projectId}`);
  // console.log(`deleted data on redis : ${deleteOnRedis} - ${deleteOnRedis2}`);
  const { projectId, title, description, asigneeId: picId, completed } = taskEdited;
  return {
    taskId,
    projectId,
    title,
    description,
    picId,
    completed,
  };
};

export const softDeleteTaskService = async ({ userId, taskId }) => {
  return await softDeleteTask(taskId);
};

export const softDeleteTasksByProjectService = async (projectId) => {
  const result = await softDeleteTasksByProjectId(projectId);
  if (result == 0) {
    throw BadRequestError("Failed to delete tasks of this project");
  }
  return result;
};

export const restoreSoftDeletedTaskService = async ({ userId, taskId }) => {
  // console.log(`ini user id : ${userId}`)
  // console.log(`ini params id : ${id}`)
  const existing = await getTaskById(taskId, true)
  if (!existing) throw new NotFoundError('Task not found');
  if (existing.deletedAt == null) throw new BadRequestError('Task not yet deleted');
  //console.log(`asignee id : ${existing.asigneeId}`);
  const projectMember = await getProjectMemberByMemberIdService({ projectId: existing.projectId, memberId: existing.asigneeId });
  const data = {
    deletedAt: null,
  }
  // if projectMember is not active and task has not been done yet
  //console.log(`isActive : ${projectMember.isActive} | completed : ${existing.completed}`);
  if (!projectMember.isActive && !existing.completed) {
    data.asigneeId = null;
  }
  //console.log(`data: ${data.asigneeId}`);
  const updatedTask = await editTask(taskId, data);
  return updatedTask;
};

export const restoreSoftDeletedTasksByProjectIdService = async ({ userId, projectId }) => {
  const totalTasks = restoreSoftDeletedTasksByProjectId(projectId);
  if (totalTasks == 0) {
    throw BadRequestError("Failed to restore tasks");
  }
  return totalTasks;
}

export const deleteTaskImageService = async(imageId) => {
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



