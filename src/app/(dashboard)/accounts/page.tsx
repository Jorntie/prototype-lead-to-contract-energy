import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getAccounts } from "@/lib/services/account.service";
import { AccountsTable } from "@/components/accounts/accounts-table";

export default async function AccountsPage() {
  const accounts = await getAccounts();

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Manage customer accounts and their sites"
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Accounts" },
        ]}
        actions={
          <Link href="/accounts/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Account
            </Button>
          </Link>
        }
      />

      <AccountsTable accounts={accounts} />
    </div>
  );
}
