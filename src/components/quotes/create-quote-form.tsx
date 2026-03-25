"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createQuoteAction } from "@/app/(dashboard)/quotes/actions";
import Link from "next/link";

interface CreateQuoteFormProps {
  opportunities: { id: string; label: string }[];
  defaultOpportunityId?: string;
}

export function CreateQuoteForm({ opportunities, defaultOpportunityId }: CreateQuoteFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]> | null>(null);
  const [showBreakdown, setShowBreakdown] = React.useState(true);

  const defaultValidUntil = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setErrors(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("showBreakdown", showBreakdown ? "true" : "false");

      const result = await createQuoteAction(formData);

      if (result && "error" in result && result.error) {
        if (typeof result.error === "string") {
          toast.error(result.error);
        } else {
          setErrors(result.error as unknown as Record<string, string[]>);
          const firstError = Object.values(
            result.error as unknown as Record<string, string[]>
          ).flat()[0];
          if (firstError) toast.error(firstError);
        }
        setIsPending(false);
        return;
      }

      toast.success("Quote created successfully");

      if (result && "id" in result && result.id) {
        router.push(`/quotes/${result.id}`);
      } else {
        router.push("/quotes");
      }
    } catch {
      toast.error("An unexpected error occurred");
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Opportunity */}
          <FieldGroup label="Opportunity" error={errors?.opportunityId} required>
            {defaultOpportunityId ? (
              <>
                <input type="hidden" name="opportunityId" value={defaultOpportunityId} />
                <div className="flex h-9 w-full items-center rounded-md border border-[var(--input)] bg-[var(--muted)] px-3 py-1 text-sm">
                  {opportunities.find((o) => o.id === defaultOpportunityId)?.label ?? defaultOpportunityId}
                </div>
              </>
            ) : (
              <Select
                name="opportunityId"
                options={opportunities.map((o) => ({ value: o.id, label: o.label }))}
                placeholder="Select opportunity..."
                required
              />
            )}
          </FieldGroup>

          {/* Currency */}
          <FieldGroup label="Currency" error={errors?.currency}>
            <Select
              name="currency"
              defaultValue="EUR"
              options={[
                { value: "EUR", label: "EUR — Euro" },
                { value: "USD", label: "USD — US Dollar" },
                { value: "GBP", label: "GBP — British Pound" },
              ]}
            />
          </FieldGroup>

          {/* Payment Terms */}
          <FieldGroup label="Payment Terms" error={errors?.paymentTerms}>
            <Select
              name="paymentTerms"
              defaultValue="NET_30"
              options={[
                { value: "NET_14", label: "Net 14 days" },
                { value: "NET_30", label: "Net 30 days" },
                { value: "NET_60", label: "Net 60 days" },
              ]}
            />
          </FieldGroup>

          {/* Billing Frequency */}
          <FieldGroup label="Billing Frequency" error={errors?.billingFrequency}>
            <Select
              name="billingFrequency"
              defaultValue="MONTHLY"
              options={[
                { value: "MONTHLY", label: "Monthly" },
                { value: "QUARTERLY", label: "Quarterly" },
              ]}
            />
          </FieldGroup>

          {/* Valid Until */}
          <FieldGroup label="Valid Until" error={errors?.validUntil}>
            <Input
              name="validUntil"
              type="date"
              defaultValue={defaultValidUntil}
            />
          </FieldGroup>

          {/* Show Breakdown */}
          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="showBreakdown"
              checked={showBreakdown}
              onCheckedChange={(v) => setShowBreakdown(!!v)}
            />
            <div>
              <label htmlFor="showBreakdown" className="text-sm font-medium cursor-pointer">
                Show component breakdown
              </label>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                When enabled, the customer-facing quote will show individual price component lines.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link href="/quotes">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Quote"}
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
