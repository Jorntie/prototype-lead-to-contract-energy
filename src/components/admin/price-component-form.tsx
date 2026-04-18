"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getUnitLabel, type ComponentUnit } from "@/lib/calculations/price-calculator";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";

// These will be provided by the backend agent
type PriceComponentTypeAction = (
  formData: FormData
) => Promise<{ success?: boolean; error?: string | Record<string, string[]>; id?: string } | void>;

// We declare the server actions inline since the admin actions will be created by the backend agent
// They are imported at the call sites via dynamic references
async function createPriceComponentTypeAction(
  _formData: FormData
): Promise<{ success?: boolean; error?: string; id?: string } | void> {
  // Implemented by backend agent at @/app/(dashboard)/admin/price-components/actions
  throw new Error("Server action not yet implemented");
}

async function updatePriceComponentTypeAction(
  _id: string,
  _formData: FormData
): Promise<{ success?: boolean; error?: string } | void> {
  throw new Error("Server action not yet implemented");
}

async function togglePriceComponentTypeActiveAction(
  _id: string
): Promise<{ success?: boolean; error?: string } | void> {
  throw new Error("Server action not yet implemented");
}

// Re-export with correct implementations when backend is ready
// These stubs allow the UI to compile and render
const ADMIN_ACTIONS = {
  create: createPriceComponentTypeAction,
  update: updatePriceComponentTypeAction,
  toggleActive: togglePriceComponentTypeActiveAction,
};

const categoryOptions = [
  { value: "ENERGY", label: "Energy" },
  { value: "NETWORK", label: "Network" },
  { value: "TAXES_LEVIES", label: "Taxes & Levies" },
  { value: "MARGIN", label: "Margin" },
  { value: "GREEN", label: "Green" },
  { value: "SERVICES", label: "Services" },
];

const unitOptions = [
  { value: "PER_KWH", label: "€/kWh — Per kWh" },
  { value: "PER_KW_MONTH", label: "€/kW/month — Per kW per Month" },
  { value: "PER_METER_MONTH", label: "€/meter/month — Per Connection per Month" },
  { value: "FIXED_ANNUAL", label: "€/year — Fixed Annual Amount" },
];

const categoryVariant: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "info"
> = {
  ENERGY: "warning",
  NETWORK: "info",
  TAXES_LEVIES: "secondary",
  MARGIN: "success",
  GREEN: "success",
  SERVICES: "default",
};

const categoryLabel: Record<string, string> = {
  ENERGY: "Energy",
  NETWORK: "Network",
  TAXES_LEVIES: "Taxes & Levies",
  MARGIN: "Margin",
  GREEN: "Green",
  SERVICES: "Services",
};

interface PriceComponentType {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  defaultValue: number | null;
  isPassThrough: boolean;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
}

interface PriceComponentFormValues {
  name: string;
  category: string;
  defaultUnit: string;
  defaultValue: string;
  isPassThrough: boolean;
  isRequired: boolean;
  displayOrder: string;
}

const defaultFormValues: PriceComponentFormValues = {
  name: "",
  category: "ENERGY",
  defaultUnit: "PER_KWH",
  defaultValue: "",
  isPassThrough: false,
  isRequired: true,
  displayOrder: "0",
};

