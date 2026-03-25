import { PageHeader } from "@/components/shared/page-header";
import { AccountForm } from "@/components/accounts/account-form";
import { createAccountAction } from "../actions";

export default async function NewAccountPage() {
  return (
    <div>
      <PageHeader
        title="New Account"
        description="Create a new customer account"
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Accounts", href: "/accounts" },
          { label: "New Account" },
        ]}
      />

      <AccountForm
        action={async (formData: FormData) => {
          "use server";
          const result = await createAccountAction(formData);
          if (!result.success) {
            return { error: result.error };
          }
          return { success: true };
        }}
        submitLabel="Create Account"
        cancelHref="/accounts"
      />
    </div>
  );
}
