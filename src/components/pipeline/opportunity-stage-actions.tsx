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
import {
  updateOpportunityStageAction,
  deleteOpportunityAction,
} from "@/app/(dashboard)/opportunities/actions";
import { ChevronDown, Trash2 } from "lucide-react";

const stageTransitions: Record<string, { label: string; value: string }[]> = {
  DISCOVERY: [
    { label: "Move to Quoting", value: "QUOTING" },
    { label: "Mark as Lost", value: "LOST" },
  ],
  QUOTING: [
    { label: "Move to Proposal Sent", value: "PROPOSAL_SENT" },
    { label: "Back to Discovery", value: "DISCOVERY" },
    { label: "Mark as Lost", value: "LOST" },
  ],
  PROPOSAL_SENT: [
    { label: "Move to Negotiation", value: "NEGOTIATION" },
    { label: "Back to Quoting", value: "QUOTING" },
    { label: "Mark as Lost", value: "LOST" },
  ],
  NEGOTIATION: [
    { label: "Mark as Won", value: "WON" },
    { label: "Back to Proposal Sent", value: "PROPOSAL_SENT" },
    { label: "Mark as Lost", value: "LOST" },
  ],
  WON: [],
  LOST: [
    { label: "Reopen to Discovery", value: "DISCOVERY" },
  ],
};

interface OpportunityStageActionsProps {
  opportunity: { id: string; stage: string; accountName: string };
}

export function OpportunityStageActions({ opportunity }: OpportunityStageActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showLostDialog, setShowLostDialog] = React.useState(false);
  const [showWonDialog, setShowWonDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [winLossReason, setWinLossReason] = React.useState("");

  const transitions = stageTransitions[opportunity.stage] ?? [];

  function handleStageChange(newStage: string) {
    if (newStage === "LOST") {
      setShowLostDialog(true);
      return;
    }
    if (newStage === "WON") {
      setShowWonDialog(true);
      return;
    }

    startTransition(async () => {
      const result = await updateOpportunityStageAction(opportunity.id, newStage);
      if (result.success) {
        toast.success("Stage updated successfully");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleLostConfirm() {
    if (!winLossReason.trim()) {
      toast.error("Please provide a reason for losing this opportunity");
      return;
    }
    startTransition(async () => {
      const result = await updateOpportunityStageAction(
        opportunity.id,
        "LOST",
        winLossReason.trim()
      );
      if (result.success) {
        toast.success("Opportunity marked as lost");
        setShowLostDialog(false);
        setWinLossReason("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleWonConfirm() {
    startTransition(async () => {
      const result = await updateOpportunityStageAction(opportunity.id, "WON");
      if (result.success) {
        toast.success("Opportunity marked as won!");
        setShowWonDialog(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOpportunityAction(opportunity.id);
      if (result.success) {
        toast.success("Opportunity deleted");
        router.push("/opportunities");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {transitions.length > 0 && (
          <DropdownMenu
            trigger={
              <Button variant="outline" size="sm" disabled={isPending}>
                {isPending ? "Updating..." : "Stage Actions"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
          >
            {transitions.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => handleStageChange(t.value)}
              >
                {t.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Opportunity
            </DropdownMenuItem>
          </DropdownMenu>
        )}

        {transitions.length === 0 && (
          <DropdownMenu
            trigger={
              <Button variant="outline" size="sm" disabled={isPending}>
                Actions
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
          >
            <DropdownMenuItem
              destructive
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Opportunity
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </div>

      {/* Lost reason dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogClose onOpenChange={setShowLostDialog} />
        <DialogHeader>
          <DialogTitle>Mark as Lost</DialogTitle>
          <DialogDescription>
            Please provide a reason for losing this opportunity with {opportunity.accountName}.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div>
            <label className="text-sm font-medium leading-none">
              Reason <span className="text-[var(--destructive)] ml-0.5">*</span>
            </label>
            <textarea
              value={winLossReason}
              onChange={(e) => setWinLossReason(e.target.value)}
              rows={3}
              className="mt-1.5 flex w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Why was this opportunity lost?"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowLostDialog(false);
              setWinLossReason("");
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleLostConfirm}
            disabled={isPending}
          >
            {isPending ? "Updating..." : "Mark as Lost"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Won confirmation dialog */}
      <Dialog open={showWonDialog} onOpenChange={setShowWonDialog}>
        <DialogClose onOpenChange={setShowWonDialog} />
        <DialogHeader>
          <DialogTitle>Mark as Won</DialogTitle>
          <DialogDescription>
            Confirm that this opportunity with {opportunity.accountName} has been won.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowWonDialog(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleWonConfirm}
            disabled={isPending}
          >
            {isPending ? "Updating..." : "Confirm Won"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogClose onOpenChange={setShowDeleteDialog} />
        <DialogHeader>
          <DialogTitle>Delete Opportunity</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this opportunity for {opportunity.accountName}? This action cannot be undone.
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
    </>
  );
}
