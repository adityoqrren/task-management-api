import { BadRequestError, NotFoundError } from '../../../exceptions/errors.js';
import { countUnreadNotifications, getNotificationsByRecipient, markAllNotificationsAsRead, markNotificationAsRead } from '../repository/notificationRepository.js';

export const getUserNotificationsService = async ({
  userId,
  limit = 20,
  cursor
}) => {
  const notifications = await getNotificationsByRecipient({
    recipientId: userId,
    limit,
    cursor
  });

  const nextCursor =
    notifications.length > 0
      ? notifications[notifications.length - 1].createdAt
      : null;

  return {
    notifications,
    nextCursor
  };
};

export const getUnreadNotificationCountService = async (userId) => {
  const count = await countUnreadNotifications(userId);

  return { count };
};

export const readNotificationService = async ({
  notificationId,
  userId
}) => {
  const result = await markNotificationAsRead({
    notificationId,
    recipientId: userId
  });

  if (result.count === 0) {
    throw new NotFoundError('Notification not found');
  }

  return { success: true };
};

export const readAllNotificationsService = async (userId) => {
  const result = await markAllNotificationsAsRead(userId);

  return {
    updatedCount: result.count
  };
};

