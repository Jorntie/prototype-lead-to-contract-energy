# Developer Review — Lead-to-Contract MVP Implementation Plan

**Reviewer perspective:** Senior Full-Stack Developer
**Date:** 2026-03-17

---

## Strengths

### 1. Stack choice is solid for the scope
Next.js 14 App Router as a full-stack monolith is the right call for a single-developer prototype. Server Actions eliminate the need for a REST API layer, and the combination of Server Components for data-heavy list pages with Client Components for interactive views (quote builder, kanban) is a pragmatic split. Prisma + PostgreSQL + Zod gives you end-to-end type safety with minimal boilerplate.

### 2. Phase ordering is correct
The plan builds entities in dependency order: foundation, then leads, then accounts/sites, then opportunities (which reference accounts), then quotes (which reference opportunities + sites), then contracts (which reference quotes). Each phase produces a testable deliverable. This is how you avoid integration nightmares.

### 3. CSV import strategy is well thought through
Client-side parsing with Papa Parse / SheetJS, client-side validation with Zod preview, then batch server insert is the right architecture. It avoids server-side file handling complexity and gives users immediate feedback. The plan correctly identifies import edge cases as a risk.

### 4. Price component model is properly separated
Having `PriceComponentType` as admin-configurable entities, with `QuoteLineComponent` as per-quote-line instances, is the correct domain modeling. This avoids hardcoding pricing logic while keeping the data model relational and queryable.

### 5. Realistic risk identification
The plan correctly identifies the quote builder UI, CSV edge cases, and PDF pagination as the top risks. These are indeed where prototypes of this type tend to stall.

---

## Concerns (ranked by impact on timeline)

### 1. Phase 4 (Pricing & Quoting) is underestimated — HIGH IMPACT

**Estimated: 5-7 days. Realistic: 8-12 days.**

This is the most complex module and the estimates are optimistic in several places:

- **"Quote builder UI — component entry" at 1.5d:** This is a dynamic form where each site has N price components, each with different units, default values, override capability, and per-site vs. per-lot inheritance. This is essentially a spreadsheet-like UI with validation, calculated fields, and cascading updates. Building this with good UX takes 3-4 days minimum. Consider using a library like TanStack Table with editable cells rather than building custom forms per row.

