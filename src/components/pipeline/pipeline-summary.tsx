"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";

const STAGE_CONFIG: Record<string, { label: string; color: string; bgClass: string; textClass: string }> = {
  DISCOVERY: { label: "Discovery", color: "bg-blue-500", bgClass: "bg-blue-50", textClass: "text-blue-700" },
  QUOTING: { label: "Quoting", color: "bg-indigo-500", bgClass: "bg-indigo-50", textClass: "text-indigo-700" },
  PROPOSAL_SENT: { label: "Proposal Sent", color: "bg-amber-500", bgClass: "bg-amber-50", textClass: "text-amber-700" },
  NEGOTIATION: { label: "Negotiation", color: "bg-orange-500", bgClass: "bg-orange-50", textClass: "text-orange-700" },
  WON: { label: "Won", color: "bg-green-500", bgClass: "bg-green-50", textClass: "text-green-700" },
  LOST: { label: "Lost", color: "bg-red-500", bgClass: "bg-red-50", textClass: "text-red-700" },
};

const STAGE_ORDER = ["DISCOVERY", "QUOTING", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];

interface StageSummary {
  stage: string;
  count: number;
  totalValue: number;
}

interface PipelineSummaryProps {
  opportunities: Array<{
    stage: string;
    estimatedValue: number | null;
  }>;
}

export function PipelineSummary({ opportunities }: PipelineSummaryProps) {
  const stageSummaries: StageSummary[] = STAGE_ORDER.map((stage) => {
    const stageOpps = opportunities.filter((o) => o.stage === stage);
    return {
      stage,
      count: stageOpps.length,
      totalValue: stageOpps.reduce((sum, o) => sum + (o.estimatedValue ?? 0), 0),
    };
  });

  const totalCount = opportunities.length;

  if (totalCount === 0) return null;

  return (
    <div className="space-y-4">
      {/* Horizontal bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-[var(--muted)]">
        {stageSummaries
          .filter((s) => s.count > 0)
          .map((s) => {
            const config = STAGE_CONFIG[s.stage];
            const widthPercent = (s.count / totalCount) * 100;
            return (
              <div
                key={s.stage}
                className={`${config.color} transition-all`}
                style={{ width: `${widthPercent}%` }}
                title={`${config.label}: ${s.count}`}
              />
            );
          })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stageSummaries.map((s) => {
          const config = STAGE_CONFIG[s.stage];
          return (
            <div
              key={s.stage}
              className={`rounded-lg border p-3 ${config.bgClass}`}
            >
              <div className={`text-xs font-medium ${config.textClass}`}>
                {config.label}
              </div>
              <div className="mt-1 text-lg font-bold">{s.count}</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                {formatCurrency(s.totalValue)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
