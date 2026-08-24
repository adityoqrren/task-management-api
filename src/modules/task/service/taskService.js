// import { ta } from "zod/locales";
// import { redis } from "../../config/redis.js";
import prisma from "../../../db/db.js";
import { BadRequestError, NotFoundError } from "../../../exceptions/errors.js";
import { getProjectMemberByMemberIdService, getProjectMembersService, updateProjectLastActivityService } from "../../project/service/projectService.js";
import { makeError } from "../../../shared/utils/response.js";
import { bulkMarkTasksCompleted, bulkSoftDeleteTasks, addTask, deleteTask, findValidTasksByIds, getAllTasks, getTaskById, softDeleteTask, editTask, softDeleteTasksByProjectId, restoreSoftDeletedTasksByProjectId, addTaskAttachment, addTaskImage, getTaskAttachmentById, getTaskImageById, getTaskAttachmentsByTaskId, deleteTaskAttachment, deleteTaskImage, getTasksByIds, getTaskStatisticsByProjectId, getUserTaskCounts } from "../repository/taskRepository.js";
import StorageService from "../../../storage/storageService.js";
import CacheService from "../../../cache/cacheService.js";
import { sendEmailMessage } from "../../../queue/emailProducer.js";
import publishEvent from "../../../queue/event/eventPublisher.js";
import { generateEventId } from "../../../shared/utils/uuid.js";

const storageService = new StorageService();
const redisClient = new CacheService();

export const addTaskService = async (userId, data) => {
  if (data.status) {
    if (data.status === 'DONE') {
      data.completed = true;
    } else {
      data.completed = false;
    }
  }
  if (data.priority) {
    data.priority = data.priority.toUpperCase();
  } else {
    data.priority = 'MEDIUM';
  }
  const addedTask = await addTask(data);

  //TODO: invalidate project task
  const cacheGroupKey = `project_cache_group:project:${addedTask.projectId}:tasks`;
  const keys = await redisClient.getCacheGroup(cacheGroupKey);
  if (keys.length) {
    await redisClient.delete(keys); // hapus semua cache project list
    await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
  }

  //publish task.created event to queue
  await publishEvent({
    id: 'event-' + generateEventId(),
    type: 'task.created',
    actorId: userId,
    occurredAt: new Date().toISOString(),
    payload: {
      taskId: addedTask.id,
      taskTitle: addedTask.title,
      projectId: addedTask.projectId,
      projectName: addedTask.project?.name ?? null,
    },
  });

  await updateProjectLastActivityService(addedTask.projectId);
  return addedTask;
};

export const addTaskAttachmentService = async ({ taskId, userId, fileName, fileBuffer, objectKey, fileMimeType, size }) => {
  // upload to bucket
  const presignedUrlFromBucket = await storageService.writeFile(fileBuffer, objectKey, fileMimeType);
  // add attachment info to db
  const attachment = await addTaskAttachment({
    taskId,
    userId,
    fileName,
    bucketKey: process.env.R2_BUCKET_NAME,
    objectKey,
    mimeType: fileMimeType,
    size,
  });
  await updateProjectLastActivityService(attachment.task.projectId);
  return {
    id: attachment.id,
    taskId,
    userId,
    projectId: attachment.task.projectId,
    taskTitle: attachment.task.title,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    fileUrl: presignedUrlFromBucket,
    createdAt: attachment.createdAt,
    updatedAt: attachment.updatedAt,
  };
};

export const addTaskImageService = addTaskAttachmentService;

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

export const getTaskByIdService = async ({ taskId, withDeleted, includeAttachments = false }) => {
  const task = await getTaskById(taskId, withDeleted, includeAttachments);
  if (!task) throw new NotFoundError('Task not found');

  if (includeAttachments && task.taskAttachments) {
    const storageService = new StorageService();
    const taskAttachmentsWithUrl = await Promise.all(task.taskAttachments.map(async (attachment) => {
      const { bucketKey, objectKey, ...attachmentDetail } = attachment;
      const fileUrl = await storageService.createPreSignedUrl({
        bucket: bucketKey,
        key: objectKey,
      });
      return {
        ...attachmentDetail,
        fileUrl,
      };
    }));

    const { taskAttachments, ...taskDetail } = task;
    return {
      ...taskDetail,
      taskAttachments: taskAttachmentsWithUrl,
    };
  }

  const { taskAttachments, ...taskDetail } = task;
  return taskDetail;
};

