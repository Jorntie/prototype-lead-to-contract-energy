import { z } from "zod";

export const COMMODITIES = ["ELECTRICITY", "GAS"] as const;
export const VOLTAGE_LEVELS = ["HV", "MV", "LV"] as const;
export const SITE_STATUSES = ["ACTIVE", "INACTIVE", "PENDING_VALIDATION"] as const;

export const commodityOptions: { value: string; label: string }[] = [
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "GAS", label: "Gas" },
];

export const voltageLevelOptions: { value: string; label: string }[] = [
  { value: "HV", label: "High Voltage" },
  { value: "MV", label: "Medium Voltage" },
  { value: "LV", label: "Low Voltage" },
];

export const siteStatusOptions: { value: string; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PENDING_VALIDATION", label: "Pending Validation" },
];

export type Commodity = (typeof COMMODITIES)[number];
export type VoltageLevel = (typeof VOLTAGE_LEVELS)[number];
export type SiteStatus = (typeof SITE_STATUSES)[number];

export const createSiteSchema = z.object({
  address: z.string().min(1, "Address is required").max(500),
  meterId: z.string().max(100).optional().or(z.literal("")),
  commodity: z.enum(COMMODITIES).default("ELECTRICITY"),
  supplyCapacity: z.coerce.number().positive("Must be a positive number").optional().or(z.literal("")),
  annualConsumption: z.coerce.number().positive("Must be a positive number").optional().or(z.literal("")),
  peakPercentage: z.coerce.number().min(0, "Must be between 0 and 100").max(100, "Must be between 0 and 100").optional().or(z.literal("")),
  voltageLevel: z.enum(VOLTAGE_LEVELS).optional().or(z.literal("")),
  connectionType: z.string().max(100).optional().or(z.literal("")),
  contractEndDate: z.coerce.date().optional().or(z.literal("")),
  siteGroupId: z.string().uuid("Invalid site group ID").optional().or(z.literal("")),
  status: z.enum(SITE_STATUSES).default("ACTIVE"),
});

export const updateSiteSchema = createSiteSchema.partial();

export const bulkCreateSitesSchema = z.array(createSiteSchema);

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
