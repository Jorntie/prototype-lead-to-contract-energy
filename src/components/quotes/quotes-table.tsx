"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatPercentage, formatDate, cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import Link from "next/link";
import type { QuoteWithDetails } from "@/lib/services/quote.service";

const quoteStatusVariant: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "info"
> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  SENT: "default",
  ACCEPTED: "success",
  REJECTED: "destructive",
  SUPERSEDED: "secondary",
  EXPIRED: "destructive",
};

const quoteStatusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  SUPERSEDED: "Superseded",
  EXPIRED: "Expired",
};

interface QuotesTableProps {
  quotes: QuoteWithDetails[];
  accounts: { id: string; name: string }[];
  users: { id: string; name: string }[];
  currentStatus?: string;
  currentAccount?: string;
  currentAssignedTo?: string;
}

export function QuotesTable({
  quotes,
  accounts,
  users,
  currentStatus,
  currentAccount,
  currentAssignedTo,
}: QuotesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const columns: ColumnDef<QuoteWithDetails>[] = [
    {
      id: "account",
      header: "Account",
      accessorFn: (row) => row.opportunity?.account?.name ?? "",
      cell: ({ row }) => {
        const account = row.original.opportunity?.account;
        if (!account) return <span className="text-[var(--muted-foreground)]">—</span>;
        return (
          <Link
            href={`/accounts/${account.id}`}
            className="font-medium text-[var(--primary)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {account.name}
          </Link>
        );
      },
    },
    {
      id: "opportunity",
      header: "Opportunity",
      accessorFn: (row) => row.opportunity?.id ?? "",
      cell: ({ row }) => {
        const opp = row.original.opportunity;
        if (!opp) return <span className="text-[var(--muted-foreground)]">—</span>;
        const stageLabel: Record<string, string> = {
          DISCOVERY: "Discovery",
          QUOTING: "Quoting",
          PROPOSAL_SENT: "Proposal Sent",
          NEGOTIATION: "Negotiation",
          WON: "Won",
          LOST: "Lost",
        };
        return (
          <Link
            href={`/opportunities/${opp.id}`}
            className="text-[var(--primary)] hover:underline text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {stageLabel[opp.stage] ?? opp.stage}
          </Link>
        );
      },
    },
    {
      id: "version",
      header: "Version",
      accessorFn: (row) => row.version,
      cell: ({ row }) => (
        <span className="font-mono text-sm">v{row.original.version}</span>
      ),
      size: 80,
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Badge variant={quoteStatusVariant[row.original.status] ?? "secondary"}>
          {quoteStatusLabel[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: "sites",
      header: "Sites",
      accessorFn: (row) => row._count?.quoteLines ?? 0,
      cell: ({ row }) => (
        <span className="text-sm">{row.original._count?.quoteLines ?? 0}</span>
      ),
      size: 70,
    },
    {
      id: "totalValue",
      header: () => <div className="text-right">Total Value</div>,
      accessorFn: (row) => row.totalValue ?? 0,
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {formatCurrency(row.original.totalValue, row.original.currency ?? "EUR")}
        </div>
      ),
      size: 130,
    },
    {
      id: "margin",
      header: () => <div className="text-right">Margin %</div>,
      accessorFn: (row) => row.marginPercentage ?? 0,
      cell: ({ row }) => {
        const pct = row.original.marginPercentage;
        if (pct == null) return <div className="text-right text-[var(--muted-foreground)]">—</div>;
        return (
          <div
            className={cn(
              "text-right font-medium tabular-nums",
              pct < 3 ? "text-red-600" : pct < 5 ? "text-amber-600" : "text-green-600"
            )}
          >
            {formatPercentage(pct)}
          </div>
        );
      },
      size: 100,
    },
    {
      id: "validUntil",
      header: "Valid Until",
      accessorFn: (row) => row.validUntil ?? "",
      cell: ({ row }) => (
        <span className="text-sm text-[var(--muted-foreground)]">
          {formatDate(row.original.validUntil)}
        </span>
      ),
    },
    {
      id: "createdBy",
      header: "Created By",
      accessorFn: (row) => row.createdBy?.name ?? "",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.createdBy?.name ?? "—"}</span>
      ),
    },
  ];

  if (quotes.length === 0 && !currentStatus && !currentAccount && !currentAssignedTo) {
    return (
      <EmptyState
        icon={FileText}
        title="No quotes yet"
        description="Create a quote from an opportunity to start pricing."
        actionLabel="Go to Opportunities"
        actionHref="/opportunities"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={currentStatus ?? ""}
          onChange={(e) => updateFilter("status", e.target.value)}
          options={[
            { value: "DRAFT", label: "Draft" },
            { value: "PENDING_APPROVAL", label: "Pending Approval" },
            { value: "APPROVED", label: "Approved" },
            { value: "SENT", label: "Sent" },
            { value: "ACCEPTED", label: "Accepted" },
            { value: "REJECTED", label: "Rejected" },
            { value: "SUPERSEDED", label: "Superseded" },
            { value: "EXPIRED", label: "Expired" },
          ]}
          placeholder="All Statuses"
          className="w-44"
        />
        <Select
          value={currentAccount ?? ""}
          onChange={(e) => updateFilter("account", e.target.value)}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          placeholder="All Accounts"
          className="w-44"
        />
        <Select
          value={currentAssignedTo ?? ""}
          onChange={(e) => updateFilter("assignedTo", e.target.value)}
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          placeholder="All Users"
          className="w-44"
        />
        {(currentStatus || currentAccount || currentAssignedTo) && (
          <button
            onClick={() => router.push(pathname)}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes match your filters"
          description="Try adjusting the filters above."
          actionLabel="Clear filters"
          onAction={() => router.push(pathname)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={quotes}
          searchPlaceholder="Search quotes..."
          pageSize={50}
          onRowClick={(row) => router.push(`/quotes/${row.id}`)}
        />
      )}
    </div>
  );
}
