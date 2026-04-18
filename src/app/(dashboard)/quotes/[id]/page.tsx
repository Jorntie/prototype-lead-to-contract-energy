import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuote } from "@/lib/services/quote.service";
import { getPriceComponentTypes } from "@/lib/services/price-component.service";
import { getActivityLog } from "@/lib/services/activity-log.service";
import { getContractByQuoteId } from "@/lib/services/contract.service";
import { formatDate } from "@/lib/utils";
import { QuoteBuilder } from "@/components/quotes/quote-builder";
import { QuoteSummaryView } from "@/components/quotes/quote-summary-view";
import { QuoteStatusActions } from "@/components/quotes/quote-status-actions";
import { QuoteTermsCard } from "@/components/quotes/quote-terms-card";
import { CreateContractButton } from "@/components/contracts/create-contract-button";

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

const EDITABLE_STATUSES = ["DRAFT", "PENDING_APPROVAL"];

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id } = await params;

  const [quote, componentTypes] = await Promise.all([
    getQuote(id),
    getPriceComponentTypes(),
  ]);

  if (!quote) notFound();

  const [activities, existingContract] = await Promise.all([
    getActivityLog("Quote", id),
    quote.status === "ACCEPTED" ? getContractByQuoteId(id) : Promise.resolve(null),
  ]);

  const accountName = quote.opportunity?.account?.name ?? "Unknown Account";
  const isEditable = EDITABLE_STATUSES.includes(quote.status);

  return (
    <div>
      <PageHeader
        title={`${accountName} — v${quote.version}`}
        description={`Quote · ${quote.opportunity?.account?.name ?? ""}`}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Quotes", href: "/quotes" },
          { label: `${accountName} v${quote.version}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {quote.status === "ACCEPTED" && (
              <CreateContractButton
                quoteId={quote.id}
                existingContractId={existingContract?.id}
              />
            )}
            <QuoteStatusActions
              quote={{
                id: quote.id,
                status: quote.status,
                opportunityId: quote.opportunityId,
              }}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content — 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {isEditable ? (
            <QuoteBuilder
              quote={quote}
              componentTypes={componentTypes.filter((c) => c.isActive)}
            />
          ) : (
            <QuoteSummaryView
              quote={quote}
              componentTypes={componentTypes}
            />
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <QuoteTermsCard
            quote={{
              id: quote.id,
              status: quote.status,
              currency: quote.currency,
              paymentTerms: quote.paymentTerms,
              billingFrequency: quote.billingFrequency,
              validUntil: quote.validUntil,
              showBreakdown: quote.showBreakdown,
              createdAt: quote.createdAt,
              updatedAt: quote.updatedAt,
            }}
          />

          {/* Activity log */}
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
