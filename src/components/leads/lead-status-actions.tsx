"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { updateLeadStatusAction, deleteLeadAction } from "@/app/(dashboard)/leads/actions";
import { LeadConvertDialog } from "@/components/leads/lead-convert-dialog";
import { ChevronDown, ArrowRightLeft, Trash2 } from "lucide-react";

const statusTransitions: Record<string, { label: string; value: string }[]> = {
  NEW: [
    { label: "Mark as Contacted", value: "CONTACTED" },
    { label: "Mark as Qualified", value: "QUALIFIED" },
    { label: "Disqualify", value: "DISQUALIFIED" },
  ],
  CONTACTED: [
    { label: "Mark as Qualified", value: "QUALIFIED" },
    { label: "Disqualify", value: "DISQUALIFIED" },
  ],
  QUALIFIED: [
    { label: "Disqualify", value: "DISQUALIFIED" },
  ],
  DISQUALIFIED: [
    { label: "Reopen as New", value: "NEW" },
  ],
};

interface LeadStatusActionsProps {
  lead: { id: string; status: string; companyName: string };
}

export function LeadStatusActions({ lead }: LeadStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showConvertDialog, setShowConvertDialog] = React.useState(false);

  const transitions = statusTransitions[lead.status] ?? [];
  const canConvert = lead.status === "QUALIFIED";

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateLeadStatusAction(lead.id, newStatus);
      if (result.success) {
        toast.success("Status updated successfully");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLeadAction(lead.id);
      if (result.success) {
        toast.success("Lead deleted");
        router.push("/leads");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canConvert && (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => setShowConvertDialog(true)}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Convert to Account
          </Button>
        )}

        {(transitions.length > 0 || lead.status !== "CONVERTED") && (
          <DropdownMenu
            trigger={
              <Button variant="outline" size="sm" disabled={isPending}>
                {isPending ? "Updating..." : "Actions"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
          >
            {transitions.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => handleStatusChange(t.value)}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
            {transitions.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              destructive
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Lead
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogClose onOpenChange={setShowDeleteDialog} />
        <DialogHeader>
          <DialogTitle>Delete Lead</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{lead.companyName}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Convert dialog */}
      {canConvert && (
        <LeadConvertDialog
          lead={{ id: lead.id, companyName: lead.companyName }}
          open={showConvertDialog}
          onOpenChange={setShowConvertDialog}
        />
      )}
    </>
  );
}
