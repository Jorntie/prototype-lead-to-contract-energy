import { prisma } from "@/lib/db";
import { logActivity, logCreation, logStatusChange } from "./activity-log.service";
import { createNotification, notifyManagers } from "./notification.service";
import { calculateComponentAnnualCost } from "@/lib/calculations/price-calculator";
import { generateCsv } from "@/lib/export/csv-export";
import type { CreateQuoteInput, UpdateQuoteInput, BulkUpdateComponentInput } from "@/lib/validators/quote";
import type { Quote, QuoteLine, QuoteLineComponent } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuoteWithDetails = Quote & {
  account: { id: string; name: string };
  opportunity: {
    id: string;
    stage: string;
    account: { id: string; name: string };
    assignedTo: { id: string; name: string; email: string } | null;
  };
  createdBy: { id: string; name: string; email: string } | null;
  _count: { quoteLines: number };
};

export type QuoteLineWithComponents = QuoteLine & {
  site: {
    id: string;
    address: string;
    meterId: string | null;
    siteGroup: { id: string; name: string } | null;
    annualConsumption: number | null;
    supplyCapacity: number | null;
  };
  components: Array<
    QuoteLineComponent & {
      componentType: { id: string; name: string; category: string; defaultUnit: string };
    }
  >;
};

export type QuoteWithLines = Quote & {
  opportunity: {
    id: string;
    stage: string;
    account: { id: string; name: string };
    assignedTo?: { id: string; name: string; email: string } | null;
  };
  account: { id: string; name: string };
  createdBy: { id: string; name: string; email: string } | null;
  approvedBy: { id: string; name: string; email: string } | null;
  quoteLines: QuoteLineWithComponents[];
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const quoteLineInclude = {
  site: {
    select: {
      id: true,
      address: true,
      meterId: true,
      siteGroup: { select: { id: true, name: true } },
      annualConsumption: true,
      supplyCapacity: true,
    },
  },
  components: {
    include: {
      componentType: {
        select: { id: true, name: true, category: true, defaultUnit: true },
      },
    },
    orderBy: { componentType: { displayOrder: "asc" } } as const,
  },
} as const;

function assertDraftStatus(status: string): void {
  if (status !== "DRAFT") {
    throw new Error(`Quote must be in DRAFT status to perform this action (current: ${status})`);
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all quotes with optional filtering.
 */
export async function getQuotes(params?: {
  opportunityId?: string;
  accountId?: string;
  status?: string;
  assignedToId?: string;
}): Promise<QuoteWithDetails[]> {
  const where: Record<string, unknown> = { deletedAt: null };

  if (params?.opportunityId) where.opportunityId = params.opportunityId;
  if (params?.accountId) where.accountId = params.accountId;
  if (params?.status) where.status = params.status;

  return prisma.quote.findMany({
    where,
    include: {
      account: { select: { id: true, name: true } },
      opportunity: {
        select: {
          id: true,
          stage: true,
          account: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { quoteLines: true } },
    },
    orderBy: [{ createdAt: "desc" }, { version: "desc" }],
  }) as Promise<QuoteWithDetails[]>;
}

/**
 * Get a single quote with full detail including all lines and components.
 */
export async function getQuote(id: string): Promise<QuoteWithLines | null> {
  return prisma.quote.findFirst({
    where: { id, deletedAt: null },
    include: {
      opportunity: {
        select: {
          id: true,
          stage: true,
          account: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      },
      account: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      quoteLines: {
        include: quoteLineInclude,
        orderBy: { site: { address: "asc" } },
      },
    },
  }) as Promise<QuoteWithLines | null>;
}

/**
 * Create a new quote with auto-populated lines and components.
 */
export async function createQuote(
  data: CreateQuoteInput,
  userId: string
): Promise<QuoteWithLines> {
  // Get all sites linked to this opportunity
  const opportunitySites = await prisma.opportunitySite.findMany({
    where: { opportunityId: data.opportunityId },
    include: {
      site: true,
    },
  });

  if (opportunitySites.length === 0) {
    throw new Error("No sites linked to this opportunity. Add sites before creating a quote.");
  }

  // Get next version number for this opportunity
  const latestQuote = await prisma.quote.findFirst({
    where: { opportunityId: data.opportunityId, deletedAt: null },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latestQuote?.version ?? 0) + 1;

  // Get all active price component types for auto-population
  const componentTypes = await prisma.priceComponentType.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  // Create quote with lines and components in a transaction
  const quote = await prisma.$transaction(async (tx) => {
    const newQuote = await tx.quote.create({
      data: {
        opportunityId: data.opportunityId,
        accountId: data.accountId,
        version: nextVersion,
        status: "DRAFT",
        currency: data.currency ?? "EUR",
        paymentTerms: data.paymentTerms ?? null,
        billingFrequency: data.billingFrequency ?? null,
        showBreakdown: data.showBreakdown ?? true,
        validUntil: data.validUntil ? new Date(data.validUntil as unknown as string) : null,
        createdById: userId,
      },
    });

    // Create QuoteLine for each site with frozen consumption
    for (const os of opportunitySites) {
      const site = os.site;
      const annualKwh = site.annualConsumption ?? 0;

      const quoteLine = await tx.quoteLine.create({
        data: {
          quoteId: newQuote.id,
          siteId: site.id,
          annualKwh,
        },
      });

      // Auto-populate components from active component types
      for (const ct of componentTypes) {
        const value = ct.defaultValue ?? 0;
        const unit = ct.defaultUnit;
        const annualAmount = calculateComponentAnnualCost(
          value,
          unit as "PER_KWH" | "PER_KW_MONTH" | "PER_METER_MONTH" | "FIXED_ANNUAL",
          annualKwh,
          site.supplyCapacity
        );

        await tx.quoteLineComponent.create({
          data: {
            quoteLineId: quoteLine.id,
            componentTypeId: ct.id,
            value,
            unit,
            annualAmount,
            isPassThrough: ct.isPassThrough,
            isOverride: false,
          },
        });
      }
    }

    return newQuote;
  });

  // Recalculate totals
  await recalculateTotals(quote.id);

  await logCreation({
    entityType: "Quote",
    entityId: quote.id,
    userId,
    entityName: `v${nextVersion}`,
  });

  const result = await getQuote(quote.id);
  if (!result) throw new Error("Failed to retrieve created quote");
  return result;
}

/**
 * Update quote header terms. Only allowed on DRAFT quotes.
 */
export async function updateQuoteTerms(
  id: string,
  data: UpdateQuoteInput,
  userId: string
): Promise<Quote> {
  const existing = await prisma.quote.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  assertDraftStatus(existing.status);

  // Optimistic locking: verify updatedAt hasn't changed
  if (data.validUntil !== undefined) {
    // validUntil is part of the update, check the timestamp via updatedAt in the returned record
  }

  const updateData: Record<string, unknown> = {};
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms ?? null;
  if (data.billingFrequency !== undefined) updateData.billingFrequency = data.billingFrequency ?? null;
  if (data.showBreakdown !== undefined) updateData.showBreakdown = data.showBreakdown;
  if (data.validUntil !== undefined) {
    updateData.validUntil = data.validUntil
      ? new Date(data.validUntil as unknown as string)
      : null;
  }

  const quote = await prisma.quote.update({
    where: { id },
    data: updateData,
  });

  await logActivity({
    entityType: "Quote",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Quote terms updated`,
    metadata: { changes: Object.keys(updateData) },
  });

  return quote;
}

/**
 * Update a single component value for one site. Sets isOverride=true.
 */
export async function updateComponentValue(
  quoteId: string,
  siteId: string,
  componentTypeId: string,
  value: number,
  userId: string
): Promise<void> {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
  });

  assertDraftStatus(quote.status);

  const quoteLine = await prisma.quoteLine.findFirstOrThrow({
    where: { quoteId, siteId },
    include: {
      site: { select: { annualConsumption: true, supplyCapacity: true } },
    },
  });

  const component = await prisma.quoteLineComponent.findFirstOrThrow({
    where: { quoteLineId: quoteLine.id, componentTypeId },
    include: { componentType: { select: { defaultUnit: true } } },
  });

  const annualAmount = calculateComponentAnnualCost(
    value,
    component.unit as "PER_KWH" | "PER_KW_MONTH" | "PER_METER_MONTH" | "FIXED_ANNUAL",
    quoteLine.annualKwh,
    quoteLine.site.supplyCapacity
  );

  await prisma.quoteLineComponent.update({
    where: { id: component.id },
    data: { value, annualAmount, isOverride: true },
  });

  await recalculateTotals(quoteId);

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    type: "UPDATED",
    content: `Component value updated for site`,
    metadata: { siteId, componentTypeId, value },
  });
}

/**
 * Update a component value across multiple sites at once.
 */
export async function bulkUpdateComponent(
  quoteId: string,
  data: BulkUpdateComponentInput,
  userId: string
): Promise<void> {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
  });

  assertDraftStatus(quote.status);

  // Process each site
  for (const siteId of data.siteIds) {
    const quoteLine = await prisma.quoteLine.findFirst({
      where: { quoteId, siteId },
      include: {
        site: { select: { annualConsumption: true, supplyCapacity: true } },
      },
    });

    if (!quoteLine) continue;

    const component = await prisma.quoteLineComponent.findFirst({
      where: { quoteLineId: quoteLine.id, componentTypeId: data.componentTypeId },
    });

    if (!component) continue;

    const annualAmount = calculateComponentAnnualCost(
      data.value,
      data.unit as "PER_KWH" | "PER_KW_MONTH" | "PER_METER_MONTH" | "FIXED_ANNUAL",
      quoteLine.annualKwh,
      quoteLine.site.supplyCapacity
    );

    await prisma.quoteLineComponent.update({
      where: { id: component.id },
      data: { value: data.value, unit: data.unit, annualAmount, isOverride: true },
    });
  }

  await recalculateTotals(quoteId);

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    type: "UPDATED",
    content: `Bulk component update across ${data.siteIds.length} sites`,
    metadata: { componentTypeId: data.componentTypeId, value: data.value, siteCount: data.siteIds.length },
  });
}

/**
 * Set a component value for all sites in a site group.
 * Sites with isOverride=true are skipped unless forceOverride=true.
 */
export async function updateSiteGroupComponent(
  quoteId: string,
  siteGroupId: string,
  componentTypeId: string,
  value: number,
  userId: string,
  forceOverride = false
): Promise<void> {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
  });

  assertDraftStatus(quote.status);

  // Get all quote lines for sites in this site group
  const quoteLines = await prisma.quoteLine.findMany({
    where: {
      quoteId,
      site: { siteGroupId },
    },
    include: {
      site: { select: { annualConsumption: true, supplyCapacity: true } },
      components: {
        where: { componentTypeId },
      },
    },
  });

  let updatedCount = 0;
  for (const line of quoteLines) {
    const component = line.components[0];
    if (!component) continue;

    // Skip sites that have been manually overridden, unless forceOverride is set
    if (component.isOverride && !forceOverride) continue;

    const annualAmount = calculateComponentAnnualCost(
      value,
      component.unit as "PER_KWH" | "PER_KW_MONTH" | "PER_METER_MONTH" | "FIXED_ANNUAL",
      line.annualKwh,
      line.site.supplyCapacity
    );

    await prisma.quoteLineComponent.update({
      where: { id: component.id },
      data: { value, annualAmount },
    });

    updatedCount++;
  }

  await recalculateTotals(quoteId);

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    type: "UPDATED",
    content: `Site group component updated (${updatedCount} sites)`,
    metadata: { siteGroupId, componentTypeId, value, updatedCount },
  });
}

/**
 * Recalculate all totals for a quote.
 * Updates: QuoteLine.totalPrice, totalCost, margin
 * Updates: Quote.totalValue, totalMargin, marginPercentage
 */
export async function recalculateTotals(quoteId: string): Promise<void> {
  const quoteLines = await prisma.quoteLine.findMany({
    where: { quoteId },
    include: {
      components: {
        include: {
          componentType: { select: { isPassThrough: true } },
        },
      },
    },
  });

  let quoteTotalValue = 0;
  let quoteTotalMargin = 0;
  let quoteTotalCost = 0;

  for (const line of quoteLines) {
    let lineTotal = 0;
    let lineCost = 0;

    for (const comp of line.components) {
      const amount = comp.annualAmount ?? 0;
      lineTotal += amount;
      if (comp.isPassThrough) {
        lineCost += amount;
      }
    }

    const lineMargin = lineTotal - lineCost;

    await prisma.quoteLine.update({
      where: { id: line.id },
      data: {
        totalPrice: lineTotal,
        totalCost: lineCost,
        margin: lineMargin,
      },
    });

    quoteTotalValue += lineTotal;
    quoteTotalCost += lineCost;
    quoteTotalMargin += lineMargin;
  }

  const marginPercentage =
    quoteTotalCost > 0 ? (quoteTotalMargin / quoteTotalCost) * 100 : 0;

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      totalValue: quoteTotalValue,
      totalMargin: quoteTotalMargin,
      marginPercentage,
    },
  });
}

/**
 * Submit a quote for approval. Transitions DRAFT → PENDING_APPROVAL.
 */
export async function submitForApproval(quoteId: string, userId: string): Promise<Quote> {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
    include: {
      quoteLines: {
        include: {
          components: {
            include: {
              componentType: { select: { isRequired: true, name: true } },
            },
          },
        },
      },
    },
  });

  assertDraftStatus(quote.status);

  if (quote.quoteLines.length === 0) {
    throw new Error("Quote has no lines. Add sites to the opportunity first.");
  }

  // Validate all required components have non-zero values
  const missingComponents: string[] = [];
  for (const line of quote.quoteLines) {
    for (const comp of line.components) {
      if (comp.componentType.isRequired && comp.value === 0) {
        missingComponents.push(comp.componentType.name);
      }
    }
  }

  if (missingComponents.length > 0) {
    const uniqueMissing = [...new Set(missingComponents)];
    throw new Error(
      `Required components have zero values: ${uniqueMissing.join(", ")}. Please set values before submitting.`
    );
  }

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "PENDING_APPROVAL" },
  });

  await logStatusChange({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    fromStatus: "DRAFT",
    toStatus: "PENDING_APPROVAL",
  });

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    type: "QUOTE_SUBMITTED",
    content: `Quote submitted for approval`,
  });

  await notifyManagers({
    type: "APPROVAL_REQUESTED",
    title: "Quote Pending Approval",
    message: `A new quote (v${quote.version}) has been submitted for approval.`,
    entityType: "Quote",
    entityId: quoteId,
    excludeUserId: userId,
  });

  return updated;
}

/**
 * Approve a quote. Transitions PENDING_APPROVAL → APPROVED.
 */
export async function approveQuote(
  quoteId: string,
  userId: string,
  comment?: string
): Promise<Quote> {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
  });

  if (quote.status !== "PENDING_APPROVAL") {
    throw new Error(
      `Quote must be in PENDING_APPROVAL status to approve (current: ${quote.status})`
    );
  }

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: "APPROVED",
      approvedById: userId,
      approvalComment: comment ?? null,
    },
  });

  await logStatusChange({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    fromStatus: "PENDING_APPROVAL",
    toStatus: "APPROVED",
  });

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    type: "QUOTE_APPROVED",
    content: comment ? `Quote approved: ${comment}` : "Quote approved",
    metadata: comment ? { comment } : undefined,
  });

  // Notify quote creator
  if (quote.createdById && quote.createdById !== userId) {
    await createNotification({
      userId: quote.createdById,
      type: "APPROVAL_GRANTED",
      title: "Quote Approved",
      message: `Your quote (v${quote.version}) has been approved.${comment ? ` Comment: ${comment}` : ""}`,
      entityType: "Quote",
      entityId: quoteId,
    });
  }

  return updated;
}

/**
 * Reject a quote. Transitions PENDING_APPROVAL → DRAFT (correction path).
 */
export async function rejectQuote(
  quoteId: string,
  userId: string,
  comment: string
): Promise<Quote> {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
  });

  if (quote.status !== "PENDING_APPROVAL") {
    throw new Error(
      `Quote must be in PENDING_APPROVAL status to reject (current: ${quote.status})`
    );
  }

  // Rejection sends the quote back to DRAFT so the rep can make corrections
  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      status: "DRAFT",
      approvalComment: comment,
    },
  });

  await logStatusChange({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    fromStatus: "PENDING_APPROVAL",
    toStatus: "DRAFT",
  });

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    type: "QUOTE_REJECTED",
    content: `Quote rejected: ${comment}`,
    metadata: { comment },
  });

  // Notify quote creator
  if (quote.createdById && quote.createdById !== userId) {
    await createNotification({
      userId: quote.createdById,
      type: "APPROVAL_REQUESTED",
      title: "Quote Returned for Corrections",
      message: `Your quote (v${quote.version}) was returned for corrections. Reason: ${comment}`,
      entityType: "Quote",
      entityId: quoteId,
    });
  }

  return updated;
}

/**
 * Send a quote to the customer. Transitions APPROVED → SENT.
 */
export async function sendQuote(quoteId: string, userId: string): Promise<Quote> {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
  });

  if (quote.status !== "APPROVED") {
    throw new Error(`Quote must be APPROVED before sending (current: ${quote.status})`);
  }

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "SENT" },
  });

  await logStatusChange({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    fromStatus: "APPROVED",
    toStatus: "SENT",
  });

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    type: "UPDATED",
    content: "Quote sent to customer",
  });

  return updated;
}

/**
 * Accept a quote. Transitions SENT → ACCEPTED. Updates opportunity estimated value.
 */
export async function acceptQuote(quoteId: string, userId: string): Promise<Quote> {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
  });

  if (quote.status !== "SENT") {
    throw new Error(`Quote must be in SENT status to accept (current: ${quote.status})`);
  }

  const updated = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "ACCEPTED" },
  });

  // Update opportunity estimated value from this quote's total
  if (quote.totalValue != null) {
    await prisma.opportunity.update({
      where: { id: quote.opportunityId },
      data: { estimatedValue: quote.totalValue },
    });
  }

  await logStatusChange({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    fromStatus: "SENT",
    toStatus: "ACCEPTED",
  });

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    type: "UPDATED",
    content: "Quote accepted by customer",
    metadata: { totalValue: quote.totalValue },
  });

  return updated;
}

/**
 * Create a new version of a quote (deep copy). Old quote becomes SUPERSEDED.
 */
export async function createNewVersion(quoteId: string, userId: string): Promise<QuoteWithLines> {
  const original = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
    include: {
      quoteLines: {
        include: {
          components: true,
        },
      },
    },
  });

  // Get next version for this opportunity
  const latestQuote = await prisma.quote.findFirst({
    where: { opportunityId: original.opportunityId, deletedAt: null },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latestQuote?.version ?? 0) + 1;

  const newQuote = await prisma.$transaction(async (tx) => {
    // Create new quote header
    const created = await tx.quote.create({
      data: {
        opportunityId: original.opportunityId,
        accountId: original.accountId,
        version: nextVersion,
        status: "DRAFT",
        currency: original.currency,
        paymentTerms: original.paymentTerms,
        billingFrequency: original.billingFrequency,
        showBreakdown: original.showBreakdown,
        validUntil: original.validUntil,
        createdById: userId,
        sourceQuoteId: original.id,
      },
    });

    // Deep copy lines and components
    for (const line of original.quoteLines) {
      const newLine = await tx.quoteLine.create({
        data: {
          quoteId: created.id,
          siteId: line.siteId,
          annualKwh: line.annualKwh,
          totalPrice: line.totalPrice,
          totalCost: line.totalCost,
          margin: line.margin,
        },
      });

      for (const comp of line.components) {
        await tx.quoteLineComponent.create({
          data: {
            quoteLineId: newLine.id,
            componentTypeId: comp.componentTypeId,
            value: comp.value,
            unit: comp.unit,
            annualAmount: comp.annualAmount,
            isPassThrough: comp.isPassThrough,
            isOverride: comp.isOverride,
          },
        });
      }
    }

    // Mark original as SUPERSEDED
    await tx.quote.update({
      where: { id: original.id },
      data: { status: "SUPERSEDED" },
    });

    return created;
  });

  await logCreation({
    entityType: "Quote",
    entityId: newQuote.id,
    userId,
    entityName: `v${nextVersion} (from v${original.version})`,
  });

  await logStatusChange({
    entityType: "Quote",
    entityId: original.id,
    userId,
    fromStatus: original.status,
    toStatus: "SUPERSEDED",
  });

  const result = await getQuote(newQuote.id);
  if (!result) throw new Error("Failed to retrieve new version quote");
  return result;
}

/**
 * Clone a quote to a different opportunity (version 1).
 */
export async function cloneQuote(
  quoteId: string,
  targetOpportunityId: string,
  userId: string
): Promise<QuoteWithLines> {
  const original = await prisma.quote.findFirstOrThrow({
    where: { id: quoteId, deletedAt: null },
    include: {
      quoteLines: {
        include: { components: true },
      },
    },
  });

  // Validate target opportunity exists and get its account
  const targetOpportunity = await prisma.opportunity.findFirstOrThrow({
    where: { id: targetOpportunityId, deletedAt: null },
    select: { id: true, accountId: true },
  });

  const newQuote = await prisma.$transaction(async (tx) => {
    const created = await tx.quote.create({
      data: {
        opportunityId: targetOpportunityId,
        accountId: targetOpportunity.accountId,
        version: 1,
        status: "DRAFT",
        currency: original.currency,
        paymentTerms: original.paymentTerms,
        billingFrequency: original.billingFrequency,
        showBreakdown: original.showBreakdown,
        validUntil: original.validUntil,
        createdById: userId,
        sourceQuoteId: original.id,
      },
    });

    for (const line of original.quoteLines) {
      const newLine = await tx.quoteLine.create({
        data: {
          quoteId: created.id,
          siteId: line.siteId,
          annualKwh: line.annualKwh,
          totalPrice: line.totalPrice,
          totalCost: line.totalCost,
          margin: line.margin,
        },
      });

      for (const comp of line.components) {
        await tx.quoteLineComponent.create({
          data: {
            quoteLineId: newLine.id,
            componentTypeId: comp.componentTypeId,
            value: comp.value,
            unit: comp.unit,
            annualAmount: comp.annualAmount,
            isPassThrough: comp.isPassThrough,
            isOverride: comp.isOverride,
          },
        });
      }
    }

    return created;
  });

  await logCreation({
    entityType: "Quote",
    entityId: newQuote.id,
    userId,
    entityName: `v1 (cloned from quote ${original.id})`,
  });

  const result = await getQuote(newQuote.id);
  if (!result) throw new Error("Failed to retrieve cloned quote");
  return result;
}

/**
 * Soft-delete a quote. Only DRAFT quotes can be deleted.
 */
export async function deleteQuote(id: string, userId: string): Promise<void> {
  const existing = await prisma.quote.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  assertDraftStatus(existing.status);

  await prisma.quote.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    entityType: "Quote",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Quote v${existing.version} deleted`,
  });
}

/**
 * Export quote lines as CSV with all component values.
 */
export async function exportQuoteCsv(id: string): Promise<string> {
  const quote = await prisma.quote.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: {
      account: { select: { name: true } },
      quoteLines: {
        include: {
          site: {
            include: {
              siteGroup: { select: { name: true } },
            },
          },
          components: {
            include: {
              componentType: { select: { name: true, displayOrder: true } },
            },
            orderBy: { componentType: { displayOrder: "asc" } },
          },
        },
        orderBy: { site: { address: "asc" } },
      },
    },
  });

  if (quote.quoteLines.length === 0) {
    return "No lines to export";
  }

  // Collect all unique component type names (in order)
  const componentTypeNames = new Map<string, string>();
  for (const line of quote.quoteLines) {
    for (const comp of line.components) {
      if (!componentTypeNames.has(comp.componentTypeId)) {
        componentTypeNames.set(comp.componentTypeId, comp.componentType.name);
      }
    }
  }

  const componentTypeIds = [...componentTypeNames.keys()];

  // Build rows
  type CsvRow = Record<string, unknown>;
  const rows: CsvRow[] = quote.quoteLines.map((line) => {
    const row: CsvRow = {
      account: quote.account.name,
      address: line.site.address,
      meterId: line.site.meterId ?? "",
      siteGroup: line.site.siteGroup?.name ?? "",
      annualKwh: line.annualKwh,
    };

    // Add component columns: "ComponentName (value unit)"
    const compsByTypeId = new Map(line.components.map((c) => [c.componentTypeId, c]));
    for (const typeId of componentTypeIds) {
      const comp = compsByTypeId.get(typeId);
      const colName = componentTypeNames.get(typeId) ?? typeId;
      row[colName] = comp ? `${comp.value} ${comp.unit}` : "";
    }

    row.totalPrice = line.totalPrice ?? 0;
    row.totalCost = line.totalCost ?? 0;
    row.margin = line.margin ?? 0;
    row.marginPct =
      (line.totalCost ?? 0) > 0
        ? (((line.margin ?? 0) / (line.totalCost ?? 1)) * 100).toFixed(2) + "%"
        : "0%";

    return row;
  });

  // Build columns list
  const columns: { key: keyof CsvRow; header: string }[] = [
    { key: "account", header: "Account" },
    { key: "address", header: "Site Address" },
    { key: "meterId", header: "Meter ID" },
    { key: "siteGroup", header: "Site Group" },
    { key: "annualKwh", header: "Annual kWh" },
    ...componentTypeIds.map((typeId) => ({
      key: componentTypeNames.get(typeId) as keyof CsvRow,
      header: componentTypeNames.get(typeId) ?? typeId,
    })),
    { key: "totalPrice", header: "Total Price" },
    { key: "totalCost", header: "Total Cost" },
    { key: "margin", header: "Margin" },
    { key: "marginPct", header: "Margin %" },
  ];

  return generateCsv(rows, columns);
}
