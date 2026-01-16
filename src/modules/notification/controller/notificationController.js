import { successPaginationResponse, successResponse } from "../../../shared/utils/response.js";
import { getUnreadNotificationCountService, getUserNotificationsService, readAllNotificationsService, readNotificationService } from "../service/notificationService.js";

export const handleGetNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id; // from auth middleware
    const limit = parseInt(req.query.limit, 10) || 20;
    const cursor = req.query.cursor || null;

    const result = await getUserNotificationsService({
      userId,
      limit,
      cursor
    });

    return successPaginationResponse(res, null, result.notifications, {
      limit,
      nextCursor: result.nextCursor,
    });
  } catch (err) {
    next(err);
  }
};

export const handleGetUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await getUnreadNotificationCountService(userId);

    return successResponse(res, null, result);
  } catch (err) {
    next(err);
  }
};

export const handleMarkNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await readNotificationService({
      notificationId,
      userId
    });
    return successResponse(res, "Notification marked as read");
  } catch (err) {
    next(err);
  }
};

export const handleMarkAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await readAllNotificationsService(userId);

    return successResponse(res, 'All notifications marked as read', result);
  } catch (err) {
    next(err);
  }
};





