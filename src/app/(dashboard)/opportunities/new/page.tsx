import { PageHeader } from "@/components/shared/page-header";
import { OpportunityForm } from "@/components/pipeline/opportunity-form";
import { createOpportunityAction } from "../actions";
import { getAccounts } from "@/lib/services/account.service";
import { getSites } from "@/lib/services/site.service";
import { getUsers } from "@/lib/services/lead.service";

export default async function NewOpportunityPage() {
  const [accounts, sites, users] = await Promise.all([
    getAccounts(),
    getSites(),
    getUsers(),
  ]);

  return (
    <div>
      <PageHeader
        title="New Opportunity"
        description="Create a new sales opportunity"
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Pipeline", href: "/opportunities" },
          { label: "New Opportunity" },
        ]}
      />

      <OpportunityForm
        action={async (formData: FormData) => {
          "use server";
          const result = await createOpportunityAction(formData);
          if (!result.success) {
            return { error: result.error };
          }
          return { success: true, id: result.id };
        }}
        accounts={accounts}
        sites={sites}
        users={users}
        submitLabel="Create Opportunity"
        cancelHref="/opportunities"
      />
    </div>
  );
}
