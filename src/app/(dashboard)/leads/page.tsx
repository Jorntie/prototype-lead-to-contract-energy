import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { getLeads } from "@/lib/services/lead.service";
import { LeadsTable } from "@/components/leads/leads-table";

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Manage and qualify incoming leads"
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Leads" },
        ]}
        actions={
          <Link href="/leads/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Lead
            </Button>
          </Link>
        }
      />

      {leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Create your first lead to start building your pipeline"
          actionLabel="Create Lead"
          actionHref="/leads/new"
        />
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}
