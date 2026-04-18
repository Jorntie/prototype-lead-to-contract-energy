import { prisma } from "@/lib/db";
import { logActivity, logCreation, logStatusChange } from "./activity-log.service";
import { generateCsv } from "@/lib/export/csv-export";
import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  UpdateStageInput,
  OpportunityStage,
} from "@/lib/validators/opportunity";
import type { Opportunity, Site } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OpportunityWithDetails = Opportunity & {
  account: { id: string; name: string };
  assignedTo: { id: string; name: string; email: string } | null;
  _count: { opportunitySites: number; quotes: number };
};

export type OpportunityFull = Opportunity & {
  account: { id: string; name: string };
  assignedTo: { id: string; name: string; email: string } | null;
  opportunitySites: Array<{
    id: string;
    site: Site & { siteGroup: { id: string; name: string } | null };
  }>;
  quotes: Array<{
    id: string;
    version: number;
    status: string;
    totalValue: number | null;
    marginPercentage: number | null;
    createdAt: Date;
  }>;
};

// ---------------------------------------------------------------------------
// Stage transition rules
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<string, OpportunityStage[]> = {
  DISCOVERY: ["QUOTING"],
  QUOTING: ["PROPOSAL_SENT", "DISCOVERY"],
  PROPOSAL_SENT: ["NEGOTIATION", "QUOTING"],
  NEGOTIATION: ["WON", "LOST", "PROPOSAL_SENT"],
  WON: [], // terminal
  LOST: ["DISCOVERY"], // reopen
};

function assertValidTransition(from: string, to: string): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to as OpportunityStage)) {
    throw new Error(`Invalid stage transition from ${from} to ${to}`);
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all opportunities with optional filtering.
 */
export async function getOpportunities(params?: {
  stage?: string;
  assignedToId?: string;
  accountId?: string;
  search?: string;
}): Promise<OpportunityWithDetails[]> {
  const where: Record<string, unknown> = { deletedAt: null };

  if (params?.stage) {
    where.stage = params.stage;
  }
  if (params?.assignedToId) {
    where.assignedToId = params.assignedToId;
  }
  if (params?.accountId) {
    where.accountId = params.accountId;
  }
  if (params?.search) {
    where.OR = [
      { account: { name: { contains: params.search } } },
      { winLossReason: { contains: params.search } },
    ];
  }

  return prisma.opportunity.findMany({
    where,
    include: {
      account: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: { select: { opportunitySites: true, quotes: true } },
    },
    orderBy: { createdAt: "desc" },
  }) as Promise<OpportunityWithDetails[]>;
}

/**
 * Get a single opportunity with full details.
 */
export async function getOpportunity(id: string): Promise<OpportunityFull | null> {
  return prisma.opportunity.findFirst({
    where: { id, deletedAt: null },
    include: {
      account: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      opportunitySites: {
        include: {
          site: {
            include: {
              siteGroup: { select: { id: true, name: true } },
            },
          },
        },
      },
      quotes: {
        where: { deletedAt: null },
        select: {
          id: true,
          version: true,
          status: true,
          totalValue: true,
          marginPercentage: true,
          createdAt: true,
        },
        orderBy: { version: "desc" },
      },
    },
  }) as Promise<OpportunityFull | null>;
}

/**
 * Create a new opportunity with optional site selection.
 */
export async function createOpportunity(
  data: CreateOpportunityInput,
  userId: string
): Promise<Opportunity> {
  const siteIds = data.siteIds ?? [];

  // Validate that all siteIds belong to the specified account
  if (siteIds.length > 0) {
    const validSites = await prisma.site.count({
      where: {
        id: { in: siteIds },
        accountId: data.accountId,
        deletedAt: null,
      },
    });

    if (validSites !== siteIds.length) {
      throw new Error(
        "One or more selected sites do not belong to the specified account"
      );
    }
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      accountId: data.accountId,
      expectedCloseDate: data.expectedCloseDate
        ? new Date(data.expectedCloseDate as unknown as string)
        : null,
      contractDuration: data.contractDuration
        ? Number(data.contractDuration)
        : null,
      assignedToId: data.assignedToId || null,
      stage: "DISCOVERY",
      createdById: userId,
      opportunitySites: siteIds.length > 0
        ? {
            create: siteIds.map((siteId) => ({ siteId })),
          }
        : undefined,
    },
  });

  await logCreation({
    entityType: "Opportunity",
    entityId: opportunity.id,
    userId,
  });

  return opportunity;
}

/**
 * Update an opportunity.
 */
