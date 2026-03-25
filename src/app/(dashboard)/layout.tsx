import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { getActionItems } from "@/lib/services/dashboard.service";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actionItems = await getActionItems();
  const overdueCount = actionItems.filter((i) => i.priority === "overdue").length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-60">
        <Header userName="Demo User" userRole="Sales Manager" notificationCount={overdueCount} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
