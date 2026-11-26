import { Prisma, ProjectRole } from '@prisma/client';
import { addProject, getProjectsByUserId, getProjectById, editProject, deleteProject, addProjectMember, editProjectMemberById, getAllProjectMembers, updateProjectMemberByProjectUserId, getProjectByIdfromAll, getProjectMemberByMemberId, getProjectMemberByUserId, getProjectsByIds, updateProjectLastActivity, archiveProjectWithTasks, unarchiveProjectWithTasks, softDeleteProjectWithTasks, restoreProjectWithTasks, deactivateProjectMemberAndReleaseAssignments } from '../repository/projectRepository.js';
import { getUserByIdService, getUserByNameOrUsernameService } from '../../user/service/userService.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../exceptions/errors.js';
import { getAllTasksService, getTaskStatisticsByProjectIdService } from '../../task/service/taskService.js';
import { getProjectAssigneeUserIds, getTaskStatusCountsByAssignee } from '../../task/repository/taskRepository.js';
import { assertProjectMutable } from '../../../shared/utils/lifecycle.js';
import { getUserById } from '../../user/repository/userRepository.js';
import CacheService from '../../../cache/cacheService.js';
import { generateEventId } from '../../../shared/utils/uuid.js';
import { sanitizeDescription } from '../../../shared/utils/sanitizeHtml.js';
import publishEvent from '../../../queue/event/eventPublisher.js';
import StorageService from '../../../storage/storageService.js';

const redisClient = new CacheService();
const storageService = new StorageService();

const invalidateProjectTaskCache = async (projectId) => {
    const cacheGroupKey = `project_cache_group:project:${projectId}:tasks`;
    const keys = await redisClient.getCacheGroup(cacheGroupKey);
    if (keys.length) {
        await redisClient.delete(keys);
        await redisClient.delete(cacheGroupKey);
    }
};

const invalidateUserTaskCaches = async (userIds = []) => {
    for (const userId of new Set(userIds.filter(Boolean))) {
        const cacheGroupKey = `tasks_cache_group:user:${userId}`;
        const keys = await redisClient.getCacheGroup(cacheGroupKey);
        if (keys.length) {
            await redisClient.delete(keys);
            await redisClient.delete(cacheGroupKey);
        }
    }
};

// Project archive/unarchive cascades must produce task audit logs without task notifications.
const publishProjectCascadeTaskEvents = async ({ userId, project, tasks, type }) => {
    for (const task of tasks) {
        await publishEvent({
            id: 'event-' + generateEventId(),
            type,
            actorId: userId,
            occurredAt: new Date().toISOString(),
            payload: {
                taskId: task.id,
                taskTitle: task.title,
                projectId: task.projectId,
                projectName: project.name,
                assignedUserId: task.assignee?.userId ?? null,
                ownerId: project.owner,
                archiveSource: 'PROJECT',
                cascade: true,
                auditOnly: true,
            },
        });
    }
};

export const addNewProjectService = async ({ name, userId, description }) => {
    const project = await addProject({ name, userId, description: sanitizeDescription(description) });

    //insert creator as leader in project's member
    const projectMember = await addProjectMember({
        projectId: project.id,
        userId,
        role: ProjectRole.LEADER,
        joinedAt: new Date(),
    });

    //publish project.created event to queue
    await publishEvent({
        id: 'event-' + generateEventId(),
        type: 'project.created',
        actorId: userId,
        occurredAt: new Date().toISOString(),
        payload: {
            projectId: project.id,
            projectName: project.name,
        }
    });

    return {
        projectId: project.id,
        name: project.name,
        description: project.description,
    };
};

export const addProjectMemberService = async ({ projectId, userId }) => {
    //find user 
    const user = await getUserByIdService(userId);
    //get project detail
    const project = await getProjectById(projectId);
    assertProjectMutable(project);
    //add project member
    try {
        const projectMember = await addProjectMember({
            projectId,
            userId,
            role: ProjectRole.MEMBER,
            joinedAt: new Date(),
        })

        //publish project.member.added event to queue
        await publishEvent({
            id: 'event-' + generateEventId(),
            type: 'project.member.added',
            actorId: project.owner,
            occurredAt: new Date().toISOString(),
            payload: {
                projectId,
                projectName: project.name,
                memberUserId: userId,
            }
        });
        await updateProjectLastActivity(projectId);
        return { userId, ...projectMember };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new BadRequestError("Member already exists in this project");
        }
        throw error;
    }
}

