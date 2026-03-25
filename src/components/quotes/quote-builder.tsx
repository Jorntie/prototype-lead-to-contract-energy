"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import {
  calculateComponentAnnualCost,
  calculateSiteTotalAnnualCost,
  getUnitLabel,
  type ComponentUnit,
} from "@/lib/calculations/price-calculator";
import {
  updateComponentValueAction,
  bulkUpdateComponentAction,
  updateSiteGroupComponentAction,
} from "@/app/(dashboard)/quotes/actions";
import { CsvImportDialog } from "@/components/quotes/csv-import-dialog";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Layers,
  Upload,
} from "lucide-react";
import type { QuoteWithLines, QuoteLineWithComponents } from "@/lib/services/quote.service";

interface PriceComponentType {
  id: string;
  name: string;
  defaultUnit: string;
  defaultValue: number | null;
  isRequired: boolean;
  isPassThrough: boolean;
  isActive: boolean;
  displayOrder: number;
  category: string;
}

interface QuoteBuilderProps {
  quote: QuoteWithLines;
  componentTypes: PriceComponentType[];
}

interface CellEditState {
  lineId: string;
  componentTypeId: string;
  value: string;
}

interface LocalComponentValue {
  lineId: string;
  componentTypeId: string;
  value: number | null;
  isOverride: boolean;
}

// Derive component values map: lineId → componentTypeId → { value, isOverride }
function buildLocalValues(
  lines: QuoteLineWithComponents[]
): Map<string, Map<string, LocalComponentValue>> {
  const map = new Map<string, Map<string, LocalComponentValue>>();
  for (const line of lines) {
    const inner = new Map<string, LocalComponentValue>();
    for (const comp of line.components ?? []) {
      inner.set(comp.componentTypeId, {
        lineId: line.id,
        componentTypeId: comp.componentTypeId,
        value: comp.value != null ? Number(comp.value) : null,
        isOverride: comp.isOverride,
      });
    }
    map.set(line.id, inner);
  }
  return map;
}

function getMarginClass(pct: number): string {
  if (pct < 3) return "text-red-600 bg-red-50";
  if (pct < 5) return "text-amber-600 bg-amber-50";
  return "text-green-600 bg-green-50";
}

function CompletenessIndicator({ complete }: { complete: boolean }) {
  return (
    <div
      className={cn(
        "h-2 w-2 rounded-full shrink-0",
        complete ? "bg-green-500" : "bg-amber-400"
      )}
      title={complete ? "All required values filled" : "Missing required values"}
    />
  );
}

