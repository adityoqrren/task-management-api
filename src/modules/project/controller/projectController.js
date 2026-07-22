import { BadRequestError } from '../../../exceptions/errors.js';
import { getAllTasksByProjectIdService, getAllTasksService } from '../../task/service/taskService.js';
import { successPaginationResponse, successResponse } from '../../../shared/utils/response.js';
import { addProjectMemberService, addNewProjectService, deleteProjectService, getAllUserProjectsService, getProjectByIdService, getProjectMembersService, updateActiveProjectMemberService, editProjectService, softDeleteProjectService, getProjectByIdFromAllService, restoreSoftDeletedProjectService, getProjectStatisticsService, getRecentProjectTasksService } from '../service/projectService.js';

export const handlePostProject = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const userId = req.user.id
        //console.log(`userId : ${userId}`);
        const project = await addNewProjectService({ name, userId, description });
        // res.status(201).json(project);
        return successResponse(res, "project has been created", project, 201);
    } catch (err) {
        console.log(err);
        next(err);
    }
};

export const handleAddProjectMember = async (req, res, next) => {
    // console.log("masuk handleAddProjectMmember");
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
        const { status = 'active', sortBy, order, memberStatus, search, role } = req.query;
        const userId = req.user.id;

        const limit = parseInt(req.query.limit, 10) || 0;
        const page = parseInt(req.query.page, 10) || 1;

        const filter = {
            ...(memberStatus === "active" && { isActive: true }),
            ...(memberStatus === "inactive" && { isActive: false }),
        };

        if (role) {
            filter.role = role.toUpperCase();
        }

        if (search) {
            filter.search = search;
        }

        // Validasi sorting
        const validSortFields = ['createdAt', 'updatedAt', 'name', 'lastActivityAt'];
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

// TODO: Review this function because seems no more purpose
// export const handleGetProjectsFromAll = async (req, res, next) => {
//     try {
//         const userId = req.user.id;
//         const projects = await getAllUserProjectsFromAllService(userId);
//         return successResponse(res, null, projects);
//     } catch (err) {
//         next(err);
//     }
// };

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
        const { projectId, name, description } = await getProjectByIdFromAllService({ userId, projectId: req.params.id })
        return successResponse(res, null, {
            projectId,
            name,
            description
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

        /**
         * Note: 'status' query param is used for the soft deletion state (active | deleted), 
         * while 'taskStatus' query param is used to filter by the task's progress state (TODO | IN_PROGRESS | DONE | CANCELLED).
         */
        const { status = 'active', userId, completed, search, sortBy, order, include, taskStatus, priority, assigneeId, assignee, dueFilter } = req.query;

        //console.log(`userId : ${userId}`);

        const limit = parseInt(req.query.limit, 10) || 0;
        const page = parseInt(req.query.page, 10) || 1;

        const filter = {};

        // Validasi sorting
        const validSortFields = ['createdAt', 'title', 'status', 'assignee_name', 'priority', 'startDate', 'dueDate'];
        const validOrders = ['asc', 'desc'];

        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortOrder = validOrders.includes(order) ? order : 'desc';


        filter.projectId = projectIdParam;

        if (completed !== undefined) {
            filter.completed = completed === 'true';
        }

        if (taskStatus) {
            filter.status = taskStatus.toUpperCase();
        }

        if (priority) {
            filter.priority = priority.toUpperCase();
        }

        if (dueFilter === 'dueSoon') {
            const now = new Date();
            const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            filter.dueDate = {
                gte: now,
                lte: threeDaysFromNow,
            };
        } else if (dueFilter === 'overdue') {
            filter.dueDate = {
                lt: new Date(),
            };
        }

        if (assigneeId === 'unassigned' || assignee === 'unassigned') {
            filter.assigneeId = null
        } else if (assigneeId || assignee) {
            filter.assigneeId = assigneeId || assignee;
        }

        if (search) {
            filter.title = {
                contains: search,
                mode: 'insensitive',
            };
        }

        //check if simple query for caching
        const isSimpleQuery =
            status === 'active' &&
            !userId &&
            completed === undefined &&
            !taskStatus &&
            !priority &&
            !assigneeId &&
            !assignee &&
            !search &&
            !dueFilter &&
            (!sortBy || sortBy === 'createdAt') &&
            (!order || order === 'desc');
            //  && !include;

        const queryParams = { userId, page, limit, filter, sortBy: sortField, order: sortOrder, include };

        const { isFromCache, tasks, totalTasks } = await getAllTasksByProjectIdService({ isSimpleQuery, status, queryParams });
        const totalPages = (limit) ? Math.ceil(totalTasks / limit) : (totalTasks > 0) ? 1 : 0;
        if (totalPages > 0 && page > totalPages) throw new BadRequestError("Page is over from limit");
        if (isFromCache) {
            res.header('X-Data-Source', 'cache');
        }
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

export const handleGetProjectStatistics = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        const statistics = await getProjectStatisticsService(projectId);
        return res.status(200).json({
            status: "success",
            projectId,
            statistics
        });
    } catch (err) {
        next(err);
    }
};

export const handleGetRecentProjectTasks = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        const limit = parseInt(req.query.limit, 10);
        if (isNaN(limit) || limit <= 0) {
            throw new BadRequestError("Limit query parameter must be a positive integer");
        }
        const tasks = await getRecentProjectTasksService(projectId, limit);
        return res.status(200).json({
            status: "success",
            totalRecent: tasks.length,
            data: tasks
        });
    } catch (err) {
        next(err);
    }
};