export const getProjectMembersService = async (projectId) => {
    const members = await getAllProjectMembers(projectId);
    const membersWithPhoto = await Promise.all(
        members.map(async (member) => {
            let photoProfile = null;
            if (member.profilePicture) {
                photoProfile = await storageService.createPreSignedUrl({
                    bucket: process.env.R2_BUCKET_NAME,
                    key: member.profilePicture,
                });
            }
            return {
                ...member,
                photoProfile
            }
        }))
    // if (!projects) throw new Error('Project not found')
    return membersWithPhoto;
};

export const getProjectMemberByMemberIdService = async ({ projectId, memberId }) => {
    const member = await getProjectMemberByMemberId(projectId, memberId);
    if (!member) throw new NotFoundError('Member not found in this project')
    return member;
}

export const getMemberTaskSummaryService = async ({ projectId, memberId }) => {
    const member = await getProjectMemberByMemberId(projectId, memberId);
    if (!member) throw new NotFoundError('Member not found in this project');

    const counts = await getTaskStatusCountsByAssignee(projectId, memberId);
    const todo = counts.TODO ?? 0;
    const inProgress = counts.IN_PROGRESS ?? 0;
    const done = counts.DONE ?? 0;

    return {
        memberId,
        projectId,
        unfinishedTasks: {
            total: todo + inProgress,
            todo,
            inProgress,
        },
        completedTasks: {
            total: done,
        },
    };
};

export const updateMemberActiveStatusService = async ({ projectId, memberId, isActive, actorUserId }) => {
    const project = await getProjectById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    assertProjectMutable(project);

    //check existing member
    const member = await getProjectMemberByMemberId(projectId, memberId);
    if (!member) throw new NotFoundError('Member not found in this project');

    const cacheGroupKey = `tasks_cache_group:user:${member.userId}`;
    const keys = await redisClient.getCacheGroup(cacheGroupKey);
    if (keys.length) {
        await redisClient.delete(keys); // hapus semua cache task list user
        await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
    }
    await invalidateProjectTaskCache(projectId);

    let updatedMember;
    let releasedTaskCount = 0;
    if (!isActive) {
        const result = await deactivateProjectMemberAndReleaseAssignments(projectId, memberId);
        updatedMember = result.member;
        releasedTaskCount = result.releasedTaskCount;
    } else {
        updatedMember = await editProjectMemberById(memberId, { isActive });
    }

    await updateProjectLastActivity(projectId);

    //publish project.member.deactivated / project.member.reactivated event to queue
    await publishEvent({
        id: 'event-' + generateEventId(),
        type: isActive ? 'project.member.reactivated' : 'project.member.deactivated',
        actorId: actorUserId ?? project.owner,
        occurredAt: new Date().toISOString(),
        payload: {
            projectId,
            projectName: project.name,
            memberUserId: updatedMember.userId,
            releasedTaskCount,
        }
    });

    const { id, ...rest } = updatedMember;
    return {
        memberId: id,
        ...rest,
        releasedTaskCount
    };
}

export const updateActiveProjectMemberService = async ({ projectId, memberId, isActive, actorUserId }) => {
    const project = await getProjectById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    if (project.owner !== actorUserId) {
        throw new ForbiddenError('Only the project owner can update member status');
    }

    const member = await getProjectMemberByMemberId(projectId, memberId);
    if (!member) throw new NotFoundError('Member not found in this project');

    if (member.userId === actorUserId) {
        throw new ForbiddenError('You cannot change your own active status; transfer ownership first');
    }

    return updateMemberActiveStatusService({ projectId, memberId, isActive, actorUserId });
}

export const getAllUserProjectsService = async (status, queryParams) => {
    // const checkUser = await getUserById(userId);
    // if (!checkUser) throw new NotFoundError("User with this user id is not found");

    const { projects, totalProjects } = await getProjectsByUserId(status, queryParams);
    return { projects, totalProjects };
};

