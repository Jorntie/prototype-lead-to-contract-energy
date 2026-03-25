"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Building2 } from "lucide-react";
import type { AccountWithDetails } from "@/lib/services/account.service";

const creditStatusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  LOW_RISK: "success",
  MEDIUM_RISK: "warning",
  HIGH_RISK: "destructive",
  NOT_ASSESSED: "secondary",
};

const creditStatusLabel: Record<string, string> = {
  LOW_RISK: "Low Risk",
  MEDIUM_RISK: "Medium Risk",
  HIGH_RISK: "High Risk",
  NOT_ASSESSED: "Not Assessed",
};

const columns: ColumnDef<AccountWithDetails, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "industry",
    header: "Industry",
    cell: ({ row }) => row.original.industry ?? "---",
  },
  {
    accessorKey: "creditStatus",
    header: "Credit Status",
    cell: ({ row }) => {
      const status = row.original.creditStatus;
      if (!status) return "---";
      return (
        <Badge variant={creditStatusVariant[status] ?? "secondary"}>
          {creditStatusLabel[status] ?? status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "_count.sites",
    header: "Sites",
    cell: ({ row }) => {
      const count = (row.original as Record<string, unknown>)._count as { sites?: number } | undefined;
      return (
        <div className="text-right">
          {count?.sites != null ? formatNumber(count.sites) : "0"}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "_count.opportunities",
    header: "Opportunities",
    cell: ({ row }) => {
      const count = (row.original as Record<string, unknown>)._count as { opportunities?: number } | undefined;
      return (
        <div className="text-right">
          {count?.opportunities != null ? formatNumber(count.opportunities) : "0"}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "contractEndDate",
    header: "Contract End Date",
    cell: ({ row }) => formatDate(row.original.contractEndDate),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

interface AccountsTableProps {
  accounts: AccountWithDetails[];
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  const router = useRouter();

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No accounts yet"
        description="Create an account or convert a qualified lead"
        actionLabel="Create Account"
        actionHref="/accounts/new"
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={accounts}
      searchPlaceholder="Search accounts..."
      searchColumn="name"
      onRowClick={(row) => router.push(`/accounts/${row.id}`)}
    />
  );
}
