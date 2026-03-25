"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  submitForApprovalAction,
  approveQuoteAction,
  rejectQuoteAction,
  sendQuoteAction,
  acceptQuoteAction,
  createNewVersionAction,
  cloneQuoteAction,
  deleteQuoteAction,
} from "@/app/(dashboard)/quotes/actions";
import { ChevronDown, Send, CheckCircle, XCircle, Copy, Trash2, RefreshCw } from "lucide-react";

type QuoteStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "SUPERSEDED"
  | "EXPIRED";

interface QuoteStatusActionsProps {
  quote: {
    id: string;
    status: string;
    opportunityId: string;
  };
  opportunities?: { id: string; label: string }[];
}

export function QuoteStatusActions({ quote, opportunities = [] }: QuoteStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [showSubmitDialog, setShowSubmitDialog] = React.useState(false);
  const [showApproveDialog, setShowApproveDialog] = React.useState(false);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [showSendDialog, setShowSendDialog] = React.useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = React.useState(false);
  const [showNewVersionDialog, setShowNewVersionDialog] = React.useState(false);
  const [showCloneDialog, setShowCloneDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const [rejectComment, setRejectComment] = React.useState("");
  const [cloneOpportunityId, setCloneOpportunityId] = React.useState(
    opportunities[0]?.id ?? ""
  );

  const status = quote.status as QuoteStatus;

  function handleAction(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  }

  async function doSubmitForApproval() {
    const result = await submitForApprovalAction(quote.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to submit");
      return;
    }
    toast.success("Quote submitted for approval");
    setShowSubmitDialog(false);
    router.refresh();
  }

  async function doApprove() {
    const result = await approveQuoteAction(quote.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to approve");
      return;
    }
    toast.success("Quote approved");
    setShowApproveDialog(false);
    router.refresh();
  }

  async function doReject() {
    if (!rejectComment.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    const result = await rejectQuoteAction(quote.id, rejectComment.trim());
    if (!result.success) {
      toast.error(result.error ?? "Failed to reject");
      return;
    }
    toast.success("Quote rejected");
    setShowRejectDialog(false);
    setRejectComment("");
    router.refresh();
  }

  async function doSend() {
    const result = await sendQuoteAction(quote.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to mark as sent");
      return;
    }
    toast.success("Quote marked as sent");
    setShowSendDialog(false);
    router.refresh();
  }

  async function doAccept() {
    const result = await acceptQuoteAction(quote.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to mark as accepted");
      return;
    }
    toast.success("Quote accepted");
    setShowAcceptDialog(false);
    router.refresh();
  }

  async function doCreateNewVersion() {
    const result = await createNewVersionAction(quote.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to create new version");
      return;
    }
    toast.success("New quote version created");
    setShowNewVersionDialog(false);
    if (result.id) {
      router.push(`/quotes/${result.id}`);
    } else {
      router.refresh();
    }
  }

  async function doClone() {
    if (!cloneOpportunityId) {
      toast.error("Please select an opportunity");
      return;
    }
    const result = await cloneQuoteAction(quote.id, cloneOpportunityId);
    if (!result.success) {
      toast.error(result.error ?? "Failed to clone quote");
      return;
    }
    toast.success("Quote cloned to opportunity");
    setShowCloneDialog(false);
    if (result.id) {
      router.push(`/quotes/${result.id}`);
    } else {
      router.refresh();
    }
  }

  async function doDelete() {
    const result = await deleteQuoteAction(quote.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to delete quote");
      return;
    }
    toast.success("Quote deleted");
    router.push("/quotes");
  }

  return (
    <>
      <DropdownMenu
        trigger={
          <Button variant="outline" size="sm" disabled={isPending}>
            {isPending ? "Updating..." : "Actions"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        }
      >
        {status === "DRAFT" && (
          <>
            <DropdownMenuItem onClick={() => setShowSubmitDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Quote
            </DropdownMenuItem>
          </>
        )}

        {status === "PENDING_APPROVAL" && (
          <>
            <DropdownMenuItem onClick={() => setShowApproveDialog(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </DropdownMenuItem>
            <DropdownMenuItem destructive onClick={() => setShowRejectDialog(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction(async () => {
              const result = await submitForApprovalAction(quote.id);
              if (!result.success) {
                toast.error(result.error ?? "Failed");
              } else {
                toast.success("Reverted to draft");
                router.refresh();
              }
            })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Revert to Draft
            </DropdownMenuItem>
          </>
        )}

        {status === "APPROVED" && (
          <DropdownMenuItem onClick={() => setShowSendDialog(true)}>
            <Send className="h-4 w-4 mr-2" />
            Mark as Sent
          </DropdownMenuItem>
        )}

        {status === "SENT" && (
          <>
            <DropdownMenuItem onClick={() => setShowAcceptDialog(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Accepted
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowNewVersionDialog(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Create New Version
            </DropdownMenuItem>
          </>
        )}

        {(status === "ACCEPTED" || status === "SUPERSEDED" || status === "REJECTED") && (
          <>
            <DropdownMenuItem onClick={() => setShowNewVersionDialog(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Create New Version
            </DropdownMenuItem>
            {opportunities.length > 0 && (
              <DropdownMenuItem onClick={() => setShowCloneDialog(true)}>
                <Copy className="h-4 w-4 mr-2" />
                Clone to Opportunity
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenu>

      {/* Submit for Approval */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogClose onOpenChange={setShowSubmitDialog} />
        <DialogHeader>
          <DialogTitle>Submit for Approval</DialogTitle>
          <DialogDescription>
            This quote will be sent to a manager for review. You won&apos;t be able to edit
            it until it is approved or rejected.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSubmitDialog(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => handleAction(doSubmitForApproval)} disabled={isPending}>
            {isPending ? "Submitting..." : "Submit for Approval"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Approve */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogClose onOpenChange={setShowApproveDialog} />
        <DialogHeader>
          <DialogTitle>Approve Quote</DialogTitle>
          <DialogDescription>
            Confirm that you have reviewed this quote and it is ready to be sent to the customer.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => handleAction(doApprove)} disabled={isPending}>
            {isPending ? "Approving..." : "Approve Quote"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Reject */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogClose onOpenChange={setShowRejectDialog} />
        <DialogHeader>
          <DialogTitle>Reject Quote</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this quote. It will be returned to the salesperson for revision.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div>
            <label className="text-sm font-medium leading-none">
              Rejection Reason <span className="text-[var(--destructive)]">*</span>
            </label>
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
              placeholder="Why is this quote being rejected?"
              className="mt-1.5"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowRejectDialog(false);
              setRejectComment("");
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleAction(doReject)}
            disabled={isPending}
          >
            {isPending ? "Rejecting..." : "Reject Quote"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Mark as Sent */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogClose onOpenChange={setShowSendDialog} />
        <DialogHeader>
          <DialogTitle>Mark as Sent</DialogTitle>
          <DialogDescription>
            Confirm that this quote has been sent to the customer.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSendDialog(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => handleAction(doSend)} disabled={isPending}>
            {isPending ? "Updating..." : "Mark as Sent"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Mark as Accepted */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogClose onOpenChange={setShowAcceptDialog} />
        <DialogHeader>
          <DialogTitle>Mark as Accepted</DialogTitle>
          <DialogDescription>
            Confirm that the customer has accepted this quote. This will move the opportunity to contract stage.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAcceptDialog(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => handleAction(doAccept)} disabled={isPending}>
            {isPending ? "Updating..." : "Mark as Accepted"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Create New Version */}
      <Dialog open={showNewVersionDialog} onOpenChange={setShowNewVersionDialog}>
        <DialogClose onOpenChange={setShowNewVersionDialog} />
        <DialogHeader>
          <DialogTitle>Create New Version</DialogTitle>
          <DialogDescription>
            A new draft version of this quote will be created with the same settings and component values.
            The current version will be marked as superseded.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewVersionDialog(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => handleAction(doCreateNewVersion)} disabled={isPending}>
            {isPending ? "Creating..." : "Create New Version"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Clone to Opportunity */}
      {opportunities.length > 0 && (
        <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
          <DialogClose onOpenChange={setShowCloneDialog} />
          <DialogHeader>
            <DialogTitle>Clone to Opportunity</DialogTitle>
            <DialogDescription>
              Clone this quote to a different opportunity. Select the target opportunity below.
            </DialogDescription>
          </DialogHeader>
          <DialogContent>
            <div>
              <label className="text-sm font-medium leading-none">Target Opportunity</label>
              <Select
                value={cloneOpportunityId}
                onChange={(e) => setCloneOpportunityId(e.target.value)}
                options={opportunities.map((o) => ({ value: o.id, label: o.label }))}
                placeholder="Select opportunity..."
                className="mt-1.5"
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={() => handleAction(doClone)} disabled={isPending}>
              {isPending ? "Cloning..." : "Clone Quote"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Delete */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogClose onOpenChange={setShowDeleteDialog} />
        <DialogHeader>
          <DialogTitle>Delete Quote</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this quote? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleAction(doDelete)}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete Quote"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
