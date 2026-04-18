import { z } from "zod";

export const createContactSchema = z.object({
  name: z.string().min(2, "Contact name must be at least 2 characters").max(200),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  role: z.string().max(100).optional().or(z.literal("")),
  isPrimary: z.coerce.boolean().default(false),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
