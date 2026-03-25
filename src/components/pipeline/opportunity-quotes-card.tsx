"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";

const quoteStatusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  APPROVED: "info",
  SENT: "default",
  ACCEPTED: "success",
  REJECTED: "destructive",
  EXPIRED: "destructive",
};

const quoteStatusLabel: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

interface Quote {
  id: string;
  version: number;
  status: string;
  totalValue: number | null;
  marginPercentage: number | null;
}

interface OpportunityQuotesCardProps {
  opportunityId: string;
  quotes: Quote[];
}

export function OpportunityQuotesCard({ opportunityId, quotes }: OpportunityQuotesCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Quotes ({quotes.length})</CardTitle>
          <Link href={`/quotes/new?opportunityId=${opportunityId}`}>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              Create Quote
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
            No quotes created yet.
          </p>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-[var(--accent)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">v{quote.version}</span>
                  <Badge variant={quoteStatusVariant[quote.status] ?? "secondary"}>
                    {quoteStatusLabel[quote.status] ?? quote.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {quote.marginPercentage != null && (
                    <span className="text-[var(--muted-foreground)]">
                      {formatPercentage(quote.marginPercentage)} margin
                    </span>
                  )}
                  <span className="font-medium">{formatCurrency(quote.totalValue)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
