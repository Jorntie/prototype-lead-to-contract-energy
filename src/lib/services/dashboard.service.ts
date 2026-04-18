import { prisma } from "@/lib/db";

// ─── KPI Dashboard ───────────────────────────────────────────────────────────

export interface DashboardKPIs {
  openLeads: number;
  leadsThisMonth: number;
  activeOpportunities: number;
  pipelineValue: number;
  pendingQuotes: number;
  quotesValue: number;
  signedContracts: number;
  contractsValue: number;
  conversionRate: number;
  avgDealSize: number;
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfQuarter = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1
  );

  const [
    openLeads,
    leadsThisMonth,
    activeOpportunities,
    pipelineAgg,
    pendingQuotes,
    quotesAgg,
    signedContracts,
    wonOpportunities,
    totalClosedOpportunities,
  ] = await Promise.all([
    // Open leads (NEW or CONTACTED)
    prisma.lead.count({
      where: {
        deletedAt: null,
        status: { in: ["NEW", "CONTACTED"] },
      },
    }),

    // Leads created this month
    prisma.lead.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startOfMonth },
      },
    }),

    // Active opportunities (not WON or LOST)
    prisma.opportunity.count({
      where: {
        deletedAt: null,
        stage: { notIn: ["WON", "LOST"] },
      },
    }),

    // Pipeline value (sum of estimatedValue for active opportunities)
    prisma.opportunity.aggregate({
      _sum: { estimatedValue: true },
      where: {
        deletedAt: null,
        stage: { notIn: ["WON", "LOST"] },
      },
    }),

    // Pending quotes (DRAFT, PENDING_APPROVAL, APPROVED, SENT)
    prisma.quote.count({
      where: {
        deletedAt: null,
        status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT"] },
      },
    }),

    // Total value of active quotes
    prisma.quote.aggregate({
      _sum: { totalValue: true },
      where: {
        deletedAt: null,
        status: { in: ["SENT", "ACCEPTED"] },
      },
    }),

    // Signed contracts this quarter
    prisma.contract.count({
      where: {
        deletedAt: null,
        status: { in: ["SIGNED", "ACTIVE"] },
        signedDate: { gte: startOfQuarter },
      },
    }),

    // Won opportunities (for conversion rate)
    prisma.opportunity.count({
      where: { deletedAt: null, stage: "WON" },
    }),

    // Total closed opportunities (WON + LOST)
    prisma.opportunity.count({
      where: {
        deletedAt: null,
        stage: { in: ["WON", "LOST"] },
      },
    }),
  ]);

  const pipelineValue = pipelineAgg._sum.estimatedValue ?? 0;
  const quotesValue = quotesAgg._sum.totalValue ?? 0;
  const conversionRate =
    totalClosedOpportunities > 0
      ? (wonOpportunities / totalClosedOpportunities) * 100
      : 0;

  // Avg deal size from won opportunities
  const wonAgg = await prisma.opportunity.aggregate({
    _avg: { estimatedValue: true },
    where: { deletedAt: null, stage: "WON" },
  });
  const avgDealSize = wonAgg._avg.estimatedValue ?? 0;

  // Count contracts with totalValue from associated quotes
  const signedContractsWithValue = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      status: { in: ["SIGNED", "ACTIVE"] },
    },
    include: { quote: { select: { totalValue: true } } },
  });
  const contractsValue = signedContractsWithValue.reduce(
    (sum, c) => sum + (c.quote?.totalValue ?? 0),
    0
  );

  return {
    openLeads,
    leadsThisMonth,
    activeOpportunities,
    pipelineValue,
    pendingQuotes,
    quotesValue,
    signedContracts,
    contractsValue,
    conversionRate,
    avgDealSize,
  };
}

// ─── Pipeline Breakdown ──────────────────────────────────────────────────────

export interface PipelineStageData {
  stage: string;
  label: string;
  count: number;
  value: number;
  color: string;
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  DISCOVERY: { label: "Discovery", color: "#3b82f6" },
  QUOTING: { label: "Quoting", color: "#8b5cf6" },
  PROPOSAL_SENT: { label: "Proposal Sent", color: "#f59e0b" },
  NEGOTIATION: { label: "Negotiation", color: "#ef4444" },
  WON: { label: "Won", color: "#22c55e" },
  LOST: { label: "Lost", color: "#6b7280" },
};

export async function getPipelineBreakdown(): Promise<PipelineStageData[]> {
  const stages = ["DISCOVERY", "QUOTING", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];

  const results = await Promise.all(
    stages.map(async (stage) => {
      const [count, agg] = await Promise.all([
        prisma.opportunity.count({
          where: { deletedAt: null, stage },
        }),
        prisma.opportunity.aggregate({
          _sum: { estimatedValue: true },
          where: { deletedAt: null, stage },
        }),
      ]);
      const config = STAGE_CONFIG[stage] ?? { label: stage, color: "#6b7280" };
      return {
        stage,
        label: config.label,
        count,
        value: agg._sum.estimatedValue ?? 0,
        color: config.color,
      };
    })
  );

  return results;
}

// ─── My Action Items ─────────────────────────────────────────────────────────

export interface ActionItem {
  id: string;
  type: "lead_followup" | "quote_expiring" | "quote_pending" | "opportunity_stuck" | "contract_expiring";
  priority: "overdue" | "this_week" | "upcoming";
  title: string;
  description: string;
  href: string;
  dueDate?: Date;
}