- **"Component CSV upload" at 1d:** Mapping uploaded component values to sites by meter ID requires: file parsing, column mapping UI (users won't always have perfect headers), meter ID matching with fuzzy/partial match handling, error reporting for unmatched meters, and preview before apply. This is 1.5-2 days.

- **"Quote versioning — compare side-by-side" at 0.5d:** A meaningful side-by-side comparison of two quote versions with per-site, per-component diffing is not a half-day task. The data fetching alone (two full quote trees with all lines and components) plus a diff-aware table UI is 1-1.5 days. Consider deferring side-by-side comparison to post-MVP and just showing version history with the ability to view any version.

- **Margin calculation complexity:** The plan mentions "margin as fixed value or % of other components" — the "% of other components" part means you need to define which components the percentage applies to, handle circular dependency if someone sets margin as % of total, and recalculate in real-time. This needs careful scoping.

### 2. Phase 0 auth setup is deceptively simple — MEDIUM IMPACT

**Estimated: 0.5d for auth. Realistic: 1-1.5d.**

NextAuth.js v5 (Auth.js) with credential provider sounds simple, but the plan requires:
- Role-based middleware (3 roles with different permissions)
- Per-entity ownership checks (sales rep sees only own leads)
- Session handling across Server Components and Client Components (different patterns in App Router)
- Protected API routes AND Server Actions

The middleware layer for "Sales Rep can only see/edit own entities, Manager sees all" is not trivial to implement correctly across every page and API route. I recommend building a simple `withAuth(role)` wrapper for Server Actions and a `canAccess(userId, entity)` utility early, rather than bolting it on later.

### 3. Kanban board (Phase 3) at 1 day is tight — MEDIUM IMPACT

**Estimated: 1d for "Data table + kanban pipeline view (drag-and-drop)". Realistic: 1.5-2d.**

This is two completely different views (table AND kanban) in one task estimate. Drag-and-drop kanban with stage transitions, optimistic updates, and proper drop validation is a full day on its own. Libraries like `@hello-pangea/dnd` or `dnd-kit` help but still require significant integration. The data table with filters is another half day.

Recommendation: Build the data table view first (0.5d), then kanban as a stretch goal. The kanban is nice for demos but not functionally required.

### 4. PDF generation will hit edge cases — MEDIUM IMPACT

**Estimated: 2d total (1d proposal + 0.5d variants + 0.5d contract). Realistic: 3-4d.**

`@react-pdf/renderer` is a good choice, but:
- **Multi-site proposals:** A customer with 50+ sites means multi-page tables with proper pagination, headers repeated on each page, and page break handling. This is fiddly with any PDF library.
- **Site schedule appendix:** The per-site component breakdown table for 50 sites with 6 components each is a 300-row table. Layout and readability require iteration.
- **Two separate PDF templates** (proposal and contract) with different structures is 2 days minimum, not 1.5d.
- **Testing:** You need to generate PDFs with 1, 5, 50, and 200+ sites to catch layout issues. This testing time is not accounted for.

### 5. Missing tasks that will eat time — MEDIUM IMPACT

Several necessary tasks are not explicitly in the plan:

| Missing Task | Where It Hits | Estimated Impact |
|---|---|---|
| **Loading states and skeleton UIs** | Every list page, every detail page | 1d total across phases |
| **Optimistic updates** | Kanban drag, inline edits, status changes | 0.5d |
| **Toast notifications / feedback** | All mutations (create, update, delete, import) | Mentioned in Phase 6 but needed from Phase 1 |
| **Confirmation dialogs** | Deletes, status transitions, lead conversion | 0.5d |
| **Pagination backend** | Every list endpoint — cursor vs. offset, total counts | 0.5d (if done consistently from the start) |
| **Database indexing** | Queries on accountId, opportunityId, status, assignedToId will be slow without indexes | 0.25d |
| **Error boundaries** | App Router error.tsx per route segment | 0.5d |
| **Form reset/dirty state** | Preventing navigation away from unsaved changes in quote builder | 0.5d |

That is roughly 3-4 days of work not accounted for in the plan.

### 6. Bulk site import validation is more complex than estimated — LOW-MEDIUM IMPACT

**Estimated: 1.5d (1d import + 0.5d validation). Realistic: 2-2.5d.**

The plan mentions "meter ID uniqueness, required fields, data type checks" but real-world CSV imports also need:
- Character encoding handling (Excel exports in Windows-1252, not UTF-8)
- Column name normalization (users will have "Meter ID", "meter_id", "MeterID", "Meter Number")
- Duplicate detection within the uploaded file itself
- Partial success handling (what if 48 of 50 rows are valid?)
- Meaningful error messages with row numbers and field names
- Re-upload workflow (fix and re-upload vs. edit in preview)

### 7. The "Lead conversion" flow is deceptively complex — LOW IMPACT

**Estimated: 0.5d. Realistic: 0.75-1d.**

Converting a lead to an account + opportunity requires:
- Creating an Account from lead data (with a form for additional fields)
- Optionally creating Contacts
- Creating an Opportunity linked to the new account
- Updating the lead status to "Converted" with a reference to the new account
- All in a single transaction
- UI: is this a multi-step wizard or a single form? The plan does not specify.

---

## Recommendations

### R1: Timebox Phase 4 aggressively and cut scope
The quote builder is where this project lives or dies. Specific recommendations:
- **Drop side-by-side version comparison.** Show a version list with "view" buttons instead. Save 1 day.
- **Start with lot-level pricing only**, then add site-level overrides. The plan says this but the estimates do not reflect it — price the lot-level version at 1.5d and site overrides as a separate 1d task.
- **Use a table-based UI** (TanStack Table) for component entry, not individual forms. This scales to 50+ sites.

### R2: Build shared infrastructure in Phase 0, not Phase 6
Move these from Phase 6 into Phase 0:
- Toast notification system (install `sonner` or similar, 0.25d)
- Error handling pattern (error.tsx files, form error display)
- Data table component with sorting/filtering/pagination (reused in every module)
- Confirmation dialog component

This adds 0.5-1d to Phase 0 but saves time in every subsequent phase.

### R3: Simplify auth in MVP
Instead of per-entity ownership checks, consider: all authenticated users can see all data, but only the assigned user (or a manager/admin) can edit. This dramatically simplifies queries and middleware. You can add row-level filtering later.

### R4: Consider Drizzle over Prisma
For a prototype, Prisma's migration workflow and type safety are great. However, the quote builder will require complex queries (joining Quote -> QuoteLine -> QuoteLineComponent -> PriceComponentType -> Site -> Lot) and Prisma's nested includes can get verbose and slow. If query performance on the quote builder becomes an issue, be prepared to drop to raw SQL for the heaviest queries. Drizzle would give you more control here, but switching ORMs mid-project is worse than sticking with Prisma, so this is a "be aware" note, not a "change the plan" note.

### R5: Add a "technical debt" buffer
Add 2 days of explicit buffer at the end for: fixing bugs found during demo prep, handling edge cases discovered during testing, and the inevitable "this doesn't look right on the screen" iteration. Do not call it "polish" — call it "integration and bug fixing" so it does not get filled with new features.

### R6: Write Zod schemas before building forms
For each module, write the Zod validation schemas first (0.25d per module). These schemas drive: form validation, API input validation, CSV import validation, and TypeScript types. Having them upfront prevents the common pattern of building a form, realizing the validation is wrong, and rebuilding it.

---

## Estimate Reality Check

### Plan says: 21-29 days (4-6 weeks for a single developer)

### My assessment: 30-38 days (6-8 weeks for a single developer)

Breakdown of the delta:

| Source | Added Days |
|---|---|
| Phase 4 underestimate (quote builder) | +3-5d |
| Missing infrastructure tasks (loading states, error handling, pagination) | +3-4d |
| PDF generation iteration | +1-2d |
| Auth/middleware complexity | +0.5-1d |
| Kanban board | +0.5-1d |
| CSV import edge cases | +0.5-1d |
| Integration bugs and testing | +2d (buffer) |
| **Total delta** | **+10-14d** |

With scope cuts (drop version comparison, simplify auth, timebox kanban), you could bring it back to **26-32 days (5-7 weeks)**. That is the realistic range for a competent full-stack developer who knows the stack well.

### If you need to hit 4 weeks
Cut these in order:
1. Side-by-side quote version comparison (save 1d)
2. Kanban board — use table view only for pipeline (save 1d)
3. Contract PDF template — reuse proposal template with minor changes (save 0.5d)
4. Global search (Phase 6) — browser Cmd+F on list pages is sufficient for MVP (save 0.5d)
5. Lot-level pricing propagation — just do site-level pricing with copy/paste UX (save 0.5d)

That gets you to roughly 4.5 weeks, which is achievable if things go well.

### Bottom line
The plan is well-structured and the architecture is sound. The primary risk is Phase 4 (Pricing & Quoting) consuming 40-50% more time than estimated, and the secondary risk is the accumulation of small missing tasks (loading states, error handling, pagination) across all phases. With the scope adjustments above, this is a buildable prototype in 5-7 weeks.
