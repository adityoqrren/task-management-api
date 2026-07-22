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

export const getProjectsByUserId = async (status, { userId, page, limit, filter = {}, sortBy, order }) => {
    const skip = (page - 1) * limit;

    const { search, ...restFilter } = filter;

    const where = {
        ...restFilter,
        userId,
        project: {
            ...(status == "all" ? {} : (status == "deleted") ? { NOT: { deletedAt: null } } : { deletedAt: null }),
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
        lastActivityAt: res.project.lastActivityAt
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
        lastActivityAt: result.lastActivityAt
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

export const updateProjectLastActivity = async (projectId) => {
    return await prisma.projects.update({
        where: { id: projectId },
        data: { lastActivityAt: new Date() }
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
                    name: true
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

