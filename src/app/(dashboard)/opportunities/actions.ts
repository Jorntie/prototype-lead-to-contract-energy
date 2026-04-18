"use server";

import { revalidatePath } from "next/cache";
import { createOpportunitySchema, type OpportunityStage } from "@/lib/validators/opportunity";
import * as opportunityService from "@/lib/services/opportunity.service";
import { requireAuth } from "@/lib/auth";

export type ActionResult = { success: true; id?: string } | { success: false; error: string };

export async function createOpportunityAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    const raw = Object.fromEntries(formData.entries());
    const siteIds = formData.get("siteIds")
      ? (formData.get("siteIds") as string).split(",").filter(Boolean)
      : [];

    const parsed = createOpportunitySchema.safeParse({
      ...raw,
      contractDuration: raw.contractDuration ? Number(raw.contractDuration) : undefined,
      siteIds,
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const opportunity = await opportunityService.createOpportunity(parsed.data, user.id);
    revalidatePath("/opportunities");
    return { success: true, id: opportunity.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create opportunity" };
  }
}

export async function updateOpportunityAction(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    const raw = Object.fromEntries(formData.entries());
    const parsed = createOpportunitySchema.safeParse({
      ...raw,
      contractDuration: raw.contractDuration ? Number(raw.contractDuration) : undefined,
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    await opportunityService.updateOpportunity(id, parsed.data, user.id);
    revalidatePath("/opportunities");
    revalidatePath(`/opportunities/${id}`);
    return { success: true, id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update opportunity" };
  }
}

export async function updateOpportunityStageAction(
  id: string,
  stage: string,
  winLossReason?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    await opportunityService.updateOpportunityStage(id, { stage: stage as OpportunityStage, winLossReason }, user.id);
    revalidatePath("/opportunities");
    revalidatePath(`/opportunities/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update stage" };
  }
}

export async function deleteOpportunityAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await opportunityService.deleteOpportunity(id, user.id);
    revalidatePath("/opportunities");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete opportunity" };
  }
}

export async function updateOpportunitySitesAction(
  id: string,
  siteIds: string[]
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await opportunityService.updateOpportunitySites(id, siteIds, user.id);
    revalidatePath("/opportunities");
    revalidatePath(`/opportunities/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update sites" };
  }
}

export async function exportSitesCsvAction(id: string): Promise<{ success: true; csv: string } | { success: false; error: string }> {
  try {
    await requireAuth();
    const csv = await opportunityService.exportSitesCsv(id);
    return { success: true, csv };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to export CSV" };
  }
}
