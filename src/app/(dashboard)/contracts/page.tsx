import { PageHeader } from "@/components/shared/page-header";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { getContracts } from "@/lib/services/contract.service";
import { prisma } from "@/lib/db";

interface ContractsPageProps {
  searchParams: Promise<{
    status?: string;
    account?: string;
  }>;
}

export default async function ContractsPage({
  searchParams,
}: ContractsPageProps) {
  const params = await searchParams;

  const [allContracts, accounts] = await Promise.all([
    getContracts(),
    prisma.account.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  let contracts = allContracts;
  if (params.status) {
    contracts = contracts.filter((c) => c.status === params.status);
  }
  if (params.account) {
    contracts = contracts.filter((c) => c.accountId === params.account);
  }

  return (
    <div>
      <PageHeader
        title="Contracts"
        description="Track contract lifecycle from draft to signed"
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Contracts" },
        ]}
      />

      <ContractsTable
        contracts={contracts}
        accounts={accounts}
        currentStatus={params.status}
        currentAccount={params.account}
      />
    </div>
  );
}