export async function getActionItems(userId?: string): Promise<ActionItem[]> {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const twoWeeksOut = new Date(now);
  twoWeeksOut.setDate(now.getDate() + 14);

  const items: ActionItem[] = [];

  // 1. Leads needing follow-up (CONTACTED status, no activity in 3+ days)
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);
  const staleLeads = await prisma.lead.findMany({
    where: {
      deletedAt: null,
      status: { in: ["NEW", "CONTACTED"] },
      updatedAt: { lt: threeDaysAgo },
      ...(userId ? { assignedToId: userId } : {}),
    },
    select: { id: true, companyName: true, contactName: true, updatedAt: true },
    take: 10,
  });

  for (const lead of staleLeads) {
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    items.push({
      id: `lead-${lead.id}`,
      type: "lead_followup",
      priority: daysSinceUpdate > 7 ? "overdue" : "this_week",
      title: `Follow up with ${lead.companyName}`,
      description: `${lead.contactName} — no activity for ${daysSinceUpdate} days`,
      href: `/leads/${lead.id}`,
      dueDate: lead.updatedAt,
    });
  }

  // 2. Quotes expiring soon
  const expiringQuotes = await prisma.quote.findMany({
    where: {
      deletedAt: null,
      status: { in: ["SENT", "APPROVED"] },
      validUntil: { lte: twoWeeksOut, gte: now },
    },
    include: {
      opportunity: { include: { account: true } },
    },
    take: 10,
  });

  for (const quote of expiringQuotes) {
    const daysUntilExpiry = Math.ceil(
      (new Date(quote.validUntil!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    items.push({
      id: `quote-exp-${quote.id}`,
      type: "quote_expiring",
      priority: daysUntilExpiry <= 3 ? "overdue" : daysUntilExpiry <= 7 ? "this_week" : "upcoming",
      title: `Quote expiring: ${quote.opportunity?.account?.name ?? "Unknown"}`,
      description: `v${quote.version} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`,
      href: `/quotes/${quote.id}`,
      dueDate: quote.validUntil ?? undefined,
    });
  }

  // 3. Quotes pending approval
  const pendingQuotes = await prisma.quote.findMany({
    where: {
      deletedAt: null,
      status: "PENDING_APPROVAL",
    },
    include: {
      opportunity: { include: { account: true } },
    },
    take: 10,
  });

  for (const quote of pendingQuotes) {
    items.push({
      id: `quote-pending-${quote.id}`,
      type: "quote_pending",
      priority: "this_week",
      title: `Review quote: ${quote.opportunity?.account?.name ?? "Unknown"}`,
      description: `v${quote.version} awaiting your approval`,
      href: `/quotes/${quote.id}`,
    });
  }

  // 4. Stuck opportunities (no update in 14+ days, active stages)
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);
  const stuckOpportunities = await prisma.opportunity.findMany({
    where: {
      deletedAt: null,
      stage: { notIn: ["WON", "LOST"] },
      updatedAt: { lt: fourteenDaysAgo },
      ...(userId ? { assignedToId: userId } : {}),
    },
    include: { account: true },
    take: 10,
  });

  for (const opp of stuckOpportunities) {
    const daysSinceUpdate = Math.floor(
      (now.getTime() - opp.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    items.push({
      id: `opp-stuck-${opp.id}`,
      type: "opportunity_stuck",
      priority: daysSinceUpdate > 30 ? "overdue" : "this_week",
      title: `Stuck: ${opp.account?.name ?? "Unknown"}`,
      description: `${STAGE_CONFIG[opp.stage]?.label ?? opp.stage} stage — no update for ${daysSinceUpdate} days`,
      href: `/opportunities/${opp.id}`,
    });
  }

  // 5. Contracts nearing end date
  const expiringContracts = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      endDate: { lte: twoWeeksOut, gte: now },
    },
    include: { account: true },
    take: 10,
  });

  for (const contract of expiringContracts) {
    const daysUntilEnd = Math.ceil(
      (new Date(contract.endDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    items.push({
      id: `contract-exp-${contract.id}`,
      type: "contract_expiring",
      priority: daysUntilEnd <= 7 ? "overdue" : "this_week",
      title: `Contract ending: ${contract.account?.name ?? "Unknown"}`,
      description: `Expires in ${daysUntilEnd} day${daysUntilEnd !== 1 ? "s" : ""}`,
      href: `/contracts/${contract.id}`,
      dueDate: contract.endDate ?? undefined,
    });
  }

  // Sort: overdue first, then this_week, then upcoming
  const priorityOrder = { overdue: 0, this_week: 1, upcoming: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
}

// ─── Lead Source Breakdown ───────────────────────────────────────────────────

export interface LeadSourceData {
  source: string;
  count: number;
  converted: number;
}

export async function getLeadSourceBreakdown(): Promise<LeadSourceData[]> {
  const leads = await prisma.lead.findMany({
    where: { deletedAt: null },
    select: { currentSupplier: true, status: true },
  });

  const sourceMap = new Map<string, { count: number; converted: number }>();

  for (const lead of leads) {
    const source = lead.currentSupplier || "Unknown";
    const entry = sourceMap.get(source) ?? { count: 0, converted: 0 };
    entry.count++;
    if (lead.status === "CONVERTED") entry.converted++;
    sourceMap.set(source, entry);
  }

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({ source, ...data }))
    .sort((a, b) => b.count - a.count);
}