export const getTaskAttachmentsService = async ({ taskId, type = 'all' }) => {
  const task = await getTaskById(taskId, false);
  if (!task) throw new NotFoundError('Task not found');

  const attachments = await getTaskAttachmentsByTaskId(taskId, type);
  const attachmentsWithUrl = await Promise.all(attachments.map(async (attachment) => {
    const { bucketKey, objectKey, ...detail } = attachment;
    const fileUrl = await storageService.createPreSignedUrl({
      bucket: bucketKey,
      key: objectKey,
    });
    return {
      ...detail,
      fileUrl,
    };
  }));

  return attachmentsWithUrl;
};

export const getTasksByIdsService = async ({ taskIds, withDeleted }) => {
  return await getTasksByIds(taskIds, withDeleted);
}

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

    //publish task.assigned event to queue
    await publishEvent({
      id: 'event-' + generateEventId(),
      type: 'task.assigned',
      actorId: editedTask.project.owner,
      occurredAt: new Date().toISOString(),
      payload: {
        taskId: editedTask.id,
        taskTitle: editedTask.title,
        projectId: editedTask.projectId,
        projectName: editedTask.project.name,
        assignedUserId: editedTask.assignee.userId,
      }
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

  await updateProjectLastActivityService(projectId);
  return editedTask;

}

export const editTaskService = async ({ userId, taskId, ownerEmail, assigneeUserId, data, statusUpdate = false }) => {
  console.log(`ini user id : ${userId}`)
  // console.log(`ini params id : ${id}`)
  // const taskExisting = await getTaskById(taskId, false)
  // const existingUserId = taskExisting.assignee?.userId ?? null;

  if (data.priority) {
    data.priority = data.priority.toUpperCase();
  }

  if (data.status) {
    if (data.status === 'DONE') {
      data.completed = true;
    } else {
      data.completed = false;
    }
  } else if (data.completed !== undefined) {
    if (data.completed) {
      data.status = 'DONE';
    } else {
      data.status = 'TODO';
    }
  }

  const editedTask = await editTask(taskId, data);

  console.log(`ini member id assignee : ${editedTask.assigneeId}`);

  //invalidate user cache
  if (assigneeUserId) {
    const cacheGroupKey = `tasks_cache_group:user:${assigneeUserId}`;
    const keys = await redisClient.getCacheGroup(cacheGroupKey);
    if (keys.length) {
      await redisClient.delete(keys); // hapus semua cache task list user
      await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
    }
  }

  const { projectId, title, description, assigneeId: picId, completed, status, priority, startDate, dueDate } = editedTask;
  const assigneeEmail = editedTask.assignee?.user?.email ?? null;

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

  const isNewlyCompleted = (statusUpdate && editedTask.completed) || (data.status === 'DONE' && editedTask.completed);
  if (isNewlyCompleted) {
    //publish task.completed event to queue
    await publishEvent({
      id: 'event-' + generateEventId(),
      type: 'task.completed',
      actorId: userId,
      occurredAt: new Date().toISOString(),
      payload: {
        taskId: editedTask.id,
        taskTitle: editedTask.title,
        projectId: editedTask.projectId,
        projectName: editedTask.project.name,
        assignedUserId: editedTask.assignee?.userId ?? null,
        ownerId: editedTask.project.owner,
      },
    });
  } else {
    //publish task.updated event to queue
    await publishEvent({
      id: 'event-' + generateEventId(),
      type: 'task.updated',
      actorId: editedTask.project.owner,
      occurredAt: new Date().toISOString(),
      payload: {
        taskId: editedTask.id,
        taskTitle: editedTask.title,
        projectId: editedTask.projectId,
        projectName: editedTask.project.name,
        assignedUserId: editedTask.assignee?.userId ?? null,
        ownerId: editedTask.project.owner,
      },
    });

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
  }

  //TODO: invalidate project task
  const cacheGroupKey = `project_cache_group:project:${projectId}:tasks`;
  const keys = await redisClient.getCacheGroup(cacheGroupKey);
  if (keys.length) {
    await redisClient.delete(keys); // hapus semua cache project list
    await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
  }

  await updateProjectLastActivityService(projectId);
  return {
    taskId,
    projectId,
    title,
    description,
    picId,
    completed,
    status,
    priority,
    startDate,
    dueDate,
  };
};

export const softDeleteTaskService = async ({ taskId, assigneeUserId, projectId, actorId }) => {
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

  //publish task.deleted event to queue
  await publishEvent({
    id: 'event-' + generateEventId(),
    type: 'task.deleted',
    actorId,
    occurredAt: new Date().toISOString(),
    payload: {
      taskId: softDeletedTask.id,
      taskTitle: softDeletedTask.title,
      projectId: softDeletedTask.projectId,
      projectName: softDeletedTask.project?.name ?? null,
    },
  });

  await updateProjectLastActivityService(projectId);
  return softDeletedTask;
};

export const softDeleteTasksByProjectService = async (projectId, tx) => {
  const result = await softDeleteTasksByProjectId(projectId, tx);
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
  // console.log(`here in restoreSoftDeletedTaskService ${taskId}`);
  const existing = await getTaskById(taskId, true)
  if (!existing) throw new NotFoundError('Task not found');
  if (existing.deletedAt == null) throw new BadRequestError('Task not yet deleted');
  //console.log(`assignee id : ${existing.assigneeId}`);

  let projectMember = null;
  const data = {
    deletedAt: null,
  }

  //if task has been assigned
  if (existing.assigneeId) {
    projectMember = await getProjectMemberByMemberIdService({ projectId: existing.projectId, memberId: existing.assigneeId });
    // if projectMember is null (member has exited) or member not active and task has not been done yet
    //console.log(`isActive : ${projectMember.isActive} | completed : ${existing.completed}`);
    if (!projectMember || (!projectMember.isActive && !existing.completed)) {
      data.assigneeId = null;
    }
  }

  //console.log(`data: ${data.assigneeId}`);
  const updatedTask = await editTask(taskId, data);

  //publish event task.restored
  await publishEvent({
    id: 'event-' + generateEventId(),
    type: 'task.restored',
    actorId: updatedTask.project.owner,
    occurredAt: new Date().toISOString(),
    payload: {
      taskId: updatedTask.id,
      taskTitle: updatedTask.title,
      projectId: updatedTask.projectId,
      projectName: updatedTask.project.name,
      assignedUserId: updatedTask.assignee?.userId ?? null,
      ownerId: updatedTask.project.owner,
    },
  });

  //invalidate user cache
  if (projectMember) {
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

  await updateProjectLastActivityService(updatedTask.projectId);
  return updatedTask;
};

export const restoreSoftDeletedTasksByProjectIdService = async ({ projectId }, tx) => {
  const totalTasks = await restoreSoftDeletedTasksByProjectId(projectId, tx);
  if (totalTasks == 0) {
    throw BadRequestError("Failed to restore tasks");
  }
  return totalTasks;
}

export const deleteTaskAttachmentService = async ({ taskId, attachmentId }) => {
  const existing = await getTaskAttachmentById(taskId, attachmentId);
  if (!existing) throw new NotFoundError('Attachment not found');
  const deleteFromBucket = await storageService.deleteFile(existing.objectKey);
  if (!deleteFromBucket.success) {
    throw new BadRequestError('Failed to delete file from storage');
  }
  const deletedAttachment = await deleteTaskAttachment(attachmentId);
  await updateProjectLastActivityService(existing.task.projectId);
  return deletedAttachment;
};

export const deleteTaskImageService = async ({ taskId, imageId }) => {
  return await deleteTaskAttachmentService({ taskId, attachmentId: imageId });
};

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
  //publish task.permanent.deleted event to queue
  await publishEvent({
    id: 'event-' + generateEventId(),
    type: 'task.permanent.deleted',
    actorId: userId,
    occurredAt: new Date().toISOString(),
    payload: {
      taskId: deletedTask.id,
      taskTitle: deletedTask.title,
      projectId: deletedTask.projectId,
      projectName: existing.project.name,
    },
  });
  await updateProjectLastActivityService(deletedTask.projectId);
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
  const { validIds } = await prisma.$transaction(async (tx) => {
    // Step 1: Retrieve valid task IDs
    const validTasks = await findValidTasksByIds(taskIds, userId, { completed: false }, tx);
    const validIds = validTasks.map(task => task.id);

    if (validIds.length === 0) {
      throw makeError('No valid tasks found to update. Maybe status has been completed', 400);
    }

    // Step 2: Perform bulk update
    await bulkMarkTasksCompleted(userId, validIds, tx);

    const projectIds = [...new Set(validTasks.map(t => t.projectId))];

    // lastActivity touch joins the transaction
    for (const pId of projectIds) {
      await updateProjectLastActivityService(pId, tx);
    }

    return { validIds };
  });

  // Step 3: Identify failed task IDs (not found or invalid)
  const failedIds = taskIds.filter(id => !validIds.includes(id));

  return {
    successIds: validIds,
    failedIds,
  };
};

export const getTaskStatisticsByProjectIdService = async (projectId) => {
  return await getTaskStatisticsByProjectId(projectId);
};

export const getUserTaskCountsService = async (userId) => {
  return await getUserTaskCounts(userId);
};




