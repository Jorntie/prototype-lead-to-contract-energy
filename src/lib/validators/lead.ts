import { z } from "zod";

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "DISQUALIFIED", "CONVERTED"] as const;

export const leadStatusOptions = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "DISQUALIFIED", label: "Disqualified" },
  { value: "CONVERTED", label: "Converted" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CREDIT_STATUSES = ["NOT_ASSESSED", "LOW_RISK", "MEDIUM_RISK", "HIGH_RISK"] as const;

export const createLeadSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters").max(200),
  contactName: z.string().min(2, "Contact name must be at least 2 characters").max(200),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  estimatedSites: z.coerce.number().int().positive("Must be a positive number").optional().or(z.literal("")),
  estimatedVolume: z.coerce.number().positive("Must be a positive number").optional().or(z.literal("")),
  currentSupplier: z.string().max(200).optional().or(z.literal("")),
  contractEndDate: z.coerce.date().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  assignedToId: z.string().uuid("Invalid user ID").optional().or(z.literal("")),
});

export const updateLeadSchema = createLeadSchema.partial();

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${LEAD_STATUSES.join(", ")}` }),
  }),
});

export const convertLeadSchema = z.object({
  industry: z.string().max(200).optional().or(z.literal("")),
  creditStatus: z.enum(CREDIT_STATUSES).default("NOT_ASSESSED"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
