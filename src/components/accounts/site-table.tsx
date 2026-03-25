"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { Plus, Upload } from "lucide-react";
import Link from "next/link";
import type { SiteWithGroup } from "@/lib/services/site.service";

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  PENDING: "warning",
  CHURNED: "destructive",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PENDING: "Pending",
  CHURNED: "Churned",
};

function makeSiteColumns(accountId: string): ColumnDef<SiteWithGroup, unknown>[] {
  return [
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.address}</span>
      ),
    },
    {
      accessorKey: "meterId",
      header: "Meter ID",
      cell: ({ row }) => row.original.meterId ?? "---",
    },
    {
      accessorKey: "siteGroup.name",
      header: "Group",
      cell: ({ row }) => row.original.siteGroup?.name ?? "---",
      enableSorting: false,
    },
    {
      accessorKey: "commodity",
      header: "Commodity",
      cell: ({ row }) => row.original.commodity ?? "---",
    },
    {
      accessorKey: "supplyCapacity",
      header: "Capacity (kW)",
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.supplyCapacity != null ? formatNumber(row.original.supplyCapacity) : "---"}
        </div>
      ),
    },
    {
      accessorKey: "annualConsumption",
      header: "Consumption (kWh)",
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.annualConsumption != null ? formatNumber(row.original.annualConsumption) : "---"}
        </div>
      ),
    },
    {
      accessorKey: "peakPercentage",
      header: "Peak %",
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.peakPercentage != null ? `${row.original.peakPercentage}%` : "---"}
        </div>
      ),
    },
    {
      accessorKey: "voltageLevel",
      header: "Voltage",
      cell: ({ row }) => row.original.voltageLevel ?? "---",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        if (!status) return "---";
        return (
          <Badge variant={statusVariant[status] ?? "secondary"}>
            {statusLabel[status] ?? status}
          </Badge>
        );
      },
    },
  ];
}

interface SiteTableProps {
  sites: SiteWithGroup[];
  accountId: string;
}

export function SiteTable({ sites, accountId }: SiteTableProps) {
  const router = useRouter();
  const columns = makeSiteColumns(accountId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sites</h3>
        <div className="flex items-center gap-2">
          <Link href={`/accounts/${accountId}/sites/new`}>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Site
            </Button>
          </Link>
        </div>
      </div>

      {sites.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] py-8 text-center">
          No sites yet. Add a site to get started.
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={sites}
          searchPlaceholder="Search sites..."
          searchColumn="address"
          onRowClick={(row) => router.push(`/accounts/${accountId}/sites/${row.id}`)}
        />
      )}
    </div>
  );
}