export async function updateOpportunity(
  id: string,
  data: UpdateOpportunityInput,
  userId: string
): Promise<Opportunity> {
  const existing = await prisma.opportunity.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  const cleaned: Record<string, unknown> = {};
  if (data.accountId !== undefined) cleaned.accountId = data.accountId;
  if (data.expectedCloseDate !== undefined)
    cleaned.expectedCloseDate = data.expectedCloseDate
      ? new Date(data.expectedCloseDate as unknown as string)
      : null;
  if (data.contractDuration !== undefined)
    cleaned.contractDuration = data.contractDuration
      ? Number(data.contractDuration)
      : null;
  if (data.assignedToId !== undefined)
    cleaned.assignedToId = data.assignedToId || null;

  // If siteIds provided, replace all OpportunitySite records
  if (data.siteIds !== undefined) {
    const accountId = data.accountId ?? existing.accountId;
    const siteIds = data.siteIds ?? [];

    if (siteIds.length > 0) {
      const validSites = await prisma.site.count({
        where: {
          id: { in: siteIds },
          accountId,
          deletedAt: null,
        },
      });

      if (validSites !== siteIds.length) {
        throw new Error(
          "One or more selected sites do not belong to the specified account"
        );
      }
    }

    await prisma.$transaction([
      prisma.opportunitySite.deleteMany({ where: { opportunityId: id } }),
      ...siteIds.map((siteId) =>
        prisma.opportunitySite.create({
          data: { opportunityId: id, siteId },
        })
      ),
    ]);
  }

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: cleaned,
  });

  await logActivity({
    entityType: "Opportunity",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Opportunity updated`,
  });

  return opportunity;
}

/**
 * Update opportunity stage with transition validation.
 */
export async function updateOpportunityStage(
  id: string,
  data: UpdateStageInput,
  userId: string
): Promise<Opportunity> {
  const existing = await prisma.opportunity.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  if (existing.stage === data.stage) return existing;

  assertValidTransition(existing.stage, data.stage);

  const updateData: Record<string, unknown> = { stage: data.stage };

  // When moving to WON, auto-update estimatedValue from latest accepted/sent quote
  if (data.stage === "WON") {
    const latestQuote = await prisma.quote.findFirst({
      where: {
        opportunityId: id,
        status: { in: ["ACCEPTED", "SENT"] },
        deletedAt: null,
      },
      orderBy: { version: "desc" },
      select: { totalValue: true },
    });

    if (latestQuote?.totalValue != null) {
      updateData.estimatedValue = latestQuote.totalValue;
    }
  }

  // When moving to LOST, store the reason
  if (data.stage === "LOST") {
    updateData.winLossReason = data.winLossReason;
  }

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: updateData,
  });

  await logStatusChange({
    entityType: "Opportunity",
    entityId: id,
    userId,
    fromStatus: existing.stage,
    toStatus: data.stage,
  });

  return opportunity;
}

/**
 * Soft-delete an opportunity.
 */
export async function deleteOpportunity(id: string, userId: string): Promise<void> {
  const existing = await prisma.opportunity.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  await prisma.opportunity.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    entityType: "Opportunity",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Opportunity deleted`,
  });
}

/**
 * Update the sites linked to an opportunity.
 */
export async function updateOpportunitySites(
  id: string,
  siteIds: string[],
  userId: string
): Promise<void> {
  const existing = await prisma.opportunity.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  // Validate that all siteIds belong to the opportunity's account
  if (siteIds.length > 0) {
    const validSites = await prisma.site.count({
      where: {
        id: { in: siteIds },
        accountId: existing.accountId,
        deletedAt: null,
      },
    });

    if (validSites !== siteIds.length) {
      throw new Error(
        "One or more selected sites do not belong to the opportunity's account"
      );
    }
  }

  await prisma.$transaction([
    prisma.opportunitySite.deleteMany({ where: { opportunityId: id } }),
    ...siteIds.map((siteId) =>
      prisma.opportunitySite.create({
        data: { opportunityId: id, siteId },
      })
    ),
  ]);

  await logActivity({
    entityType: "Opportunity",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Sites updated (${siteIds.length} sites selected)`,
  });
}

/**
 * Export site list as CSV for pricing desk.
 */
export async function exportSitesCsv(id: string): Promise<string> {
  const opportunity = await prisma.opportunity.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: {
      opportunitySites: {
        include: {
          site: {
            include: {
              siteGroup: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const rows = opportunity.opportunitySites.map((os) => ({
    meterId: os.site.meterId ?? "",
    address: os.site.address,
    siteGroup: os.site.siteGroup?.name ?? "",
    commodity: os.site.commodity,
    supplyCapacity: os.site.supplyCapacity ?? "",
    annualConsumption: os.site.annualConsumption ?? "",
    peakPercentage: os.site.peakPercentage ?? "",
    voltageLevel: os.site.voltageLevel ?? "",
  }));

  return generateCsv(rows, [
    { key: "meterId", header: "Meter ID" },
    { key: "address", header: "Address" },
    { key: "siteGroup", header: "Site Group" },
    { key: "commodity", header: "Commodity" },
    { key: "supplyCapacity", header: "Supply Capacity (kW)" },
    { key: "annualConsumption", header: "Annual Consumption (kWh)" },
    { key: "peakPercentage", header: "Peak %" },
    { key: "voltageLevel", header: "Voltage Level" },
  ]);
}
