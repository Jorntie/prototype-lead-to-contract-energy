"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface LeadFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string | Record<string, string[]> } | void>;
  defaultValues?: {
    id?: string;
    companyName?: string;
    contactName?: string;
    email?: string | null;
    phone?: string | null;
    estimatedSites?: number | null;
    estimatedVolume?: number | null;
    currentSupplier?: string | null;
    contractEndDate?: Date | string | null;
    notes?: string | null;
    assignedToId?: string | null;
  };
  users: { id: string; name: string }[];
  submitLabel?: string;
  cancelHref: string;
}

export function LeadForm({
  action,
  defaultValues = {},
  users,
  submitLabel = "Create Lead",
  cancelHref,
}: LeadFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]> | null>(null);

  const contractEndDateStr = defaultValues.contractEndDate
    ? new Date(defaultValues.contractEndDate).toISOString().split("T")[0]
    : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setErrors(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await action(formData);

      if (result && "error" in result && result.error) {
        if (typeof result.error === "string") {
          toast.error(result.error);
        } else {
          setErrors(result.error);
          const firstError = Object.values(result.error).flat()[0];
          if (firstError) toast.error(firstError);
        }
        setIsPending(false);
        return;
      }

      toast.success(defaultValues.id ? "Lead updated successfully" : "Lead created successfully");
      if (defaultValues.id) {
        router.push(`/leads/${defaultValues.id}`);
      } else {
        router.push("/leads");
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
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="Company Name" error={errors?.companyName} required>
              <Input
                name="companyName"
                defaultValue={defaultValues.companyName ?? ""}
                required
              />
            </FieldGroup>
            <FieldGroup label="Contact Name" error={errors?.contactName} required>
              <Input
                name="contactName"
                defaultValue={defaultValues.contactName ?? ""}
                required
              />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Email" error={errors?.email}>
                <Input
                  name="email"
                  type="email"
                  defaultValue={defaultValues.email ?? ""}
                />
              </FieldGroup>
              <FieldGroup label="Phone" error={errors?.phone}>
                <Input
                  name="phone"
                  defaultValue={defaultValues.phone ?? ""}
                />
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Estimated Sites" error={errors?.estimatedSites}>
                <Input
                  name="estimatedSites"
                  type="number"
                  min="1"
                  defaultValue={defaultValues.estimatedSites ?? ""}
                />
              </FieldGroup>
              <FieldGroup label="Estimated Volume (kWh)" error={errors?.estimatedVolume}>
                <Input
                  name="estimatedVolume"
                  type="number"
                  min="0"
                  defaultValue={defaultValues.estimatedVolume ?? ""}
                />
              </FieldGroup>
            </div>
            <FieldGroup label="Current Supplier" error={errors?.currentSupplier}>
              <Input
                name="currentSupplier"
                defaultValue={defaultValues.currentSupplier ?? ""}
              />
            </FieldGroup>
            <FieldGroup label="Contract End Date" error={errors?.contractEndDate}>
              <Input
                name="contractEndDate"
                type="date"
                defaultValue={contractEndDateStr}
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              name="notes"
              rows={3}
              defaultValue={defaultValues.notes ?? ""}
              className="flex w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Additional notes..."
            />
          </CardContent>
        </Card>
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
