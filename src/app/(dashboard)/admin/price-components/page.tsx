import { PageHeader } from "@/components/shared/page-header";
import { getPriceComponentTypes } from "@/lib/services/price-component.service";
import { PriceComponentsAdmin } from "@/components/admin/price-component-form";

export default async function PriceComponentsPage() {
  const componentTypes = await getPriceComponentTypes(true);

  return (
    <div>
      <PageHeader
        title="Price Components"
        description="Configure price component types, categories, units, and default values"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Price Components" },
        ]}
      />
      {/* AddButton is a client component that manages its own open state */}
      <PriceComponentsAdmin componentTypes={componentTypes} />
    </div>
  );
}
