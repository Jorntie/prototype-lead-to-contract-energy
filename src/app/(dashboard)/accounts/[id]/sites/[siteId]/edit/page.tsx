import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SiteForm } from "@/components/accounts/site-form";
import { getAccount } from "@/lib/services/account.service";
import { getSite } from "@/lib/services/site.service";
import { getSiteGroups } from "@/lib/services/site-group.service";
import { updateSiteAction } from "../../../../actions";

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id, siteId } = await params;
  const [account, site, siteGroups] = await Promise.all([
    getAccount(id),
    getSite(siteId),
    getSiteGroups(id),
  ]);

  if (!account || !site) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit Site`}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Accounts", href: "/accounts" },
          { label: account.name, href: `/accounts/${account.id}` },
          { label: "Sites", href: `/accounts/${account.id}?tab=sites` },
          { label: site.address, href: `/accounts/${account.id}/sites/${site.id}` },
          { label: "Edit" },
        ]}
      />

      <SiteForm
        action={async (formData: FormData) => {
          "use server";
          const result = await updateSiteAction(siteId, formData);
          if (!result.success) {
            return { error: result.error };
          }
          return { success: true };
        }}
        defaultValues={{
          id: site.id,
          address: site.address,
          meterId: site.meterId,
          commodity: site.commodity,
          supplyCapacity: site.supplyCapacity,
          annualConsumption: site.annualConsumption,
          peakPercentage: site.peakPercentage,
          voltageLevel: site.voltageLevel,
          connectionType: site.connectionType,
          contractEndDate: site.contractEndDate,
          siteGroupId: site.siteGroupId,
          status: site.status,
        }}
        siteGroups={siteGroups}
        accountId={id}
        submitLabel="Update Site"
        cancelHref={`/accounts/${id}/sites/${siteId}`}
      />
    </div>
  );
}
