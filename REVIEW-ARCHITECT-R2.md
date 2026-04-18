# Architecture Review — Round 2

**Reviewer:** Senior Software Architect
**Date:** 2026-03-18
**Documents reviewed:** PLAN.md (updated), ANALYSIS.md (updated), REVIEW-ARCHITECT.md (Round 1), REVIEW-ENDUSER.md

---

## Round 1 Concerns — Resolution Status

### Resolved

**C1. No accountId on OpportunitySite — site-account consistency.**
Addressed. The plan now states "validated: site.accountId must match opportunity.accountId" on OpportunitySite and lists service-layer enforcement. This is adequate for MVP. The plan should note that a database-level CHECK constraint or trigger is the post-MVP hardening path, since service-layer-only validation can be bypassed by direct DB operations or future batch jobs.

**C2. No currency or unit-of-measure tracking.**
Addressed. `currency` (ISO 4217) is now on Quote. Decimal types specified with explicit precision (`Decimal(12,6)` for rates, `Decimal(14,2)` for totals). This is exactly what was recommended.

**C3. Missing accountId on Quote and Contract.**
Addressed. `accountId` is now denormalized on both Quote and Contract. Plan correctly notes it is set on creation and simplifies queries.

**C5. No decimal precision for pricing.**
Addressed. Decimal types are specified in the schema design decisions and repeated in the Risks & Mitigations table. Good.

**C6. Server Actions without a service layer.**
Addressed. `src/lib/services/` is now established in Phase 0 with 0.5d allocated for scaffolding. The architecture diagram showing Server Action -> Service Layer -> Prisma is present in two places. This was the single most important structural recommendation.

**C7. Optimistic locking.**
Addressed. `updatedAt`-based optimistic locking on Quote writes is listed in schema design decisions and in Risks & Mitigations. Sufficient for MVP.

**C8. PDF generation without caching.**
Addressed. Immutable PDF snapshots are now stored when quote status transitions to "Sent". Re-generation restricted to draft-status quotes. Storage interface abstracted (filesystem now, S3 later). This is clean.

**C9. Soft deletes without query discipline.**
Addressed. "Prisma middleware for soft-delete filtering" is listed in the schema design decisions. Automatically excludes deleted records.

**C10. Bulk import size limits undefined.**
Addressed. Batch size of 100 records, max file size 5MB, error reporting per row — all specified in Phase 2.

### Partially Resolved

**C4. ActivityLog as a polymorphic table.**
The polymorphic `entityType + entityId` pattern remains. The plan now leans more heavily on this table via auto-logging middleware, which increases its write volume. This is acceptable for MVP but the plan should acknowledge two things: (1) this table will need an index on `(entityType, entityId, createdAt)` from day one or timeline queries will degrade quickly, and (2) orphaned entries are expected when entities are deleted (even soft-deleted entities may later be hard-purged).

**Action needed:** Add a note about the composite index in the schema section. Low effort, prevents a performance surprise during demo.

**C11. No API layer.**
Still deferred, which is fine. The service layer now makes wrapping in REST trivial. No further action needed for MVP.

**C12. Global search.**
Dropped from MVP scope in favor of list-page filters. Acceptable trade-off. The plan should ensure list-page search uses `ILIKE` with a database index (or `tsvector` on high-cardinality fields like `Account.name` and `Site.meterId`) rather than application-level filtering, or performance will suffer once seed data scales up.

---

## New Additions — Architectural Assessment

### Mixed-Unit Calculation Engine

The plan correctly identifies four unit types and their formulas:
- per-kWh: value x annualConsumption
- per-kW/month: value x supplyCapacity x 12
- per-meter/month: value x 12
- fixed annual: value as-is

**Assessment: Sound in principle, but needs stronger isolation.**

The 0.5d estimate is adequate for the math itself, but this module deserves the following treatment:

1. **Standalone pure-function module** at `src/lib/calculations/pricing-engine.ts` with zero side effects. Input: array of components with their units and values, site capacity, site consumption. Output: annualized cost per component, total. No database calls, no service-layer dependencies.

