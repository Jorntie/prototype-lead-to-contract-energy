import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getActionItems, type ActionItem } from "@/lib/services/dashboard.service";
import { ListChecks, Users, FileText, Target, FileSignature, ArrowRight } from "lucide-react";
import Link from "next/link";

const typeIcons: Record<string, typeof Users> = {
  lead_followup: Users,
  quote_expiring: FileText,
  quote_pending: FileText,
  opportunity_stuck: Target,
  contract_expiring: FileSignature,
};

const typeColors: Record<string, string> = {
  lead_followup: "text-blue-600 bg-blue-50",
  quote_expiring: "text-amber-600 bg-amber-50",
  quote_pending: "text-purple-600 bg-purple-50",
  opportunity_stuck: "text-red-600 bg-red-50",
  contract_expiring: "text-orange-600 bg-orange-50",
};

function ActionItemCard({ item }: { item: ActionItem }) {
  const Icon = typeIcons[item.type] ?? ListChecks;
  const colorClass = typeColors[item.type] ?? "text-gray-600 bg-gray-50";

  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--accent)] transition-colors group"
    >
      <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{item.title}</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
          {item.description}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
    </Link>
  );
}

export default async function ActionsPage() {
  const items = await getActionItems();

  const overdue = items.filter((i) => i.priority === "overdue");
  const thisWeek = items.filter((i) => i.priority === "this_week");
  const upcoming = items.filter((i) => i.priority === "upcoming");

  return (
    <div>
      <PageHeader
        title="My Action Items"
        description="What you need to do today"
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Overdue */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-red-600">Overdue</CardTitle>
              {overdue.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdue.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="Nothing overdue"
                description="You're all caught up"
              />
            ) : (
              <div className="space-y-1">
                {overdue.map((item) => (
                  <ActionItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* This Week */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-amber-600">
                This Week
              </CardTitle>
              {thisWeek.length > 0 && (
                <Badge variant="warning" className="text-xs">
                  {thisWeek.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {thisWeek.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No items this week"
                description="Check back soon"
              />
            ) : (
              <div className="space-y-1">
                {thisWeek.map((item) => (
                  <ActionItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coming Up */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Coming Up</CardTitle>
              {upcoming.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {upcoming.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No upcoming items"
                description="Create leads or opportunities to see actions here"
              />
            ) : (
              <div className="space-y-1">
                {upcoming.map((item) => (
                  <ActionItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
