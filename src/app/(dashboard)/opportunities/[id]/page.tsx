import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOpportunity } from "@/lib/services/opportunity.service";
import { getActivityLog } from "@/lib/services/activity-log.service";
import { getSites } from "@/lib/services/site.service";
import { formatDate, formatDateRelative, formatCurrency, formatNumber } from "@/lib/utils";
import { Pencil, Download } from "lucide-react";
import Link from "next/link";
import { StageStepper } from "@/components/pipeline/stage-stepper";
import { OpportunityStageActions } from "@/components/pipeline/opportunity-stage-actions";
import { OpportunitySitesCard } from "@/components/pipeline/opportunity-sites-card";
import { OpportunityQuotesCard } from "@/components/pipeline/opportunity-quotes-card";

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

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);

  if (!opportunity) notFound();

  const [activities, accountSites] = await Promise.all([
    getActivityLog("Opportunity", id),
    getSites({ accountId: opportunity.accountId }),
  ]);

  const selectedSiteIds = opportunity.opportunitySites?.map(
    (os) => os.site.id
  ) ?? [];

  const selectedSites = opportunity.opportunitySites?.map(
    (os) => os.site
  ) ?? [];

  return (
    <div>
      <PageHeader
        title={`${opportunity.account.name}`}
        description="Opportunity"
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Pipeline", href: "/opportunities" },
          { label: opportunity.account.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <OpportunityStageActions
              opportunity={{
                id: opportunity.id,
                stage: opportunity.stage,
                accountName: opportunity.account.name,
              }}
            />
            <Link href={`/opportunities/${opportunity.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage stepper */}
          <Card>
            <CardContent className="pt-6">
              <StageStepper currentStage={opportunity.stage} />
            </CardContent>
          </Card>

          {/* Opportunity info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Opportunity Information</CardTitle>
                <Badge variant={stageVariant[opportunity.stage]}>
                  {stageLabel[opportunity.stage]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[var(--muted-foreground)]">Account</dt>
                  <dd className="font-medium mt-0.5">
                    <Link
                      href={`/accounts/${opportunity.account.id}`}
                      className="text-[var(--primary)] hover:underline"
                    >
                      {opportunity.account.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Expected Close</dt>
                  <dd className="mt-0.5">
                    {opportunity.expectedCloseDate ? (
                      <span>
                        {formatDate(opportunity.expectedCloseDate)}{" "}
                        <span className="text-[var(--muted-foreground)]">
                          ({formatDateRelative(opportunity.expectedCloseDate)})
                        </span>
                      </span>
                    ) : (
                      "---"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Contract Duration</dt>
                  <dd className="font-medium mt-0.5">
                    {opportunity.contractDuration != null
                      ? `${opportunity.contractDuration} months`
                      : "---"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Estimated Value</dt>
                  <dd className="font-medium mt-0.5">
                    {formatCurrency(opportunity.estimatedValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Assigned To</dt>
                  <dd className="mt-0.5">{opportunity.assignedTo?.name ?? "Unassigned"}</dd>
                </div>
                {opportunity.winLossReason && (
                  <div className="col-span-2">
                    <dt className="text-[var(--muted-foreground)]">
                      {opportunity.stage === "WON" ? "Win Reason" : "Loss Reason"}
                    </dt>
                    <dd className="mt-0.5">{opportunity.winLossReason}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Sites card */}
          <OpportunitySitesCard
            opportunityId={opportunity.id}
            selectedSites={selectedSites}
            accountSites={accountSites}
            selectedSiteIds={selectedSiteIds}
          />

          {/* Quotes card */}
          <OpportunityQuotesCard
            opportunityId={opportunity.id}
            quotes={opportunity.quotes ?? []}
          />
        </div>

        {/* Right column - Activity */}
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