2. **Exhaustive unit tests** — this is the one area where I would insist on test coverage before any other testing. The test matrix should include:
   - Each unit type in isolation
   - Mixed units on a single site (the real case)
   - Zero consumption (site with capacity charges but no usage yet)
   - Zero capacity (site where capacity is unknown/optional — the end-user flagged this)
   - Null/undefined capacity with per-kW/month component (must error or skip, not silently produce NaN)
   - Decimal precision: verify that 0.00342 EUR/kWh x 1,250,000 kWh = 4,275.00 exactly, not 4,274.999999...
   - Portfolio rollup: sum of 200 sites, verify no accumulated rounding drift

3. **Explicit handling of missing data.** The end-user noted that `supplyCapacity` is often unknown. If a per-kW/month component is present but the site has no capacity value, the calculation engine must either: (a) skip that component and flag the site as incomplete, or (b) throw a validation error. It must not silently produce zero or NaN. This rule should be documented in the calculation module, not scattered across the UI.

**Verdict:** Make this the most thoroughly tested module in the codebase. The 0.5d estimate is fine for implementation but allocate testing time within the Phase 6 integration testing budget specifically for this engine with real-world pricing data.

### Auto-Logging Middleware

The plan places auto-logging as "service-layer middleware" in Phase 0, allocating 0.5d.

**Assessment: Correct pattern, two concerns.**

1. **Implementation approach matters.** "Service-layer middleware" is ambiguous. The cleanest implementation is a higher-order function that wraps service methods:

   ```
   function withAutoLog<T>(serviceFn: (...args) => Promise<T>, eventType: string): (...args) => Promise<T>
   ```

   This is preferable to Prisma middleware for logging because Prisma middleware operates at the query level (too low — you get `UPDATE Quote SET status = 'approved'` but lose the semantic meaning "quote was approved"). Service-layer wrapping preserves business context.

   Do not use a pub/sub or event emitter pattern for MVP — it adds complexity and makes the execution order harder to reason about.

2. **Circular dependency risk.** The auto-logger writes to ActivityLog via Prisma. If the ActivityLog service itself is wrapped with auto-logging, you get infinite recursion. Simple fix: the ActivityLog write should bypass the middleware (call Prisma directly). Document this as a known design constraint.

**Verdict:** Solid addition. Clarify that it is a higher-order function wrapper, not Prisma middleware or an event system. Add the circular-dependency guard note.

### CSV Export Utility

Phase 0 allocates 0.5d for a shared CSV export utility using Papa Parse.

**Assessment: Straightforward, one consideration.**

The export should happen client-side (serialize the currently displayed/filtered data to CSV in the browser, trigger download). This avoids server-side file generation, keeps it stateless, and means filtered views export only the filtered data — which is the expected behavior.

For the quote export specifically, ensure the export includes the unit type per component and the calculated annual amount, not just the raw value. A CSV with `0.00342` in a column is meaningless without knowing it is "EUR/kWh" and maps to "4,275.00 EUR/year" for that site.

**Verdict:** No concerns. Include unit context in quote exports.

### Pricing Desk Export

Phase 3 adds a "download opportunity site list as CSV" (0.25d) for submission to the pricing desk.

**Assessment: Good domain-aware addition.** This acknowledges the real workflow where the sales rep is not the person calculating energy costs. The export should include: meterId, address, annualConsumption, peakPercentage, supplyCapacity, voltageLevel, connectionType, siteGroupName — everything the pricing desk needs to return energy costs per site. The re-import path already exists via the component CSV upload in Phase 4. This is a clean round-trip.

**Verdict:** No concerns.

---

## New Schema Fields — Fit Assessment

### Site fields: peakPercentage, voltageLevel, connectionType, per-site contractEndDate

All optional fields, all justified by the end-user review. No schema concerns. Two notes:

- `voltageLevel` should be an enum (HV/MV/LV), not a free-text string. This prevents data entry variations ("high voltage" vs "HV" vs "hv") and enables correct filtering.
- `connectionType` should also be an enum with defined values. The plan says "grid connection vs. behind-the-meter" but the analysis mentions it more broadly. Define 3-4 enum values upfront; the admin can extend later if needed.

