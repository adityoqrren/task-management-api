import { successPaginationResponse } from '../../../shared/utils/response.js';
import {
  getProjectActivityLogsService,
  getTaskActivityLogsService,
  getUserActivityLogsService
} from '../service/activityLogService.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parseLimit = (value) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

export const handleGetProjectActivityLogs = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { cursor } = req.query;
    const limit = parseLimit(req.query.limit);

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

    const limit = parseLimit(req.query.limit);

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
    const limit = parseLimit(req.query.limit);

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