function PriceComponentFormDialog({
  open,
  onOpenChange,
  component,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component?: PriceComponentType;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = React.useState<Record<string, string[]> | null>(null);
  const [values, setValues] = React.useState<PriceComponentFormValues>(() =>
    component
      ? {
          name: component.name,
          category: component.category,
          defaultUnit: component.defaultUnit,
          defaultValue: component.defaultValue != null ? String(component.defaultValue) : "",
          isPassThrough: component.isPassThrough,
          isRequired: component.isRequired,
          displayOrder: String(component.displayOrder),
        }
      : defaultFormValues
  );

  function update<K extends keyof PriceComponentFormValues>(
    key: K,
    value: PriceComponentFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", values.name);
      formData.set("category", values.category);
      formData.set("defaultUnit", values.defaultUnit);
      formData.set("defaultValue", values.defaultValue);
      formData.set("isPassThrough", values.isPassThrough ? "true" : "false");
      formData.set("isRequired", values.isRequired ? "true" : "false");
      formData.set("displayOrder", values.displayOrder);

      try {
        let result;
        if (component) {
          result = await ADMIN_ACTIONS.update(component.id, formData);
        } else {
          result = await ADMIN_ACTIONS.create(formData);
        }

        if (result && "error" in result && result.error) {
          if (typeof result.error === "string") {
            toast.error(result.error);
          } else {
            setErrors(result.error as unknown as Record<string, string[]>);
            const firstError = Object.values(
              result.error as unknown as Record<string, string[]>
            ).flat()[0];
            if (firstError) toast.error(firstError);
          }
          return;
        }

        toast.success(component ? "Component updated" : "Component created");
        onOpenChange(false);
        onSuccess();
      } catch (err) {
        toast.error(
          err instanceof Error && err.message.includes("not yet implemented")
            ? "Backend action not yet implemented"
            : "An unexpected error occurred"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onOpenChange={onOpenChange} />
      <DialogHeader>
        <DialogTitle>{component ? "Edit Component Type" : "Add Component Type"}</DialogTitle>
        <DialogDescription>
          {component
            ? "Update the price component type settings."
            : "Add a new price component type that will appear in all quotes."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          {/* Name */}
          <FormField label="Name" error={errors?.name} required>
            <Input
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Energy Cost, Network Tariff"
              required
            />
          </FormField>

          {/* Category */}
          <FormField label="Category" error={errors?.category} required>
            <Select
              value={values.category}
              onChange={(e) => update("category", e.target.value)}
              options={categoryOptions}
            />
          </FormField>

          {/* Default Unit */}
          <FormField label="Unit" error={errors?.defaultUnit} required>
            <Select
              value={values.defaultUnit}
              onChange={(e) => update("defaultUnit", e.target.value)}
              options={unitOptions}
            />
          </FormField>

          {/* Default Value */}
          <FormField label="Default Value" error={errors?.defaultValue}>
            <Input
              type="number"
              step="any"
              value={values.defaultValue}
              onChange={(e) => update("defaultValue", e.target.value)}
              placeholder="Leave blank for no default"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Pre-filled value for new sites. Can be overridden per site.
            </p>
          </FormField>

          {/* Display Order */}
          <FormField label="Display Order" error={errors?.displayOrder}>
            <Input
              type="number"
              min="0"
              value={values.displayOrder}
              onChange={(e) => update("displayOrder", e.target.value)}
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Lower numbers appear first in the quote builder.
            </p>
          </FormField>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={values.isRequired}
                onCheckedChange={(v) => update("isRequired", !!v)}
              />
              <div>
                <span className="text-sm font-medium">Required</span>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Sites without this value will be flagged as incomplete.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={values.isPassThrough}
                onCheckedChange={(v) => update("isPassThrough", !!v)}
              />
              <div>
                <span className="text-sm font-medium">Pass-Through</span>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Pass-through costs are excluded from margin calculations.
                </p>
              </div>
            </label>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : component ? "Update Component" : "Add Component"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function AddButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Component Type
      </Button>
      <PriceComponentFormDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}

function PriceComponentsAdminContent({
  componentTypes,
}: {
  componentTypes: PriceComponentType[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editComponent, setEditComponent] = React.useState<PriceComponentType | null>(null);
  const [showAddDialog, setShowAddDialog] = React.useState(false);

  function handleToggleActive(id: string, name: string, currentlyActive: boolean) {
    startTransition(async () => {
      try {
        const result = await ADMIN_ACTIONS.toggleActive(id);
        if (result?.error) {
          toast.error(typeof result.error === "string" ? result.error : "Failed to update");
          return;
        }
        toast.success(`${name} ${currentlyActive ? "deactivated" : "activated"}`);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error && err.message.includes("not yet implemented")
            ? "Backend action not yet implemented"
            : "An unexpected error occurred"
        );
      }
    });
  }

  const active = componentTypes.filter((c) => c.isActive);
  const inactive = componentTypes.filter((c) => !c.isActive);

  return (
    <>
      {/* Add button at top */}
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          Add Component Type
        </Button>
      </div>

      <Card>
        <CardContent className="pt-0 p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Default Value</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.length === 0 && inactive.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-[var(--muted-foreground)]">
                    No price components configured yet. Click &ldquo;Add Component Type&rdquo; to get started.
                  </TableCell>
                </TableRow>
              )}
              {active.length > 0 && (
                <>
                  {active.map((comp) => (
                    <ComponentRow
                      key={comp.id}
                      comp={comp}
                      isPending={isPending}
                      onEdit={() => setEditComponent(comp)}
                      onToggle={() => handleToggleActive(comp.id, comp.name, comp.isActive)}
                    />
                  ))}
                </>
              )}
              {inactive.length > 0 && (
                <>
                  <TableRow className="bg-[var(--muted)] hover:bg-[var(--muted)]">
                    <TableCell
                      colSpan={8}
                      className="py-1.5 px-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide"
                    >
                      Inactive
                    </TableCell>
                  </TableRow>
                  {inactive.map((comp) => (
                    <ComponentRow
                      key={comp.id}
                      comp={comp}
                      isPending={isPending}
                      onEdit={() => setEditComponent(comp)}
                      onToggle={() => handleToggleActive(comp.id, comp.name, comp.isActive)}
                    />
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add dialog */}
      <PriceComponentFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false);
          router.refresh();
        }}
      />

      {/* Edit dialog */}
      {editComponent && (
        <PriceComponentFormDialog
          open={!!editComponent}
          onOpenChange={(open) => {
            if (!open) setEditComponent(null);
          }}
          component={editComponent}
          onSuccess={() => {
            setEditComponent(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function ComponentRow({
  comp,
  isPending,
  onEdit,
  onToggle,
}: {
  comp: PriceComponentType;
  isPending: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <TableRow className={cn(!comp.isActive && "opacity-60")}>
      <TableCell className="font-medium">{comp.name}</TableCell>
      <TableCell>
        <Badge variant={categoryVariant[comp.category] ?? "secondary"}>
          {categoryLabel[comp.category] ?? comp.category}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        {getUnitLabel(comp.defaultUnit as ComponentUnit)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">
        {comp.defaultValue != null ? String(comp.defaultValue) : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {comp.isRequired && (
            <Badge variant="outline" className="text-xs">Required</Badge>
          )}
          {comp.isPassThrough && (
            <Badge variant="secondary" className="text-xs">Pass-through</Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right text-sm text-[var(--muted-foreground)]">
        {comp.displayOrder}
      </TableCell>
      <TableCell className="text-right">
        <Badge variant={comp.isActive ? "success" : "secondary"}>
          {comp.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={isPending}
            title={comp.isActive ? "Deactivate" : "Activate"}
            className={comp.isActive ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
          >
            {comp.isActive ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Export as namespace to allow `PriceComponentsAdmin.AddButton` from the server component
export const PriceComponentsAdmin = Object.assign(PriceComponentsAdminContent, {
  AddButton,
});

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string[];
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium leading-none">
        {label}
        {required && <span className="text-[var(--destructive)] ml-0.5">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="text-xs text-[var(--destructive)] mt-1">{error[0]}</p>}
    </div>
  );
}
