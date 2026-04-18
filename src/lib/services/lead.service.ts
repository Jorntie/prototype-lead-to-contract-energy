import { prisma } from "@/lib/db";
import { logActivity, logCreation, logStatusChange } from "./activity-log.service";
import type { CreateLeadInput, UpdateLeadInput, ConvertLeadInput, LeadStatus } from "@/lib/validators/lead";
import type { Lead, Account, Opportunity } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeadWithAssignee = Lead & {
  assignedTo: { id: string; name: string; email: string } | null;
  convertedToAccount?: { id: string; name: string } | null;
};

// ---------------------------------------------------------------------------
// Status transition rules
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<string, LeadStatus[]> = {
  NEW: ["CONTACTED", "QUALIFIED", "DISQUALIFIED"],
  CONTACTED: ["QUALIFIED", "DISQUALIFIED"],
  QUALIFIED: ["CONVERTED", "DISQUALIFIED"],
  DISQUALIFIED: ["NEW"],
  CONVERTED: [], // terminal
};

function assertValidTransition(from: string, to: string): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to as LeadStatus)) {
    throw new Error(`Invalid status transition from ${from} to ${to}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanInput(data: CreateLeadInput | UpdateLeadInput) {
  const cleaned: Record<string, unknown> = {};

  if (data.companyName !== undefined) cleaned.companyName = data.companyName;
  if (data.contactName !== undefined) cleaned.contactName = data.contactName;
  if (data.email !== undefined) cleaned.email = data.email || null;
  if (data.phone !== undefined) cleaned.phone = data.phone || null;
  if (data.estimatedSites !== undefined)
    cleaned.estimatedSites = data.estimatedSites ? Number(data.estimatedSites) : null;
  if (data.estimatedVolume !== undefined)
    cleaned.estimatedVolume = data.estimatedVolume ? Number(data.estimatedVolume) : null;
  if (data.currentSupplier !== undefined) cleaned.currentSupplier = data.currentSupplier || null;
  if (data.contractEndDate !== undefined)
    cleaned.contractEndDate = data.contractEndDate ? new Date(data.contractEndDate as unknown as string) : null;
  if (data.notes !== undefined) cleaned.notes = data.notes || null;
  if (data.assignedToId !== undefined) cleaned.assignedToId = data.assignedToId || null;

  return cleaned;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all leads with optional filtering by status, assignee, or search term.
 */
export async function getLeads(params?: {
  status?: string;
  assignedToId?: string;
  search?: string;
}): Promise<LeadWithAssignee[]> {
  const where: Record<string, unknown> = { deletedAt: null };

  if (params?.status) {
    where.status = params.status;
  }
  if (params?.assignedToId) {
    where.assignedToId = params.assignedToId;
  }
  if (params?.search) {
    where.OR = [
      { companyName: { contains: params.search } },
      { contactName: { contains: params.search } },
      { email: { contains: params.search } },
    ];
  }

  return prisma.lead.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  }) as Promise<LeadWithAssignee[]>;
}

/**
 * Get a single lead by ID.
 */
export async function getLead(id: string): Promise<LeadWithAssignee | null> {
  return prisma.lead.findFirst({
    where: { id, deletedAt: null },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      convertedToAccount: { select: { id: true, name: true } },
    },
  }) as Promise<LeadWithAssignee | null>;
}

/** Alias for backward compatibility. */
export const getLeadById = getLead;

/**
 * Create a new lead.
 */
export async function createLead(data: CreateLeadInput, userId: string): Promise<Lead> {
  const lead = await prisma.lead.create({
    data: {
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email || null,
      phone: data.phone || null,
      estimatedSites: data.estimatedSites ? Number(data.estimatedSites) : null,
      estimatedVolume: data.estimatedVolume ? Number(data.estimatedVolume) : null,
      currentSupplier: data.currentSupplier || null,
      contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
      notes: data.notes || null,
      assignedToId: data.assignedToId || null,
      status: "NEW",
      createdById: userId,
    },
  });

  await logCreation({
    entityType: "Lead",
    entityId: lead.id,
    userId,
    entityName: lead.companyName,
  });

  return lead;
}

/**
 * Update a lead.
 */
export async function updateLead(id: string, data: UpdateLeadInput, userId: string): Promise<Lead> {
  const existing = await prisma.lead.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  const lead = await prisma.lead.update({
    where: { id },
    data: cleanInput(data),
  });

  await logActivity({
    entityType: "Lead",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Lead "${existing.companyName}" updated`,
  });

  return lead;
}

