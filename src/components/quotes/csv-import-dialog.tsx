"use client";

import * as React from "react";
import { toast } from "sonner";
import Papa from "papaparse";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { bulkUpdateComponentAction } from "@/app/(dashboard)/quotes/actions";
import { Upload, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import type { QuoteLineWithComponents } from "@/lib/services/quote.service";

interface PriceComponentType {
  id: string;
  name: string;
  defaultUnit: string;
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  lines: QuoteLineWithComponents[];
  componentTypes: PriceComponentType[];
  onImportComplete: () => void;
}

// Build siteId from a line (handles both shapes)
function getSiteId(line: QuoteLineWithComponents): string | null {
  return (line as unknown as { siteId?: string }).siteId ?? line.site?.id ?? null;
}

type ImportStep = "upload" | "preview" | "complete";

interface ParsedRow {
  meterId: string;
  lineId: string | null;
  found: boolean;
  values: Record<string, string | undefined>; // componentTypeId → raw value
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function CsvImportDialog({
  open,
  onOpenChange,
  quoteId,
  lines,
  componentTypes,
  onImportComplete,
}: CsvImportDialogProps) {
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [parsedRows, setParsedRows] = React.useState<ParsedRow[]>([]);
  const [unmatchedIds, setUnmatchedIds] = React.useState<string[]>([]);
  const [matchedComponentNames, setMatchedComponentNames] = React.useState<string[]>([]);
  const [isPending, setIsPending] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setParsedRows([]);
    setUnmatchedIds([]);
    setMatchedComponentNames([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  // Build meter ID → line ID map
  const meterIdToLineId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const line of lines) {
      if (line.site?.meterId) {
        map.set(line.site.meterId.trim().toLowerCase(), line.id);
      }
    }
    return map;
  }, [lines]);

  // Build component name → id map (case-insensitive)
  const componentNameToId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const ct of componentTypes) {
      map.set(ct.name.trim().toLowerCase(), ct.id);
    }
    return map;
  }, [componentTypes]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (!headers.length) {
          toast.error("CSV file has no headers");
          return;
        }

        // Find meter ID column (case-insensitive)
        const meterIdHeader = headers.find(
          (h) => h.trim().toLowerCase() === "meter id" || h.trim().toLowerCase() === "meterid"
        );
        if (!meterIdHeader) {
          toast.error('CSV must have a "Meter ID" column');
          return;
        }

        // Map component columns
        const componentHeaders: { header: string; componentTypeId: string; name: string }[] = [];
        for (const header of headers) {
          if (header === meterIdHeader) continue;
          const compId = componentNameToId.get(header.trim().toLowerCase());
          if (compId) {
            componentHeaders.push({ header, componentTypeId: compId, name: header });
          }
        }

        if (componentHeaders.length === 0) {
          toast.error("No matching price component columns found. Column headers must match component names exactly.");
          return;
        }

        const parsed: ParsedRow[] = [];
        const unmatched: string[] = [];

        for (const row of results.data) {
          const meterId = (row[meterIdHeader] ?? "").trim();
          if (!meterId) continue;

          const lineId = meterIdToLineId.get(meterId.toLowerCase()) ?? null;
          const found = lineId !== null;

          if (!found) {
            unmatched.push(meterId);
          }

          const values: Record<string, string | undefined> = {};
          for (const ch of componentHeaders) {
            values[ch.componentTypeId] = row[ch.header];
          }

          parsed.push({ meterId, lineId, found, values });
        }

        setParsedRows(parsed);
        setUnmatchedIds(unmatched);
        setMatchedComponentNames(componentHeaders.map((c) => c.name));
        setStep("preview");
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });
  }

  async function handleImport() {
    const matchedRows = parsedRows.filter((r) => r.found && r.lineId);
    if (matchedRows.length === 0) {
      toast.error("No matching sites found to import");
      return;
    }

    setIsPending(true);
    let imported = 0;
    const errors: string[] = [];

    for (const ct of componentTypes) {
      const lineIdsWithValue: string[] = [];
      let bulkValue: number | null = null;

      for (const row of matchedRows) {
        const rawVal = row.values[ct.id];
        if (rawVal == null || rawVal === "") continue;
        const numVal = parseFloat(rawVal);
        if (isNaN(numVal)) {
          errors.push(`Invalid value "${rawVal}" for meter ${row.meterId}, component ${ct.name}`);
          continue;
        }
        lineIdsWithValue.push(row.lineId!);
        bulkValue = numVal; // Each row may have different values — we'll process per-row
      }

      // We need to handle per-row values since they may differ
      // Group rows by value and resolve siteIds to minimize server calls
      const valueGroups = new Map<number, string[]>();
      for (const row of matchedRows) {
        const rawVal = row.values[ct.id];
        if (rawVal == null || rawVal === "") continue;
        const numVal = parseFloat(rawVal);
        if (isNaN(numVal)) continue;
        // Resolve siteId from the line
        const line = lines.find((l) => l.id === row.lineId);
        const siteId = line ? getSiteId(line) : null;
        if (!siteId) continue;
        const group = valueGroups.get(numVal) ?? [];
        group.push(siteId);
        valueGroups.set(numVal, group);
      }

      for (const [value, siteIds] of valueGroups.entries()) {
        try {
          const result = await bulkUpdateComponentAction(quoteId, siteIds, ct.id, value);
          if (!result.success) {
            errors.push(`Failed to update ${ct.name}: ${result.error ?? "Unknown error"}`);
          } else {
            imported += siteIds.length;
          }
        } catch {
          errors.push(`Failed to update ${ct.name}`);
        }
      }

      void bulkValue; // suppress unused warning
      void lineIdsWithValue; // suppress unused warning
    }

    setImportResult({
      imported,
      skipped: unmatchedIds.length,
      errors,
    });
    setStep("complete");
    setIsPending(false);

    if (errors.length === 0) {
      toast.success(`Successfully imported values for ${parsedRows.filter((r) => r.found).length} sites`);
    } else {
      toast.warning(`Import completed with ${errors.length} error(s)`);
    }
  }

  function handleDone() {
    onImportComplete();
    handleClose(false);
  }

  const matchedCount = parsedRows.filter((r) => r.found).length;
  const unmatchedCount = parsedRows.filter((r) => !r.found).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogClose onOpenChange={handleClose} />
      <DialogHeader>
        <DialogTitle>
          {step === "upload" && "Import from CSV"}
          {step === "preview" && "Preview Import"}
          {step === "complete" && "Import Complete"}
        </DialogTitle>
        <DialogDescription>
          {step === "upload" && (
            <>
              Upload a CSV file with a{" "}
              <strong>Meter ID</strong> column and one column per price component type.
              Column headers must match component names exactly.
            </>
          )}
          {step === "preview" && (
            <>
              Review the matches before importing.{" "}
              <span className="text-green-700">{matchedCount} site(s) matched</span>
              {unmatchedCount > 0 && (
                <>, <span className="text-amber-700">{unmatchedCount} not found</span></>
              )}
              .
            </>
          )}
          {step === "complete" && "Import results summary."}
        </DialogDescription>
      </DialogHeader>

      <DialogContent>
        {step === "upload" && (
          <div className="space-y-4">
            {/* Expected format */}
            <div className="rounded-md bg-[var(--muted)] p-3 text-sm">
              <p className="font-medium mb-1">Expected CSV format:</p>
              <code className="text-xs">
                Meter ID,{componentTypes.slice(0, 3).map((c) => c.name).join(",")}
                {componentTypes.length > 3 && ",..."}
              </code>
            </div>

            {/* Component reference */}
            <div>
              <p className="text-sm font-medium mb-2">Available component columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {componentTypes.map((ct) => (
                  <Badge key={ct.id} variant="outline" className="text-xs">
                    {ct.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* File input */}
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] p-8 cursor-pointer hover:border-[var(--ring)] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-10 w-10 text-[var(--muted-foreground)] mb-3" />
              <p className="text-sm font-medium">Click to upload CSV</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                .csv files only
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            {/* Summary banner */}
            <div className="flex items-center gap-4 rounded-md bg-[var(--muted)] px-4 py-2.5 text-sm">
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>{matchedCount} matched</span>
              </div>
              {unmatchedCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{unmatchedCount} not found</span>
                </div>
              )}
              <div className="text-[var(--muted-foreground)]">
                Components: {matchedComponentNames.join(", ")}
              </div>
            </div>

            {unmatchedCount > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-medium mb-1">Unmatched Meter IDs (will be skipped):</p>
                <p className="font-mono">{unmatchedIds.slice(0, 10).join(", ")}
                  {unmatchedIds.length > 10 && ` and ${unmatchedIds.length - 10} more`}
                </p>
              </div>
            )}

            {/* Preview table */}
            <div className="max-h-64 overflow-auto rounded-md border text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Meter ID</TableHead>
                    {matchedComponentNames.map((name) => (
                      <TableHead key={name} className="text-right">{name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.slice(0, 100).map((row, idx) => {
                    const ct = componentTypes.find(
                      (c) =>
                        matchedComponentNames.includes(c.name) &&
                        row.values[c.id] != null
                    );
                    void ct;
                    return (
                      <TableRow
                        key={idx}
                        className={cn(!row.found && "opacity-50")}
                      >
                        <TableCell className="py-1.5">
                          {row.found ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 font-mono">{row.meterId}</TableCell>
                        {matchedComponentNames.map((name) => {
                          const compType = componentTypes.find((c) => c.name === name);
                          const val = compType ? row.values[compType.id] : undefined;
                          return (
                            <TableCell key={name} className="py-1.5 text-right tabular-nums">
                              {val ?? <span className="text-[var(--muted-foreground)]">—</span>}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                  {parsedRows.length > 100 && (
                    <TableRow>
                      <TableCell
                        colSpan={2 + matchedComponentNames.length}
                        className="text-center text-[var(--muted-foreground)] py-2"
                      >
                        … and {parsedRows.length - 100} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === "complete" && importResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                Successfully imported values for{" "}
                {parsedRows.filter((r) => r.found).length} site(s)
              </span>
            </div>
            {importResult.skipped > 0 && (
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{importResult.skipped} site(s) not found and skipped</span>
              </div>
            )}
            {importResult.errors.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800 mb-1">
                  {importResult.errors.length} error(s):
                </p>
                <ul className="text-xs text-red-700 space-y-0.5">
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>… and {importResult.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        {step === "upload" && (
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
        )}

        {step === "preview" && (
          <>
            <Button variant="outline" onClick={reset} disabled={isPending}>
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={isPending || matchedCount === 0}
            >
              <Upload className="h-4 w-4" />
              {isPending ? "Importing..." : `Import ${matchedCount} Site(s)`}
            </Button>
          </>
        )}

        {step === "complete" && (
          <Button onClick={handleDone}>Done</Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
