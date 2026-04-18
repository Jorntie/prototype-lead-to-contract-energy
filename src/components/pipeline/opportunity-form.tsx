"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

interface Account {
  id: string;
  name: string;
}

interface Site {
  id: string;
  address: string;
  meterId: string | null;
  annualConsumption: number | null;
  accountId: string;
}

interface User {
  id: string;
  name: string;
}

interface OpportunityFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string; id?: string } | void>;
  defaultValues?: {
    id?: string;
    accountId?: string;
    expectedCloseDate?: Date | string | null;
    contractDuration?: number | null;
    assignedToId?: string | null;
    siteIds?: string[];
  };
  accounts: Account[];
  sites: Site[];
  users: User[];
  submitLabel?: string;
  cancelHref: string;
}

export function OpportunityForm({
  action,
  defaultValues = {},
  accounts,
  sites,
  users,
  submitLabel = "Create Opportunity",
  cancelHref,
}: OpportunityFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]> | null>(null);
  const [selectedAccountId, setSelectedAccountId] = React.useState(defaultValues.accountId ?? "");
  const [selectedSiteIds, setSelectedSiteIds] = React.useState<Set<string>>(
    new Set(defaultValues.siteIds ?? [])
  );

  const expectedCloseDateStr = defaultValues.expectedCloseDate
    ? new Date(defaultValues.expectedCloseDate).toISOString().split("T")[0]
    : "";

  const accountSites = React.useMemo(
    () => sites.filter((s) => s.accountId === selectedAccountId),
    [sites, selectedAccountId]
  );

  function toggleSite(siteId: string) {
    setSelectedSiteIds((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setErrors(null);

    try {
      const formData = new FormData(e.currentTarget);
      // Add selected site IDs
      formData.set("siteIds", Array.from(selectedSiteIds).join(","));

      const result = await action(formData);

      if (result && "error" in result && result.error) {
        if (typeof result.error === "string") {
          toast.error(result.error);
        } else {
          setErrors(result.error as unknown as Record<string, string[]>);
          const firstError = Object.values(result.error as unknown as Record<string, string[]>).flat()[0];
          if (firstError) toast.error(firstError);
        }
        setIsPending(false);
        return;
      }

      toast.success(defaultValues.id ? "Opportunity updated successfully" : "Opportunity created successfully");

      if (result && "id" in result && result.id) {
        router.push(`/opportunities/${result.id}`);
      } else if (defaultValues.id) {
        router.push(`/opportunities/${defaultValues.id}`);
      } else {
        router.push("/opportunities");
      }
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Opportunity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="Account" error={errors?.accountId} required>
              <Select
                name="accountId"
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  setSelectedSiteIds(new Set());
                }}
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                placeholder="Select account..."
                required
              />
            </FieldGroup>

            <FieldGroup label="Expected Close Date" error={errors?.expectedCloseDate}>
              <Input
                name="expectedCloseDate"
                type="date"
                defaultValue={expectedCloseDateStr}
              />
            </FieldGroup>

            <FieldGroup label="Contract Duration (months)" error={errors?.contractDuration}>
              <Input
                name="contractDuration"
                type="number"
                min="1"
                defaultValue={defaultValues.contractDuration ?? ""}
              />
            </FieldGroup>

            <FieldGroup label="Assigned To" error={errors?.assignedToId}>
              <Select
                name="assignedToId"
                defaultValue={defaultValues.assignedToId ?? ""}
                options={users.map((u) => ({ value: u.id, label: u.name }))}
                placeholder="Select user..."
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Site selection (only on create, or when account is selected) */}
        {selectedAccountId && !defaultValues.id && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Select Sites</CardTitle>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {selectedSiteIds.size} selected
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {accountSites.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
                  No sites found for this account.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1">
                  {accountSites.map((site) => (
                    <label
                      key={site.id}
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-[var(--accent)] cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedSiteIds.has(site.id)}
                        onCheckedChange={() => toggleSite(site.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{site.address}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {site.meterId ?? "No meter ID"}
                          {site.annualConsumption != null && (
                            <> &middot; {formatNumber(site.annualConsumption)} kWh</>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link href={cancelHref}>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function FieldGroup({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string[];
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium leading-none">
        {label}
        {required && <span className="text-[var(--destructive)] ml-0.5">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="text-xs text-[var(--destructive)] mt-1">{error[0]}</p>}
    </div>
  );
}
