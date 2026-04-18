import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getOpportunities } from "@/lib/services/opportunity.service";
import { getUsers } from "@/lib/services/lead.service";
import { PipelineTable } from "@/components/pipeline/pipeline-table";
import { PipelineSummary } from "@/components/pipeline/pipeline-summary";
import { PipelineFilters } from "@/components/pipeline/pipeline-filters";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; assignedToId?: string }>;
}) {
  const params = await searchParams;
  const [opportunities, users] = await Promise.all([
    getOpportunities({
      stage: params.stage || undefined,
      assignedToId: params.assignedToId || undefined,
    }),
    getUsers(),
  ]);

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Track opportunities through your sales process"
        breadcrumbs={[
          { label: "Sales", href: "/dashboard" },
          { label: "Pipeline" },
        ]}
        actions={
          <Link href="/opportunities/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Opportunity
            </Button>
          </Link>
        }
      />

      <div className="space-y-6">
        <PipelineSummary opportunities={opportunities} />

        <PipelineFilters
          currentStage={params.stage ?? ""}
          currentAssignedToId={params.assignedToId ?? ""}
          users={users}
        />

        <PipelineTable opportunities={opportunities} />
      </div>
    </div>
  );
}
