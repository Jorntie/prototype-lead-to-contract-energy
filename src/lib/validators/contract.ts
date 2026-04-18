import { z } from "zod";

export const CONTRACT_STATUSES = [
  "DRAFT",
  "SENT",
  "SIGNED",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const contractStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "SIGNED", label: "Signed" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "TERMINATED", label: "Terminated" },
] as const;

export const createContractSchema = z.object({
  quoteId: z.string().uuid("Invalid quote ID"),
  startDate: z.coerce.date().optional().or(z.literal("")),
  endDate: z.coerce.date().optional().or(z.literal("")),
});

export const updateContractSchema = z.object({
  startDate: z.coerce.date().optional().or(z.literal("")),
  endDate: z.coerce.date().optional().or(z.literal("")),
  signedDate: z.coerce.date().optional().or(z.literal("")),
  documentUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const updateContractStatusSchema = z.object({
  status: z.enum(CONTRACT_STATUSES),
  signedDate: z.coerce.date().optional().or(z.literal("")),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>;
