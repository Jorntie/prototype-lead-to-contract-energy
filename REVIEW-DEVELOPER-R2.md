# Developer Review — Round 2

**Reviewer:** Senior Full-Stack Developer
**Date:** 2026-03-18
**Reviewing:** Updated PLAN.md (post Round 1 developer review + end-user review)

---

## Resolved

### R1 concern: Phase 4 underestimated
**Resolved.** The quote builder estimate moved from 5-7d to 9-11d. This is within my original 8-12d range. The UX design step before coding, the explicit TanStack Table callout, and the dropped side-by-side comparison all reflect my feedback. The added end-user scope (bulk editing, completeness bar, mixed-unit engine) pushes it to the high end, but 9-11d is defensible if the developer is disciplined about timeboxing.

### R1 concern: Auth setup underestimated
**Resolved.** Increased from 0.5d to 1d with explicit mention of `withAuth(role)` wrapper for Server Actions. This matches my recommendation.

### R1 concern: Kanban drag-and-drop scope
**Resolved.** Kanban replaced with table view + stage-grouped display. Saves ~1d and eliminates the drag-and-drop complexity entirely. Good call.

### R1 concern: Missing shared infrastructure
**Resolved.** Data table component, toast notifications (sonner), confirmation dialogs, error boundaries, and loading skeletons all moved to Phase 0. This was my R2 recommendation verbatim.

### R1 concern: PDF scope too large
**Resolved.** Contract PDF template dropped. Proposal PDF stored as immutable snapshot (good architectural decision — prevents audit trail issues). Estimate for Phase 5 at 2-3d is now reasonable.

### R1 concern: Side-by-side version comparison
**Resolved.** Dropped per my recommendation. Version list with "view" action is sufficient for MVP.

### R1 concern: Integration testing buffer
**Resolved.** Explicit 1d testing buffer in Phase 6, with 100+ site quote builder performance test called out as a requirement.

### R1 concern: CSV import validation complexity
**Partially resolved.** Column name normalization, encoding handling, and duplicate detection within file are now explicitly listed. The estimate is still 1.5d (1d import + 0.5d validation) which I said should be 2-2.5d. The gap is small enough that I will not flag it again — the 0.5d risk is absorbable within Phase 2's range estimate.

### R1 concern: Lead conversion complexity
**Not revisited, but acceptable.** Still at 0.5d. The plan now mentions "multi-step: carries over currentSupplier/contractEndDate to account" which adds a small amount of scope. This will likely take 0.75d, but the 0.25d overrun is noise in the overall plan.

---

## Partially Resolved

### Quote builder component entry at 2.5d
My Round 1 concern was that the component entry UI was estimated at 1.5d. It is now 2.5d, but the scope has also grown significantly:
- Bulk editing (select multiple sites, set same value)
- Completeness bar ("42 of 50 sites fully priced")
- Sort/filter within the builder by site group, consumption, address
- Inline validation for negative margins
- Visual distinction for defaults vs. overrides (grey vs. black)

This is a lot of interactive behavior packed into one line item. The bulk editing alone — implementing a multi-select mechanism on table rows plus a "set value" modal/popover that writes to all selected rows — is 0.5-0.75d. The sort/filter within TanStack Table is relatively cheap (0.25d) since TanStack has built-in support. The completeness bar is straightforward (0.25d). The visual distinction for defaults is CSS-level work.

**My assessment: 2.5d is tight but achievable if** the developer treats this as "TanStack Table with custom cell renderers" rather than building a bespoke grid from scratch. The key risk is bulk editing — do not build a custom selection mechanism; use TanStack Table's row selection API and add a toolbar action. If you scope bulk editing as "select rows via checkbox column, click 'Set Value' button, pick component, enter value, apply" — that is a known pattern and 0.5d. If you try to build inline multi-cell editing (Excel-style), you will burn 2 days on that alone.

**Recommendation: hardcode the bulk edit interaction to "select + toolbar action", not "click-drag cell range".**

---

## New Concerns

### 1. Auto-logging middleware — implementation approach matters (0.5d estimate)

