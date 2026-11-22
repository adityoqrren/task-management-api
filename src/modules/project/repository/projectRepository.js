import prisma from "../../../db/db.js";

//Manage project
export const addProject = async (projectData) => {
    return await prisma.projects.create({
        data: {
            name: projectData.name,
            owner: projectData.userId,
            description: projectData.description
        }
    });
};

const buildProjectLifecycleFilter = (status) => {
    if (status === 'all') return {};
    if (status === 'archived') return { deletedAt: null, archivedAt: { not: null } };
    if (status === 'deleted') return { NOT: { deletedAt: null } };
    return { deletedAt: null, archivedAt: null };
};

export const getProjectsByUserId = async (status, { userId, page, limit, filter = {}, sortBy, order }) => {
    const skip = (page - 1) * limit;

    const { search, ...restFilter } = filter;

    const where = {
        ...restFilter,
        userId,
        project: {
            ...buildProjectLifecycleFilter(status),
            ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
        }
    };

    const result = await prisma.projectMembers.findMany({
        where,
        select: {
            id: true,
            role: true,
            joinedAt: true,
            isActive: true,
            project: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    createdAt: true,
                    updatedAt: true,
                    lastActivityAt: true,
                    archivedAt: true,
                    deletedAt: true,
                }
            }
        },
        skip,
        take: (limit > 0) ? limit : undefined,
        orderBy: {
            project: {
                [sortBy]: order
            }
        },
    });

    const projects = result.map(res => ({
        projectId: res.project.id,
        name: res.project.name,
        description: res.project.description,
        role: res.role,
        createdAt: res.project.createdAt,
        updatedAt: res.project.updatedAt,
        lastActivityAt: res.project.lastActivityAt,
        archivedAt: res.project.archivedAt,
        deletedAt: res.project.deletedAt
    }));

    const totalProjects = await prisma.projectMembers.count({ where });

    return { projects, totalProjects };
};

export const getProjectById = async (id) => {
    const result = await prisma.projects.findUnique({ where: { id, deletedAt: null } })
    // console.log(result);
    if (!result) {
        return result
    }
    return ({
        owner: result.owner,
        projectId: result.id,
        name: result.name,
        description: result.description,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        lastActivityAt: result.lastActivityAt,
        archivedAt: result.archivedAt,
        deletedAt: result.deletedAt,
    })
};

export const getProjectByIdfromAll = async (id) => {
    const result = await prisma.projects.findUnique({ where: { id } })
    // console.log(result);
    if (!result) {
        return result
    }
    return ({
        owner: result.owner,
        projectId: result.id,
        name: result.name,
        description: result.description,
        archivedAt: result.archivedAt,
        deletedAt: result.deletedAt,
    })
};

// bulk operation for getting projects by ids
export const getProjectsByIds = async (projectIds, withDeleted) => await prisma.projects.findMany({
    where: { id: { in: projectIds }, deletedAt: withDeleted ? {} : null },
    select: { id: true, deletedAt: true }
});

export const editProject = async (id, data) => {
    return await prisma.projects.update({ where: { id }, data: { ...data, lastActivityAt: new Date() } })
};

//soft delete project
export const softDeleteProject = async (id) => {
    return await prisma.projects.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), lastActivityAt: new Date() },
    });
};

/*
 * Lifecycle operations below are transactional so that a project and its tasks
 * always change state together. Manual archive/delete sources are never touched.
 */

export const archiveProjectWithTasks = async (projectId) => {
    return await prisma.$transaction(async (tx) => {
        const archivedAt = new Date();
        const project = await tx.projects.update({
            where: { id: projectId },
            data: { archivedAt, lastActivityAt: archivedAt },
        });

        const affectedTasks = await tx.tasks.findMany({
            where: { projectId, archivedAt: null, deletedAt: null },
            select: {
                id: true,
                title: true,
                projectId: true,
                assignee: {
                    select: { userId: true },
                },
            },
        });

        await tx.tasks.updateMany({
            where: { projectId, archivedAt: null, deletedAt: null },
            data: { archivedAt, archiveSource: 'PROJECT' },
        });

        return { project, affectedTasks };
    });
};

