"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { creditStatusOptions } from "@/lib/validators/account";

interface AccountFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string; id?: string } | void>;
  defaultValues?: {
    id?: string;
    name?: string;
    industry?: string | null;
    creditStatus?: string | null;
    currentSupplier?: string | null;
    contractEndDate?: Date | string | null;
  };
  submitLabel?: string;
  cancelHref: string;
}

export function AccountForm({
  action,
  defaultValues = {},
  submitLabel = "Create Account",
  cancelHref,
}: AccountFormProps) {
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
          setErrors(result.error as unknown as Record<string, string[]>);
          const firstError = Object.values(result.error).flat()[0];
          if (firstError) toast.error(String(firstError));
        }
        setIsPending(false);
        return;
      }

      toast.success(defaultValues.id ? "Account updated successfully" : "Account created successfully");
      if (result && "id" in result && result.id) {
        router.push(`/accounts/${result.id}`);
      } else if (defaultValues.id) {
        router.push(`/accounts/${defaultValues.id}`);
      } else {
        router.push("/accounts");
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
            <FieldGroup label="Account Name" error={errors?.name} required>
              <Input
                name="name"
                defaultValue={defaultValues.name ?? ""}
                required
              />
            </FieldGroup>
            <FieldGroup label="Industry" error={errors?.industry}>
              <Input
                name="industry"
                defaultValue={defaultValues.industry ?? ""}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="Credit Status" error={errors?.creditStatus}>
              <Select
                name="creditStatus"
                defaultValue={defaultValues.creditStatus ?? ""}
                options={creditStatusOptions}
                placeholder="Select credit status..."
              />
            </FieldGroup>
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
