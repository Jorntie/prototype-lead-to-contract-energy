# Architecture Review — Lead-to-Contract MVP

**Reviewer:** Senior Software Architect
**Date:** 2026-03-17
**Documents reviewed:** ANALYSIS.md (requirements), PLAN.md (implementation plan)

---

## Strengths

### 1. Correct domain modeling priorities
The plan correctly identifies multi-site management and component-based pricing as the two areas where B2B energy differs fundamentally from generic CRM. Investing depth here rather than spreading thin across all modules is the right call.

### 2. PriceComponentType as a first-class entity
Modeling price components as configurable admin-managed types with per-quote-line instances is the right abstraction. This will support adding new component categories (e.g., demand response, capacity market charges) without schema changes. The separation between `PriceComponentType` (template) and `QuoteLineComponent` (instance) is clean.

### 3. Next.js monolith is appropriate for MVP
For a single-developer 4-6 week prototype, a full-stack monolith avoids the overhead of API contracts, separate deployments, and CORS. Server Actions for mutations remove boilerplate. This is the right trade-off for speed.

### 4. Client-side CSV parsing
Parsing CSV/Excel on the client gives immediate feedback and keeps the server stateless. Good pragmatic choice that avoids file upload infrastructure for MVP.

### 5. Quote versioning via deep copy
Immutable previous versions with deep-copied line items is simple and auditable. More complex approaches (event sourcing, diff-based) would be over-engineering for MVP.

### 6. Phased delivery with clear deliverables
Each phase produces a demonstrable, self-contained increment. Phase ordering respects data dependencies (accounts before opportunities before quotes).

---

## Concerns (ranked by severity)

### CRITICAL

#### C1. No `accountId` on `Lot` or `Opportunity` in join table design
The schema shows `OpportunitySite` as a join table between Opportunity and Site. However, the plan doesn't describe how to enforce that an opportunity only references sites belonging to its account. Without a database-level constraint (or at minimum consistent application-level checks), it's possible to create an opportunity for Account A that includes sites from Account B. This is a data integrity issue that will silently corrupt business logic.

**Impact:** Incorrect quotes, wrong sites on contracts, broken trust in the system.

#### C2. No currency or unit-of-measure tracking on financial values
The schema stores `totalValue`, `totalMargin`, `value`, `annualAmount` as bare numbers. Even for a single-currency MVP, you need to know *which* currency those numbers are in. When the second currency is needed (and in European energy markets, it will be), every financial column becomes ambiguous.

**Impact:** Painful migration when multi-currency is needed; risk of mixing currencies in calculation logic even in MVP if deployed across regions.

#### C3. Missing `accountId` on `Quote` and `Contract`
Quotes are linked to opportunities, and contracts to quotes, but there's no direct foreign key to the account. This means every query for "show me all quotes for this account" requires a join through Opportunity. More critically, if an Opportunity is deleted or reassigned, the quote/contract lineage breaks.

**Impact:** Query complexity, fragile data relationships, reporting difficulties.

### HIGH

#### C4. ActivityLog as a single polymorphic table
Using `entityType` + `entityId` (string-based polymorphic association) for activity logs means no foreign key constraints, no referential integrity, and increasingly expensive queries as the table grows. For MVP this is tolerable, but the design should acknowledge this is throwaway.

**Impact:** Cannot enforce data integrity; orphaned log entries when entities are deleted; no cascading deletes.

#### C5. No consideration of decimal precision for pricing
Energy pricing involves values like 0.00342 EUR/kWh. The plan doesn't specify whether `value` fields use `Float`, `Decimal`, or `Int` (cents). Using floating point for financial calculations will produce rounding errors that compound across hundreds of sites.

**Impact:** Incorrect totals, margin calculations off by meaningful amounts on large portfolios.

#### C6. Server Actions without a service layer
The plan routes mutations through Server Actions directly. Without an intermediate service/business-logic layer, validation rules, authorization checks, and calculation logic will be scattered across individual action files. This becomes painful to test and refactor quickly.

**Impact:** Duplicated logic, harder to write unit tests, business rules coupled to Next.js framework.

### MEDIUM

#### C7. No consideration for optimistic locking / concurrent edits
The quote builder is the primary collaborative surface. Two users (sales rep and pricing analyst) editing the same quote simultaneously will silently overwrite each other's changes. A simple `version` or `updatedAt` check on write would prevent this.

**Impact:** Lost work, especially during the quote-building phase which is the highest-value interaction.

#### C8. PDF generation on-demand without caching
The plan states PDFs are "regenerated each time from current data." For a proposal that was sent to a customer, this means the PDF content can change after it was delivered. You need either: (a) store generated PDFs as immutable snapshots, or (b) generate from the versioned/immutable quote data only.

**Impact:** Audit trail broken; customer receives proposal, internal team sees different numbers if components are edited.

#### C9. Soft deletes without query discipline
Soft deletes (deletedAt) are planned for all entities, but the plan doesn't describe how this is enforced in queries. Without Prisma middleware or a global filter, every query must remember to add `WHERE deletedAt IS NULL`. Developers will forget.

**Impact:** Deleted records appearing in list views, counts, and calculations.

#### C10. Bulk import size limits undefined
The plan supports CSV import for sites and price components but doesn't discuss limits. A 10,000-row CSV parsed client-side and sent to the server in "batches" needs defined batch sizes, timeout handling, and progress indication. Without these, large imports will fail silently.

**Impact:** Poor UX for the core use case of onboarding large multi-site customers.

### LOW

#### C11. No API layer limits future integration
The plan explicitly states "No REST API layer in MVP." While Server Actions are faster to develop, the deferred integration requirements (CRM sync, market data, billing handoff) will require an API. Consider at minimum defining the service layer such that wrapping it in REST endpoints later is trivial.