/**
 * Update lead status with validation of allowed transitions.
 */
export async function updateLeadStatus(id: string, newStatus: string, userId: string): Promise<Lead> {
  const existing = await prisma.lead.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  if (existing.status === newStatus) return existing;

  assertValidTransition(existing.status, newStatus);

  const lead = await prisma.lead.update({
    where: { id },
    data: { status: newStatus },
  });

  await logStatusChange({
    entityType: "Lead",
    entityId: id,
    userId,
    fromStatus: existing.status,
    toStatus: newStatus,
  });

  return lead;
}

/**
 * Convert a lead to an Account + Opportunity.
 * Runs in a Prisma transaction.
 */
export async function convertLead(
  id: string,
  data: ConvertLeadInput,
  userId: string
): Promise<{ account: Account; opportunity: Opportunity }> {
  const lead = await prisma.lead.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  if (lead.status === "CONVERTED") {
    throw new Error("Lead is already converted");
  }
  if (lead.status === "DISQUALIFIED") {
    throw new Error("Cannot convert a disqualified lead");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create account from lead data
    const account = await tx.account.create({
      data: {
        name: lead.companyName,
        currentSupplier: lead.currentSupplier,
        contractEndDate: lead.contractEndDate,
        industry: data.industry || null,
        creditStatus: data.creditStatus ?? "NOT_ASSESSED",
        createdFromLeadId: lead.id,
        createdById: userId,
      },
    });

    // Create primary contact from lead
    if (lead.contactName) {
      await tx.contact.create({
        data: {
          accountId: account.id,
          name: lead.contactName,
          email: lead.email,
          phone: lead.phone,
          isPrimary: true,
        },
      });
    }

    // Create opportunity linked to the account
    const opportunity = await tx.opportunity.create({
      data: {
        accountId: account.id,
        stage: "DISCOVERY",
        assignedToId: lead.assignedToId,
        createdById: userId,
      },
    });

    // Update lead status to CONVERTED
    await tx.lead.update({
      where: { id },
      data: {
        status: "CONVERTED",
        convertedToAccountId: account.id,
      },
    });

    return { account, opportunity };
  });

  // Log activities after transaction succeeds
  await logStatusChange({
    entityType: "Lead",
    entityId: id,
    userId,
    fromStatus: lead.status,
    toStatus: "CONVERTED",
  });

  await logActivity({
    entityType: "Lead",
    entityId: id,
    userId,
    type: "CONVERTED",
    content: `Lead "${lead.companyName}" converted to Account "${result.account.name}"`,
    metadata: {
      accountId: result.account.id,
      opportunityId: result.opportunity.id,
    },
  });

  await logCreation({
    entityType: "Account",
    entityId: result.account.id,
    userId,
    entityName: result.account.name,
  });

  await logCreation({
    entityType: "Opportunity",
    entityId: result.opportunity.id,
    userId,
  });

  return result;
}

/**
 * Soft-delete a lead.
 */
export async function deleteLead(id: string, userId: string): Promise<void> {
  const existing = await prisma.lead.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  await prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    entityType: "Lead",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Lead "${existing.companyName}" deleted`,
  });
}

/**
 * Get all users (for assignment dropdowns).
 */
export async function getUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}
