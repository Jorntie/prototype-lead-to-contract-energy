import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccount } from "@/lib/services/account.service";
import { getSite } from "@/lib/services/site.service";
import { formatDate, formatNumber } from "@/lib/utils";
import { Pencil } from "lucide-react";
import Link from "next/link";

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
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

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id, siteId } = await params;
  const [account, site] = await Promise.all([
    getAccount(id),
    getSite(siteId),
  ]);

  if (!account || !site) notFound();

  return (
    <div>
      <PageHeader
        title={site.address}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Accounts", href: "/accounts" },
          { label: account.name, href: `/accounts/${account.id}` },
          { label: "Sites", href: `/accounts/${account.id}?tab=sites` },
          { label: site.address },
        ]}
        actions={
          <Link href={`/accounts/${account.id}/sites/${site.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Site Information</CardTitle>
              {site.status && (
                <Badge variant={statusVariant[site.status] ?? "secondary"}>
                  {statusLabel[site.status] ?? site.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--muted-foreground)]">Address</dt>
                <dd className="font-medium mt-0.5">{site.address}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Meter ID</dt>
                <dd className="mt-0.5">{site.meterId ?? "---"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Commodity</dt>
                <dd className="mt-0.5">{site.commodity ?? "---"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Connection Type</dt>
                <dd className="mt-0.5">{site.connectionType ?? "---"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Voltage Level</dt>
                <dd className="mt-0.5">{site.voltageLevel ?? "---"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Site Group</dt>
                <dd className="mt-0.5">{site.siteGroup?.name ?? "---"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consumption Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--muted-foreground)]">Supply Capacity</dt>
                <dd className="font-medium mt-0.5">
                  {site.supplyCapacity != null ? `${formatNumber(site.supplyCapacity)} kW` : "---"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Annual Consumption</dt>
                <dd className="font-medium mt-0.5">
                  {site.annualConsumption != null ? `${formatNumber(site.annualConsumption)} kWh` : "---"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Peak Percentage</dt>
                <dd className="mt-0.5">
                  {site.peakPercentage != null ? `${site.peakPercentage}%` : "---"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted-foreground)]">Contract End Date</dt>
                <dd className="mt-0.5">
                  {site.contractEndDate ? formatDate(site.contractEndDate) : "---"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