export function QuoteBuilder({ quote, componentTypes }: QuoteBuilderProps) {
  const router = useRouter();

  // Sort component types by display order
  const sortedComponentTypes = React.useMemo(
    () => [...componentTypes].sort((a, b) => a.displayOrder - b.displayOrder),
    [componentTypes]
  );

  // Local mutable state for component values (optimistic updates)
  const [localValues, setLocalValues] = React.useState<
    Map<string, Map<string, LocalComponentValue>>
  >(() => buildLocalValues(quote.quoteLines ?? []));

  // Inline edit state
  const [editState, setEditState] = React.useState<CellEditState | null>(null);
  const [editInputValue, setEditInputValue] = React.useState("");
  const editInputRef = React.useRef<HTMLInputElement>(null);

  // Filters & grouping
  const [searchFilter, setSearchFilter] = React.useState("");
  const [groupBySiteGroup, setGroupBySiteGroup] = React.useState(false);

  // Bulk edit
  const [bulkComponentId, setBulkComponentId] = React.useState("");
  const [bulkValue, setBulkValue] = React.useState("");
  const [isBulkPending, setIsBulkPending] = React.useState(false);

  // Site group dialog
  const [showGroupDialog, setShowGroupDialog] = React.useState(false);
  const [groupDialogValues, setGroupDialogValues] = React.useState<
    Record<string, Record<string, string>>
  >({});
  const [isGroupPending, setIsGroupPending] = React.useState(false);

  // CSV import dialog
  const [showCsvDialog, setShowCsvDialog] = React.useState(false);

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const lines = quote.quoteLines ?? [];

  // Compute unique site groups (name → id map for API calls)
  const siteGroups = React.useMemo(() => {
    const groups = new Map<string, string>(); // name → id
    for (const line of lines) {
      if (line.site?.siteGroup?.id && line.site.siteGroup.name) {
        groups.set(line.site.siteGroup.name, line.site.siteGroup.id);
      }
    }
    return Array.from(groups.entries())
      .map(([name, id]) => ({ name, id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [lines]);

  // Compute completeness for a line
  function isLineComplete(lineId: string): boolean {
    const inner = localValues.get(lineId);
    if (!inner) return false;
    for (const ct of sortedComponentTypes) {
      if (!ct.isRequired) continue;
      const cv = inner.get(ct.id);
      if (cv == null || cv.value == null) return false;
    }
    return true;
  }

  // Compute total annual cost for a line
  function getLineTotalAnnualCost(lineId: string, line: QuoteLineWithComponents): number {
    const inner = localValues.get(lineId);
    if (!inner) return 0;

    const components = sortedComponentTypes
      .map((ct) => {
        const cv = inner.get(ct.id);
        if (cv == null || cv.value == null) return null;
        return {
          value: cv.value,
          unit: ct.defaultUnit as ComponentUnit,
          isPassThrough: ct.isPassThrough,
        };
      })
      .filter(Boolean) as Array<{ value: number; unit: ComponentUnit; isPassThrough: boolean }>;

    const annualConsumption = line.site?.annualConsumption != null
      ? Number(line.site.annualConsumption)
      : null;
    const supplyCapacity = line.site?.supplyCapacity != null
      ? Number(line.site.supplyCapacity)
      : null;

    const { total } = calculateSiteTotalAnnualCost(components, annualConsumption, supplyCapacity);
    return total;
  }

  // Compute margin for a line
  function getLineMargin(lineId: string, line: QuoteLineWithComponents): { pct: number; amount: number } | null {
    const inner = localValues.get(lineId);
    if (!inner) return null;

    const annualConsumption = line.site?.annualConsumption != null
      ? Number(line.site.annualConsumption)
      : null;
    const supplyCapacity = line.site?.supplyCapacity != null
      ? Number(line.site.supplyCapacity)
      : null;

    // Revenue = all components; cost = non-margin, non-passthrough components
    let totalRevenue = 0;
    let baseCost = 0;

    for (const ct of sortedComponentTypes) {
      const cv = inner.get(ct.id);
      if (cv == null || cv.value == null) continue;
      const annualCost = calculateComponentAnnualCost(
        cv.value,
        ct.defaultUnit as ComponentUnit,
        annualConsumption,
        supplyCapacity
      );
      totalRevenue += annualCost;
      if (ct.category !== "MARGIN" && !ct.isPassThrough) {
        baseCost += annualCost;
      }
    }

    if (totalRevenue === 0) return null;
    const amount = totalRevenue - baseCost;
    const pct = baseCost > 0 ? (amount / baseCost) * 100 : 0;
    return { pct, amount };
  }

  // Compute tooltip breakdown for a line
  function getLineBreakdown(lineId: string, line: QuoteLineWithComponents): string {
    const inner = localValues.get(lineId);
    if (!inner) return "";
    const annualConsumption = line.site?.annualConsumption != null ? Number(line.site.annualConsumption) : null;
    const supplyCapacity = line.site?.supplyCapacity != null ? Number(line.site.supplyCapacity) : null;

    const parts: string[] = [];
    for (const ct of sortedComponentTypes) {
      const cv = inner.get(ct.id);
      if (cv == null || cv.value == null) continue;
      const annualCost = calculateComponentAnnualCost(
        cv.value,
        ct.defaultUnit as ComponentUnit,
        annualConsumption,
        supplyCapacity
      );
      if (annualCost !== 0) {
        parts.push(`${ct.name}: ${formatCurrency(annualCost, quote.currency ?? "EUR")}`);
      }
    }
    return parts.join("\n");
  }

  // Start inline edit
  function startEdit(lineId: string, componentTypeId: string) {
    const inner = localValues.get(lineId);
    const cv = inner?.get(componentTypeId);
    const currentVal = cv?.value ?? "";
    setEditState({ lineId, componentTypeId, value: String(currentVal) });
    setEditInputValue(String(currentVal));
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  // Cancel inline edit
  function cancelEdit() {
    setEditState(null);
    setEditInputValue("");
  }

  // Save inline edit
  async function saveEdit() {
    if (!editState) return;
    const numVal = parseFloat(editInputValue);
    if (isNaN(numVal)) {
      cancelEdit();
      return;
    }

    // Look up the siteId for this line
    const line = (quote.quoteLines ?? []).find((l) => l.id === editState.lineId);
    const siteId = line?.siteId ?? line?.site?.id ?? "";

    // Capture editState before clearing it (it will be null in the async callback)
    const capturedEdit = { ...editState };

    // Optimistic update
    setLocalValues((prev) => {
      const next = new Map(prev);
      const inner = new Map(next.get(capturedEdit.lineId) ?? []);
      inner.set(capturedEdit.componentTypeId, {
        lineId: capturedEdit.lineId,
        componentTypeId: capturedEdit.componentTypeId,
        value: numVal,
        isOverride: true,
      });
      next.set(capturedEdit.lineId, inner);
      return next;
    });

    setEditState(null);
    setEditInputValue("");

    try {
      const result = await updateComponentValueAction(
        quote.id,
        siteId,
        capturedEdit.componentTypeId,
        numVal
      );
      if (!result.success) {
        toast.error(result.error ?? "Failed to save value");
        // Revert
        setLocalValues(buildLocalValues(quote.quoteLines ?? []));
      }
    } catch {
      toast.error("Failed to save value");
      setLocalValues(buildLocalValues(quote.quoteLines ?? []));
    }
  }

  // Bulk update
  async function handleBulkUpdate(selectedLineIds: string[]) {
    if (!bulkComponentId || !bulkValue) {
      toast.error("Please select a component and enter a value");
      return;
    }
    const numVal = parseFloat(bulkValue);
    if (isNaN(numVal)) {
      toast.error("Please enter a valid number");
      return;
    }

    // Resolve siteIds from lineIds
    const lines = quote.quoteLines ?? [];
    const siteIds = selectedLineIds
      .map((lineId) => {
        const line = lines.find((l) => l.id === lineId);
        return line?.siteId ?? line?.site?.id ?? null;
      })
      .filter((id): id is string => id !== null);

    setIsBulkPending(true);

    // Optimistic update
    setLocalValues((prev) => {
      const next = new Map(prev);
      for (const lineId of selectedLineIds) {
        const inner = new Map(next.get(lineId) ?? []);
        inner.set(bulkComponentId, {
          lineId,
          componentTypeId: bulkComponentId,
          value: numVal,
          isOverride: true,
        });
        next.set(lineId, inner);
      }
      return next;
    });

    try {
      const result = await bulkUpdateComponentAction(
        quote.id,
        siteIds,
        bulkComponentId,
        numVal
      );
      if (!result.success) {
        toast.error(result.error ?? "Bulk update failed");
        setLocalValues(buildLocalValues(quote.quoteLines ?? []));
      } else {
        toast.success(`Updated ${selectedLineIds.length} site(s)`);
        setRowSelection({});
        setBulkValue("");
      }
    } catch {
      toast.error("Bulk update failed");
      setLocalValues(buildLocalValues(quote.quoteLines ?? []));
    } finally {
      setIsBulkPending(false);
    }
  }

  // Group pricing save
  async function handleGroupPricingSubmit() {
    setIsGroupPending(true);
    try {
      // groupDialogValues keyed by group name; resolve group ID
      for (const [groupName, compVals] of Object.entries(groupDialogValues)) {
        const groupId = siteGroups.find((g) => g.name === groupName)?.id;
        if (!groupId) continue;
        for (const [componentTypeId, rawVal] of Object.entries(compVals)) {
          const numVal = parseFloat(rawVal);
          if (isNaN(numVal)) continue;
          const result = await updateSiteGroupComponentAction(
            quote.id,
            groupId,
            componentTypeId,
            numVal
          );
          if (!result.success) {
            toast.error(`Failed to update group ${groupName}: ${result.error}`);
            setIsGroupPending(false);
            return;
          }
        }
      }
      toast.success("Group prices updated");
      setShowGroupDialog(false);
      router.refresh();
    } catch {
      toast.error("Failed to update group prices");
    } finally {
      setIsGroupPending(false);
    }
  }

  // Filter lines
  const filteredLines = React.useMemo(() => {
    if (!searchFilter) return lines;
    const lower = searchFilter.toLowerCase();
    return lines.filter(
      (l) =>
        l.site?.address?.toLowerCase().includes(lower) ||
        l.site?.siteGroup?.name?.toLowerCase().includes(lower) ||
        l.site?.meterId?.toLowerCase().includes(lower)
    );
  }, [lines, searchFilter]);

  // Sort by site group if grouped
  const displayLines = React.useMemo(() => {
    if (!groupBySiteGroup) return filteredLines;
    return [...filteredLines].sort((a, b) => {
      const ga = a.site?.siteGroup?.name ?? "";
      const gb = b.site?.siteGroup?.name ?? "";
      return ga.localeCompare(gb);
    });
  }, [filteredLines, groupBySiteGroup]);

  // Completeness stats
  const completeSitesCount = React.useMemo(
    () => lines.filter((l) => isLineComplete(l.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, localValues, sortedComponentTypes]
  );
  const completenessPercent =
    lines.length > 0 ? (completeSitesCount / lines.length) * 100 : 0;

  // TanStack Table columns
  const columns = React.useMemo<ColumnDef<QuoteLineWithComponents>[]>(() => {
    const baseColumns: ColumnDef<QuoteLineWithComponents>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 40,
        enableSorting: false,
      },
      {
        id: "completeness",
        header: "",
        cell: ({ row }) => (
          <CompletenessIndicator complete={isLineComplete(row.original.id)} />
        ),
        size: 28,
        enableSorting: false,
      },
      {
        id: "siteGroup",
        header: "Site Group",
        accessorFn: (row) => row.site?.siteGroup?.name ?? "",
        cell: ({ row }) => (
          <span className="text-sm text-[var(--muted-foreground)]">
            {row.original.site?.siteGroup?.name ?? "—"}
          </span>
        ),
        size: 120,
      },
      {
        id: "address",
        header: "Address",
        accessorFn: (row) => row.site?.address ?? "",
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate text-sm font-medium" title={row.original.site?.address ?? ""}>
            {row.original.site?.address ?? "—"}
          </div>
        ),
        size: 200,
      },
      {
        id: "annualKwh",
        header: () => <div className="text-right">Annual kWh</div>,
        accessorFn: (row) => row.site?.annualConsumption ?? 0,
        cell: ({ row }) => {
          const v = row.original.site?.annualConsumption;
          return (
            <div className="text-right text-sm tabular-nums text-[var(--muted-foreground)]">
              {v != null ? formatNumber(Number(v)) : "—"}
            </div>
          );
        },
        size: 110,
      },
      {
        id: "capacityKw",
        header: () => <div className="text-right">Capacity kW</div>,
        accessorFn: (row) => row.site?.supplyCapacity ?? 0,
        cell: ({ row }) => {
          const v = row.original.site?.supplyCapacity;
          return (
            <div className="text-right text-sm tabular-nums text-[var(--muted-foreground)]">
              {v != null ? formatNumber(Number(v)) : "—"}
            </div>
          );
        },
        size: 110,
      },
    ];

    // Dynamic component columns
    const componentColumns: ColumnDef<QuoteLineWithComponents>[] = sortedComponentTypes.map((ct) => ({
      id: `comp_${ct.id}`,
      header: () => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs font-medium leading-none">{ct.name}</span>
          <span className="text-xs text-[var(--muted-foreground)] leading-none">
            {getUnitLabel(ct.defaultUnit as ComponentUnit)}
          </span>
        </div>
      ),
      accessorFn: (row) => {
        const inner = localValues.get(row.id);
        return inner?.get(ct.id)?.value ?? null;
      },
      cell: ({ row }) => {
        const lineId = row.original.id;
        const inner = localValues.get(lineId);
        const cv = inner?.get(ct.id);
        const isEditing =
          editState?.lineId === lineId && editState?.componentTypeId === ct.id;

        if (isEditing) {
          return (
            <input
              ref={editInputRef}
              type="number"
              step="any"
              value={editInputValue}
              onChange={(e) => setEditInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              onBlur={saveEdit}
              className="w-full max-w-[90px] rounded border border-[var(--ring)] bg-white px-1.5 py-0.5 text-right text-sm font-medium focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          );
        }

        const hasValue = cv != null && cv.value != null;
        const isRequired = ct.isRequired;
        const missingRequired = isRequired && !hasValue;

        return (
          <div
            className={cn(
              "cursor-pointer rounded px-1.5 py-0.5 text-right text-sm tabular-nums select-none min-w-[70px]",
              hasValue && cv.isOverride && "bg-white font-medium text-[var(--foreground)]",
              hasValue && !cv.isOverride && "bg-[var(--muted)] text-[var(--muted-foreground)]",
              !hasValue && !isRequired && "text-[var(--muted-foreground)]",
              missingRequired && "bg-orange-50 text-orange-600"
            )}
            onClick={(e) => {
              e.stopPropagation();
              startEdit(lineId, ct.id);
            }}
            title={
              hasValue && !cv.isOverride
                ? "Default value — click to override"
                : hasValue
                ? "Click to edit"
                : isRequired
                ? "Required — click to set value"
                : "Click to set value"
            }
          >
            {hasValue ? String(cv.value) : isRequired ? "⚠ required" : "—"}
          </div>
        );
      },
      size: 100,
      enableSorting: false,
    }));

    // Total column (pinned right)
    const totalColumn: ColumnDef<QuoteLineWithComponents> = {
      id: "total",
      header: () => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs font-medium leading-none">Total</span>
          <span className="text-xs text-[var(--muted-foreground)] leading-none">€/year</span>
        </div>
      ),
      accessorFn: (row) => getLineTotalAnnualCost(row.id, row),
      cell: ({ row }) => {
        const total = getLineTotalAnnualCost(row.original.id, row.original);
        const margin = getLineMargin(row.original.id, row.original);
        const breakdown = getLineBreakdown(row.original.id, row.original);
        const isNegative = total < 0;

        return (
          <div className="flex flex-col items-end gap-0.5 min-w-[100px]">
            <div
              className={cn(
                "text-sm font-medium tabular-nums rounded px-1.5 py-0.5 text-right",
                isNegative && "bg-red-50 text-red-700"
              )}
              title={breakdown || "No values set"}
            >
              {total !== 0 ? formatCurrency(total, quote.currency ?? "EUR") : "—"}
            </div>
            {margin != null && (
              <div
                className={cn(
                  "text-xs font-medium rounded px-1 py-0.5 tabular-nums",
                  getMarginClass(margin.pct)
                )}
              >
                {margin.pct.toFixed(1)}%
              </div>
            )}
          </div>
        );
      },
      size: 130,
      enableSorting: false,
    };

    return [...baseColumns, ...componentColumns, totalColumn];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedComponentTypes, localValues, editState, editInputValue]);

  const table = useReactTable({
    data: displayLines,
    columns,
    state: { sorting, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
    enableRowSelection: true,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedLineIds = selectedRows.map((r) => r.original.id);
  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const startRow = totalRows === 0 ? 0 : pageIndex * currentPageSize + 1;
  const endRow = Math.min((pageIndex + 1) * currentPageSize, totalRows);

  // Portfolio totals
  const portfolioTotal = React.useMemo(
    () => lines.reduce((sum, l) => sum + getLineTotalAnnualCost(l.id, l), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, localValues]
  );

  return (
    <div className="space-y-4">
      {/* Quote builder card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Quote Builder</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGroupDialog(true)}
              >
                <Layers className="h-4 w-4" />
                Set Group Prices
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCsvDialog(true)}
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                placeholder="Search by address or site group..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <Checkbox
                checked={groupBySiteGroup}
                onCheckedChange={(v) => setGroupBySiteGroup(!!v)}
              />
              Group by site group
            </label>

            {selectedRows.length > 0 && (
              <Badge variant="info">
                {selectedRows.length} selected
              </Badge>
            )}

            {/* Completeness */}
            <div className="ml-auto flex items-center gap-2 min-w-[200px]">
              <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                {completeSitesCount} / {lines.length} complete
              </span>
              <div className="flex-1 h-2 min-w-[80px] rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    completenessPercent === 100
                      ? "bg-green-500"
                      : completenessPercent > 50
                      ? "bg-amber-400"
                      : "bg-red-400"
                  )}
                  style={{ width: `${completenessPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Portfolio summary */}
          <div className="flex items-center gap-6 rounded-lg bg-[var(--muted)] px-4 py-3 text-sm">
            <div>
              <span className="text-[var(--muted-foreground)]">Portfolio Total</span>{" "}
              <span className="font-semibold ml-1">
                {formatCurrency(portfolioTotal, quote.currency ?? "EUR")} / year
              </span>
            </div>
            <div>
              <span className="text-[var(--muted-foreground)]">Sites</span>{" "}
              <span className="font-semibold ml-1">{lines.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{
                          width: header.getSize() !== 150 ? header.getSize() : undefined,
                          minWidth: header.getSize() !== 150 ? header.getSize() : undefined,
                        }}
                        className={cn(
                          header.column.getCanSort() && "cursor-pointer select-none"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => {
                    let prevGroup: string | undefined;
                    const currentGroup = row.original.site?.siteGroup?.name;
                    const rows = table.getRowModel().rows;
                    const rowIdx = rows.indexOf(row);
                    if (groupBySiteGroup && rowIdx > 0) {
                      prevGroup = rows[rowIdx - 1].original.site?.siteGroup?.name;
                    }
                    const showGroupHeader =
                      groupBySiteGroup && currentGroup && currentGroup !== prevGroup;

                    return (
                      <React.Fragment key={row.id}>
                        {showGroupHeader && (
                          <TableRow className="bg-[var(--muted)] hover:bg-[var(--muted)]">
                            <TableCell
                              colSpan={columns.length}
                              className="py-1.5 px-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide"
                            >
                              {currentGroup}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow
                          data-state={row.getIsSelected() && "selected"}
                          className="cursor-default"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="py-2">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-[var(--muted-foreground)]"
                    >
                      No sites found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-[var(--muted-foreground)]">
              Showing {startRow}–{endRow} of {totalRows}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sticky bulk actions bar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-[var(--background)] p-3 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 flex-wrap">
            <span className="text-sm font-medium">
              {selectedRows.length} site{selectedRows.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <Select
                value={bulkComponentId}
                onChange={(e) => setBulkComponentId(e.target.value)}
                options={sortedComponentTypes.map((ct) => ({
                  value: ct.id,
                  label: `${ct.name} (${getUnitLabel(ct.defaultUnit as ComponentUnit)})`,
                }))}
                placeholder="Select component..."
                className="w-52"
              />
              <Input
                type="number"
                step="any"
                placeholder="Value"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="w-28"
              />
              <Button
                size="sm"
                onClick={() => handleBulkUpdate(selectedLineIds)}
                disabled={isBulkPending || !bulkComponentId || !bulkValue}
              >
                {isBulkPending ? "Updating..." : "Apply to Selected"}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Site group pricing dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogClose onOpenChange={setShowGroupDialog} />
        <DialogHeader>
          <DialogTitle>Set Group Prices</DialogTitle>
          <DialogDescription>
            Apply component values to all sites in a site group. This will overwrite individual site values.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          {siteGroups.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No site groups found. Assign sites to groups to use this feature.
            </p>
          ) : (
            <div className="space-y-6">
              {siteGroups.map(({ name: group }) => (
                <div key={group}>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[var(--muted-foreground)]" />
                    {group}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {sortedComponentTypes.map((ct) => (
                      <div key={ct.id}>
                        <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                          {ct.name}{" "}
                          <span className="text-[var(--muted-foreground)]">
                            ({getUnitLabel(ct.defaultUnit as ComponentUnit)})
                          </span>
                        </label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Enter value..."
                          value={groupDialogValues[group]?.[ct.id] ?? ""}
                          onChange={(e) => {
                            setGroupDialogValues((prev) => ({
                              ...prev,
                              [group]: {
                                ...(prev[group] ?? {}),
                                [ct.id]: e.target.value,
                              },
                            }));
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowGroupDialog(false)}
            disabled={isGroupPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGroupPricingSubmit}
            disabled={isGroupPending || siteGroups.length === 0}
          >
            {isGroupPending ? "Applying..." : "Apply Group Prices"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* CSV Import dialog */}
      <CsvImportDialog
        open={showCsvDialog}
        onOpenChange={setShowCsvDialog}
        quoteId={quote.id}
        lines={lines}
        componentTypes={sortedComponentTypes}
        onImportComplete={() => {
          setShowCsvDialog(false);
          router.refresh();
        }}
      />
    </div>
  );
}
