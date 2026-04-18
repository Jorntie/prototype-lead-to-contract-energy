"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { FileSignature } from "lucide-react";
import Link from "next/link";
import type { ContractListItem } from "@/lib/services/contract.service";

const contractStatusVariant: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "info"
> = {
  DRAFT: "secondary",
  SENT: "info",
  SIGNED: "success",
  ACTIVE: "success",
  EXPIRED: "destructive",
  TERMINATED: "destructive",
};

const contractStatusLabel: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  SIGNED: "Signed",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
};

interface ContractsTableProps {
  contracts: ContractListItem[];
  accounts: { id: string; name: string }[];
  currentStatus?: string;
  currentAccount?: string;
}

export function ContractsTable({
  contracts,
  accounts,
  currentStatus,
  currentAccount,
}: ContractsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const columns: ColumnDef<ContractListItem>[] = [
    {
      id: "account",
      header: "Account",
      accessorFn: (row) => row.account?.name ?? "",
      cell: ({ row }) => {
        const account = row.original.account;
        if (!account)
          return (
            <span className="text-[var(--muted-foreground)]">&mdash;</span>
          );
        return (
          <Link
            href={`/accounts/${account.id}`}
            className="font-medium text-[var(--primary)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {account.name}
          </Link>
        );
      },
    },
    {
      id: "quote",
      header: "Quote",
      accessorFn: (row) => row.quote?.id ?? "",
      cell: ({ row }) => {
        const quote = row.original.quote;
        if (!quote)
          return (
            <span className="text-[var(--muted-foreground)]">&mdash;</span>
          );
        return (
          <Link
            href={`/quotes/${quote.id}`}
            className="text-[var(--primary)] hover:underline text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            v{quote.version}
          </Link>
        );
      },
      size: 80,
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Badge
          variant={contractStatusVariant[row.original.status] ?? "secondary"}
        >
          {contractStatusLabel[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: "startDate",
      header: "Start Date",
      accessorFn: (row) => row.startDate ?? "",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(row.original.startDate)}
        </span>
      ),
    },
    {
      id: "endDate",
      header: "End Date",
      accessorFn: (row) => row.endDate ?? "",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(row.original.endDate)}
        </span>
      ),
    },
    {
      id: "signedDate",
      header: "Signed",
      accessorFn: (row) => row.signedDate ?? "",
      cell: ({ row }) => (
        <span className="text-sm text-[var(--muted-foreground)]">
          {formatDate(row.original.signedDate)}
        </span>
      ),
    },
    {
      id: "assignedTo",
      header: "Owner",
      accessorFn: (row) =>
        row.quote?.opportunity?.assignedTo?.name ?? "",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.quote?.opportunity?.assignedTo?.name ?? "—"}
        </span>
      ),
    },
  ];

  if (
    contracts.length === 0 &&
    !currentStatus &&
    !currentAccount
  ) {
    return (
      <EmptyState
        icon={FileSignature}
        title="No contracts yet"
        description="Accept a quote to generate a contract."
        actionLabel="Go to Quotes"
        actionHref="/quotes"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={currentStatus ?? ""}
          onChange={(e) => updateFilter("status", e.target.value)}
          options={[
            { value: "DRAFT", label: "Draft" },
            { value: "SENT", label: "Sent" },
            { value: "SIGNED", label: "Signed" },
            { value: "ACTIVE", label: "Active" },
            { value: "EXPIRED", label: "Expired" },
            { value: "TERMINATED", label: "Terminated" },
          ]}
          placeholder="All Statuses"
          className="w-44"
        />
        <Select
          value={currentAccount ?? ""}
          onChange={(e) => updateFilter("account", e.target.value)}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          placeholder="All Accounts"
          className="w-44"
        />
        {(currentStatus || currentAccount) && (
          <button
            onClick={() => router.push(pathname)}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No contracts match your filters"
          description="Try adjusting the filters above."
          actionLabel="Clear filters"
          onAction={() => router.push(pathname)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={contracts}
          searchPlaceholder="Search contracts..."
          pageSize={50}
          onRowClick={(row) => router.push(`/contracts/${row.id}`)}
        />
      )}
    </div>
  );
}
