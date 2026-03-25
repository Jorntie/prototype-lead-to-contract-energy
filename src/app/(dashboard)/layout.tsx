import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { getActionItems } from "@/lib/services/dashboard.service";
import { auth } from "@/lib/auth";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  SALES_MANAGER: "Sales Manager",
  SALES_REP: "Sales Rep",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, actionItems] = await Promise.all([
    auth(),
    getActionItems(),
  ]);
  const overdueCount = actionItems.filter((i) => i.priority === "overdue").length;
  const userName = session?.user?.name ?? "User";
  const userRole = ROLE_LABELS[session?.user?.role ?? ""] ?? "Sales Rep";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-60">
        <Header userName={userName} userRole={userRole} notificationCount={overdueCount} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
