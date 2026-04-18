"use server";

import { revalidatePath } from "next/cache";
import { createLeadSchema, updateLeadSchema, updateLeadStatusSchema, convertLeadSchema } from "@/lib/validators/lead";
import * as leadService from "@/lib/services/lead.service";
import { requireAuth } from "@/lib/auth";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createLeadAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    const raw = Object.fromEntries(formData.entries());
    const parsed = createLeadSchema.safeParse(raw);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    await leadService.createLead(parsed.data, user.id);
    revalidatePath("/leads");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create lead" };
  }
}

export async function updateLeadAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    const raw = Object.fromEntries(formData.entries());
    const parsed = updateLeadSchema.safeParse(raw);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    await leadService.updateLead(id, parsed.data, user.id);
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update lead" };
  }
}

export async function updateLeadStatusAction(id: string, status: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    const parsed = updateLeadStatusSchema.safeParse({ status });

    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors.status?.[0] ?? "Invalid status" };
    }

    await leadService.updateLeadStatus(id, parsed.data.status, user.id);
    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update status" };
  }
}

export async function convertLeadAction(id: string, formData?: FormData): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    const raw = formData ? Object.fromEntries(formData.entries()) : {};
    const parsed = convertLeadSchema.safeParse(raw);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    await leadService.convertLead(id, parsed.data, user.id);
    revalidatePath("/leads");
    revalidatePath("/accounts");
    revalidatePath("/opportunities");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to convert lead" };
  }
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await leadService.deleteLead(id, user.id);
    revalidatePath("/leads");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete lead" };
  }
}
