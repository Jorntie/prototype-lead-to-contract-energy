import { prisma } from "@/lib/db";
export type ActivityType = "NOTE" | "CALL" | "EMAIL" | "MEETING" | "STATUS_CHANGE" | "CREATED" | "UPDATED" | "CONVERTED" | "QUOTE_SUBMITTED" | "QUOTE_APPROVED" | "QUOTE_REJECTED" | "CONTRACT_SIGNED";

/**
 * Auto-logging service for system events.
 * Called from other services to log events automatically.
 * Reps should not manually log what the system already knows.
 */
export async function logActivity(params: {
  entityType: string;
  entityId: string;
  userId?: string;
  type: ActivityType;
  content?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userId,
        type: params.type,
        content: params.content,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    });
  } catch (error) {
    // Activity logging should never fail silently but also never block operations
    console.error("Failed to log activity:", error);
  }
}

/**
 * Auto-log a status change on any entity.
 */
export async function logStatusChange(params: {
  entityType: string;
  entityId: string;
  userId?: string;
  fromStatus: string;
  toStatus: string;
}) {
  return logActivity({
    entityType: params.entityType,
    entityId: params.entityId,
    userId: params.userId,
    type: "STATUS_CHANGE",
    content: `Status changed from ${params.fromStatus} to ${params.toStatus}`,
    metadata: { fromStatus: params.fromStatus, toStatus: params.toStatus },
  });
}

/**
 * Auto-log entity creation.
 */
export async function logCreation(params: {
  entityType: string;
  entityId: string;
  userId?: string;
  entityName?: string;
}) {
  return logActivity({
    entityType: params.entityType,
    entityId: params.entityId,
    userId: params.userId,
    type: "CREATED",
    content: params.entityName
      ? `${params.entityType} "${params.entityName}" created`
      : `${params.entityType} created`,
  });
}

/**
 * Get activity log for an entity, including child entities.
 */
export async function getActivityLog(
  entityType: string,
  entityId: string,
  options?: { limit?: number; includeChildren?: { entityType: string; entityIds: string[] }[] }
) {
  const whereConditions = [
    { entityType, entityId },
    ...(options?.includeChildren?.flatMap((child) =>
      child.entityIds.map((id) => ({
        entityType: child.entityType,
        entityId: id,
      }))
    ) ?? []),
  ];

  return prisma.activityLog.findMany({
    where: { OR: whereConditions },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
  });
}
