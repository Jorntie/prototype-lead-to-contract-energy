import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/services/activity-log.service";
import type {
  CreateContractInput,
  UpdateContractInput,
  UpdateContractStatusInput,
} from "@/lib/validators/contract";

export type ContractWithDetails = NonNullable<Awaited<ReturnType<typeof getContract>>>;
export type ContractListItem = Awaited<ReturnType<typeof getContracts>>[number];

export async function getContracts() {
  return prisma.contract.findMany({
    where: { deletedAt: null },
    include: {
      quote: {
        include: {
          opportunity: {
            include: {
              account: true,
              assignedTo: true,
            },
          },
        },
      },
      account: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContract(id: string) {
  return prisma.contract.findFirst({
    where: { id, deletedAt: null },
    include: {
      quote: {
        include: {
          opportunity: {
            include: {
              account: true,
              assignedTo: true,
              opportunitySites: { include: { site: true } },
            },
          },
          quoteLines: {
            include: {
              site: true,
              components: {
                include: { componentType: true },
              },
            },
          },
        },
      },
      account: true,
    },
  });
}

export async function getContractByQuoteId(quoteId: string) {
  return prisma.contract.findFirst({
    where: { quoteId, deletedAt: null },
  });
}

export async function createContractFromQuote(
  input: CreateContractInput,
  userId: string
) {
  const { quoteId } = input;

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, deletedAt: null },
    include: {
      opportunity: { include: { account: true } },
    },
  });

  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "ACCEPTED")
    throw new Error("Only accepted quotes can generate a contract");

  const existing = await prisma.contract.findFirst({
    where: { quoteId, deletedAt: null, status: { not: "TERMINATED" } },
  });
  if (existing) throw new Error("A contract already exists for this quote");

  const accountId = quote.opportunity?.accountId;
  if (!accountId) throw new Error("Quote has no associated account");

  const startDate =
    input.startDate instanceof Date
      ? input.startDate
      : input.startDate
        ? new Date(input.startDate)
        : new Date();

  const contractDuration = quote.opportunity?.contractDuration;
  const endDate =
    input.endDate instanceof Date
      ? input.endDate
      : input.endDate
        ? new Date(input.endDate)
        : contractDuration
          ? new Date(
              new Date(startDate).setMonth(startDate.getMonth() + contractDuration)
            )
          : null;

  const contract = await prisma.contract.create({
    data: {
      quoteId,
      accountId,
      status: "DRAFT",
      startDate,
      endDate,
      createdById: userId,
    },
  });

  await logActivity({
    entityType: "Contract",
    entityId: contract.id,
    userId,
    type: "NOTE",
    content: `Contract created from quote v${quote.version} for ${quote.opportunity?.account?.name}`,
  });

  await logActivity({
    entityType: "Quote",
    entityId: quoteId,
    userId,
    type: "NOTE",
    content: "Contract generated from this quote",
    metadata: { contractId: contract.id },
  });

  return contract;
}

export async function updateContract(
  id: string,
  input: UpdateContractInput,
  userId: string
) {
  const parseDate = (v: unknown) =>
    v instanceof Date ? v : v ? new Date(v as string) : undefined;

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      startDate: parseDate(input.startDate),
      endDate: parseDate(input.endDate),
      signedDate: parseDate(input.signedDate),
      documentUrl: input.documentUrl || null,
    },
  });

  await logActivity({
    entityType: "Contract",
    entityId: id,
    userId,
    type: "NOTE",
    content: "Contract details updated",
  });

  return contract;
}

export async function updateContractStatus(
  id: string,
  input: UpdateContractStatusInput,
  userId: string
) {
  const data: Record<string, unknown> = { status: input.status };
  if (input.status === "SIGNED" && input.signedDate) {
    data.signedDate =
      input.signedDate instanceof Date
        ? input.signedDate
        : new Date(input.signedDate as string);
  }

  const contract = await prisma.contract.update({ where: { id }, data });

  await logActivity({
    entityType: "Contract",
    entityId: id,
    userId,
    type: "NOTE",
    content: `Contract status changed to ${input.status}`,
  });

  return contract;
}

export async function deleteContract(id: string, userId: string) {
  await prisma.contract.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    entityType: "Contract",
    entityId: id,
    userId,
    type: "NOTE",
    content: "Contract deleted",
  });
}
