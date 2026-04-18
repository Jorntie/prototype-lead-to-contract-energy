"use client";

import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const STAGES = ["DISCOVERY", "QUOTING", "PROPOSAL_SENT", "NEGOTIATION", "WON"];

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  QUOTING: "Quoting",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
};

interface StageStepperProps {
  currentStage: string;
}

export function StageStepper({ currentStage }: StageStepperProps) {
  const isLost = currentStage === "LOST";
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STAGES.map((stage, index) => {
          const isCompleted = !isLost && currentIndex > index;
          const isCurrent = currentStage === stage;
          const isFuture = !isLost && currentIndex < index;

          return (
            <div key={stage} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    isCurrent && !isLost && "border-blue-500 bg-blue-500 text-white",
                    isCurrent && isLost && "border-red-500 bg-red-500 text-white",
                    isFuture && "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
                    isLost && !isCurrent && "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] opacity-50"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isLost && stage === "WON" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-xs text-center whitespace-nowrap",
                    isCurrent && "font-semibold text-[var(--foreground)]",
                    isCompleted && "text-green-600 font-medium",
                    isFuture && "text-[var(--muted-foreground)]",
                    isLost && !isCurrent && "text-[var(--muted-foreground)] line-through opacity-50"
                  )}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>

              {/* Connector line */}
              {index < STAGES.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 mb-5",
                    isCompleted && "bg-green-500",
                    isCurrent && "bg-[var(--border)]",
                    isFuture && "bg-[var(--border)]",
                    isLost && "bg-[var(--border)] opacity-50"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Lost banner */}
      {isLost && (
        <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium">
          This opportunity has been marked as Lost
        </div>
      )}
    </div>
  );
}
