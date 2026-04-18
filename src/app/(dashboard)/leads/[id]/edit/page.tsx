import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { LeadForm } from "@/components/leads/lead-form";
import { getLeadById, getUsers } from "@/lib/services/lead.service";
import { updateLeadAction } from "../../actions";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, users] = await Promise.all([getLeadById(id), getUsers()]);

  if (!lead) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit: ${lead.companyName}`}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Leads", href: "/leads" },
          { label: lead.companyName, href: `/leads/${lead.id}` },
          { label: "Edit" },
        ]}
      />

      <LeadForm
        action={async (formData: FormData) => {
          "use server";
          const result = await updateLeadAction(id, formData);
          if (!result.success) {
            return { error: result.error };
          }
          return { success: true };
        }}
        defaultValues={{ ...lead, id: lead.id }}
        users={users}
        submitLabel="Save Changes"
        cancelHref={`/leads/${lead.id}`}
      />
    </div>
  );
}
