import { prisma } from "@/lib/db";
import { logActivity, logCreation } from "./activity-log.service";
import type { CreateAccountInput, UpdateAccountInput } from "@/lib/validators/account";
import type { Account, Contact, Site, SiteGroup, Opportunity } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountWithDetails = Account & {
  _count: { sites: number; opportunities: number; contacts: number };
};

export type AccountFull = Account & {
  contacts: Contact[];
  siteGroups: (SiteGroup & { sites: Site[] })[];
  sites: (Site & { siteGroup: { id: string; name: string } | null })[];
  opportunities: Opportunity[];
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all accounts with optional search filtering.
 */
export async function getAccounts(params?: {
  search?: string;
}): Promise<AccountWithDetails[]> {
  const where: Record<string, unknown> = { deletedAt: null };

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search } },
      { industry: { contains: params.search } },
      { currentSupplier: { contains: params.search } },
    ];
  }

  return prisma.account.findMany({
    where,
    include: {
      _count: {
        select: { sites: true, opportunities: true, contacts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  }) as Promise<AccountWithDetails[]>;
}

/**
 * Get a single account by ID with full details.
 */
export async function getAccount(id: string): Promise<AccountFull | null> {
  return prisma.account.findFirst({
    where: { id, deletedAt: null },
    include: {
      contacts: {
        where: { deletedAt: null },
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      },
      siteGroups: {
        where: { deletedAt: null },
        include: {
          sites: {
            where: { deletedAt: null },
            orderBy: { address: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
      sites: {
        where: { deletedAt: null },
        include: { siteGroup: { select: { id: true, name: true } } },
        orderBy: { address: "asc" },
      },
      opportunities: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  }) as Promise<AccountFull | null>;
}

/**
 * Create a new account.
 */
export async function createAccount(
  data: CreateAccountInput,
  userId: string
): Promise<Account> {
  const account = await prisma.account.create({
    data: {
      name: data.name,
      industry: data.industry || null,
      creditStatus: data.creditStatus ?? "NOT_ASSESSED",
      currentSupplier: data.currentSupplier || null,
      contractEndDate: data.contractEndDate
        ? new Date(data.contractEndDate)
        : null,
      createdById: userId,
    },
  });

  await logCreation({
    entityType: "Account",
    entityId: account.id,
    userId,
    entityName: account.name,
  });

  return account;
}

/**
 * Update an account.
 */
export async function updateAccount(
  id: string,
  data: UpdateAccountInput,
  userId: string
): Promise<Account> {
  const existing = await prisma.account.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.industry !== undefined) cleaned.industry = data.industry || null;
  if (data.creditStatus !== undefined) cleaned.creditStatus = data.creditStatus;
  if (data.currentSupplier !== undefined)
    cleaned.currentSupplier = data.currentSupplier || null;
  if (data.contractEndDate !== undefined)
    cleaned.contractEndDate = data.contractEndDate
      ? new Date(data.contractEndDate)
      : null;

  const account = await prisma.account.update({
    where: { id },
    data: cleaned,
  });

  await logActivity({
    entityType: "Account",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Account "${existing.name}" updated`,
  });

  return account;
}

/**
 * Soft-delete an account.
 */
export async function deleteAccount(id: string, userId: string): Promise<void> {
  const existing = await prisma.account.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  await prisma.account.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    entityType: "Account",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Account "${existing.name}" deleted`,
  });
}
