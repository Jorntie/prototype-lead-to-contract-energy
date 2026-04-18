"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import * as priceComponentService from "@/lib/services/price-component.service";

export type ActionResult = { success: true; id?: string } | { success: false; error: string };

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

const createPriceComponentTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  category: z.enum(
    ["ENERGY", "NETWORK", "TAXES_LEVIES", "MARGIN", "GREEN", "SERVICES"],
    { errorMap: () => ({ message: "Invalid category" }) }
  ),
  defaultUnit: z.enum(
    ["PER_KWH", "PER_KW_MONTH", "PER_METER_MONTH", "FIXED_ANNUAL"],
    { errorMap: () => ({ message: "Invalid unit" }) }
  ),
  defaultValue: z.coerce.number().optional().or(z.literal("")),
  isPassThrough: z.boolean().default(false),
  isRequired: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  marginBaseComponentIds: z.array(z.string().uuid()).optional(),
});

const updatePriceComponentTypeSchema = createPriceComponentTypeSchema.partial();

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createPriceComponentTypeAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["ADMIN", "SALES_MANAGER"]);
    const raw = Object.fromEntries(formData.entries());

    // Parse marginBaseComponentIds from comma-separated string if provided
    const marginBaseRaw = formData.get("marginBaseComponentIds");
    const marginBaseComponentIds =
      typeof marginBaseRaw === "string" && marginBaseRaw.trim()
        ? marginBaseRaw.split(",").filter(Boolean)
        : undefined;

    const parsed = createPriceComponentTypeSchema.safeParse({
      ...raw,
      isPassThrough: raw.isPassThrough === "true" || raw.isPassThrough === "on",
      isRequired: raw.isRequired !== undefined
        ? raw.isRequired === "true" || raw.isRequired === "on"
        : true,
      isActive: raw.isActive !== undefined
        ? raw.isActive === "true" || raw.isActive === "on"
        : true,
      defaultValue: raw.defaultValue ? Number(raw.defaultValue) : undefined,
      displayOrder: raw.displayOrder ? Number(raw.displayOrder) : 0,
      marginBaseComponentIds,
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const componentType = await priceComponentService.createPriceComponentType(
      {
        ...parsed.data,
        defaultValue: parsed.data.defaultValue
          ? Number(parsed.data.defaultValue)
          : null,
      },
      user.id
    );

    revalidatePath("/admin/price-components");
    return { success: true, id: componentType.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create price component type",
    };
  }
}

export async function updatePriceComponentTypeAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["ADMIN", "SALES_MANAGER"]);
    const raw = Object.fromEntries(formData.entries());

    const marginBaseRaw = formData.get("marginBaseComponentIds");
    const marginBaseComponentIds =
      typeof marginBaseRaw === "string" && marginBaseRaw.trim()
        ? marginBaseRaw.split(",").filter(Boolean)
        : undefined;

    const updatePayload: Record<string, unknown> = { ...raw };

    if (raw.isPassThrough !== undefined) {
      updatePayload.isPassThrough = raw.isPassThrough === "true" || raw.isPassThrough === "on";
    }
    if (raw.isRequired !== undefined) {
      updatePayload.isRequired = raw.isRequired === "true" || raw.isRequired === "on";
    }
    if (raw.isActive !== undefined) {
      updatePayload.isActive = raw.isActive === "true" || raw.isActive === "on";
    }
    if (raw.defaultValue !== undefined) {
      updatePayload.defaultValue = raw.defaultValue ? Number(raw.defaultValue) : null;
    }
    if (raw.displayOrder !== undefined) {
      updatePayload.displayOrder = Number(raw.displayOrder);
    }
    if (marginBaseComponentIds !== undefined) {
      updatePayload.marginBaseComponentIds = marginBaseComponentIds;
    }

    const parsed = updatePriceComponentTypeSchema.safeParse(updatePayload);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    await priceComponentService.updatePriceComponentType(
      id,
      {
        ...parsed.data,
        defaultValue:
          parsed.data.defaultValue != null
            ? Number(parsed.data.defaultValue)
            : parsed.data.defaultValue === null
            ? null
            : undefined,
        marginBaseComponentIds: parsed.data.marginBaseComponentIds,
      },
      user.id
    );

    revalidatePath("/admin/price-components");
    revalidatePath(`/admin/price-components/${id}`);
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update price component type",
    };
  }
}

export async function togglePriceComponentTypeActiveAction(
  id: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth(["ADMIN", "SALES_MANAGER"]);
    await priceComponentService.togglePriceComponentTypeActive(id, user.id);
    revalidatePath("/admin/price-components");
    return { success: true, id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to toggle price component type status",
    };
  }
}
