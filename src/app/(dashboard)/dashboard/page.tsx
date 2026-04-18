import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getDashboardKPIs,
  getPipelineBreakdown,
  getLeadSourceBreakdown,
} from "@/lib/services/dashboard.service";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import {
  Users,
  Target,
  FileText,
  FileSignature,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const [kpis, pipeline, leadSources] = await Promise.all([
    getDashboardKPIs(),
    getPipelineBreakdown(),
    getLeadSourceBreakdown(),
  ]);

  const activePipeline = pipeline.filter(
    (s) => s.stage !== "WON" && s.stage !== "LOST"
  );
  const maxPipelineValue = Math.max(...activePipeline.map((s) => s.value), 1);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your sales pipeline and key metrics"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Leads</CardTitle>
            <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.openLeads}</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              +{kpis.leadsThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Pipeline
            </CardTitle>
            <Target className="h-4 w-4 text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(kpis.pipelineValue)}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {kpis.activeOpportunities} opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Quotes
            </CardTitle>
            <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pendingQuotes}</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {formatCurrency(kpis.quotesValue)} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Signed Contracts
            </CardTitle>
            <FileSignature className="h-4 w-4 text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.signedContracts}</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {formatCurrency(kpis.contractsValue)} this quarter
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Pipeline Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activePipeline.map((stage) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-medium">{stage.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {stage.count}
                      </Badge>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(stage.value)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max((stage.value / maxPipelineValue) * 100, 2)}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Won / Lost summary */}
              <div className="border-t border-[var(--border)] pt-4 mt-4 flex gap-6 text-sm">
                {pipeline
                  .filter((s) => s.stage === "WON" || s.stage === "LOST")
                  .map((stage) => (
                    <div key={stage.stage} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span>{stage.label}:</span>
                      <span className="font-medium">{stage.count}</span>
                      <span className="text-[var(--muted-foreground)]">
                        ({formatCurrency(stage.value)})
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Win Rate</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatPercentage(kpis.conversionRate)}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Of closed opportunities
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Avg Deal Size</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(kpis.avgDealSize)}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Won opportunities
              </p>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <h4 className="text-sm font-medium mb-3">Current Suppliers</h4>
              <div className="space-y-2">
                {leadSources.slice(0, 5).map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[var(--muted-foreground)]">
                      {source.source}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{source.count}</span>
                      {source.converted > 0 && (
                        <span className="text-xs text-green-600">
                          ({source.converted} won)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/leads" className="block">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-2" />
              <p className="font-medium">View Leads</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/opportunities" className="block">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-2" />
              <p className="font-medium">Pipeline</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/quotes" className="block">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <FileText className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-2" />
              <p className="font-medium">Quotes</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/contracts" className="block">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="pt-6 text-center">
              <FileSignature className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-2" />
              <p className="font-medium">Contracts</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