// TODO: Review this function because seems no more purpose
// export const getAllUserProjectsFromAllService = async (userId) => {
//     const checkUser = await getUserById(userId);
//     if (!checkUser) throw new NotFoundError("User with this user id is not found");

//     const projects = await getProjectsByUserId(userId, true);
//     return projects;
// };


export const getProjectByIdService = async ({ projectId, userId }) => {
    const project = await getProjectById(projectId)
    if (!project) throw new NotFoundError('Project not found')
    // check if this user is member or not -> this function is preserved because caller routes not necessarily use middleware
    const checkMember = await getProjectMemberByUserId(projectId, userId);
    if (!checkMember) throw new ForbiddenError("You are not a member of this project")
    return project
}

export const getProjectByIdFromAllService = async ({ projectId, userId }) => {
    const project = await getProjectByIdfromAll(projectId)
    if (!project) throw new NotFoundError('Project not found')
    // check if this user is owner(leader) or not -> this is preserved because caller routes not necessarily use middleware
    if (project.owner !== userId) throw new ForbiddenError("You are not owner of this project")
    return project
}

// bulk operation for getting projects by ids
export const getProjectsByIdsService = async ({ projectIds, withDeleted = false }) => {
    const project = await getProjectsByIds(projectIds, withDeleted)
    if (!project) throw new NotFoundError('Project not found')
    return project
}

export const editProjectService = async ({ userId, projectId, data }) => {
    const project = await getProjectById(projectId)
    if (!project) throw new NotFoundError('Project not found')
    assertProjectMutable(project)
    if (project.owner !== userId) throw new ForbiddenError("You are not a member of this project")

    const sanitizedData = data.description !== undefined
        ? { ...data, description: sanitizeDescription(data.description) }
        : data;
    const { id, name } = await editProject(projectId, sanitizedData)

    //publish project.updated event to queue
    await publishEvent({
        id: 'event-' + generateEventId(),
        type: 'project.updated',
        actorId: userId,
        occurredAt: new Date().toISOString(),
        payload: {
            projectId: id,
            projectName: name,
        }
    });

    return ({ projectId: id, name })
}

