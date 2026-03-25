"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, cn } from "@/lib/utils";
import { updateQuoteTermsAction } from "@/app/(dashboard)/quotes/actions";
import { Pencil, Check, X } from "lucide-react";

const paymentTermsLabel: Record<string, string> = {
  NET_14: "Net 14 days",
  NET_30: "Net 30 days",
  NET_60: "Net 60 days",
};

const billingFrequencyLabel: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
};

interface QuoteTermsCardProps {
  quote: {
    id: string;
    status: string;
    currency: string | null;
    paymentTerms: string | null;
    billingFrequency: string | null;
    validUntil: Date | string | null;
    showBreakdown: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
}

const EDITABLE_STATUSES = ["DRAFT"];

export function QuoteTermsCard({ quote }: QuoteTermsCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = React.useState(false);

  const canEdit = EDITABLE_STATUSES.includes(quote.status);

  const validUntilStr = quote.validUntil
    ? new Date(quote.validUntil).toISOString().split("T")[0]
    : "";

  // Edit form state
  const [currency, setCurrency] = React.useState(quote.currency ?? "EUR");
  const [paymentTerms, setPaymentTerms] = React.useState(quote.paymentTerms ?? "NET_30");
  const [billingFrequency, setBillingFrequency] = React.useState(
    quote.billingFrequency ?? "MONTHLY"
  );
  const [validUntil, setValidUntil] = React.useState(validUntilStr);
  const [showBreakdown, setShowBreakdown] = React.useState(quote.showBreakdown);

  function resetForm() {
    setCurrency(quote.currency ?? "EUR");
    setPaymentTerms(quote.paymentTerms ?? "NET_30");
    setBillingFrequency(quote.billingFrequency ?? "MONTHLY");
    setValidUntil(validUntilStr);
    setShowBreakdown(quote.showBreakdown);
  }

  function handleEdit() {
    resetForm();
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    resetForm();
  }

  function handleSave() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("currency", currency);
      formData.set("paymentTerms", paymentTerms);
      formData.set("billingFrequency", billingFrequency);
      formData.set("validUntil", validUntil);
      formData.set("showBreakdown", showBreakdown ? "true" : "false");

      const result = await updateQuoteTermsAction(quote.id, formData);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save terms");
        return;
      }
      toast.success("Quote terms updated");
      setIsEditing(false);
      router.refresh();
    });
  }

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Currency",
      value: quote.currency ?? "EUR",
    },
    {
      label: "Payment Terms",
      value: paymentTermsLabel[quote.paymentTerms ?? ""] ?? quote.paymentTerms ?? "—",
    },
    {
      label: "Billing Frequency",
      value: billingFrequencyLabel[quote.billingFrequency ?? ""] ?? quote.billingFrequency ?? "—",
    },
    {
      label: "Valid Until",
      value: formatDate(quote.validUntil),
    },
    {
      label: "Show Breakdown",
      value: quote.showBreakdown ? "Yes" : "No",
    },
    {
      label: "Created",
      value: formatDate(quote.createdAt),
    },
    {
      label: "Last Updated",
      value: formatDate(quote.updatedAt),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Quote Terms</CardTitle>
          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {isEditing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isPending}
                className="text-green-600 hover:text-green-700"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <TermField label="Currency">
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: "EUR", label: "EUR" },
                  { value: "USD", label: "USD" },
                  { value: "GBP", label: "GBP" },
                ]}
              />
            </TermField>
            <TermField label="Payment Terms">
              <Select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                options={[
                  { value: "NET_14", label: "Net 14 days" },
                  { value: "NET_30", label: "Net 30 days" },
                  { value: "NET_60", label: "Net 60 days" },
                ]}
              />
            </TermField>
            <TermField label="Billing Frequency">
              <Select
                value={billingFrequency}
                onChange={(e) => setBillingFrequency(e.target.value)}
                options={[
                  { value: "MONTHLY", label: "Monthly" },
                  { value: "QUARTERLY", label: "Quarterly" },
                ]}
              />
            </TermField>
            <TermField label="Valid Until">
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </TermField>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="showBreakdownEdit"
                checked={showBreakdown}
                onCheckedChange={(v) => setShowBreakdown(!!v)}
              />
              <label htmlFor="showBreakdownEdit" className="text-sm cursor-pointer">
                Show component breakdown to customer
              </label>
            </div>
          </div>
        ) : (
          <dl className="space-y-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2">
                <dt className={cn("text-[var(--muted-foreground)] shrink-0")}>{row.label}</dt>
                <dd className="font-medium text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function TermField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted-foreground)] block mb-1">{label}</label>
      {children}
    </div>
  );
}
