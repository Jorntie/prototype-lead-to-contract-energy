import { prisma } from "@/lib/db";
import { logActivity, logCreation } from "./activity-log.service";
import type { PriceComponentType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreatePriceComponentTypeInput = {
  name: string;
  category: string;
  defaultUnit: string;
  defaultValue?: number | null;
  isPassThrough?: boolean;
  isRequired?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  marginBaseComponentIds?: string[]; // stored as JSON string
};

export type UpdatePriceComponentTypeInput = Partial<CreatePriceComponentTypeInput>;

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all price component types, optionally including inactive ones.
 */
export async function getPriceComponentTypes(
  includeInactive = false
): Promise<PriceComponentType[]> {
  return prisma.priceComponentType.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
}

/**
 * Get a single price component type by ID.
 */
export async function getPriceComponentType(id: string): Promise<PriceComponentType | null> {
  return prisma.priceComponentType.findUnique({
    where: { id },
  });
}

/**
 * Create a new price component type.
 */
export async function createPriceComponentType(
  data: CreatePriceComponentTypeInput,
  userId: string
): Promise<PriceComponentType> {
  // Validate category
  const validCategories = ["ENERGY", "NETWORK", "TAXES_LEVIES", "MARGIN", "GREEN", "SERVICES"];
  if (!validCategories.includes(data.category)) {
    throw new Error(
      `Invalid category "${data.category}". Must be one of: ${validCategories.join(", ")}`
    );
  }

  // Validate unit
  const validUnits = ["PER_KWH", "PER_KW_MONTH", "PER_METER_MONTH", "FIXED_ANNUAL"];
  if (!validUnits.includes(data.defaultUnit)) {
    throw new Error(
      `Invalid unit "${data.defaultUnit}". Must be one of: ${validUnits.join(", ")}`
    );
  }

  const componentType = await prisma.priceComponentType.create({
    data: {
      name: data.name,
      category: data.category,
      defaultUnit: data.defaultUnit,
      defaultValue: data.defaultValue ?? null,
      isPassThrough: data.isPassThrough ?? false,
      isRequired: data.isRequired ?? true,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
      marginBaseComponentIds: data.marginBaseComponentIds
        ? JSON.stringify(data.marginBaseComponentIds)
        : "[]",
    },
  });

  await logCreation({
    entityType: "PriceComponentType",
    entityId: componentType.id,
    userId,
    entityName: componentType.name,
  });

  return componentType;
}

/**
 * Update a price component type.
 */
export async function updatePriceComponentType(
  id: string,
  data: UpdatePriceComponentTypeInput,
  userId: string
): Promise<PriceComponentType> {
  await prisma.priceComponentType.findFirstOrThrow({
    where: { id },
  });

  if (data.category !== undefined) {
    const validCategories = ["ENERGY", "NETWORK", "TAXES_LEVIES", "MARGIN", "GREEN", "SERVICES"];
    if (!validCategories.includes(data.category)) {
      throw new Error(
        `Invalid category "${data.category}". Must be one of: ${validCategories.join(", ")}`
      );
    }
  }

  if (data.defaultUnit !== undefined) {
    const validUnits = ["PER_KWH", "PER_KW_MONTH", "PER_METER_MONTH", "FIXED_ANNUAL"];
    if (!validUnits.includes(data.defaultUnit)) {
      throw new Error(
        `Invalid unit "${data.defaultUnit}". Must be one of: ${validUnits.join(", ")}`
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.defaultUnit !== undefined) updateData.defaultUnit = data.defaultUnit;
  if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue ?? null;
  if (data.isPassThrough !== undefined) updateData.isPassThrough = data.isPassThrough;
  if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.marginBaseComponentIds !== undefined) {
    updateData.marginBaseComponentIds = JSON.stringify(data.marginBaseComponentIds);
  }

  const componentType = await prisma.priceComponentType.update({
    where: { id },
    data: updateData,
  });

  await logActivity({
    entityType: "PriceComponentType",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Price component type "${componentType.name}" updated`,
    metadata: { changes: Object.keys(updateData) },
  });

  return componentType;
}

/**
 * Toggle the isActive flag on a price component type.
 */
export async function togglePriceComponentTypeActive(
  id: string,
  userId: string
): Promise<PriceComponentType> {
  const existing = await prisma.priceComponentType.findFirstOrThrow({
    where: { id },
  });

  const newActive = !existing.isActive;

  const componentType = await prisma.priceComponentType.update({
    where: { id },
    data: { isActive: newActive },
  });

  await logActivity({
    entityType: "PriceComponentType",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Price component type "${componentType.name}" ${newActive ? "activated" : "deactivated"}`,
    metadata: { isActive: newActive },
  });

  return componentType;
}
