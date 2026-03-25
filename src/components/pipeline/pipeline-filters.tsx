"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

const stageOptions = [
  { value: "", label: "All Stages" },
  { value: "DISCOVERY", label: "Discovery" },
  { value: "QUOTING", label: "Quoting" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

interface PipelineFiltersProps {
  currentStage: string;
  currentAssignedToId: string;
  users: { id: string; name: string }[];
}

export function PipelineFilters({
  currentStage,
  currentAssignedToId,
  users,
}: PipelineFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/opportunities?${params.toString()}`);
  }

  const userOptions = [
    { value: "", label: "All Reps" },
    ...users.map((u) => ({ value: u.id, label: u.name })),
  ];

  return (
    <div className="flex items-center gap-3">
      <Select
        value={currentStage}
        onChange={(e) => updateFilter("stage", e.target.value)}
        options={stageOptions}
      />
      <Select
        value={currentAssignedToId}
        onChange={(e) => updateFilter("assignedToId", e.target.value)}
        options={userOptions}
      />
    </div>
  );
}
