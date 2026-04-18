"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";
import {
  createSiteGroupAction,
  updateSiteGroupAction,
  deleteSiteGroupAction,
} from "@/app/(dashboard)/accounts/actions";

interface SiteGroup {
  id: string;
  name: string;
  description: string | null;
  _count?: { sites: number };
}

interface SiteGroupListProps {
  siteGroups: SiteGroup[];
  accountId: string;
}

export function SiteGroupList({ siteGroups, accountId }: SiteGroupListProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<SiteGroup | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  function openAdd() {
    setEditingGroup(null);
    setDialogOpen(true);
  }

  function openEdit(group: SiteGroup) {
    setEditingGroup(group);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);

    try {
      const formData = new FormData(e.currentTarget);

      let result;
      if (editingGroup) {
        result = await updateSiteGroupAction(editingGroup.id, formData);
      } else {
        result = await createSiteGroupAction(accountId, formData);
      }

      if (!result.success) {
        toast.error(result.error);
        setIsPending(false);
        return;
      }

      toast.success(editingGroup ? "Site group updated" : "Site group created");
      setDialogOpen(false);
      setEditingGroup(null);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete(groupId: string) {
    setIsPending(true);
    try {
      const result = await deleteSiteGroupAction(groupId, accountId);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Site group deleted");
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
        <h3 className="text-lg font-semibold">Site Groups</h3>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Group
        </Button>
      </div>

      {siteGroups.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] py-8 text-center">
          No site groups yet. Create a group to organize sites.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {siteGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <CardTitle className="text-base">{group.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(group)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(group.id)}
                    >
                      <Trash2 className="h-3 w-3 text-[var(--destructive)]" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {group.description && (
                  <p className="text-sm text-[var(--muted-foreground)] mb-2">
                    {group.description}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-medium">{group._count?.sites ?? 0}</span>{" "}
                  <span className="text-[var(--muted-foreground)]">
                    site{(group._count?.sites ?? 0) !== 1 ? "s" : ""}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogClose onOpenChange={setDialogOpen} />
        <DialogHeader>
          <DialogTitle>
            {editingGroup ? "Edit Site Group" : "Add Site Group"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form id="site-group-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Name <span className="text-[var(--destructive)]">*</span>
              </label>
              <div className="mt-1.5">
                <Input
                  name="name"
                  required
                  defaultValue={editingGroup?.name ?? ""}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <div className="mt-1.5">
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingGroup?.description ?? ""}
                  className="flex w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe this site group..."
                />
              </div>
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
          <Button type="submit" form="site-group-form" disabled={isPending}>
            {isPending ? "Saving..." : editingGroup ? "Update" : "Create"}
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
        <DialogClose onOpenChange={() => setDeleteConfirmId(null)} />
        <DialogHeader>
          <DialogTitle>Delete Site Group</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-[var(--muted-foreground)]">
            Are you sure you want to delete this site group? Sites in this group will not be deleted but will be ungrouped.
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
