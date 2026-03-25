import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AccountForm } from "@/components/accounts/account-form";
import { getAccount } from "@/lib/services/account.service";
import { updateAccountAction } from "../../actions";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccount(id);

  if (!account) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit ${account.name}`}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Accounts", href: "/accounts" },
          { label: account.name, href: `/accounts/${account.id}` },
          { label: "Edit" },
        ]}
      />

      <AccountForm
        action={async (formData: FormData) => {
          "use server";
          const result = await updateAccountAction(id, formData);
          if (!result.success) {
            return { error: result.error };
          }
          return { success: true, id };
        }}
        defaultValues={{
          id: account.id,
          name: account.name,
          industry: account.industry,
          creditStatus: account.creditStatus,
          currentSupplier: account.currentSupplier,
          contractEndDate: account.contractEndDate,
        }}
        submitLabel="Update Account"
        cancelHref={`/accounts/${account.id}`}
      />
    </div>
  );
}
