import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccount } from "@/lib/services/account.service";
import { getActivityLog } from "@/lib/services/activity-log.service";
import { formatDate, formatDateRelative } from "@/lib/utils";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { AccountTabs } from "@/components/accounts/account-tabs";
import { ContactList } from "@/components/accounts/contact-list";
import { SiteTable } from "@/components/accounts/site-table";
import { SiteGroupList } from "@/components/accounts/site-group-list";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

const creditStatusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  LOW_RISK: "success",
  MEDIUM_RISK: "warning",
  HIGH_RISK: "destructive",
  NOT_ASSESSED: "secondary",
};

const creditStatusLabel: Record<string, string> = {
  LOW_RISK: "Low Risk",
  MEDIUM_RISK: "Medium Risk",
  HIGH_RISK: "High Risk",
  NOT_ASSESSED: "Not Assessed",
};

const opportunityStageVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  DISCOVERY: "info",
  QUOTING: "secondary",
  PROPOSAL_SENT: "warning",
  NEGOTIATION: "default",
  WON: "success",
  LOST: "destructive",
};

const opportunityStageLabel: Record<string, string> = {
  DISCOVERY: "Discovery",
  QUOTING: "Quoting",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

interface OpportunityRow {
  id: string;
  stage: string;
  expectedCloseDate: Date | string | null;
  contractDuration: number | null;
  estimatedValue: number | null;
}

const opportunityColumns: ColumnDef<OpportunityRow, unknown>[] = [
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => (
      <Badge variant={opportunityStageVariant[row.original.stage] ?? "secondary"}>
        {opportunityStageLabel[row.original.stage] ?? row.original.stage}
      </Badge>
    ),
  },
  {
    accessorKey: "expectedCloseDate",
    header: "Expected Close",
    cell: ({ row }) => formatDate(row.original.expectedCloseDate),
  },
  {
    accessorKey: "contractDuration",
    header: "Contract Duration",
    cell: ({ row }) =>
      row.original.contractDuration != null
        ? `${row.original.contractDuration} months`
        : "---",
  },
];

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccount(id);

  if (!account) notFound();

  const activities = await getActivityLog("Account", id);

  const primaryContact = account.contacts?.find((c: { isPrimary: boolean }) => c.isPrimary) ?? account.contacts?.[0];

  return (
    <div>
      <PageHeader
        title={account.name}
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Accounts", href: "/accounts" },
          { label: account.name },
        ]}
        actions={
          <Link href={`/accounts/${account.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        }
      />

      <AccountTabs>
        {{
          overview: (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Account Information</CardTitle>
                      {account.creditStatus && (
                        <Badge variant={creditStatusVariant[account.creditStatus] ?? "secondary"}>
                          {creditStatusLabel[account.creditStatus] ?? account.creditStatus}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-[var(--muted-foreground)]">Industry</dt>
                        <dd className="font-medium mt-0.5">{account.industry ?? "---"}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--muted-foreground)]">Credit Status</dt>
                        <dd className="mt-0.5">
                          {account.creditStatus
                            ? creditStatusLabel[account.creditStatus] ?? account.creditStatus
                            : "---"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--muted-foreground)]">Current Supplier</dt>
                        <dd className="mt-0.5">{account.currentSupplier ?? "---"}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--muted-foreground)]">Contract End Date</dt>
                        <dd className="mt-0.5">
                          {account.contractEndDate ? (
                            <span>
                              {formatDate(account.contractEndDate)}{" "}
                              <span className="text-[var(--muted-foreground)]">
                                ({formatDateRelative(account.contractEndDate)})
                              </span>
                            </span>
                          ) : (
                            "---"
                          )}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Primary Contact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {primaryContact ? (
                      <dl className="space-y-3 text-sm">
                        <div>
                          <dt className="text-[var(--muted-foreground)]">Name</dt>
                          <dd className="font-medium mt-0.5">{primaryContact.name}</dd>
                        </div>
                        <div>
                          <dt className="text-[var(--muted-foreground)]">Email</dt>
                          <dd className="mt-0.5">{primaryContact.email ?? "---"}</dd>
                        </div>
                        <div>
                          <dt className="text-[var(--muted-foreground)]">Phone</dt>
                          <dd className="mt-0.5">{primaryContact.phone ?? "---"}</dd>
                        </div>
                        <div>
                          <dt className="text-[var(--muted-foreground)]">Role</dt>
                          <dd className="mt-0.5">{primaryContact.role ?? "---"}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No contacts yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ),

          contacts: (
            <ContactList
              contacts={account.contacts ?? []}
              accountId={account.id}
            />
          ),

          sites: (
            <SiteTable
              sites={account.sites ?? []}
              accountId={account.id}
            />
          ),

          "site-groups": (
            <SiteGroupList
              siteGroups={account.siteGroups ?? []}
              accountId={account.id}
            />
          ),

          opportunities: (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Opportunities</h3>
              </div>
              {(account.opportunities?.length ?? 0) === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] py-8 text-center">
                  No opportunities linked to this account yet.
                </p>
              ) : (
                <DataTable
                  columns={opportunityColumns}
                  data={(account.opportunities ?? []) as OpportunityRow[]}
                  searchPlaceholder="Search opportunities..."
                  searchColumn="stage"
                />
              )}
            </div>
          ),

          activity: (
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No activity yet.</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 text-sm">
                        <div className="mt-1 h-2 w-2 rounded-full bg-[var(--muted-foreground)] shrink-0" />
                        <div>
                          <p>{activity.content}</p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                            {activity.user?.name ?? "System"} &middot; {formatDate(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ),
        }}
      </AccountTabs>
    </div>
  );
}
