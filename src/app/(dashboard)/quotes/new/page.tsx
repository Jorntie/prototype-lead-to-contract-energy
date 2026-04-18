import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOpportunity, getOpportunities } from "@/lib/services/opportunity.service";
import { getPriceComponentTypes } from "@/lib/services/price-component.service";
import { CreateQuoteForm } from "@/components/quotes/create-quote-form";
import { getUnitLabel } from "@/lib/calculations/price-calculator";

interface NewQuotePageProps {
  searchParams: Promise<{ opportunityId?: string }>;
}

const stageLabel: Record<string, string> = {
  DISCOVERY: "Discovery",
  QUOTING: "Quoting",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export default async function NewQuotePage({ searchParams }: NewQuotePageProps) {
  const { opportunityId } = await searchParams;

  const [allComponentTypes, opportunities] = await Promise.all([
    getPriceComponentTypes(false), // only active ones
    getOpportunities(),
  ]);

  const activeComponents = allComponentTypes;

  let opportunity = null;
  if (opportunityId) {
    opportunity = await getOpportunity(opportunityId);
  }

  return (
    <div>
      <PageHeader
        title="Create Quote"
        description={
          opportunity
            ? `Creating quote for ${opportunity.account.name} — ${stageLabel[opportunity.stage] ?? opportunity.stage}`
            : "Create a new quote for an opportunity"
        }
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Quotes", href: "/quotes" },
          { label: "New Quote" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CreateQuoteForm
            opportunities={opportunities.map((o) => ({
              id: o.id,
              label: `${o.account.name} — ${stageLabel[o.stage] ?? o.stage}`,
            }))}
            defaultOpportunityId={opportunityId}
          />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Price Components</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                The following components will be pre-populated for each site:
              </p>
              <div className="space-y-2">
                {activeComponents.map((comp) => (
                  <div key={comp.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comp.name}</span>
                      {comp.isRequired && (
                        <span className="text-xs text-[var(--destructive)]">*</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getUnitLabel(comp.defaultUnit as import("@/lib/calculations/price-calculator").ComponentUnit)}
                      </Badge>
                      {comp.defaultValue != null && (
                        <span className="text-[var(--muted-foreground)]">
                          {comp.defaultValue}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {activeComponents.length === 0 && (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No price components configured. Add components in Admin → Price Components.
                  </p>
                )}
              </div>
              {activeComponents.some((c) => c.isRequired) && (
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                  <span className="text-[var(--destructive)]">*</span> Required — must be filled for each site
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
