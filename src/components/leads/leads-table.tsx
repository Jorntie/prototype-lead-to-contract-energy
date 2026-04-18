"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import type { LeadWithAssignee } from "@/lib/services/lead.service";

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  NEW: "info",
  CONTACTED: "secondary",
  QUALIFIED: "success",
  DISQUALIFIED: "destructive",
  CONVERTED: "default",
};

const statusLabel: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  DISQUALIFIED: "Disqualified",
  CONVERTED: "Converted",
};

const columns: ColumnDef<LeadWithAssignee, unknown>[] = [
  {
    accessorKey: "companyName",
    header: "Company Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.companyName}</span>
    ),
  },
  {
    accessorKey: "contactName",
    header: "Contact Name",
    cell: ({ row }) => row.original.contactName,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status] ?? "secondary"}>
        {statusLabel[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "estimatedSites",
    header: "Estimated Sites",
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.estimatedSites != null ? formatNumber(row.original.estimatedSites) : "---"}
      </div>
    ),
  },
  {
    accessorKey: "estimatedVolume",
    header: "Est. Volume (kWh)",
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.estimatedVolume != null ? formatNumber(row.original.estimatedVolume) : "---"}
      </div>
    ),
  },
  {
    accessorKey: "contractEndDate",
    header: "Contract End Date",
    cell: ({ row }) => formatDate(row.original.contractEndDate),
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => row.original.assignedTo?.name ?? "Unassigned",
    enableSorting: false,
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

interface LeadsTableProps {
  leads: LeadWithAssignee[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter();

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No leads yet"
        description="Create your first lead to start building your pipeline"
        actionLabel="Create Lead"
        actionHref="/leads/new"
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={leads}
      searchPlaceholder="Search leads..."
      searchColumn="companyName"
      onRowClick={(row) => router.push(`/leads/${row.id}`)}
    />
  );
}
