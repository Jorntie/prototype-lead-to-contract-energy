import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Sliders, Users } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Administration"
        description="System configuration and settings"
        breadcrumbs={[
          { label: "Admin" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/components">
          <Card className="hover:border-[var(--ring)] transition-colors cursor-pointer">
            <CardHeader>
              <Sliders className="h-8 w-8 text-[var(--muted-foreground)]" />
              <CardTitle className="text-base">Price Components</CardTitle>
              <CardDescription>
                Configure price component types, categories, and defaults
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="hover:border-[var(--ring)] transition-colors cursor-pointer">
            <CardHeader>
              <Users className="h-8 w-8 text-[var(--muted-foreground)]" />
              <CardTitle className="text-base">Users</CardTitle>
              <CardDescription>
                Manage users and role assignments
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card className="opacity-50">
          <CardHeader>
            <Settings className="h-8 w-8 text-[var(--muted-foreground)]" />
            <CardTitle className="text-base">Settings</CardTitle>
            <CardDescription>
              Approval thresholds, quote validity, and system settings (coming soon)
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
