import { Prisma, ProjectRole } from '@prisma/client';
import { addProject, getProjectsByUserId, getProjectById, editProject, deleteProject, addProjectMember, editProjectMemberById, getAllProjectMembers, updateProjectMemberByProjectUserId, softDeleteProject, getProjectByIdfromAll, getProjectMemberByMemberId, getProjectMemberByUserId } from '../repository/projectRepository.js';
import { getUserByIdService, getUserByNameOrUsernameService } from '../../user/service/userService.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../exceptions/errors.js';
import { getAllTasksService, restoreSoftDeletedTasksByProjectIdService, softDeleteTasksByProjectService } from '../../task/service/taskService.js';
import { getUserById } from '../../user/repository/userRepository.js';
import CacheService from '../../../cache/cacheService.js';
import { generateEventId } from '../../../shared/utils/uuid.js';
import publishEvent from '../../../queue/event/eventPublisher.js';

const redisClient = new CacheService();

export const addNewProjectService = async ({ name, userId }) => {
    const project = await addProject({ name, userId });

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
    };
};

export const addProjectMemberService = async ({ projectId, userId }) => {
    //find user 
    const user = await getUserByIdService(userId);
    //get project detail
    const project = await getProjectById(projectId);
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
        return { userId, ...projectMember };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new BadRequestError("Member already exists in this project");
        }
        throw error;
    }
}

export const getProjectMembersService = async (projectId) => {
    const projects = await getAllProjectMembers(projectId);
    // if (!projects) throw new Error('Project not found')
    return projects;
};

export const getProjectMemberByMemberIdService = async ({ projectId, memberId }) => {
    const member = await getProjectMemberByMemberId(projectId, memberId);
    if (!member) throw new NotFoundError('Member not found in this project')
    return member;
}

export const updateActiveProjectMemberService = async ({ projectId, memberId, isActive }) => {
    //console.log(`projectId : ${projectId} || userId : ${userId} || isActive : ${isActive}`);

    //check existing member
    const member = await getProjectMemberByMemberId(projectId, memberId);
    if (!member) throw new NotFoundError('Member not found in this project');

    //check existing member task in this project
    //if to deactivate member, we must ensure all tasks undone assigned to that member are assigned to another or null
    if (!isActive) {
        const filter = {
            completed: false,
            assigneeId: memberId,
            projectId
        };

        const { totalTasks } = await getAllTasksService('active', { page: 1, limit: 0, filter });
        if (totalTasks > 0) {
            throw new BadRequestError('there are active tasks assigned to this member still undone. change it to done if task is finished. otherwise, assigned to another or null');
        }
    }

    const cacheGroupKey = `tasks_cache_group:user:${member.userId}`;
    const keys = await redisClient.getCacheGroup(cacheGroupKey);
    if (keys.length) {
        await redisClient.delete(keys); // hapus semua cache task list user
        await redisClient.delete(cacheGroupKey); // bersihkan set-nya juga
    }

    //update status
    const { id, ...rest } = await editProjectMemberById(memberId, { isActive });

    return {
        memberId: id,
        ...rest
    };
}

export const getAllUserProjectsService = async (status, queryParams) => {
    // const checkUser = await getUserById(userId);
    // if (!checkUser) throw new NotFoundError("User with this user id is not found");

    const { projects, totalProjects } = await getProjectsByUserId(status, queryParams);
    return { projects, totalProjects };
};

export const getAllUserProjectsFromAllService = async (userId) => {
    const checkUser = await getUserById(userId);
    if (!checkUser) throw new NotFoundError("User with this user id is not found");

    const projects = await getProjectsByUserId(userId, true);
    return projects;
};


export const getProjectByIdService = async ({ projectId, userId }) => {
    const project = await getProjectById(projectId)
    if (!project) throw new NotFoundError('Project not found')
    if (project.owner !== userId) throw new ForbiddenError("You are not a member of this project")
    return project
}

export const getProjectByIdFromAllService = async ({ projectId, userId }) => {
    const project = await getProjectByIdfromAll(projectId)
    if (!project) throw new NotFoundError('Project not found')
    if (project.owner !== userId) throw new ForbiddenError("You are not a member of this project")
    return project
}

export const editProjectService = async ({ userId, projectId, data }) => {
    const project = await getProjectById(projectId)
    if (!project) throw new NotFoundError('Project not found')
    if (project.owner !== userId) throw new ForbiddenError("You are not a member of this project")
    const { id, name } = await editProject(projectId, data)
    return ({ projectId: id, name })
}

export const softDeleteProjectService = async ({ userId, projectId }) => {
    // const project = await getProjectById(projectId)
    // if (!project) throw new NotFoundError('Project not found')
    // if (project.owner !== userId) throw new ForbiddenError("You are not a member of this project")

    // soft delete all tasks in this project
    await softDeleteTasksByProjectService(projectId);
    const softDeletedProject = await softDeleteProject(projectId);

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

//TODO: make restoreSoftDeletedProject -> tasks related to it must be restored too
export const restoreSoftDeletedProjectService = async ({ userId, projectId }) => {
    // restore related tasks
    await restoreSoftDeletedTasksByProjectIdService(projectId);
    // restore project
    const res = await editProject(projectId, {
        deletedAt: null
    });
    return res
}


export const deleteProjectService = async ({ userId, projectId }) => {
    const project = await getProjectByIdfromAll(projectId)
    if (!project) throw new NotFoundError('Project not found')
    if (project.owner !== userId) throw new ForbiddenError("You are not a member of this project")
    if (project.deletedAt === null) throw new BadRequestError("You can only delete a project that has been soft deleted")
    await deleteProject(projectId)
}