export const unarchiveProjectWithTasks = async (projectId) => {
    return await prisma.$transaction(async (tx) => {
        const project = await tx.projects.update({
            where: { id: projectId },
            data: { archivedAt: null, lastActivityAt: new Date() },
        });

        const affectedTasks = await tx.tasks.findMany({
            where: { projectId, archiveSource: 'PROJECT', deletedAt: null },
            select: {
                id: true,
                title: true,
                projectId: true,
                assignee: {
                    select: { userId: true },
                },
            },
        });

        await tx.tasks.updateMany({
            where: { projectId, archiveSource: 'PROJECT', deletedAt: null },
            data: { archivedAt: null, archiveSource: null },
        });

        return { project, affectedTasks };
    });
};

export const softDeleteProjectWithTasks = async (projectId) => {
    return await prisma.$transaction(async (tx) => {
        const deletedAt = new Date();
        const project = await tx.projects.update({
            where: { id: projectId },
            data: { deletedAt, lastActivityAt: deletedAt },
        });

        await tx.tasks.updateMany({
            where: { projectId, deletedAt: null },
            data: { deletedAt, deleteSource: 'PROJECT' },
        });

        return project;
    });
};

export const restoreProjectWithTasks = async (projectId) => {
    return await prisma.$transaction(async (tx) => {
        const project = await tx.projects.update({
            where: { id: projectId },
            data: { deletedAt: null, lastActivityAt: new Date() },
        });

        await tx.tasks.updateMany({
            where: { projectId, deleteSource: 'PROJECT' },
            data: { deletedAt: null, deleteSource: null },
        });

        return project;
    });
};

export const updateProjectLastActivity = async (projectId) => {
    return await prisma.projects.update({
        where: { id: projectId },
        data: { lastActivityAt: new Date() }
    });
};

export const deactivateProjectMemberAndReleaseAssignments = async (projectId, memberId) => {
    return await prisma.$transaction(async (tx) => {
        const member = await tx.projectMembers.update({
            where: { id: memberId },
            data: { isActive: false },
        });

        const released = await tx.tasks.updateMany({
            where: {
                projectId,
                assigneeId: memberId,
                status: { in: ['TODO', 'IN_PROGRESS'] },
            },
            data: { assigneeId: null },
        });

        return { member, releasedTaskCount: released.count };
    });
};

export const deleteProject = async (id) => {
    return await prisma.projects.delete({ where: { id } })
};

//Manage members of project
export const addProjectMember = async (data) => {
    const { id, ...res } = await prisma.projectMembers.create({
        data, select: {
            id: true,
            projectId: true,
            role: true,
            isActive: true,
            joinedAt: true,
        }
    });

    return {
        memberId: id,
        ...res
    };
};

export const getAllProjectMembers = async (projectId) => {
    const result = await prisma.projectMembers.findMany({
        where: { projectId }, select: {
            id: true,
            user: {
                select: {
                    name: true,
                    username: true,
                    profilePicture: true,
                }
            },
            projectId: true,
            userId: true,
            role: true,
            isActive: true,
            joinedAt: true
        }
    });

    const resultMapped = result.map((res) => ({
        memberId: res.id,
        userId: res.userId,
        name: res.user.name,
        username: res.user.username,
        profilePicture: res.user.profilePicture,
        projectId: res.projectId,
        role: res.role,
        isActive: res.isActive,
        joinedAt: res.joinedAt.toISOString(),
    }));

    return resultMapped;
}

export const getProjectMemberByUserId = async (projectId, userId) => {
    return await prisma.projectMembers.findFirst({
        where: { projectId, userId }
    });
}

export const getProjectMemberByMemberId = async (projectId, id) => {
    return await prisma.projectMembers.findFirst({
        where: { projectId, id },
        include: {
            user: {
                select: {
                    username: true,
                    email: true,
                }
            }
        }
    });
}

export const editProjectMemberById = async (projectMemberId, data) => {
    return await prisma.projectMembers.update({
        where: { id: projectMemberId },
        data,
    });
};

export const updateProjectMemberByProjectUserId = async (projectId, userId, data) => {
    return await prisma.projectMembers.update({
        where: {
            projectId_userId: {
                projectId,
                userId
            }
        },
        data,
    });
};

export const softDeleteProjectMember = async (id) => {
    return await prisma.projectMembers.update({
        where: { id },
        data: { deletedAt: new Date() },
    });
}

