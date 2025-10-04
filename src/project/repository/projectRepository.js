import prisma from '../../config/db.js';

//Manage project
export const addProject = async (projectData) => {
    return await prisma.projects.create({
        data: {
            name: projectData.name,
            owner: projectData.userId,
        }
    });
};

export const getProjectsByUserId = async (userId, withDeleted = false) => {
    const result = await prisma.projectMembers.findMany({
        where: {
            userId, project: {
                ...(withDeleted ? {} : { deletedAt: null })
            }
        }, select: {
            id: true,
            role: true,
            joinedAt: true,
            isActive: true,
            project: {
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                }
            }
        }
    });

    return result.map(res => ({
        projectId: res.project.id,
        name: res.project.name,
        role: res.role,
    }));
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
    })
};

export const editProject = async (id, data) => {
    return await prisma.projects.update({ where: { id }, data })
};

//soft delete project
export const softDeleteProject = async (id) => {
    return await prisma.projects.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
    });
};

export const deleteProject = async (id) => {
    return await prisma.projects.delete({ where: { id } })
};

//Manage members of project
export const addProjectMember = async (data) => {
    const {id, ...res} = await prisma.projectMembers.create({
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
        where: { projectId, id }
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

