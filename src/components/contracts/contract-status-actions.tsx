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
import { Input } from "@/components/ui/input";
import {
  updateContractStatusAction,
  deleteContractAction,
} from "@/app/(dashboard)/contracts/actions";
import {
  ChevronDown,
  Send,
  FileCheck,
  CheckCircle,
  Trash2,
  XCircle,
  FileDown,
} from "lucide-react";

type ContractStatus =
  | "DRAFT"
  | "SENT"
  | "SIGNED"
  | "ACTIVE"
  | "EXPIRED"
  | "TERMINATED";

interface ContractStatusActionsProps {
  contract: {
    id: string;
    status: string;
    quoteId: string;
  };
}

export function ContractStatusActions({
  contract,
}: ContractStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showSendDialog, setShowSendDialog] = React.useState(false);
  const [showSignDialog, setShowSignDialog] = React.useState(false);
  const [showActivateDialog, setShowActivateDialog] = React.useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const [signedDate, setSignedDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );

  const status = contract.status as ContractStatus;

  function handleAction(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  }

  async function doSend() {
    const result = await updateContractStatusAction(contract.id, "SENT");
    if (!result.success) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("Contract marked as sent");
    setShowSendDialog(false);
    router.refresh();
  }

  async function doSign() {
    const result = await updateContractStatusAction(
      contract.id,
      "SIGNED",
      signedDate
    );
    if (!result.success) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("Contract marked as signed");
    setShowSignDialog(false);
    router.refresh();
  }

  async function doActivate() {
    const result = await updateContractStatusAction(contract.id, "ACTIVE");
    if (!result.success) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("Contract activated");
    setShowActivateDialog(false);
    router.refresh();
  }

  async function doTerminate() {
    const result = await updateContractStatusAction(
      contract.id,
      "TERMINATED"
    );
    if (!result.success) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("Contract terminated");
    setShowTerminateDialog(false);
    router.refresh();
  }

  async function doDelete() {
    const result = await deleteContractAction(contract.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed");
      return;
    }
    toast.success("Contract deleted");
    router.push("/contracts");
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <a
          href={`/api/quotes/${contract.quoteId}/proposal`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium border border-[var(--input)] bg-[var(--background)] shadow-sm hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] h-8 px-3"
        >
          <FileDown className="h-4 w-4" />
          Download Proposal
        </a>

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
              <DropdownMenuItem onClick={() => setShowSendDialog(true)}>
                <Send className="h-4 w-4 mr-2" />
                Mark as Sent
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Contract
              </DropdownMenuItem>
            </>
          )}

          {status === "SENT" && (
            <>
              <DropdownMenuItem onClick={() => setShowSignDialog(true)}>
                <FileCheck className="h-4 w-4 mr-2" />
                Record Signature
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onClick={() => setShowTerminateDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Terminate
              </DropdownMenuItem>
            </>
          )}

          {status === "SIGNED" && (
            <>
              <DropdownMenuItem onClick={() => setShowActivateDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate Contract
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                destructive
                onClick={() => setShowTerminateDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Terminate
              </DropdownMenuItem>
            </>
          )}

          {status === "ACTIVE" && (
            <DropdownMenuItem
              destructive
              onClick={() => setShowTerminateDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Terminate
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      </div>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogClose onOpenChange={setShowSendDialog} />
        <DialogHeader>
          <DialogTitle>Send Contract</DialogTitle>
          <DialogDescription>
            Mark this contract as sent to the customer for signing.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowSendDialog(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleAction(doSend)}
            disabled={isPending}
          >
            {isPending ? "Sending..." : "Mark as Sent"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogClose onOpenChange={setShowSignDialog} />
        <DialogHeader>
          <DialogTitle>Record Signature</DialogTitle>
          <DialogDescription>
            Record the date the customer signed the contract.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div>
            <label className="text-sm font-medium leading-none">
              Signed Date
            </label>
            <Input
              type="date"
              value={signedDate}
              onChange={(e) => setSignedDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowSignDialog(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleAction(doSign)}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Record Signature"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Activate Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogClose onOpenChange={setShowActivateDialog} />
        <DialogHeader>
          <DialogTitle>Activate Contract</DialogTitle>
          <DialogDescription>
            Activate this contract to indicate supply has started.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowActivateDialog(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleAction(doActivate)}
            disabled={isPending}
          >
            {isPending ? "Activating..." : "Activate"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Terminate Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogClose onOpenChange={setShowTerminateDialog} />
        <DialogHeader>
          <DialogTitle>Terminate Contract</DialogTitle>
          <DialogDescription>
            Are you sure you want to terminate this contract? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogContent />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowTerminateDialog(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleAction(doTerminate)}
            disabled={isPending}
          >
            {isPending ? "Terminating..." : "Terminate Contract"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogClose onOpenChange={setShowDeleteDialog} />
        <DialogHeader>
          <DialogTitle>Delete Contract</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this contract? This action cannot be
            undone.
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
            onClick={() => handleAction(doDelete)}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete Contract"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
