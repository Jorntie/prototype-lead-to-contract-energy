/**
 * Mixed-unit price calculation engine.
 * This is the highest-risk module — flagged as a DEAL BREAKER by end-user review.
 * "If the total price calculation is wrong, every quote will have incorrect numbers."
 *
 * Pure functions with no side effects. Must be exhaustively unit tested.
 */

export type ComponentUnit = "PER_KWH" | "PER_KW_MONTH" | "PER_METER_MONTH" | "FIXED_ANNUAL";

/**
 * Calculate the annual cost for a single price component on a single site.
 *
 * @param value - The component rate value (e.g., 0.082 €/kWh, 3.45 €/kW/month)
 * @param unit - The unit type of the component
 * @param annualConsumption - Annual consumption in kWh (used for PER_KWH)
 * @param supplyCapacity - Supply capacity in kW (used for PER_KW_MONTH)
 * @returns Annual cost in the quote's currency
 */
export function calculateComponentAnnualCost(
  value: number,
  unit: ComponentUnit,
  annualConsumption: number | null,
  supplyCapacity: number | null
): number {
  switch (unit) {
    case "PER_KWH":
      // value × annual consumption (kWh)
      if (annualConsumption === null || annualConsumption === 0) return 0;
      return value * annualConsumption;

    case "PER_KW_MONTH":
      // value × supply capacity (kW) × 12 months
      if (supplyCapacity === null || supplyCapacity === 0) return 0;
      return value * supplyCapacity * 12;

    case "PER_METER_MONTH":
      // value × 12 months (fixed per connection point)
      return value * 12;

    case "FIXED_ANNUAL":
      // value as entered (already annual)
      return value;

    default:
      throw new Error(`Unknown component unit: ${unit}`);
  }
}

/**
 * Calculate the total annual cost for a site across all components.
 */
export function calculateSiteTotalAnnualCost(
  components: Array<{
    value: number;
    unit: ComponentUnit;
    isPassThrough?: boolean;
  }>,
  annualConsumption: number | null,
  supplyCapacity: number | null
): { total: number; byComponent: number[] } {
  const byComponent = components.map((c) =>
    calculateComponentAnnualCost(c.value, c.unit, annualConsumption, supplyCapacity)
  );
  const total = byComponent.reduce((sum, val) => sum + val, 0);
  return { total, byComponent };
}

/**
 * Calculate margin for a site.
 * Margin = total revenue - cost of base components.
 * Margin percentage is calculated against configurable base components
 * (typically energy cost only, not pass-throughs).
 *
 * @param totalRevenue - Total annual revenue from all components
 * @param baseCost - Cost of the base components that margin is calculated against
 * @returns margin amount and percentage
 */
export function calculateMargin(
  totalRevenue: number,
  baseCost: number
): { amount: number; percentage: number } {
  if (totalRevenue === 0) return { amount: 0, percentage: 0 };
  const amount = totalRevenue - baseCost;
  const percentage = baseCost > 0 ? (amount / baseCost) * 100 : 0;
  return { amount, percentage };
}

/**
 * Calculate the margin component value from a percentage of base components.
 *
 * @param marginPercentage - Desired margin as percentage (e.g., 8 for 8%)
 * @param baseComponentValues - Array of { value, unit } for components the margin applies to
 * @param annualConsumption - Site annual consumption
 * @param supplyCapacity - Site supply capacity
 * @returns margin rate in per-kWh terms (most common)
 */
export function calculateMarginFromPercentage(
  marginPercentage: number,
  baseComponentAnnualCosts: number[]
): number {
  const totalBaseCost = baseComponentAnnualCosts.reduce((sum, val) => sum + val, 0);
  return totalBaseCost * (marginPercentage / 100);
}

/**
 * Calculate the total contract value across all sites.
 *
 * @param siteTotals - Annual cost per site
 * @param contractDurationMonths - Contract duration in months
 * @returns Total contract value
 */
export function calculateTotalContractValue(
  siteTotals: number[],
  contractDurationMonths: number
): number {
  const totalAnnual = siteTotals.reduce((sum, val) => sum + val, 0);
  return totalAnnual * (contractDurationMonths / 12);
}

/**
 * Get the display unit label for a component unit.
 */
export function getUnitLabel(unit: ComponentUnit): string {
  switch (unit) {
    case "PER_KWH":
      return "€/kWh";
    case "PER_KW_MONTH":
      return "€/kW/mo";
    case "PER_METER_MONTH":
      return "€/meter/mo";
    case "FIXED_ANNUAL":
      return "€/year";
    default:
      return unit;
  }
}

/**
 * Validate that a site has the required data for all its components.
 * Returns missing fields.
 */
export function validateSiteForPricing(
  site: { annualConsumption: number | null; supplyCapacity: number | null },
  componentUnits: ComponentUnit[]
): string[] {
  const missing: string[] = [];

  if (componentUnits.includes("PER_KWH") && !site.annualConsumption) {
    missing.push("Annual consumption required for per-kWh components");
  }

  if (componentUnits.includes("PER_KW_MONTH") && !site.supplyCapacity) {
    missing.push("Supply capacity required for per-kW/month components");
  }

  return missing;
}
