import { ForbiddenError, NotFoundError } from '../exceptions/errors.js';
import { getProjectById, getProjectByIdfromAll, getProjectMemberByMemberId, getProjectMemberByUserId } from '../project/repository/projectRepository.js';
import { getTaskById } from '../task/repository/taskRepository.js';

export const checkProjectRole = (allowedRoles = [], all = false) => {
  return async (req, res, next) => {
    const userId = req.user.id;
    // const taskId = req.params?.taskId;
    // let projectIdFromTask = ''
    // if (taskId) {
    //   const task = await getTaskById(taskId);
    //   if (!task) throw new NotFoundError('Task is not found');
    //   projectIdFromTask = task.projectId;
    // }

    const projectId = req.params?.id || req.params?.projectId || req.body?.projectId;
    // || projectIdFromTask;

    console.log(`projectId : ${projectId}`);

    const project = (all) ? await getProjectByIdfromAll(projectId) : await getProjectById(projectId);

    if (!project) return next(new NotFoundError('Project is not found'));

    const member = await getProjectMemberByUserId(projectId, userId);

    if (!member) return next(new ForbiddenError('User is not a member of this project'));

    if(!member.isActive) return next(new ForbiddenError('Inactive member of this project'));

    if (!allowedRoles.includes(member.role)) {
      return next(new ForbiddenError('You are not authorized to perform this action'));
    }

    // // save info role
    // req.projectRole = member.role;

    next();
  };
};

export const checkProjectRoleForTask = (allowedRoles = [], all = false) => {
  return async (req, res, next) => {
    const userId = req.user.id;
    const taskId = req.params?.taskId;

    const withDeleted = (req.params?.status == "all") ? true : false || all;

    const task = await getTaskById(taskId, withDeleted);
    if (!task) throw new NotFoundError('Task is not found');

    const projectId = task.projectId;

    //console.log(`projectId : ${projectId}`);

    const project = await getProjectById(projectId);

    if (!project) return next(new NotFoundError('Project is not found'));

    const member = await getProjectMemberByUserId(projectId, userId);

    if (!member) return next(new ForbiddenError('User is not a member of this project'));

    if (!allowedRoles.includes(member.role)) {
      return next(new ForbiddenError('You are not authorized to perform this action'));
    }

    // save info task
    req.taskProjectId = task.projectId;
    req.asigneeUserId = task.asignee?.userId ?? null;

    // // save info role
    // req.projectRole = member.role;

    next();
  };
};

export const checkProjectRoleForUpdateStatusTask = (allowedRoles = [], all = false) => {
  return async (req, res, next) => {
    const userId = req.user.id;
    const taskId = req.params?.taskId;

    const withDeleted = (req.params?.status == "all") ? true : false || all;

    const task = await getTaskById(taskId, withDeleted);
    if (!task) throw new NotFoundError('Task is not found');

    const projectId = task.projectId;

    //console.log(`projectId : ${projectId}`);

    const project = await getProjectById(projectId);

    if (!project) return next(new NotFoundError('Project is not found'));

    const member = await getProjectMemberByUserId(projectId, userId);

    if (!member) return next(new ForbiddenError('User is not a member of this project'));

    if (!allowedRoles.includes(member.role)) {
      return next(new ForbiddenError('You are not authorized to perform this action'));
    }

    //check if MEMBER is asignee to the task
    if (member.role == "MEMBER" && userId != task.asigneeId) {
      return next(new ForbiddenError('You are not authorized to perform this action'));
    }

    // // save info role
    // req.projectRole = member.role;

    next();
  };
};

