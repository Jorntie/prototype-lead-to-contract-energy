"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatCurrency, formatNumber, cn } from "@/lib/utils";
import { TrendingUp, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { OpportunityWithDetails } from "@/lib/services/opportunity.service";

const stageVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  DISCOVERY: "info",
  QUOTING: "secondary",
  PROPOSAL_SENT: "warning",
  NEGOTIATION: "default",
  WON: "success",
  LOST: "destructive",
};

const stageLabel: Record<string, string> = {
  DISCOVERY: "Discovery",
  QUOTING: "Quoting",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

const STAGE_ORDER = ["DISCOVERY", "QUOTING", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function isStuckDeal(opportunity: OpportunityWithDetails): boolean {
  const updatedAt = new Date(opportunity.updatedAt).getTime();
  const now = Date.now();
  return (
    now - updatedAt > FOURTEEN_DAYS_MS &&
    opportunity.stage !== "WON" &&
    opportunity.stage !== "LOST"
  );
}

function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getTime() < Date.now();
}

const columns: ColumnDef<OpportunityWithDetails, unknown>[] = [
  {
    accessorKey: "account.name",
    header: "Account",
    cell: ({ row }) => {
      const opp = row.original;
      const stuck = isStuckDeal(opp);
      return (
        <div className="flex items-center gap-2">
          <Link
            href={`/accounts/${opp.account.id}`}
            className="font-medium text-[var(--primary)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {opp.account.name}
          </Link>
          {stuck && (
            <span title="Stuck deal: no progress for 14+ days"><AlertTriangle className="h-4 w-4 text-amber-500" /></span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "expectedCloseDate",
    header: "Expected Close",
    cell: ({ row }) => {
      const date = row.original.expectedCloseDate;
      const overdue = isOverdue(date);
      return (
        <span className={cn(overdue && "text-[var(--destructive)] font-medium")}>
          {formatDate(date)}
        </span>
      );
    },
  },
  {
    accessorKey: "contractDuration",
    header: "Duration",
    cell: ({ row }) =>
      row.original.contractDuration != null
        ? `${row.original.contractDuration} months`
        : "---",
  },
  {
    id: "sites",
    header: "Sites",
    cell: ({ row }) => {
      const count = row.original._count?.opportunitySites ?? 0;
      return <div className="text-right">{formatNumber(count)}</div>;
    },
    enableSorting: false,
  },
  {
    id: "quotes",
    header: "Quotes",
    cell: ({ row }) => {
      const count = row.original._count?.quotes ?? 0;
      return <div className="text-right">{formatNumber(count)}</div>;
    },
    enableSorting: false,
  },
  {
    accessorKey: "estimatedValue",
    header: "Estimated Value",
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatCurrency(row.original.estimatedValue)}
      </div>
    ),
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => row.original.assignedTo?.name ?? "Unassigned",
    enableSorting: false,
  },
];

interface PipelineTableProps {
  opportunities: OpportunityWithDetails[];
}

export function PipelineTable({ opportunities }: PipelineTableProps) {
  const router = useRouter();
  const [collapsedStages, setCollapsedStages] = React.useState<Set<string>>(new Set());

  if (opportunities.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No opportunities yet"
        description="Create an opportunity from an account or convert a qualified lead"
        actionLabel="Create Opportunity"
        actionHref="/opportunities/new"
      />
    );
  }

  // Group by stage
  const grouped = STAGE_ORDER.map((stage) => ({
    stage,
    label: stageLabel[stage],
    opportunities: opportunities.filter((o) => o.stage === stage),
    totalValue: opportunities
      .filter((o) => o.stage === stage)
      .reduce((sum, o) => sum + (o.estimatedValue ?? 0), 0),
  })).filter((g) => g.opportunities.length > 0);

  function toggleStage(stage: string) {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => {
        const isCollapsed = collapsedStages.has(group.stage);

        return (
          <div key={group.stage} className="border rounded-lg overflow-hidden">
            {/* Stage header */}
            <button
              onClick={() => toggleStage(group.stage)}
              className="flex w-full items-center justify-between px-4 py-3 bg-[var(--muted)] hover:bg-[var(--accent)] transition-colors"
            >
              <div className="flex items-center gap-3">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <Badge variant={stageVariant[group.stage] ?? "secondary"}>
                  {group.label}
                </Badge>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {group.opportunities.length} deal{group.opportunities.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-sm font-medium">
                {formatCurrency(group.totalValue)}
              </span>
            </button>

            {/* Stage content */}
            {!isCollapsed && (
              <div>
                <DataTable
                  columns={columns}
                  data={group.opportunities}
                  searchPlaceholder="Search opportunities..."
                  searchColumn="account.name"
                  onRowClick={(row) => router.push(`/opportunities/${row.id}`)}
                  pageSize={20}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
