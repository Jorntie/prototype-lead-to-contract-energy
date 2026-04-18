"use client";

import * as React from "react";
import { useTransition } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteSelectionDialog } from "@/components/pipeline/site-selection-dialog";
import { exportSitesCsvAction } from "@/app/(dashboard)/opportunities/actions";
import { formatNumber } from "@/lib/utils";
import { Download, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Site {
  id: string;
  address: string;
  meterId: string | null;
  annualConsumption: number | null;
  voltageLevel: string | null;
  siteGroupId: string | null;
  siteGroup?: { id: string; name: string } | null;
  accountId?: string;
}

const siteColumns: ColumnDef<Site, unknown>[] = [
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
    id: "group",
    header: "Group",
    cell: ({ row }) => row.original.siteGroup?.name ?? "---",
    enableSorting: false,
  },
  {
    accessorKey: "annualConsumption",
    header: "Consumption (kWh)",
    cell: ({ row }) => (
      <div className="text-right">
        {row.original.annualConsumption != null
          ? formatNumber(row.original.annualConsumption)
          : "---"}
      </div>
    ),
  },
  {
    accessorKey: "voltageLevel",
    header: "Voltage",
    cell: ({ row }) => row.original.voltageLevel ?? "---",
  },
];

interface OpportunitySitesCardProps {
  opportunityId: string;
  selectedSites: Site[];
  accountSites: Site[];
  selectedSiteIds: string[];
}

export function OpportunitySitesCard({
  opportunityId,
  selectedSites,
  accountSites,
  selectedSiteIds,
}: OpportunitySitesCardProps) {
  const [showDialog, setShowDialog] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  function handleExportCsv() {
    startTransition(async () => {
      const result = await exportSitesCsvAction(opportunityId);
      if (result.success) {
        // Trigger download
        const blob = new Blob([result.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `opportunity-${opportunityId}-sites.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("CSV exported successfully");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Selected Sites ({selectedSites.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={isPending || selectedSites.length === 0}
              >
                <Download className="h-4 w-4" />
                Export for Pricing Desk
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDialog(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit Sites
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedSites.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
              No sites selected for this opportunity.
            </p>
          ) : (
            <DataTable
              columns={siteColumns}
              data={selectedSites}
              searchPlaceholder="Search sites..."
              searchColumn="address"
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      <SiteSelectionDialog
        opportunityId={opportunityId}
        sites={accountSites}
        selectedSiteIds={selectedSiteIds}
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </>
  );
}