export const archiveProjectService = async ({ userId, projectId }) => {
    const project = await getProjectByIdfromAll(projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (project.owner !== userId) throw new ForbiddenError("You are not owner of this project");
    if (project.deletedAt) throw new NotFoundError('PROJECT_DELETED: project not found');
    if (project.archivedAt) throw new BadRequestError('PROJECT_ALREADY_ARCHIVED');

    const assigneeUserIds = await getProjectAssigneeUserIds(projectId);
    const { project: archivedProject, affectedTasks } = await archiveProjectWithTasks(projectId);

    await invalidateProjectTaskCache(projectId);
    await invalidateUserTaskCaches(assigneeUserIds);

    //publish project.archived event to queue
    await publishEvent({
        id: 'event-' + generateEventId(),
        type: 'project.archived',
        actorId: userId,
        occurredAt: new Date().toISOString(),
        payload: {
            projectId: archivedProject.id,
            projectName: archivedProject.name,
            archivedTaskCount: affectedTasks.length,
        }
    });

    // Audit-only task events for tasks archived by the project cascade.
    await publishProjectCascadeTaskEvents({
        userId,
        project: archivedProject,
        tasks: affectedTasks,
        type: 'task.archived.by_project',
    });

    return {
        projectId: archivedProject.id,
        archivedAt: archivedProject.archivedAt,
    };
};

export const unarchiveProjectService = async ({ userId, projectId }) => {
    const project = await getProjectByIdfromAll(projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (project.owner !== userId) throw new ForbiddenError("You are not owner of this project");
    if (project.deletedAt) throw new NotFoundError('PROJECT_DELETED: project not found');
    if (!project.archivedAt) throw new BadRequestError('PROJECT_NOT_ARCHIVED');

    const assigneeUserIds = await getProjectAssigneeUserIds(projectId);
    const { project: unarchivedProject, affectedTasks } = await unarchiveProjectWithTasks(projectId);

    await invalidateProjectTaskCache(projectId);
    await invalidateUserTaskCaches(assigneeUserIds);

    //publish project.unarchived event to queue
    await publishEvent({
        id: 'event-' + generateEventId(),
        type: 'project.unarchived',
        actorId: userId,
        occurredAt: new Date().toISOString(),
        payload: {
            projectId: unarchivedProject.id,
            projectName: unarchivedProject.name,
            unarchivedTaskCount: affectedTasks.length,
        }
    });

    // Audit-only task events for tasks unarchived by the project cascade.
    await publishProjectCascadeTaskEvents({
        userId,
        project: unarchivedProject,
        tasks: affectedTasks,
        type: 'task.unarchived.by_project',
    });

    return {
        projectId: unarchivedProject.id,
        archivedAt: unarchivedProject.archivedAt,
    };
};

export const softDeleteProjectService = async ({ userId, projectId }) => {
    const project = await getProjectByIdfromAll(projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (project.owner !== userId) throw new ForbiddenError("You are not owner of this project");
    if (project.deletedAt) throw new BadRequestError('PROJECT_ALREADY_DELETED');

    const assigneeUserIds = await getProjectAssigneeUserIds(projectId);
    const softDeletedProject = await softDeleteProjectWithTasks(projectId);

    await invalidateProjectTaskCache(projectId);
    await invalidateUserTaskCaches(assigneeUserIds);

    //publish project.deleted event to queue
    await publishEvent({
        id: 'event-' + generateEventId(),
        type: 'project.deleted',
        actorId: userId,
        occurredAt: new Date().toISOString(),
        payload: {
            projectId: softDeletedProject.id,
            projectName: softDeletedProject.name,
        }
    });
    return softDeletedProject
}

export const restoreSoftDeletedProjectService = async ({ userId, projectId }) => {
    const project = await getProjectByIdfromAll(projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (project.owner !== userId) throw new ForbiddenError("You are not owner of this project");
    if (!project.deletedAt) throw new BadRequestError('Project is not deleted');

    const assigneeUserIds = await getProjectAssigneeUserIds(projectId);
    const res = await restoreProjectWithTasks(projectId);

    await invalidateProjectTaskCache(projectId);
    await invalidateUserTaskCaches(assigneeUserIds);

    //publish project.restored event to queue
    await publishEvent({
        id: 'event-' + generateEventId(),
        type: 'project.restored',
        actorId: userId,
        occurredAt: new Date().toISOString(),
        payload: {
            projectId: res.id,
            projectName: res.name,
        }
    });

    return res
}


export const deleteProjectService = async ({ userId, projectId }) => {
    const project = await getProjectByIdfromAll(projectId)
    if (!project) throw new NotFoundError('Project not found')
    if (project.owner !== userId) throw new ForbiddenError("You are not owner of this project")
    if (project.deletedAt === null) throw new BadRequestError("You can only delete a project that has been soft deleted")
    await deleteProject(projectId)

    //publish project.permanent.deleted event to queue
    await publishEvent({
        id: 'event-' + generateEventId(),
        type: 'project.permanent.deleted',
        actorId: userId,
        occurredAt: new Date().toISOString(),
        payload: {
            projectId: project.projectId,
            projectName: project.name,
        }
    });
}

export const getProjectStatisticsService = async (projectId) => {
    const project = await getProjectById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    // An archived project is read-only, so its statistics describe all non-deleted
    // tasks. An active project's statistics describe active (non-archived) work.
    const statistics = await getTaskStatisticsByProjectIdService(projectId, {
        includeArchived: Boolean(project.archivedAt),
    });
    return statistics;
};

export const getRecentProjectTasksService = async (projectId, limit) => {
    const project = await getProjectById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    const queryParams = {
        page: 1,
        limit,
        filter: { projectId },
        sortBy: 'updatedAt',
        order: 'desc'
    };

    const { tasks } = await getAllTasksService('active', queryParams);
    return tasks;
};

export const updateProjectLastActivityService = async (projectId) => {
    return await updateProjectLastActivity(projectId);
};
