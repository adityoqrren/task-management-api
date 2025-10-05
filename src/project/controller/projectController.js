import { BadRequestError } from '../../exceptions/errors.js';
import { getAllTasksService } from '../../task/service/taskService.js';
import { successPaginationResponse, successResponse } from '../../utils/response.js';
import { addProjectMemberService, addNewProjectService, deleteProjectService, getAllUserProjectsService, getProjectByIdService, getProjectMembersService, updateActiveProjectMemberService, editProjectService, softDeleteProjectService, getProjectByIdFromAllService, getAllUserProjectsFromAllService, restoreSoftDeletedProjectService } from '../service/projectService.js';

export const handlePostProject = async (req, res, next) => {
    try {
        const { name } = req.body;
        const userId = req.user.id
        //console.log(`userId : ${userId}`);
        const project = await addNewProjectService({ name, userId });
        // res.status(201).json(project);
        return successResponse(res, "project has been created", project, 201);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

export const handleAddProjectMember = async (req, res, next) => {
    console.log("masuk handleAddProjectMmember");
    const { projectId, userId } = req.body;

    try {
        const projectMember = await addProjectMemberService({ projectId, userId });
        return successResponse(res, "member has been added", projectMember, 201);
    } catch (err) {
        next(err);
    }
}

export const handleGetProjects = async (req, res, next) => {
    try {
        const { status = 'active', sortBy, order } = req.query;
        const userId = req.user.id;

        const limit = parseInt(req.query.limit, 10) || 0;
        const page = parseInt(req.query.page, 10) || 1;

        const filter = {};

        // Validasi sorting
        const validSortFields = ['createdAt', 'updatedAt', 'name'];
        const validOrders = ['asc', 'desc'];

        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortOrder = validOrders.includes(order) ? order : 'desc';

        const { projects, totalProjects } = await getAllUserProjectsService(status, { userId, page, limit, filter, sortBy: sortField, order: sortOrder });

        const totalPages = (limit) ? Math.ceil(totalProjects / limit) : (totalProjects > 0) ? 1 : 0;
        if (totalPages > 0 && page > totalPages) throw new BadRequestError("Page is over from limit");

        return successPaginationResponse(res, null, projects, {
            total: totalProjects,
            page: page,
            totalPages,
            limit,
            hasPrev: (limit > 0) ? (page > 1) : false,
            hasNext: (limit > 0) ? (page < totalPages) : false
        });
    } catch (err) {
        next(err);
    }
};

export const handleGetProjectsFromAll = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const projects = await getAllUserProjectsFromAllService(userId);
        return successResponse(res, null, projects);
    } catch (err) {
        next(err);
    }
};

export const handleGetProjectMembers = async (req, res, next) => {
    try {
        const project = await getProjectMembersService(req.params.id)
        return successResponse(res, null, project);
    } catch (err) {
        next(err)
    }
};

export const handleGetProjectById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        // console.log(`${userId} - ${req.params.id}`)
        const project = await getProjectByIdService({ userId, projectId: req.params.id })
        return successResponse(res, null, project);
    } catch (err) {
        next(err)
    }
};

export const handleGetProjectByIdFromAll = async (req, res, next) => {
    try {
        const userId = req.user.id;
        // console.log(`${userId} - ${req.params.id}`)
        const { projectId, name } = await getProjectByIdFromAllService({ userId, projectId: req.params.id })
        return successResponse(res, null, {
            projectId,
            name
        });
    } catch (err) {
        next(err)
    }
};

export const handleUpdateProject = async (req, res, next) => {
    try {
        const data = await editProjectService({
            userId: req.user.id,
            projectId: req.params.id,
            data: req.body
        })
        //res.json(updated)
        return successResponse(res, "project has been edited", data)
    } catch (err) {
        next(err)
    }
}

export const handleSoftDeleteProject = async (req, res, next) => {
    try {
        const data = await softDeleteProjectService({
            userId: req.user.id,
            projectId: req.params.id,
        })
        //res.json(updated)
        if (!data) {
            throw new BadRequestError("Failed to delete project")
        }
        return successResponse(res, "project has been soft deleted")
    } catch (err) {
        next(err)
    }
}

export const handleRestoreSoftDeletedProject = async (req, res, next) => {
    try {
        const data = await restoreSoftDeletedProjectService({
            userId: req.user.id,
            projectId: req.params.id,
        })
        //res.json(updated)
        if (!data) {
            throw new BadRequestError("Failed to restore project")
        }
        return successResponse(res, "project has been restored")
    } catch (err) {
        next(err)
    }
}

export const handleUpdateActiveProjectMember = async (req, res, next) => {
    try {
        const { projectId, memberId } = req.params;
        const isActive = req.body.isActive;

        const updated = await updateActiveProjectMemberService({ projectId, memberId, isActive })
        //res.json(updated)
        return successResponse(res, (updated.isActive) ? "member has been activated" : "member has been inactivated", updated)
    } catch (err) {
        next(err)
    }
}

export const handleDeleteProject = async (req, res, next) => {
    try {
        await deleteProjectService({ userId: req.user.id, projectId: req.params.id })
        return successResponse(res, "project is success deleted")
    } catch (err) {
        next(err)
    }
}

export const handleGetProjectTasks = async (req, res, next) => {
    try {
        const projectIdParam = req.params.id;

        const { status = 'active', userId, completed, search, sortBy, order } = req.query;

        console.log(`userId : ${userId}`);

        const limit = parseInt(req.query.limit, 10) || 0;
        const page = parseInt(req.query.page, 10) || 1;

        const filter = {};

        // Validasi sorting
        const validSortFields = ['createdAt', 'title', 'priority', 'completed'];
        const validOrders = ['asc', 'desc'];

        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortOrder = validOrders.includes(order) ? order : 'desc';


        filter.projectId = projectIdParam;

        if (completed !== undefined) {
            filter.completed = completed === 'true';
        }

        if (search) {
            filter.title = {
                contains: search,
                mode: 'insensitive',
            };
        }

        const queryParams = { userId, page, limit, filter, sortBy: sortField, order: sortOrder };

        const { tasks, totalTasks } = await getAllTasksService(status, queryParams);
        const totalPages = Math.ceil(totalTasks / limit);
        if (page > totalPages) throw new BadRequestError("Page is over from limit");
        return successPaginationResponse(res, null, tasks, {
            total: totalTasks,
            page: page,
            totalPages: (limit > 0) ? totalPages : 1,
            limit,
            hasPrev: (limit > 0) ? (page > 1) : false,
            hasNext: (limit > 0) ? (page < totalPages) : false
        });
    } catch (error) {
        next(error);
    }
};