The plan says "service-layer middleware that auto-logs system events" at 0.5d. This is the right idea, but the implementation approach determines whether 0.5d is realistic.

**Option A: Prisma middleware (bad).** Prisma's `$use` middleware can intercept queries, but it operates at the query level, not the business logic level. You cannot distinguish "status changed from Draft to Submitted" from "user edited the description" — both are `update` calls. You also do not have access to the authenticated user in Prisma middleware without passing it through. Do not go this route.

**Option B: Service-layer wrapper (good, 0.5d).** Create a `withActivityLog` higher-order function that wraps service methods:

```typescript
async function withActivityLog<T>(
  params: { entityType: string; entityId: string; userId: string; type: string },
  fn: () => Promise<T>
): Promise<T> {
  const result = await fn();
  await prisma.activityLog.create({ data: { ...params, content: generateContent(params.type) } });
  return result;
}
```

Call this in the service layer for specific operations: `lead.convert()`, `quote.submit()`, `quote.approve()`, `opportunity.changeStage()`. This is explicit, testable, and 0.5d is realistic.

**Option C: Event emitter (overengineered for MVP).** Skip this.

**Recommendation: Go with Option B. Document which events are auto-logged during Phase 0 so every subsequent phase just calls the wrapper.**

### 2. CSV export utility — 0.5d is realistic but watch the server/client boundary

The plan says "shared export function using Papa Parse for CSV generation" at 0.5d. This implies client-side generation, which is the right choice for MVP:

- **Client-side (Papa Parse):** Serialize the data already loaded in the browser to CSV and trigger a download. Works for datasets under ~10K rows. Simple, no server round-trip. 0.5d is realistic for building a reusable `exportToCSV(columns, data, filename)` utility.
- **Server-side streaming:** Required when the dataset exceeds what is loaded in the browser (e.g., exporting all 200 sites across all accounts). Not needed for MVP if list pages already load all visible data.

**Gotcha:** If list pages use server-side pagination (loading 25 rows at a time), the client only has 25 rows to export. The user will expect "Export" to export ALL rows, not just the current page. Two options:
1. Load all data on export click (separate fetch with no pagination), then generate CSV client-side.
2. Server-side CSV generation endpoint that streams directly.

**Recommendation: For MVP, option 1 is fine. Add a `fetchAll` variant to each list's data fetching that removes pagination, call it on export click. Document the assumption that exports are capped at ~5K rows. 0.5d is achievable.**

### 3. Mixed-unit calculation engine — 0.5d is tight but possible

The plan allocates 0.5d for a calculation engine handling four unit types:
- `per-kWh` : value x annualConsumption
- `per-kW/month` : value x supplyCapacity x 12
- `per-meter/month` : value x 12
- `fixed-annual` : value as-is

The logic itself is a switch statement — that is not the hard part. The hard parts are:

1. **What happens when `supplyCapacity` is null?** The end-user review says "most reps do not know this." If a site has no capacity value and you have a per-kW/month component, the calculation produces `NaN` or `0`. This needs a clear UX treatment: show a warning on the site row ("capacity required for network charge calculation"), and either exclude that component from the total or show the total as incomplete.

2. **Unit test coverage.** This is flagged as a deal breaker. You need test cases for: each unit type individually, a site with all four unit types combined, a site with missing capacity, a site with zero consumption, and a site group total aggregation. Writing those tests takes as long as writing the engine.

3. **Where does the unit live?** It should be on `PriceComponentType.defaultUnit`, and the engine reads it from there. Make sure the unit is not just a display label but drives the calculation.

**My assessment: 0.5d is achievable if** you scope it as: (a) one pure function `calculateComponentAnnualAmount(value, unit, site)` with the switch statement, (b) one aggregation function `calculateQuoteLineTotal(components[])`, (c) 8-10 unit tests. No UI work in this line item — the UI just calls the engine. If you also need to build the UI for displaying unit-specific inputs and warnings, add 0.25d.

**Recommendation: Write the calculation engine and its tests first, before building the quote builder UI. The UI calls the engine; the engine does not depend on the UI. This also makes it testable independently.**

### 4. Phase 0 is now 5-6 days — that is a full week+ before any visible feature

