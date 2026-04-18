import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SiteForm } from "@/components/accounts/site-form";
import { getAccount } from "@/lib/services/account.service";
import { getSiteGroups } from "@/lib/services/site-group.service";
import { createSiteAction } from "../../../actions";

export default async function NewSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccount(id);

  if (!account) notFound();

  const siteGroups = await getSiteGroups(id);

  return (
    <div>
      <PageHeader
        title="New Site"
        description={`Add a new site to ${account.name}`}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Accounts", href: "/accounts" },
          { label: account.name, href: `/accounts/${account.id}` },
          { label: "New Site" },
        ]}
      />

      <SiteForm
        action={async (formData: FormData) => {
          "use server";
          const result = await createSiteAction(id, formData);
          if (!result.success) {
            return { error: result.error };
          }
          return { success: true };
        }}
        siteGroups={siteGroups}
        accountId={id}
        submitLabel="Create Site"
        cancelHref={`/accounts/${id}?tab=sites`}
      />
    </div>
  );
}
