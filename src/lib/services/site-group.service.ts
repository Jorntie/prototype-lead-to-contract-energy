import { prisma } from "@/lib/db";
import { logActivity, logCreation } from "./activity-log.service";
import type {
  CreateSiteGroupInput,
  UpdateSiteGroupInput,
} from "@/lib/validators/site-group";
import type { SiteGroup } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SiteGroupWithCount = SiteGroup & {
  _count: { sites: number };
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all site groups for an account.
 */
export async function getSiteGroups(
  accountId: string
): Promise<SiteGroupWithCount[]> {
  return prisma.siteGroup.findMany({
    where: { accountId, deletedAt: null },
    include: {
      _count: { select: { sites: true } },
    },
    orderBy: { name: "asc" },
  }) as Promise<SiteGroupWithCount[]>;
}

/**
 * Create a new site group for an account.
 */
export async function createSiteGroup(
  accountId: string,
  data: CreateSiteGroupInput,
  userId: string
): Promise<SiteGroup> {
  const siteGroup = await prisma.siteGroup.create({
    data: {
      accountId,
      name: data.name,
      description: data.description || null,
    },
  });

  await logCreation({
    entityType: "SiteGroup",
    entityId: siteGroup.id,
    userId,
    entityName: siteGroup.name,
  });

  return siteGroup;
}

/**
 * Update a site group.
 */
export async function updateSiteGroup(
  id: string,
  data: UpdateSiteGroupInput,
  userId: string
): Promise<SiteGroup> {
  const existing = await prisma.siteGroup.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.description !== undefined)
    cleaned.description = data.description || null;

  const siteGroup = await prisma.siteGroup.update({
    where: { id },
    data: cleaned,
  });

  await logActivity({
    entityType: "SiteGroup",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Site group "${existing.name}" updated`,
  });

  return siteGroup;
}

/**
 * Delete a site group. Unassigns any sites from the group before deleting.
 */
export async function deleteSiteGroup(
  id: string,
  userId: string
): Promise<void> {
  const existing = await prisma.siteGroup.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  // Unassign sites from this group
  await prisma.site.updateMany({
    where: { siteGroupId: id },
    data: { siteGroupId: null },
  });

  await prisma.siteGroup.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    entityType: "SiteGroup",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Site group "${existing.name}" deleted`,
  });
}
