import { z } from "zod";

export const CREDIT_STATUSES = ["NOT_ASSESSED", "LOW_RISK", "MEDIUM_RISK", "HIGH_RISK"] as const;

export const creditStatusOptions: { value: string; label: string }[] = [
  { value: "NOT_ASSESSED", label: "Not Assessed" },
  { value: "LOW_RISK", label: "Low Risk" },
  { value: "MEDIUM_RISK", label: "Medium Risk" },
  { value: "HIGH_RISK", label: "High Risk" },
];

export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export const createAccountSchema = z.object({
  name: z.string().min(2, "Account name must be at least 2 characters").max(200),
  industry: z.string().max(200).optional().or(z.literal("")),
  creditStatus: z.enum(CREDIT_STATUSES).default("NOT_ASSESSED"),
  currentSupplier: z.string().max(200).optional().or(z.literal("")),
  contractEndDate: z.coerce.date().optional().or(z.literal("")),
});

export const updateAccountSchema = createAccountSchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
