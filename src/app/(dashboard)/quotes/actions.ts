"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  createQuoteSchema,
  updateQuoteSchema,
  bulkUpdateComponentSchema,
} from "@/lib/validators/quote";
import * as quoteService from "@/lib/services/quote.service";

export type ActionResult = { success: true; id?: string } | { success: false; error: string };

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export async function createQuoteAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());

    const parsed = createQuoteSchema.safeParse({
      ...raw,
      showBreakdown: raw.showBreakdown === "true" || raw.showBreakdown === "on",
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const quote = await quoteService.createQuote(parsed.data, user.id);
    revalidatePath("/quotes");
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    return { success: true, id: quote.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create quote",
    };
  }
}

export async function updateQuoteTermsAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());

    const parsed = updateQuoteSchema.safeParse({
      ...raw,
      showBreakdown:
        raw.showBreakdown === undefined
          ? undefined
          : raw.showBreakdown === "true" || raw.showBreakdown === "on",
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    await quoteService.updateQuoteTerms(id, parsed.data, user.id);
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${id}`);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update quote terms",
    };
  }
}

// ---------------------------------------------------------------------------
// Component value updates
// ---------------------------------------------------------------------------

export async function updateComponentValueAction(
  quoteId: string,
  siteId: string,
  componentTypeId: string,
  value: number
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    if (typeof value !== "number" || value < 0) {
      return { success: false, error: "Value must be a non-negative number" };
    }

    await quoteService.updateComponentValue(quoteId, siteId, componentTypeId, value, user.id);
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update component value",
    };
  }
}

export async function bulkUpdateComponentAction(
  quoteId: string,
  siteIds: string[],
  componentTypeId: string,
  value: number
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    // Fetch the current unit for this component from the first site's component
    // The unit is passed as part of the existing record; value update keeps same unit
    const parsed = bulkUpdateComponentSchema.safeParse({
      siteIds,
      componentTypeId,
      value,
      unit: "PER_KWH", // placeholder — actual unit resolved from existing record in service
    });

    // We'll let the service resolve the actual unit from the existing component record.
    // Pass the data directly since the service reads the current unit.
    await quoteService.bulkUpdateComponent(
      quoteId,
      { siteIds, componentTypeId, value, unit: "PER_KWH" },
      user.id
    );
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to bulk update component",
    };
  }
}

export async function updateSiteGroupComponentAction(
  quoteId: string,
  siteGroupId: string,
  componentTypeId: string,
  value: number
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    if (typeof value !== "number" || value < 0) {
      return { success: false, error: "Value must be a non-negative number" };
    }

    await quoteService.updateSiteGroupComponent(
      quoteId,
      siteGroupId,
      componentTypeId,
      value,
      user.id
    );
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update site group component",
    };
  }
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export async function submitForApprovalAction(quoteId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await quoteService.submitForApproval(quoteId, user.id);
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit quote for approval",
    };
  }
}

export async function approveQuoteAction(
  quoteId: string,
  comment?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["SALES_MANAGER", "ADMIN"]);
    await quoteService.approveQuote(quoteId, user.id, comment);
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve quote",
    };
  }
}

export async function rejectQuoteAction(
  quoteId: string,
  comment: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["SALES_MANAGER", "ADMIN"]);

    if (!comment || comment.trim().length === 0) {
      return { success: false, error: "Rejection comment is required" };
    }

    await quoteService.rejectQuote(quoteId, user.id, comment);
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject quote",
    };
  }
}

export async function sendQuoteAction(quoteId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await quoteService.sendQuote(quoteId, user.id);
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send quote",
    };
  }
}

export async function acceptQuoteAction(quoteId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const quote = await quoteService.acceptQuote(quoteId, user.id);
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath(`/opportunities/${quote.opportunityId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept quote",
    };
  }
}

// ---------------------------------------------------------------------------
// Versioning / Cloning
// ---------------------------------------------------------------------------

export async function createNewVersionAction(quoteId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const newQuote = await quoteService.createNewVersion(quoteId, user.id);
    revalidatePath("/quotes");
    revalidatePath(`/quotes/${quoteId}`);
    return { success: true, id: newQuote.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create new version",
    };
  }
}

export async function cloneQuoteAction(
  quoteId: string,
  targetOpportunityId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const cloned = await quoteService.cloneQuote(quoteId, targetOpportunityId, user.id);
    revalidatePath("/quotes");
    revalidatePath(`/opportunities/${targetOpportunityId}`);
    return { success: true, id: cloned.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clone quote",
    };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteQuoteAction(quoteId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await quoteService.deleteQuote(quoteId, user.id);
    revalidatePath("/quotes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete quote",
    };
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportQuoteCsvAction(
  quoteId: string
): Promise<{ success: true; csv: string } | { success: false; error: string }> {
  try {
    await requireAuth();
    const csv = await quoteService.exportQuoteCsv(quoteId);
    return { success: true, csv };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export quote CSV",
    };
  }
}
