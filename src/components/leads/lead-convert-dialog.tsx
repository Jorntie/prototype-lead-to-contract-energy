"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CREDIT_STATUSES } from "@/lib/validators/lead";
import { convertLeadAction } from "@/app/(dashboard)/leads/actions";

interface LeadConvertDialogProps {
  lead: { id: string; companyName: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const creditStatusOptions = CREDIT_STATUSES.map((s) => ({
  value: s,
  label: s.replace(/_/g, " "),
}));

export function LeadConvertDialog({ lead, open, onOpenChange }: LeadConvertDialogProps) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await convertLeadAction(lead.id, formData);

      if (!result.success) {
        toast.error(result.error);
        setIsPending(false);
        return;
      }

      toast.success(`Lead "${lead.companyName}" converted to account`);
      onOpenChange(false);
      router.push("/accounts");
      router.refresh();
    } catch {
      toast.error("Failed to convert lead");
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onOpenChange={onOpenChange} />
      <DialogHeader>
        <DialogTitle>Convert Lead to Account</DialogTitle>
        <DialogDescription>
          This will create a new account and opportunity from &quot;{lead.companyName}&quot;.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          <div>
            <label className="text-sm font-medium leading-none">Industry</label>
            <div className="mt-1.5">
              <Input name="industry" placeholder="e.g. Manufacturing, Retail..." />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium leading-none">Credit Status</label>
            <div className="mt-1.5">
              <Select
                name="creditStatus"
                defaultValue="NOT_ASSESSED"
                options={creditStatusOptions}
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Converting..." : "Convert Lead"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
