import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const QUOTE_STATUS = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "SUPERSEDED",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUS)[number];

export const PAYMENT_TERMS_OPTIONS = [
  { value: "NET_14", label: "Net 14 Days" },
  { value: "NET_30", label: "Net 30 Days" },
  { value: "NET_60", label: "Net 60 Days" },
] as const;

export const BILLING_FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
] as const;

export const COMPONENT_UNITS = [
  "PER_KWH",
  "PER_KW_MONTH",
  "PER_METER_MONTH",
  "FIXED_ANNUAL",
] as const;

export type ComponentUnit = (typeof COMPONENT_UNITS)[number];

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const createQuoteSchema = z.object({
  opportunityId: z.string().uuid("Invalid opportunity ID"),
  accountId: z.string().uuid("Invalid account ID"),
  currency: z.string().default("EUR"),
  paymentTerms: z
    .enum(["NET_14", "NET_30", "NET_60"], {
      errorMap: () => ({ message: "Payment terms must be NET_14, NET_30, or NET_60" }),
    })
    .optional(),
  billingFrequency: z
    .enum(["MONTHLY", "QUARTERLY"], {
      errorMap: () => ({ message: "Billing frequency must be MONTHLY or QUARTERLY" }),
    })
    .optional(),
  showBreakdown: z.boolean().default(true),
  validUntil: z.coerce.date().optional().or(z.literal("")),
});

export const updateQuoteSchema = createQuoteSchema
  .omit({ opportunityId: true, accountId: true })
  .partial();

export const componentValueSchema = z.object({
  value: z.number().min(0, "Value must be 0 or greater"),
  unit: z.enum(["PER_KWH", "PER_KW_MONTH", "PER_METER_MONTH", "FIXED_ANNUAL"], {
    errorMap: () => ({ message: "Invalid component unit" }),
  }),
});

export const quoteLineComponentSchema = z.object({
  componentTypeId: z.string().uuid("Invalid component type ID"),
  value: z.number().min(0, "Value must be 0 or greater"),
  unit: z.enum(["PER_KWH", "PER_KW_MONTH", "PER_METER_MONTH", "FIXED_ANNUAL"]),
  isPassThrough: z.boolean().optional(),
  isOverride: z.boolean().optional(),
});

export const quoteLineSchema = z.object({
  siteId: z.string().uuid("Invalid site ID"),
  annualKwh: z.number().min(0, "Annual kWh must be 0 or greater"),
  components: z.array(quoteLineComponentSchema),
});

export const updateQuoteLinesSchema = z.object({
  lines: z.array(quoteLineSchema),
});

export const submitForApprovalSchema = z.object({
  quoteId: z.string().uuid("Invalid quote ID"),
});

export const approveQuoteSchema = z.object({
  quoteId: z.string().uuid("Invalid quote ID"),
  comment: z.string().max(2000).optional(),
});

export const rejectQuoteSchema = z.object({
  quoteId: z.string().uuid("Invalid quote ID"),
  comment: z.string().min(1, "Rejection comment is required").max(2000),
});

export const bulkUpdateComponentSchema = z.object({
  siteIds: z.array(z.string().uuid("Invalid site ID")).min(1, "At least one site required"),
  componentTypeId: z.string().uuid("Invalid component type ID"),
  value: z.number().min(0, "Value must be 0 or greater"),
  unit: z.enum(["PER_KWH", "PER_KW_MONTH", "PER_METER_MONTH", "FIXED_ANNUAL"]),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type QuoteLineInput = z.infer<typeof quoteLineSchema>;
export type BulkUpdateComponentInput = z.infer<typeof bulkUpdateComponentSchema>;
