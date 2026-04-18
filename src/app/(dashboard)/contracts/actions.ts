"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  createContractSchema,
  updateContractSchema,
  updateContractStatusSchema,
} from "@/lib/validators/contract";
import * as contractService from "@/lib/services/contract.service";

export type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export async function createContractAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());

    const parsed = createContractSchema.safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const contract = await contractService.createContractFromQuote(
      parsed.data,
      user.id
    );

    revalidatePath("/contracts");
    revalidatePath("/quotes");
    return { success: true, id: contract.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create contract",
    };
  }
}

export async function updateContractAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData.entries());

    const parsed = updateContractSchema.safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(errors).flat()[0] ?? "Validation failed";
      return { success: false, error: firstError };
    }

    await contractService.updateContract(id, parsed.data, user.id);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${id}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update contract",
    };
  }
}

export async function updateContractStatusAction(
  id: string,
  status: string,
  signedDate?: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    const parsed = updateContractStatusSchema.safeParse({
      status,
      signedDate: signedDate || undefined,
    });
    if (!parsed.success) {
      return { success: false, error: "Invalid status" };
    }

    await contractService.updateContractStatus(id, parsed.data, user.id);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${id}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update contract status",
    };
  }
}

export async function deleteContractAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await contractService.deleteContract(id, user.id);
    revalidatePath("/contracts");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete contract",
    };
  }
}
