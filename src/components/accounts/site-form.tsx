"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface SiteGroup {
  id: string;
  name: string;
}

interface SiteFormProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string } | void>;
  defaultValues?: {
    id?: string;
    address?: string;
    meterId?: string | null;
    commodity?: string | null;
    supplyCapacity?: number | null;
    annualConsumption?: number | null;
    peakPercentage?: number | null;
    voltageLevel?: string | null;
    connectionType?: string | null;
    contractEndDate?: Date | string | null;
    siteGroupId?: string | null;
    status?: string | null;
  };
  siteGroups: SiteGroup[];
  accountId: string;
  submitLabel?: string;
  cancelHref: string;
}

const commodityOptions = [
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "GAS", label: "Gas" },
  { value: "WATER", label: "Water" },
];

const voltageLevelOptions = [
  { value: "LV", label: "Low Voltage (LV)" },
  { value: "HV", label: "High Voltage (HV)" },
  { value: "EHV", label: "Extra High Voltage (EHV)" },
];

const siteStatusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PENDING", label: "Pending" },
  { value: "CHURNED", label: "Churned" },
];

export function SiteForm({
  action,
  defaultValues = {},
  siteGroups,
  accountId,
  submitLabel = "Create Site",
  cancelHref,
}: SiteFormProps) {
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

      toast.success(defaultValues.id ? "Site updated successfully" : "Site created successfully");
      router.push(`/accounts/${accountId}?tab=sites`);
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
            <CardTitle>Site Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="Address" error={errors?.address} required>
              <Input
                name="address"
                defaultValue={defaultValues.address ?? ""}
                required
              />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Meter ID" error={errors?.meterId}>
                <Input
                  name="meterId"
                  defaultValue={defaultValues.meterId ?? ""}
                />
              </FieldGroup>
              <FieldGroup label="Commodity" error={errors?.commodity}>
                <Select
                  name="commodity"
                  defaultValue={defaultValues.commodity ?? ""}
                  options={commodityOptions}
                  placeholder="Select commodity..."
                />
              </FieldGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Connection Type" error={errors?.connectionType}>
                <Input
                  name="connectionType"
                  defaultValue={defaultValues.connectionType ?? ""}
                />
              </FieldGroup>
              <FieldGroup label="Voltage Level" error={errors?.voltageLevel}>
                <Select
                  name="voltageLevel"
                  defaultValue={defaultValues.voltageLevel ?? ""}
                  options={voltageLevelOptions}
                  placeholder="Select voltage..."
                />
              </FieldGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consumption Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Supply Capacity (kW)" error={errors?.supplyCapacity}>
                <Input
                  name="supplyCapacity"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={defaultValues.supplyCapacity ?? ""}
                />
              </FieldGroup>
              <FieldGroup label="Annual Consumption (kWh)" error={errors?.annualConsumption}>
                <Input
                  name="annualConsumption"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={defaultValues.annualConsumption ?? ""}
                />
              </FieldGroup>
            </div>
            <FieldGroup label="Peak Percentage (%)" error={errors?.peakPercentage}>
              <Input
                name="peakPercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={defaultValues.peakPercentage ?? ""}
              />
            </FieldGroup>
            <FieldGroup label="Contract End Date" error={errors?.contractEndDate}>
              <Input
                name="contractEndDate"
                type="date"
                defaultValue={contractEndDateStr}
              />
            </FieldGroup>
            <FieldGroup label="Site Group" error={errors?.siteGroupId}>
              <Select
                name="siteGroupId"
                defaultValue={defaultValues.siteGroupId ?? ""}
                options={siteGroups.map((g) => ({ value: g.id, label: g.name }))}
                placeholder="Select site group..."
              />
            </FieldGroup>
            <FieldGroup label="Status" error={errors?.status}>
              <Select
                name="status"
                defaultValue={defaultValues.status ?? "ACTIVE"}
                options={siteStatusOptions}
                placeholder="Select status..."
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
