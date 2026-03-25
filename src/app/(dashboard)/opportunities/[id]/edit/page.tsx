import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { OpportunityForm } from "@/components/pipeline/opportunity-form";
import { updateOpportunityAction } from "../../actions";
import { getOpportunity } from "@/lib/services/opportunity.service";
import { getAccounts } from "@/lib/services/account.service";
import { getSites } from "@/lib/services/site.service";
import { getUsers } from "@/lib/services/lead.service";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [opportunity, accounts, users] = await Promise.all([
    getOpportunity(id),
    getAccounts(),
    getUsers(),
  ]);

  if (!opportunity) notFound();

  const sites = await getSites(opportunity.accountId);

  return (
    <div>
      <PageHeader
        title="Edit Opportunity"
        description={`Editing opportunity for ${opportunity.account.name}`}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Pipeline", href: "/opportunities" },
          { label: opportunity.account.name, href: `/opportunities/${id}` },
          { label: "Edit" },
        ]}
      />

      <OpportunityForm
        action={async (formData: FormData) => {
          "use server";
          const result = await updateOpportunityAction(id, formData);
          if (!result.success) {
            return { error: result.error };
          }
          return { success: true, id: result.id };
        }}
        defaultValues={{
          id: opportunity.id,
          accountId: opportunity.accountId,
          expectedCloseDate: opportunity.expectedCloseDate,
          contractDuration: opportunity.contractDuration,
          assignedToId: opportunity.assignedToId,
        }}
        accounts={accounts}
        sites={sites}
        users={users}
        submitLabel="Update Opportunity"
        cancelHref={`/opportunities/${id}`}
      />
    </div>
  );
}