Phase 0 went from 3d (original) to 4-5d (Round 1) to 5-6d (Round 2). It now includes: scaffolding, Docker, Prisma schema, auth, service layer, app shell, shared UI, CSV export, auto-logging, seed data. That is a lot of foundation before the first feature page exists.

This is not wrong — the infrastructure will pay for itself. But psychologically, spending 5-6 days without a single working page can be demoralizing and makes it hard to show progress to stakeholders.

**Recommendation: Reorder Phase 0 internally. Do scaffolding + Prisma + seed + app shell first (2d), then immediately start Phase 1 lead list page. Build the shared data table component as part of the lead list (not in isolation). Add CSV export, auto-logging, and auth middleware in parallel or at the end of Phase 0/start of Phase 1. This way you have a visible page by day 3.**

### 5. "My Action Items" view — the query complexity is non-trivial

The plan allocates 0.5d for a rep-focused view showing:
- Leads needing follow-up
- Quotes expiring this week
- Opportunities with upcoming close dates
- Pending approvals

Each of these is a separate query with different filters, date comparisons, and join patterns. The "leads needing follow-up" requires defining what "needs follow-up" means — is it based on the last activity date? A separate follow-up date field (which does not exist in the schema)? Status-based (all leads in "Contacted" status)?

**My assessment: 0.5d works if** each "action item" is just a filtered query from the existing list endpoints (e.g., "my leads where status = Contacted", "my quotes where validUntil < 7 days from now"). Do not build a separate aggregation service — just render four small tables/lists on one page, each calling an existing service method with filters. If you try to build a unified "action items" abstraction, it will take 1d+.

**Recommendation: Implement as four independent card/list components on a single page, each with its own server component data fetch. No new schema changes needed if "needs follow-up" is defined as status-based rather than date-based.**

---

## Timeline Assessment

### Plan says: 27-34 days (6-7 weeks)

### My assessment: 30-37 days (6-7.5 weeks)

The plan has addressed most of my Round 1 concerns and absorbed 3 additional days of end-user scope. The remaining delta:

| Source | Risk (days) |
|---|---|
| Quote builder component entry (2.5d estimate vs. 3d realistic) | +0.5d |
| Mixed-unit engine needs null-capacity handling + tests | +0.25d |
| "My Action Items" query complexity | +0.25d |
| CSV export pagination gotcha (fetchAll variant needed) | +0.25d |
| General integration friction across 6 phases | +1-2d |
| **Total delta** | **+2-3d** |

This is within the plan's own range (27-34d). If you target the upper end of the range (34 days / 7 weeks), the plan is realistic. If you are being held to the lower end (27 days / 5.5 weeks), you will overrun.

**The 6-7 week estimate is honest.** That is an improvement over the original plan, which would have been 8+ weeks in practice.

---

## Verdict

**The plan is ready to build.** The Round 1 structural concerns (infrastructure in Phase 0, realistic Phase 4 estimate, kanban cut, PDF scope reduction) are all addressed. The end-user additions (mixed-unit engine, bulk editing, auto-logging, CSV export, "My Action Items") are correctly identified as adoption-critical and have been given reasonable — if tight — time allocations.

The primary remaining risk is still Phase 4. The quote builder is now 9-11 days of work with significant interactive complexity (bulk editing, completeness tracking, mixed-unit calculations, CSV component upload, site group cascading, approval workflow). If any single feature in Phase 4 takes 50% longer than estimated, the buffer is consumed. The mitigation is to build the calculation engine and TanStack Table grid first, then layer on bulk editing and completeness indicators — these are additive features on a working base, not structural dependencies.

**Three things to get right early:**
1. Write the mixed-unit calculation engine with tests in Phase 0 or early Phase 4 — before the UI. It is a pure function with no dependencies and the end-user called it a deal breaker.
2. Build the quote builder grid on TanStack Table from day one of Phase 4. Do not prototype with a simpler approach and then migrate — you will lose a day.
3. Implement bulk editing as "checkbox selection + toolbar action", not as inline multi-cell editing. This is the difference between 0.5d and 2d.

No further plan revisions needed. Start building.
