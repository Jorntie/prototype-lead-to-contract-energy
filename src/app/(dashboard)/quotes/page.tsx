import { PageHeader } from "@/components/shared/page-header";
import { getQuotes } from "@/lib/services/quote.service";
import { getUsers } from "@/lib/services/lead.service";
import { getOpportunities } from "@/lib/services/opportunity.service";
import { QuotesTable } from "@/components/quotes/quotes-table";
import { InfoIcon } from "lucide-react";

interface QuotesPageProps {
  searchParams: Promise<{
    status?: string;
    account?: string;
    assignedTo?: string;
  }>;
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;

  const [quotes, users, opportunities] = await Promise.all([
    getQuotes(),
    getUsers(),
    getOpportunities(),
  ]);

  // Derive unique accounts from opportunities for the filter
  const accountMap = new Map<string, string>();
  for (const opp of opportunities) {
    if (opp.account) {
      accountMap.set(opp.account.id, opp.account.name);
    }
  }
  const accounts = Array.from(accountMap.entries()).map(([id, name]) => ({ id, name }));

  // Apply filters server-side
  const filteredQuotes = quotes.filter((q) => {
    if (params.status && q.status !== params.status) return false;
    if (params.account && q.opportunity?.account?.id !== params.account) return false;
    if (params.assignedTo && q.opportunity?.assignedTo?.id !== params.assignedTo) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="View and manage all quotes across opportunities"
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Quotes" },
        ]}
      />

      <div className="mb-4 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <InfoIcon className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Quotes are created from opportunities. Open an opportunity and click{" "}
          <strong>Create Quote</strong> to start pricing.
        </span>
      </div>

      <QuotesTable
        quotes={filteredQuotes}
        accounts={accounts}
        users={users}
        currentStatus={params.status}
        currentAccount={params.account}
        currentAssignedTo={params.assignedTo}
      />
    </div>
  );
}
