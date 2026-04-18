import { prisma } from "@/lib/db";
export type NotificationType = "APPROVAL_REQUESTED" | "APPROVAL_GRANTED" | "QUOTE_EXPIRING" | "STAGE_CHANGE";

/**
 * Create a notification for a user.
 */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
    },
  });
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Get notifications for a user.
 */
export async function getNotifications(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(options?.unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 20,
  });
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Notify all managers about a pending approval.
 */
export async function notifyManagers(params: {
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  excludeUserId?: string;
}) {
  const managers = await prisma.user.findMany({
    where: {
      role: { in: ["SALES_MANAGER", "ADMIN"] },
      ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
    },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: managers.map((m) => ({
      userId: m.id,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
    })),
  });
}
