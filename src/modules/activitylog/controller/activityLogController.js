import { successPaginationResponse } from '../../../shared/utils/response.js';
import {
  getProjectActivityLogsService,
  getTaskActivityLogsService,
  getUserActivityLogsService
} from '../service/activityLogService.js';

export const handleGetProjectActivityLogs = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { cursor } = req.query;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await getProjectActivityLogsService({
      projectId,
      cursor,
      limit
    });

    return successPaginationResponse(res, null, result.data, {
      limit, nextCursor: result.nextCursor,
    })
  } catch (err) {
    next(err);
  }
};

export const handleGetTaskActivityLogs = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { cursor } = req.query;

    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await getTaskActivityLogsService({
      taskId,
      cursor,
      limit,
    });

    return successPaginationResponse(res, null, result.data, {
      limit, nextCursor: result.nextCursor,
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetUserActivityLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cursor } = req.query;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await getUserActivityLogsService({
      userId,
      cursor,
      limit,
    });

    return successPaginationResponse(res, null, result.data, {
      limit, nextCursor: result.nextCursor,
    });
  } catch (err) {
    next(err);
  }
};
