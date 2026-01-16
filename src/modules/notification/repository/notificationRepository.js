import prisma from "../../../db/db.js";

export const getNotificationsByRecipient = async ({
  recipientId,
  limit,
  cursor
}) => {
  return prisma.notifications.findMany({
    where: {
      recipientId,
      ...(cursor && {
        createdAt: {
          lt: new Date(cursor)
        }
      })
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });
};

export const countUnreadNotifications = async (recipientId) => {
  return prisma.notifications.count({
    where: {
      recipientId,
      isRead: false
    }
  });
};

export const markNotificationAsRead = async ({
  notificationId,
  recipientId
}) => {
  return prisma.notifications.updateMany({
    where: {
      id: notificationId,
      recipientId
    },
    data: {
      isRead: true,
    }
  });
};

export const markAllNotificationsAsRead = async (recipientId) => {
  return prisma.notifications.updateMany({
    where: {
      recipientId,
      isRead: false
    },
    data: {
      isRead: true,
    }
  });
};
