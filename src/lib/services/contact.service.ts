import { prisma } from "@/lib/db";
import { logActivity, logCreation } from "./activity-log.service";
import type { CreateContactInput, UpdateContactInput } from "@/lib/validators/contact";
import type { Contact } from "@prisma/client";

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Get all contacts for an account.
 */
export async function getContacts(accountId: string): Promise<Contact[]> {
  return prisma.contact.findMany({
    where: { accountId, deletedAt: null },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });
}

/**
 * Create a new contact for an account.
 * When isPrimary is true, unset any existing primary contact on the same account.
 */
export async function createContact(
  accountId: string,
  data: CreateContactInput,
  userId: string
): Promise<Contact> {
  if (data.isPrimary) {
    await prisma.contact.updateMany({
      where: { accountId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.contact.create({
    data: {
      accountId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role || null,
      isPrimary: data.isPrimary ?? false,
    },
  });

  await logCreation({
    entityType: "Contact",
    entityId: contact.id,
    userId,
    entityName: contact.name,
  });

  return contact;
}

/**
 * Update a contact.
 */
export async function updateContact(
  id: string,
  data: UpdateContactInput,
  userId: string
): Promise<Contact> {
  const existing = await prisma.contact.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  // If setting this contact as primary, unset others on the same account
  if (data.isPrimary) {
    await prisma.contact.updateMany({
      where: { accountId: existing.accountId, isPrimary: true, id: { not: id } },
      data: { isPrimary: false },
    });
  }

  const cleaned: Record<string, unknown> = {};
  if (data.name !== undefined) cleaned.name = data.name;
  if (data.email !== undefined) cleaned.email = data.email || null;
  if (data.phone !== undefined) cleaned.phone = data.phone || null;
  if (data.role !== undefined) cleaned.role = data.role || null;
  if (data.isPrimary !== undefined) cleaned.isPrimary = data.isPrimary;

  const contact = await prisma.contact.update({
    where: { id },
    data: cleaned,
  });

  await logActivity({
    entityType: "Contact",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Contact "${existing.name}" updated`,
  });

  return contact;
}

/**
 * Delete a contact (hard delete).
 */
export async function deleteContact(id: string, userId: string): Promise<void> {
  const existing = await prisma.contact.findFirstOrThrow({
    where: { id, deletedAt: null },
  });

  await prisma.contact.delete({
    where: { id },
  });

  await logActivity({
    entityType: "Contact",
    entityId: id,
    userId,
    type: "UPDATED",
    content: `Contact "${existing.name}" deleted`,
  });
}
