"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercentage, cn } from "@/lib/utils";
import {
  calculateComponentAnnualCost,
  calculateSiteTotalAnnualCost,
  getUnitLabel,
  type ComponentUnit,
} from "@/lib/calculations/price-calculator";
import { exportQuoteCsvAction } from "@/app/(dashboard)/quotes/actions";
import { Download } from "lucide-react";
import type { QuoteWithLines, QuoteLineWithComponents } from "@/lib/services/quote.service";

interface PriceComponentType {
  id: string;
  name: string;
  defaultUnit: string;
  isRequired: boolean;
  isPassThrough: boolean;
  isActive: boolean;
  displayOrder: number;
  category: string;
}

interface QuoteSummaryViewProps {
  quote: QuoteWithLines;
  componentTypes: PriceComponentType[];
}

interface SiteGroupSummary {
  group: string;
  siteCount: number;
  totalAnnual: number;
  marginPct: number | null;
}

function getMarginVariant(pct: number): "destructive" | "warning" | "success" {
  if (pct < 3) return "destructive";
  if (pct < 5) return "warning";
  return "success";
}

export function QuoteSummaryView({ quote, componentTypes }: QuoteSummaryViewProps) {
  const [isPending, startTransition] = useTransition();

  const sortedComponentTypes = React.useMemo(
    () =>
      [...componentTypes]
        .filter((c) => c.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [componentTypes]
  );

  const lines = quote.quoteLines ?? [];
  const currency = quote.currency ?? "EUR";

  // Compute per-line totals
  function getLineTotalAnnualCost(line: QuoteLineWithComponents): number {
    const components = (line.components ?? []).map((comp) => {
      const ct = sortedComponentTypes.find((c) => c.id === comp.componentTypeId);
      if (!ct) return null;
      return {
        value: comp.value != null ? Number(comp.value) : 0,
        unit: ct.defaultUnit as ComponentUnit,
        isPassThrough: ct.isPassThrough,
      };
    }).filter(Boolean) as Array<{ value: number; unit: ComponentUnit; isPassThrough: boolean }>;

    const annualConsumption = line.site?.annualConsumption != null
      ? Number(line.site.annualConsumption)
      : null;
    const supplyCapacity = line.site?.supplyCapacity != null
      ? Number(line.site.supplyCapacity)
      : null;

    const { total } = calculateSiteTotalAnnualCost(components, annualConsumption, supplyCapacity);
    return total;
  }

  function getLineComponentValue(
    line: QuoteLineWithComponents,
    componentTypeId: string
  ): number | null {
    const comp = (line.components ?? []).find(
      (c) => c.componentTypeId === componentTypeId
    );
    return comp?.value != null ? Number(comp.value) : null;
  }

  function getLineComponentAnnualCost(
    line: QuoteLineWithComponents,
    ct: PriceComponentType
  ): number {
    const val = getLineComponentValue(line, ct.id);
    if (val == null) return 0;
    const annualConsumption = line.site?.annualConsumption != null
      ? Number(line.site.annualConsumption)
      : null;
    const supplyCapacity = line.site?.supplyCapacity != null
      ? Number(line.site.supplyCapacity)
      : null;
    return calculateComponentAnnualCost(
      val,
      ct.defaultUnit as ComponentUnit,
      annualConsumption,
      supplyCapacity
    );
  }

  function getLineMargin(line: QuoteLineWithComponents): { pct: number; amount: number } | null {
    let totalRevenue = 0;
    let baseCost = 0;
    const annualConsumption = line.site?.annualConsumption != null
      ? Number(line.site.annualConsumption)
      : null;
    const supplyCapacity = line.site?.supplyCapacity != null
      ? Number(line.site.supplyCapacity)
      : null;

    for (const ct of sortedComponentTypes) {
      const val = getLineComponentValue(line, ct.id);
      if (val == null) continue;
      const annualCost = calculateComponentAnnualCost(
        val,
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

  // Portfolio totals
  const portfolioTotal = React.useMemo(
    () => lines.reduce((sum, l) => sum + getLineTotalAnnualCost(l), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, sortedComponentTypes]
  );

  // Per site group subtotals
  const siteGroupSummaries = React.useMemo<SiteGroupSummary[]>(() => {
    const groupMap = new Map<string, { totalAnnual: number; siteCount: number; baseCost: number }>();

    for (const line of lines) {
      const group = line.site?.siteGroup?.name ?? "No Group";
      const existing = groupMap.get(group) ?? { totalAnnual: 0, siteCount: 0, baseCost: 0 };
      const total = getLineTotalAnnualCost(line);

      let baseCost = 0;
      const annualConsumption = line.site?.annualConsumption != null
        ? Number(line.site.annualConsumption)
        : null;
      const supplyCapacity = line.site?.supplyCapacity != null
        ? Number(line.site.supplyCapacity)
        : null;
      for (const ct of sortedComponentTypes) {
        const val = getLineComponentValue(line, ct.id);
        if (val == null) continue;
        if (ct.category !== "MARGIN" && !ct.isPassThrough) {
          baseCost += calculateComponentAnnualCost(
            val,
            ct.defaultUnit as ComponentUnit,
            annualConsumption,
            supplyCapacity
          );
        }
      }

      groupMap.set(group, {
        totalAnnual: existing.totalAnnual + total,
        siteCount: existing.siteCount + 1,
        baseCost: existing.baseCost + baseCost,
      });
    }

    return Array.from(groupMap.entries())
      .map(([group, data]) => ({
        group,
        siteCount: data.siteCount,
        totalAnnual: data.totalAnnual,
        marginPct:
          data.baseCost > 0
            ? ((data.totalAnnual - data.baseCost) / data.baseCost) * 100
            : null,
      }))
      .sort((a, b) => a.group.localeCompare(b.group));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, sortedComponentTypes]);

  function handleExport() {
    startTransition(async () => {
      const result = await exportQuoteCsvAction(quote.id);
      if (result && "error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Export failed");
        return;
      }
      if (result && "csv" in result && result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `quote-v${quote.version}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-[var(--muted-foreground)]">Portfolio Total</p>
            <p className="text-lg font-bold mt-0.5">{formatCurrency(portfolioTotal, currency)}</p>
            <p className="text-xs text-[var(--muted-foreground)]">per year</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-[var(--muted-foreground)]">Sites</p>
            <p className="text-lg font-bold mt-0.5">{lines.length}</p>
          </CardContent>
        </Card>
        {quote.totalValue != null && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-[var(--muted-foreground)]">Contract Value</p>
              <p className="text-lg font-bold mt-0.5">
                {formatCurrency(quote.totalValue, currency)}
              </p>
            </CardContent>
          </Card>
        )}
        {quote.marginPercentage != null && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-[var(--muted-foreground)]">Avg Margin</p>
              <p
                className={cn(
                  "text-lg font-bold mt-0.5",
                  quote.marginPercentage < 3
                    ? "text-red-600"
                    : quote.marginPercentage < 5
                    ? "text-amber-600"
                    : "text-green-600"
                )}
              >
                {formatPercentage(quote.marginPercentage)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Site group subtotals */}
      {siteGroupSummaries.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Site Group</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Group</TableHead>
                  <TableHead className="text-right">Sites</TableHead>
                  <TableHead className="text-right">Annual Total</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siteGroupSummaries.map((sg) => (
                  <TableRow key={sg.group}>
                    <TableCell className="font-medium">{sg.group}</TableCell>
                    <TableCell className="text-right">{sg.siteCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(sg.totalAnnual, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {sg.marginPct != null ? (
                        <Badge variant={getMarginVariant(sg.marginPct)}>
                          {formatPercentage(sg.marginPct)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Full site table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Sites</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isPending}
            >
              <Download className="h-4 w-4" />
              {isPending ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Group</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">kWh/yr</TableHead>
                  <TableHead className="text-right">kW</TableHead>
                  {sortedComponentTypes.map((ct) => (
                    <TableHead key={ct.id} className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs">{ct.name}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {getUnitLabel(ct.defaultUnit as ComponentUnit)}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total/yr</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const total = getLineTotalAnnualCost(line);
                  const margin = getLineMargin(line);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm text-[var(--muted-foreground)]">
                        {line.site?.siteGroup?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px] truncate text-sm" title={line.site?.address ?? ""}>
                          {line.site?.address ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-[var(--muted-foreground)]">
                        {line.site?.annualConsumption != null
                          ? formatNumber(Number(line.site.annualConsumption))
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-[var(--muted-foreground)]">
                        {line.site?.supplyCapacity != null
                          ? formatNumber(Number(line.site.supplyCapacity))
                          : "—"}
                      </TableCell>
                      {sortedComponentTypes.map((ct) => {
                        const val = getLineComponentValue(line, ct.id);
                        const annualCost = getLineComponentAnnualCost(line, ct);
                        return (
                          <TableCell key={ct.id} className="text-right text-sm tabular-nums">
                            {val != null ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span>{val}</span>
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  {formatCurrency(annualCost, currency)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(total, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {margin != null ? (
                          <Badge variant={getMarginVariant(margin.pct)}>
                            {formatPercentage(margin.pct)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="border-t-2 font-semibold bg-[var(--muted)]">
                  <TableCell colSpan={4 + sortedComponentTypes.length} className="text-sm">
                    Portfolio Total
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(portfolioTotal, currency)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
