"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/validators/account";
import {
  createContactSchema,
  updateContactSchema,
} from "@/lib/validators/contact";
import {
  createSiteSchema,
  updateSiteSchema,
  bulkCreateSitesSchema,
} from "@/lib/validators/site";
import {
  createSiteGroupSchema,
  updateSiteGroupSchema,
} from "@/lib/validators/site-group";
import * as accountService from "@/lib/services/account.service";
import * as contactService from "@/lib/services/contact.service";
import * as siteService from "@/lib/services/site.service";
import * as siteGroupService from "@/lib/services/site-group.service";

export type ActionResult = { success: true } | { success: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstError(errors: Record<string, string[] | undefined>): string {
  return Object.values(errors).flat()[0] ?? "Validation failed";
}

function revalidateAccount(accountId?: string) {
  revalidatePath("/accounts");
  if (accountId) {
    revalidatePath(`/accounts/${accountId}`);
  }
}

// ---------------------------------------------------------------------------
// Account actions
// ---------------------------------------------------------------------------

export async function createAccountAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());
    const parsed = createAccountSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };
    }

    await accountService.createAccount(parsed.data, user.id);
    revalidateAccount();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create account",
    };
  }
}

export async function updateAccountAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());
    const parsed = updateAccountSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };
    }

    await accountService.updateAccount(id, parsed.data, user.id);
    revalidateAccount(id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update account",
    };
  }
}

export async function deleteAccountAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await accountService.deleteAccount(id, user.id);
    revalidateAccount();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete account",
    };
  }
}

// ---------------------------------------------------------------------------
// Contact actions
// ---------------------------------------------------------------------------

export async function createContactAction(
  accountId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());
    const parsed = createContactSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };
    }

    await contactService.createContact(accountId, parsed.data, user.id);
    revalidateAccount(accountId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create contact",
    };
  }
}

export async function updateContactAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());
    const parsed = updateContactSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };
    }

    await contactService.updateContact(id, parsed.data, user.id);
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update contact",
    };
  }
}

export async function deleteContactAction(
  id: string,
  accountId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await contactService.deleteContact(id, user.id);
    revalidateAccount(accountId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete contact",
    };
  }
}

// ---------------------------------------------------------------------------
// Site actions
// ---------------------------------------------------------------------------

export async function createSiteAction(
  accountId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());
    const parsed = createSiteSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };
    }

    await siteService.createSite(accountId, parsed.data, user.id);
    revalidateAccount(accountId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create site",
    };
  }
}

export async function updateSiteAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());
    const parsed = updateSiteSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };
    }

    await siteService.updateSite(id, parsed.data, user.id);
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update site",
    };
  }
}

export async function deleteSiteAction(
  id: string,
  accountId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await siteService.deleteSite(id, user.id);
    revalidateAccount(accountId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete site",
    };
  }
}

// ---------------------------------------------------------------------------
// Site Group actions
// ---------------------------------------------------------------------------

export async function createSiteGroupAction(
  accountId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());
    const parsed = createSiteGroupSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };
    }

    await siteGroupService.createSiteGroup(accountId, parsed.data, user.id);
    revalidateAccount(accountId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create site group",
    };
  }
}

export async function updateSiteGroupAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());
    const parsed = updateSiteGroupSchema.safeParse(raw);

    if (!parsed.success) {
      return { success: false, error: firstError(parsed.error.flatten().fieldErrors) };
    }

    await siteGroupService.updateSiteGroup(id, parsed.data, user.id);
    revalidatePath("/accounts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update site group",
    };
  }
}

export async function deleteSiteGroupAction(
  id: string,
  accountId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await siteGroupService.deleteSiteGroup(id, user.id);
    revalidateAccount(accountId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete site group",
    };
  }
}

// ---------------------------------------------------------------------------
// Bulk actions
// ---------------------------------------------------------------------------

export async function bulkCreateSitesAction(
  accountId: string,
  sitesJson: string
): Promise<ActionResult & { created?: number; errors?: string[] }> {
  try {
    const user = await requireAuth();

    let sitesData: unknown;
    try {
      sitesData = JSON.parse(sitesJson);
    } catch {
      return { success: false, error: "Invalid JSON data" };
    }

    const parsed = bulkCreateSitesSchema.safeParse(sitesData);

    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return {
        success: false,
        error: errors.formErrors[0] ?? "Validation failed for one or more sites",
      };
    }

    const result = await siteService.bulkCreateSites(
      accountId,
      parsed.data,
      user.id
    );

    revalidateAccount(accountId);

    if (result.errors.length > 0 && result.created === 0) {
      return {
        success: false,
        error: `All ${result.errors.length} sites failed to import`,
        errors: result.errors,
      };
    }

    return { success: true, created: result.created, errors: result.errors };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to bulk create sites",
    };
  }
}
