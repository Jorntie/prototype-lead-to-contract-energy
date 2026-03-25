"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createContactAction,
  updateContactAction,
  deleteContactAction,
} from "@/app/(dashboard)/accounts/actions";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
}

interface ContactListProps {
  contacts: Contact[];
  accountId: string;
}

export function ContactList({ contacts, accountId }: ContactListProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  function openAdd() {
    setEditingContact(null);
    setDialogOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);

    try {
      const formData = new FormData(e.currentTarget);

      let result;
      if (editingContact) {
        result = await updateContactAction(editingContact.id, formData);
      } else {
        result = await createContactAction(accountId, formData);
      }

      if (!result.success) {
        toast.error(result.error);
        setIsPending(false);
        return;
      }

      toast.success(editingContact ? "Contact updated" : "Contact added");
      setDialogOpen(false);
      setEditingContact(null);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete(contactId: string) {
    setIsPending(true);
    try {
      const result = await deleteContactAction(contactId, accountId);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Contact deleted");
        router.refresh();
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPending(false);
      setDeleteConfirmId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Contacts</h3>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] py-8 text-center">
          No contacts yet. Add a contact to get started.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>{contact.email ?? "---"}</TableCell>
                <TableCell>{contact.phone ?? "---"}</TableCell>
                <TableCell>{contact.role ?? "---"}</TableCell>
                <TableCell>
                  {contact.isPrimary && (
                    <Badge variant="info">Primary</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(contact.id)}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogClose onOpenChange={setDialogOpen} />
        <DialogHeader>
          <DialogTitle>
            {editingContact ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Name <span className="text-[var(--destructive)]">*</span>
              </label>
              <div className="mt-1.5">
                <Input
                  name="name"
                  required
                  defaultValue={editingContact?.name ?? ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <div className="mt-1.5">
                  <Input
                    name="email"
                    type="email"
                    defaultValue={editingContact?.email ?? ""}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <div className="mt-1.5">
                  <Input
                    name="phone"
                    defaultValue={editingContact?.phone ?? ""}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <div className="mt-1.5">
                <Input
                  name="role"
                  placeholder="e.g. Energy Manager, Procurement"
                  defaultValue={editingContact?.role ?? ""}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                name="isPrimary"
                defaultChecked={editingContact?.isPrimary ?? false}
                value="true"
              />
              <label className="text-sm font-medium">Primary Contact</label>
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="contact-form" disabled={isPending}>
            {isPending ? "Saving..." : editingContact ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogClose
          onOpenChange={() => setDeleteConfirmId(null)}
        />
        <DialogHeader>
          <DialogTitle>Delete Contact</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-[var(--muted-foreground)]">
            Are you sure you want to delete this contact? This action cannot be undone.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteConfirmId(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
