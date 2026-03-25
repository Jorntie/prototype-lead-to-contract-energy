"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { createContractAction } from "@/app/(dashboard)/contracts/actions";
import { FileSignature, FileDown } from "lucide-react";

interface CreateContractButtonProps {
  quoteId: string;
  existingContractId?: string | null;
}

export function CreateContractButton({
  quoteId,
  existingContractId,
}: CreateContractButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = React.useState(false);
  const [startDate, setStartDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = React.useState("");

  if (existingContractId) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/contracts/${existingContractId}`)}
      >
        <FileSignature className="h-4 w-4 mr-1" />
        View Contract
      </Button>
    );
  }

  async function handleCreate() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("quoteId", quoteId);
      if (startDate) formData.set("startDate", startDate);
      if (endDate) formData.set("endDate", endDate);

      const result = await createContractAction(formData);
      if (!result.success) {
        toast.error(result.error ?? "Failed to create contract");
        return;
      }
      toast.success("Contract created");
      setShowDialog(false);
      if (result.id) {
        router.push(`/contracts/${result.id}`);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <a
            href={`/api/quotes/${quoteId}/proposal`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileDown className="h-4 w-4 mr-1" />
            Download Proposal
          </a>
        </Button>
        <Button
          size="sm"
          onClick={() => setShowDialog(true)}
        >
          <FileSignature className="h-4 w-4 mr-1" />
          Create Contract
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogClose onOpenChange={setShowDialog} />
        <DialogHeader>
          <DialogTitle>Create Contract</DialogTitle>
          <DialogDescription>
            Generate a contract from this accepted quote. Set the supply period
            dates below.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium leading-none">
                End Date{" "}
                <span className="text-[var(--muted-foreground)] font-normal">
                  (optional — derived from contract duration if empty)
                </span>
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDialog(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending}>
            {isPending ? "Creating..." : "Create Contract"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