### Quote fields: paymentTerms, billingFrequency

Both should be enums (`NET_14 | NET_30 | NET_60` and `MONTHLY | QUARTERLY`). These are carried to the Contract, so ensure the Contract schema also stores these values (currently the Contract table does not list them — they would need to be either denormalized onto Contract or always read from the linked Quote). Since the Quote is immutable once accepted, reading from the linked Quote is acceptable.

**Action needed:** Confirm that Contract either stores paymentTerms/billingFrequency or that the contract detail page reads them from the linked Quote. Currently ambiguous in the schema listing.

---

## Remaining Risks

### R1. QuoteLine.siteId still references live Site data

The plan correctly deep-copies `annualKwh` into QuoteLine (frozen at quote creation). But `QuoteLine.siteId` still points to the live Site record. If a site's address, meterId, or capacity changes after the quote is created, the quote detail view will show the updated site data alongside the frozen consumption figure. This is inconsistent.

For MVP this is tolerable — the proposal PDF should render from QuoteLine + QuoteLineComponent data only (which is frozen), not from the live Site record. Document this constraint for the PDF template implementation.

### R2. Margin percentage base component configuration

The plan says margin can be "a percentage of specified base components (energy cost only, not pass-throughs)" and "allow specifying which components the margin % applies to." This configuration needs to be stored somewhere. Options:

- On the PriceComponentType record for the margin component (a `baseComponentIds` array field)
- Hardcoded to "all components where isPassThrough = false"

The second option is simpler and matches the end-user's stated behavior ("margin as percentage of energy cost, not of pass-throughs"). I recommend the second approach for MVP: margin % applies to the sum of all non-pass-through, non-margin components. This avoids a configuration UI for base component selection while still being correct.

### R3. Phase 0 is now 5-6 days for a single developer

Phase 0 has grown to include: scaffolding, Docker, Prisma schema, auth, service layer, app shell, shared UI, CSV export, auto-logging, and seed data. That is a lot of foundational work before any visible feature is delivered. The risk is motivational — 6 days without a usable screen.

Consider delivering Phase 0 and Phase 1 in a combined sprint. The lead module is lightweight (2-3 days) and provides immediate visual feedback that the architecture works end-to-end. Shared infrastructure can be refined as needed during Phase 1 rather than perfected upfront.

### R4. Phase 4 estimate range is wide (9-11 days)

The quote builder is the make-or-break module and has a 2-day range. Given that the end-user flagged both the calculation engine and the bulk-editing UX as deal breakers, I would plan for the upper bound (11 days) and treat finishing early as a bonus. The demo script in Section 6 leans heavily on Phase 4 features — if this phase runs over, Phases 5 and 6 get compressed, and the demo suffers.

---

## Verdict

The plan has materially improved since Round 1. All three critical concerns (C1, C2, C3) are resolved. The service layer is in place. PDF snapshots are handled correctly. The end-user feedback has been incorporated thoughtfully — the new additions (mixed-unit calculations, auto-logging, CSV export, pricing desk export, new site/quote fields) are all architecturally sound and add genuine domain value without over-complicating the system.

**Remaining action items (ordered by importance):**

1. **Calculation engine isolation and testing** — make it a pure-function module, write exhaustive unit tests including edge cases (zero capacity, null values, decimal precision). This is the single highest-risk module.
2. **Enum types for voltageLevel, connectionType, paymentTerms, billingFrequency** — prevent free-text data quality issues.
3. **Composite index on ActivityLog (entityType, entityId, createdAt)** — prevent timeline query degradation as auto-logging increases write volume.
4. **Clarify paymentTerms/billingFrequency on Contract** — either denormalize or document that Contract reads from Quote.
5. **Document the auto-logging circular-dependency guard** — ActivityLog writes must bypass the middleware wrapper.
6. **Document that proposal PDFs render from frozen QuoteLine data, not live Site records.**

None of these are blocking. The plan is ready for implementation. The calculation engine testing is the one area where I would not compromise — get that right and the rest follows.
