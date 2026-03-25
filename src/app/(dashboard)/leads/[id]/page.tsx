import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadById } from "@/lib/services/lead.service";
import { getActivityLog } from "@/lib/services/activity-log.service";
import { formatDate, formatNumber, formatDateRelative } from "@/lib/utils";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { LeadStatusActions } from "@/components/leads/lead-status-actions";

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

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);

  if (!lead) notFound();

  const activities = await getActivityLog("Lead", id);

  return (
    <div>
      <PageHeader
        title={lead.companyName}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Leads", href: "/leads" },
          { label: lead.companyName },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {lead.status !== "CONVERTED" && (
              <LeadStatusActions
                lead={{ id: lead.id, status: lead.status, companyName: lead.companyName }}
              />
            )}
            <Link href={`/leads/${lead.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lead Information</CardTitle>
                <Badge variant={statusVariant[lead.status]}>
                  {statusLabel[lead.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[var(--muted-foreground)]">Contact</dt>
                  <dd className="font-medium mt-0.5">{lead.contactName}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Email</dt>
                  <dd className="mt-0.5">{lead.email ?? "---"}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Phone</dt>
                  <dd className="mt-0.5">{lead.phone ?? "---"}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Assigned To</dt>
                  <dd className="mt-0.5">{lead.assignedTo?.name ?? "Unassigned"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Qualification Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[var(--muted-foreground)]">Estimated Sites</dt>
                  <dd className="font-medium mt-0.5">
                    {lead.estimatedSites != null ? formatNumber(lead.estimatedSites) : "---"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Estimated Volume</dt>
                  <dd className="font-medium mt-0.5">
                    {lead.estimatedVolume ? `${formatNumber(lead.estimatedVolume)} kWh` : "---"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Current Supplier</dt>
                  <dd className="mt-0.5">{lead.currentSupplier ?? "---"}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Contract End Date</dt>
                  <dd className="mt-0.5">
                    {lead.contractEndDate ? (
                      <span>
                        {formatDate(lead.contractEndDate)}{" "}
                        <span className="text-[var(--muted-foreground)]">
                          ({formatDateRelative(lead.contractEndDate)})
                        </span>
                      </span>
                    ) : (
                      "---"
                    )}
                  </dd>
                </div>
              </dl>
              {lead.notes && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-sm text-[var(--muted-foreground)]">Notes</dt>
                  <dd className="mt-1 text-sm whitespace-pre-wrap">{lead.notes}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          {lead.convertedToAccount && (
            <Card>
              <CardHeader>
                <CardTitle>Converted To</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/accounts/${lead.convertedToAccount.id}`}
                  className="text-sm text-[var(--primary)] hover:underline font-medium"
                >
                  {lead.convertedToAccount.name}
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Activity Timeline */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 rounded-full bg-[var(--muted-foreground)] shrink-0" />
                      <div>
                        <p>{activity.content}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {activity.user?.name ?? "System"} &middot; {formatDate(activity.createdAt)}
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
