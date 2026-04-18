"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { updateOpportunitySitesAction } from "@/app/(dashboard)/opportunities/actions";
import { formatNumber } from "@/lib/utils";

interface Site {
  id: string;
  address: string;
  meterId: string | null;
  annualConsumption: number | null;
  siteGroupId: string | null;
  siteGroup?: { id: string; name: string } | null;
}

interface SiteSelectionDialogProps {
  opportunityId: string;
  sites: Site[];
  selectedSiteIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SiteSelectionDialog({
  opportunityId,
  sites,
  selectedSiteIds,
  open,
  onOpenChange,
}: SiteSelectionDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = React.useState<Set<string>>(new Set(selectedSiteIds));

  React.useEffect(() => {
    if (open) {
      setSelected(new Set(selectedSiteIds));
    }
  }, [open, selectedSiteIds]);

  // Group sites by site group
  const grouped = React.useMemo(() => {
    const groups: Record<string, { name: string; sites: Site[] }> = {};
    const ungrouped: Site[] = [];

    for (const site of sites) {
      if (site.siteGroup) {
        if (!groups[site.siteGroup.id]) {
          groups[site.siteGroup.id] = { name: site.siteGroup.name, sites: [] };
        }
        groups[site.siteGroup.id].sites.push(site);
      } else {
        ungrouped.push(site);
      }
    }

    return { groups, ungrouped };
  }, [sites]);

  function toggleSite(siteId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(sites.map((s) => s.id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateOpportunitySitesAction(
        opportunityId,
        Array.from(selected)
      );
      if (result.success) {
        toast.success("Sites updated successfully");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function renderSiteRow(site: Site) {
    return (
      <label
        key={site.id}
        className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-[var(--accent)] cursor-pointer"
      >
        <Checkbox
          checked={selected.has(site.id)}
          onCheckedChange={() => toggleSite(site.id)}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{site.address}</div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {site.meterId ?? "No meter ID"}
            {site.annualConsumption != null && (
              <> &middot; {formatNumber(site.annualConsumption)} kWh</>
            )}
          </div>
        </div>
      </label>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onOpenChange={onOpenChange} />
      <DialogHeader>
        <DialogTitle>Select Sites</DialogTitle>
        <DialogDescription>
          Choose which sites to include in this opportunity.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-[var(--muted-foreground)]">
            {selected.size} of {sites.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Deselect All
            </Button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-4">
          {Object.entries(grouped.groups).map(([groupId, group]) => (
            <div key={groupId}>
              <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1 px-3">
                {group.name}
              </div>
              <div className="space-y-0.5">
                {group.sites.map(renderSiteRow)}
              </div>
            </div>
          ))}

          {grouped.ungrouped.length > 0 && (
            <div>
              {Object.keys(grouped.groups).length > 0 && (
                <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1 px-3">
                  Ungrouped
                </div>
              )}
              <div className="space-y-0.5">
                {grouped.ungrouped.map(renderSiteRow)}
              </div>
            </div>
          )}

          {sites.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
              No sites found for this account.
            </p>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Selection"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