#### C12. Global search implementation unclear
Global search across accounts, sites, and opportunities is listed but the plan doesn't describe the approach. Full-text search in PostgreSQL (using `tsvector` / `GIN` indexes) is straightforward but needs to be set up at schema time, not retrofitted.

---

## Recommendations

### R1. Add Prisma `Decimal` type for all financial fields
Use `Decimal` (maps to PostgreSQL `NUMERIC`) for: `value`, `annualAmount`, `totalPrice`, `totalCost`, `margin`, `totalValue`, `totalMargin`, `estimatedValue`. Specify precision explicitly (e.g., `Decimal @db.Decimal(12, 6)` for per-kWh rates, `Decimal @db.Decimal(14, 2)` for totals).

### R2. Add a `currency` field to Quote
Even if MVP only supports EUR, add a `currency` column (3-char ISO code) on `Quote`. All monetary display and calculation logic should reference this field. This is a 15-minute change now vs. a multi-day migration later.

### R3. Introduce a thin service layer
Create a `src/lib/services/` directory with one file per domain (e.g., `quote.service.ts`, `lead.service.ts`). Server Actions call service functions; service functions contain business logic and call Prisma. This enables unit testing without Next.js context and makes future API routes trivial.

```
Server Action / API Route
        |
   Service Layer  (business logic, validation, calculations)
        |
   Prisma Client  (data access)
```

### R4. Store generated PDFs as snapshots
When a proposal or contract PDF is generated for delivery (status changes to "Sent"), store the PDF blob (filesystem in MVP, S3 later) and link it to the quote version. Subsequent downloads serve the stored file. Re-generation is only available for draft-status quotes.

### R5. Add Prisma middleware for soft deletes
Use Prisma middleware or the `@prisma/client/extensions` API to automatically filter soft-deleted records on all `findMany`/`findFirst` queries. Provide an explicit `includeDeleted` option for admin/audit views.

### R6. Add `updatedAt`-based optimistic locking on Quote
When saving a quote, include the `updatedAt` timestamp in the update `WHERE` clause. If zero rows are affected, return a conflict error. The UI shows a "this quote was modified by someone else" message.

### R7. Add redundant `accountId` to Quote and Contract
Denormalize `accountId` onto `Quote` and `Contract` tables. Maintain it via application logic (set on creation, immutable). This simplifies queries and provides a safety net if the opportunity relationship changes.

### R8. Define import limits and batch strategy
- Maximum file size: 5 MB (covers ~50,000 rows of site data)
- Client-side batch size: 100 records per server request
- Server-side: wrap each batch in a transaction
- UI: progress bar showing batch N of M
- On error: report failed rows, successfully imported rows are committed

### R9. Add PostgreSQL full-text search indexes in the initial migration
Add `tsvector` generated columns on `Account.name`, `Site.address`, `Site.meterId`, and `Contact.name`. Create GIN indexes. This is a one-time schema addition that makes global search performant from the start.

### R10. Validate site-account consistency at the database level
Add a composite check or use application-level validation to ensure that `OpportunitySite.siteId` references a site that belongs to the same account as `OpportunitySite.opportunityId`. Consider a trigger or a unique constraint approach if application-level checks feel insufficient.

---

## Questions for Clarification

### Q1. What is the expected scale for MVP?
How many concurrent users? How many accounts with 100+ sites? This affects whether client-side CSV parsing is viable (browser memory limits) and whether Server Components can handle the dashboard queries without caching.

### Q2. Proposal PDF: should it be a legal-grade snapshot or a live preview?
The answer determines whether PDFs need to be stored immutably (see R4). If proposals are just "nice-to-have previews" and the real document is a Word doc edited separately, the approach can be simpler.

### Q3. What happens to quotes when site data changes?
If a site's annual consumption is updated on the account after a quote is created, should existing quotes reflect the change or remain frozen? The current deep-copy approach for versioning suggests quotes are frozen, but `QuoteLine.siteId` still points to the live site record.

### Q4. Is the approval workflow synchronous or async?
The plan mentions "multi-level approval" but only describes "below margin threshold needs manager approval." Is this a blocking state (quote cannot proceed until approved) or advisory (sales rep can proceed but the quote is flagged)?

### Q5. What is the deployment target?
Docker Compose is listed for local dev. What is the production target? A single VPS? AWS/GCP with managed PostgreSQL? This affects decisions around file storage (local filesystem vs. S3), session management, and whether the Next.js server needs horizontal scaling.

### Q6. How should the system handle pass-through components in quote totals?
Pass-through components (network charges, taxes) are flagged but their commercial treatment is unclear. Are they included in total price shown to the customer? Are they included in margin calculations? The calculation logic needs a clear business rule here.

### Q7. Is lot-level pricing a default that can be overridden, or a lock?
When a component value is set at lot level and then overridden at site level, what happens if the lot-level value is subsequently changed? Does the override persist, or does it reset? This needs a clear precedence rule before building the quote builder UI.

---

## Summary Assessment

The plan is well-structured and demonstrates genuine understanding of the B2B energy domain. The phasing is realistic and the technology choices are appropriate for an MVP. The primary risks are around data integrity (financial precision, cross-entity consistency) and the absence of a service layer that will make the codebase harder to evolve.

The most impactful changes to make before starting implementation:

1. **Use Decimal types for all money/rate fields** (R1) -- prevents compounding errors
2. **Add a service layer** (R3) -- keeps business logic testable and portable
3. **Store PDFs as snapshots** (R4) -- ensures audit integrity
4. **Add currency to Quote** (R2) -- 15 minutes now, days later

None of these recommendations add significant development time. They are all "pay a little now, save a lot later" investments that are well worth making even in a prototype.
