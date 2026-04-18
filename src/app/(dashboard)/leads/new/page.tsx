import { PageHeader } from "@/components/shared/page-header";
import { LeadForm } from "@/components/leads/lead-form";
import { createLeadAction } from "../actions";
import { getUsers } from "@/lib/services/lead.service";

export default async function NewLeadPage() {
  const users = await getUsers();

  return (
    <div>
      <PageHeader
        title="New Lead"
        description="Add a new lead to the pipeline"
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Leads", href: "/leads" },
          { label: "New Lead" },
        ]}
      />

      <LeadForm
        action={async (formData: FormData) => {
          "use server";
          const result = await createLeadAction(formData);
          if (!result.success) {
            return { error: result.error };
          }
          return { success: true };
        }}
        users={users}
        submitLabel="Create Lead"
        cancelHref="/leads"
      />
    </div>
  );
}
