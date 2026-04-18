import { prisma } from "@/lib/db";
import { logActivity, logCreation } from "./activity-log.service";
import type { CreateSiteInput, UpdateSiteInput } from "@/lib/validators/site";
import type { Site } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SiteWithGroup = Site & {
  siteGroup: { id: string; name: string } | null;
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get sites, optionally filtered by account.
 */
export async function getSites(accountIdOrParams?: string | { accountId: string }): Promise<SiteWithGroup[]> {
  const accountId = typeof accountIdOrParams === "string"
    ? accountIdOrParams
    : accountIdOrParams?.accountId;

  const where: Record<string, unknown> = { deletedAt: null };
  if (accountId) {
    where.accountId = accountId;
  }

  return prisma.site.findMany({
    where,
    include: {
      siteGroup: { select: { id: true, name: true } },
    },
    orderBy: { address: "asc" },
  }) as Promise<SiteWithGroup[]>;
}

/**
 * Get a single site by ID.
 */
export async function getSite(id: string): Promise<SiteWithGroup | null> {
  return prisma.site.findFirst({
    where: { id, deletedAt: null },
    include: {
      siteGroup: { select: { id: true, name: true } },
    },
  }) as Promise<SiteWithGroup | null>;
}

/**
 * Create a new site for an account.
 */
export async function createSite(
  accountId: string,
  data: CreateSiteInput,
  userId: string
): Promise<Site> {
  const site = await prisma.site.create({
    data: {
      accountId,
      address: data.address,
      meterId: data.meterId || null,
      commodity: data.commodity ?? "ELECTRICITY",
      supplyCapacity: data.supplyCapacity ? Number(data.supplyCapacity) : null,
      annualConsumption: data.annualConsumption
        ? Number(data.annualConsumption)
        : null,
      peakPercentage: data.peakPercentage ? Number(data.peakPercentage) : null,
      voltageLevel: data.voltageLevel || null,
      connectionType: data.connectionType || null,
      contractEndDate: data.contractEndDate
        ? new Date(data.contractEndDate)
        : null,
      siteGroupId: data.siteGroupId || null,
      status: data.status ?? "ACTIVE",
    },
  });

  await logCreation({
    entityType: "Site",
    entityId: site.id,
    userId,
    entityName: site.address,
  });

  return site;
}

/**
 * Update a site.
 */
export async function updateSite(
  id: string,
  data: UpdateSiteInput,
  userId: string
): Promise<Site> {
  const existing = await prisma.site.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  const cleaned: Record<string, unknown> = {};
  if (data.address !== undefined) cleaned.address = data.address;
  if (data.meterId !== undefined) cleaned.meterId = data.meterId || null;
  if (data.commodity !== undefined) cleaned.commodity = data.commodity;
  if (data.supplyCapacity !== undefined)
    cleaned.supplyCapacity = data.supplyCapacity
      ? Number(data.supplyCapacity)
      : null;
  if (data.annualConsumption !== undefined)
    cleaned.annualConsumption = data.annualConsumption
      ? Number(data.annualConsumption)
      : null;
  if (data.peakPercentage !== undefined)
    cleaned.peakPercentage = data.peakPercentage
      ? Number(data.peakPercentage)
      : null;
  if (data.voltageLevel !== undefined)
    cleaned.voltageLevel = data.voltageLevel || null;
  if (data.connectionType !== undefined)
    cleaned.connectionType = data.connectionType || null;
  if (data.contractEndDate !== undefined)
    cleaned.contractEndDate = data.contractEndDate
      ? new Date(data.contractEndDate)
      : null;
  if (data.siteGroupId !== undefined)
    cleaned.siteGroupId = data.siteGroupId || null;
  if (data.status !== undefined) cleaned.status = data.status;

  const site = await prisma.site.update({
    where: { id },
    data: cleaned,
  });

  await logActivity({
    entityType: "Site",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Site "${existing.address}" updated`,
  });

  return site;
}

/**
 * Soft-delete a site.
 */
export async function deleteSite(id: string, userId: string): Promise<void> {
  const existing = await prisma.site.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  await prisma.site.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    entityType: "Site",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Site "${existing.address}" deleted`,
  });
}

/**
 * Bulk create sites for an account.
 * Returns the count of successfully created sites and any errors.
 */
export async function bulkCreateSites(
  accountId: string,
  sites: CreateSiteInput[],
  userId: string
): Promise<{ created: number; errors: string[] }> {
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < sites.length; i++) {
    try {
      await createSite(accountId, sites[i], userId);
      created++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`Row ${i + 1}: ${message}`);
    }
  }

  return { created, errors };
}
