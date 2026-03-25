import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getContract } from "@/lib/services/contract.service";
import { getActivityLog } from "@/lib/services/activity-log.service";
import { formatDate, formatCurrency, formatNumber } from "@/lib/utils";
import { ContractStatusActions } from "@/components/contracts/contract-status-actions";
import Link from "next/link";

interface ContractDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "info"
> = {
  DRAFT: "secondary",
  SENT: "info",
  SIGNED: "success",
  ACTIVE: "success",
  EXPIRED: "destructive",
  TERMINATED: "destructive",
};

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  SIGNED: "Signed",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
};

export default async function ContractDetailPage({
  params,
}: ContractDetailPageProps) {
  const { id } = await params;

  const contract = await getContract(id);
  if (!contract) notFound();

  const activities = await getActivityLog("Contract", id);

  const accountName = contract.account?.name ?? "Unknown Account";
  const quote = contract.quote;
  const opportunity = quote?.opportunity;

  return (
    <div>
      <PageHeader
        title={`Contract — ${accountName}`}
        description={`Contract for ${accountName}`}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Contracts", href: "/contracts" },
          { label: accountName },
        ]}
        actions={
          <ContractStatusActions
            contract={{
              id: contract.id,
              status: contract.status,
              quoteId: contract.quoteId,
            }}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Status
                  </p>
                  <Badge
                    variant={statusVariant[contract.status] ?? "secondary"}
                    className="mt-1"
                  >
                    {statusLabel[contract.status] ?? contract.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Total Value
                  </p>
                  <p className="text-lg font-semibold mt-0.5">
                    {formatCurrency(
                      quote?.totalValue,
                      quote?.currency ?? "EUR"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Start Date
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {formatDate(contract.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    End Date
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {formatDate(contract.endDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sites & Pricing */}
          {quote?.quoteLines && quote.quoteLines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Sites & Pricing ({quote.quoteLines.length} sites)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 pr-4 font-medium">
                          Site
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Annual kWh
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Capacity kW
                        </th>
                        <th className="text-right py-2 pl-4 font-medium">
                          Annual Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.quoteLines.map((line) => {
                        const annualCost = line.components.reduce(
                          (sum, c) => sum + (c.annualAmount ?? 0),
                          0
                        );
                        return (
                          <tr
                            key={line.id}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="py-2 pr-4">
                              <div className="font-medium">
                                {line.site?.address ??
                                  `Site ${line.siteId.slice(0, 8)}`}
                              </div>
                            </td>
                            <td className="text-right py-2 px-4 tabular-nums">
                              {formatNumber(line.annualKwh)}
                            </td>
                            <td className="text-right py-2 px-4 tabular-nums">
                              {line.site?.supplyCapacity ?? "—"}
                            </td>
                            <td className="text-right py-2 pl-4 font-medium tabular-nums">
                              {formatCurrency(
                                annualCost,
                                quote.currency ?? "EUR"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="py-2 pr-4">Total</td>
                        <td className="text-right py-2 px-4 tabular-nums">
                          {formatNumber(
                            quote.quoteLines.reduce(
                              (s, l) => s + (l.annualKwh ?? 0),
                              0
                            )
                          )}
                        </td>
                        <td className="text-right py-2 px-4" />
                        <td className="text-right py-2 pl-4 tabular-nums">
                          {formatCurrency(
                            quote.totalValue,
                            quote.currency ?? "EUR"
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Account</span>
                <Link
                  href={`/accounts/${contract.accountId}`}
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  {accountName}
                </Link>
              </div>
              {opportunity && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">
                    Opportunity
                  </span>
                  <Link
                    href={`/opportunities/${opportunity.id}`}
                    className="font-medium text-[var(--primary)] hover:underline"
                  >
                    {opportunity.stage}
                  </Link>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Quote</span>
                <Link
                  href={`/quotes/${contract.quoteId}`}
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  v{quote?.version}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Currency</span>
                <span className="font-medium">
                  {quote?.currency ?? "EUR"}
                </span>
              </div>
              {contract.signedDate && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">
                    Signed Date
                  </span>
                  <span className="font-medium">
                    {formatDate(contract.signedDate)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Created</span>
                <span className="font-medium">
                  {formatDate(contract.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">
                  Last Updated
                </span>
                <span className="font-medium">
                  {formatDate(contract.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Activity log */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No activity yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 rounded-full bg-[var(--muted-foreground)] shrink-0" />
                      <div>
                        <p>{activity.content}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {activity.user?.name ?? "System"} &middot;{" "}
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
