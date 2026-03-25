import { z } from "zod";

export const createSiteGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters").max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
});

export const updateSiteGroupSchema = createSiteGroupSchema.partial();

export type CreateSiteGroupInput = z.infer<typeof createSiteGroupSchema>;
export type UpdateSiteGroupInput = z.infer<typeof updateSiteGroupSchema>;
