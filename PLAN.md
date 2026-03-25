# Implementation Plan — Lead-to-Contract MVP

## 1. Technical Architecture

### 1.1 Stack Decision: Next.js Full-Stack Monolith

Single Next.js 14+ (App Router) application combining frontend and API.

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack in one project, SSR for data-heavy pages, API routes for backend |
| Language | TypeScript (strict) | End-to-end type safety, shared types between frontend and API |
| Database | PostgreSQL 16 | Relational model for hierarchical data, JSON columns for flexible metadata |
| ORM | Prisma | Type-safe queries, migration management, seeding |
| UI | Tailwind CSS + shadcn/ui | Production-quality components, rapid prototyping, accessible |
| State | React Server Components + TanStack Query | Server-first data loading, client cache for interactive views |
| Auth | NextAuth.js v5 (Auth.js) | Built-in role support, credential provider for MVP, extensible |
| File Processing | Papa Parse (CSV) + SheetJS (Excel) | Client-side parsing for bulk imports |
| PDF | @react-pdf/renderer | Declarative PDF templates in React, no headless browser needed |
| Validation | Zod | Schema validation shared between client and server |
| Testing | Vitest + Playwright | Unit/integration + E2E |
| Containerization | Docker + Docker Compose | Local dev parity, easy deployment |

### 1.2 Project Structure

```
/
├── prisma/
│   ├── schema.prisma          # Data model
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Seed data (demo accounts, component types)
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Login, registration
│   │   ├── (dashboard)/       # Authenticated layout
│   │   │   ├── leads/         # Lead management pages
│   │   │   ├── accounts/      # Account & site management
│   │   │   ├── opportunities/ # Deal pipeline
│   │   │   ├── quotes/        # Quote builder
│   │   │   ├── contracts/     # Contract management
│   │   │   ├── admin/         # Admin configuration
│   │   │   └── page.tsx       # Dashboard home
│   │   └── api/               # API routes
│   │       ├── leads/
│   │       ├── accounts/
│   │       ├── sites/
│   │       ├── opportunities/
│   │       ├── quotes/
│   │       ├── contracts/
│   │       ├── import/        # CSV/Excel upload endpoints
│   │       └── admin/
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── leads/             # Lead-specific components
│   │   ├── accounts/          # Account & site components
│   │   ├── quotes/            # Quote builder components
│   │   ├── pipeline/          # Pipeline table view
│   │   └── shared/            # Layout, navigation, data tables
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # Auth configuration
│   │   ├── services/          # Service layer: business logic per domain
│   │   │   ├── lead.service.ts
│   │   │   ├── account.service.ts
│   │   │   ├── quote.service.ts
│   │   │   ├── contract.service.ts
│   │   │   └── notification.service.ts
│   │   ├── validators/        # Zod schemas per entity
│   │   ├── calculations/      # Price component math, margin calculations, mixed-unit engine
│   │   ├── export/            # CSV/Excel export for pipeline, quotes, site lists
│   │   ├── import/            # CSV/Excel parsing and validation logic
│   │   └── pdf/               # PDF templates for proposals
│   └── types/                 # Shared TypeScript types
├── docker-compose.yml
├── Dockerfile
└── package.json
```

### 1.3 Database Schema (Prisma)

Key design decisions:
- **Soft deletes** on all major entities (deletedAt timestamp)
- **Audit columns** (createdAt, updatedAt, createdBy, updatedBy) on all tables
- **UUID primary keys** for all entities
- **Enum types** for statuses, categories, and roles
- **Decimal types** for all financial/pricing fields (`Decimal @db.Decimal(12,6)` for per-kWh rates, `Decimal @db.Decimal(14,2)` for monetary totals) — prevents floating point rounding errors across large portfolios
- **Optimistic locking** via `updatedAt` check on Quote writes — prevents concurrent edit overwrites
- **Prisma middleware** for soft-delete filtering — automatically excludes deleted records from queries

Core tables:

```
User                    (id, email, name, role, passwordHash)
Lead                    (id, companyName, contactName, email, phone, estSites, estVolume, currentSupplier?, contractEndDate?, status, assignedToId, convertedToAccountId, notes)
Account                 (id, name, parentId?, industry, creditStatus, currentSupplier?, contractEndDate?, createdFromLeadId?)
Contact                 (id, accountId, name, email, phone, role, isPrimary)
Site                    (id, accountId, siteGroupId?, address, meterId, commodity, supplyCapacity, annualConsumption, peakPercentage?, voltageLevel?, connectionType?, contractEndDate?, status)
SiteGroup               (id, accountId, name, description)                    -- renamed from "Lot"
Opportunity             (id, accountId, stage, expectedCloseDate, contractDuration, estimatedValue, winLossReason, assignedToId)
OpportunitySite         (id, opportunityId, siteId)                           -- M:N join, validated: site.accountId must match opportunity.accountId
Quote                   (id, opportunityId, accountId, version, status, validUntil, currency, paymentTerms?, billingFrequency?, totalValue, totalMargin, showBreakdown, createdById, approvedById?, sourceQuoteId?)
QuoteLine               (id, quoteId, siteId, annualKwh, totalPrice, totalCost, margin)
QuoteLineComponent      (id, quoteLineId, componentTypeId, value, unit, annualAmount, isPassThrough)
PriceComponentType      (id, name, category, defaultUnit, defaultValue, isPassThrough, isRequired, displayOrder, isActive)
Contract                (id, quoteId, accountId, status, startDate, endDate, signedDate, documentUrl)
ActivityLog             (id, entityType, entityId, userId, type, content, createdAt)
Notification            (id, userId, type, title, message, entityType?, entityId?, isRead, createdAt)
```

Key schema changes from review feedback:
- **`currentSupplier` + `contractEndDate`** on Lead and Account — fundamental B2B energy qualification data
- **`currency`** on Quote (ISO 4217 code, e.g., "EUR") — avoids painful migration later
- **`accountId`** denormalized on Quote and Contract — simplifies queries, prevents broken lineage
- **`sourceQuoteId`** on Quote — enables "Clone quote" action
- **`Notification`** table — supports in-app approval notifications
- **`Lot` renamed to `SiteGroup`** — clearer for non-domain users
- **Site-account validation** on OpportunitySite — enforced at service layer

Key schema changes from end-user feedback:
- **`peakPercentage`** on Site — optional peak/off-peak consumption split; annual consumption alone is insufficient for accurate energy pricing
- **`voltageLevel`** (HV/MV/LV) on Site — network charges differ dramatically by voltage level
- **`connectionType`** on Site — affects which network charges apply
- **`contractEndDate`** on Site — individual sites within a portfolio may have different contract end dates
- **`paymentTerms`** on Quote (net14/net30/net60) — part of every commercial negotiation
- **`billingFrequency`** on Quote (monthly/quarterly) — customer expectation, carried to contract

---

## 2. Implementation Phases

### Phase 0: Foundation (4-5 days)

**Goal:** Runnable application with auth, navigation, database, and shared infrastructure.

| Task | Details | Est. |
|---|---|---|
| Project scaffolding | Next.js + TypeScript + Tailwind + shadcn/ui setup | 0.5d |
| Docker Compose | PostgreSQL + app container | 0.5d |
| Prisma schema | Full data model with Decimal types, initial migration, soft-delete middleware | 1d |
| Auth setup | NextAuth with credential provider, role-based middleware (`withAuth(role)` wrapper for Server Actions) | 1d |
| Service layer scaffolding | `src/lib/services/` pattern with base service, Zod validation approach per entity | 0.5d |
| App shell | Sidebar navigation (grouped sections: "My Actions" first, then entities), layout, role-based menu items, notification badge, role-based default landing page (reps → "My Action Items", managers → dashboard) | 0.5d |
| Shared UI infrastructure | Reusable data table component (sorting/filtering/pagination with active filter chips), toast notifications (sonner), confirmation dialogs, error boundaries (error.tsx), loading skeletons, empty states for all list pages, breadcrumb component | 1d |
| CSV/Excel export utility | Shared export function for data tables — CSV download button on all list pages. Uses Papa Parse for CSV generation | 0.5d |
| Auto-logging middleware | Service-layer middleware that auto-logs system events (status changes, entity creation, conversions, approvals) to ActivityLog — reps should not manually log what the system already knows | 0.5d |
| Seed data | Demo users (admin, manager, rep), price component types | 0.5d |

**Deliverable:** Login, navigate, empty pages for all modules. Database fully migrated. Shared components ready for all phases. CSV export and auto-logging available from day one.

> **Review change:** Auth estimate increased from 0.5d to 1d (role middleware complexity). Shared UI infrastructure moved here from Phase 6 — prevents repeated effort in every subsequent phase. Service layer established upfront.
> **End-user change:** CSV export utility and auto-logging middleware added to Phase 0 so all subsequent phases benefit immediately. "My team will not use a system they cannot get data out of" and "do not rely on reps to manually log what the system already knows."

---

### Phase 1: Lead Management (2-3 days)

**Goal:** Capture and manage leads through qualification.

| Task | Details | Est. |
|---|---|---|
| Lead service + CRUD API | Create, read, update, list with filtering/sorting via service layer | 0.5d |
| Lead list page | Data table with status filters, search, pagination | 0.5d |
| Lead form | Create/edit form with Zod validation. Fields include `currentSupplier` and `contractEndDate` | 0.5d |
| Lead detail page | Detail view with activity log | 0.5d |
| CSV import | Upload CSV, validate, preview, confirm import | 0.5d |
| Lead conversion | Convert lead to account + opportunity (multi-step: carries over currentSupplier/contractEndDate to account) | 0.5d |

**Deliverable:** Full lead lifecycle from capture to conversion. Contract end date captured from first touch.

---

### Phase 2: Account & Site Management (4-5 days)

**Goal:** Multi-site account management with bulk import — the core B2B complexity.

| Task | Details | Est. |
|---|---|---|
| Account service + CRUD API | Create, read, update, list. Fields include `currentSupplier`, `contractEndDate` | 0.5d |
| Account list page | Data table with search, contract end date column for renewal visibility | 0.5d |
| Account detail page | Tabs: overview, contacts, sites, site groups, opportunities. Unified activity timeline aggregating activities across child entities | 0.5d |
| Contact management | CRUD for contacts within account, role assignment | 0.5d |
| Site CRUD API | Create, read, update, list per account | 0.5d |
| Site form | Address, meter ID, commodity, capacity, consumption, peak/off-peak split (%), voltage level (HV/MV/LV), connection type, per-site contract end date | 0.5d |
| Site list | Data table within account, status indicators | 0.25d |
| Site Group management | Create/edit site groups, assign sites to groups | 0.5d |
| Bulk site import | CSV/Excel upload → parse → validate → preview with error highlighting → confirm. Batch size: 100 records. Max file: 5MB | 1d |
| Import validation | Meter ID uniqueness, required fields, data type checks, column name normalization, encoding handling, duplicate detection within file | 0.5d |

**Deliverable:** Accounts with contacts, sites, site groups, and bulk import. Contract end dates visible for pipeline planning.

---

### Phase 3: Opportunity / Pipeline (2 days)

**Goal:** Deal management with site selection and pipeline view.

| Task | Details | Est. |
|---|---|---|
| Opportunity service + CRUD API | Create, read, update with site selection. Validates site-account consistency | 0.5d |
| Opportunity list / pipeline | Collapsible stage-grouped table with summary headers showing count + total value per stage. Horizontal pipeline shape bar at top for visual health check. Filters by stage/rep/account with active filter chips. Stuck-deal highlighting (deals in same stage > X days) | 0.5d |
| Opportunity detail | Stage stepper (visual progression), selected sites, metadata, activity log. Contextual action: "Create Quote". Auto-calculate `estimatedValue` from latest quote total — never ask users to enter data the system already knows. Related entities as clickable links (account, all quotes) | 0.5d |
| Site selection | Multi-select sites from account for inclusion in deal | 0.25d |
| Pricing desk export | Download opportunity site list as CSV (meter ID, address, consumption, voltage level, peak %) for submission to internal pricing/wholesale team | 0.25d |
| Win/loss capture | Modal for structured win/loss reason on stage change | 0.25d |

**Deliverable:** Pipeline management with site-level deal composition.

> **Review change:** Kanban drag-and-drop replaced with table view + stage-grouped display. Saves ~1d. Contextual "Create Quote" action added per PM feedback.

---

### Phase 4: Pricing & Quoting (8-10 days)

**Goal:** Component-based quote builder — the most complex and highest-value module.

**Pre-coding: Quote Builder UX Design (0.5d)**

Before coding, define the quote builder interaction model:
- Spreadsheet-style grid: rows = sites, columns = price components
- Default values auto-populate and are visually distinct (grey) from user-entered values (black)
- Completeness indicator per site (green check / orange warning)
- Margin outlier highlighting (negative margin sites in red)
- Sort/filter sites within the builder by site group, address, or consumption
- Use TanStack Table for the grid — handles large datasets efficiently

| Task | Details | Est. |
|---|---|---|
| Quote builder UX design | Wireframe the grid layout, default cascade logic, interaction patterns | 0.5d |
| Price component type admin | CRUD for managing component types, categories, defaults | 0.5d |
| Quote service + CRUD API | Create quote from opportunity, versioning logic, clone quote logic, optimistic locking | 1d |
| Quote builder UI — site grid | TanStack Table with frozen left columns (site group, address, consumption, capacity) and pinned right column (total + margin %). Two-line column headers showing units (€/kWh, €/kW/mo). Paginated at 50 rows/page (not virtual scroll — avoids broken Cmd+F and scroll jumpiness). Completeness indicators per row. Tooltip on total cells showing calculation breakdown. "Back to Opportunity" link in header | 1d |
| Quote builder UI — component entry | Editable cells per component per site. Defaults in `text-muted-foreground` (grey) with tooltip "Default from [source]"; overrides in `text-foreground` (black) with `font-medium` + dot indicator. Empty cells: dash in `bg-orange-50`. Inline validation. **Bulk editing**: checkbox-select rows → sticky bottom action bar ("3 sites selected — [Set Energy Cost] [Set Margin] [Clear Overrides]") using popovers (not modals — keeps grid context visible). Completeness bar ("42 of 50 sites priced"). Filter toolbar above grid by site group, consumption range, address | 2.5d |
| Component CSV upload | Upload component values mapped to sites by meter ID. Column mapping UI, unmatched meter handling, preview before apply | 1.5d |
| Site group-level pricing | Set component values at site group level, auto-fill to member sites. Site-level overrides persist when group value changes | 0.5d |
| Mixed-unit calculation engine | Correct total calculation per unit type: per-kWh × consumption, per-kW/month × capacity × 12, per-meter/month × 12, fixed annual as-is. **Deal breaker if wrong — every quote will show incorrect numbers** | 0.5d |
| Calculated components | Margin as fixed value or % of specified base components (energy cost only, not pass-throughs). Prevent circular references. Allow specifying which components the margin % applies to | 0.5d |
| Quote summary | Totals per site, per site group, portfolio level. Margin display with outlier highlighting. Total contract value. Quote export to CSV/Excel | 0.5d |
| Quote versioning | Create new version (deep copy). Version history list with "view" action | 0.5d |
| Clone quote | Clone an existing quote to a different opportunity (copies all lines + components) | 0.25d |
| Approval workflow | Submit for approval → triggers notification to managers. Approve/reject with comments | 0.5d |
| Quote commercial terms | Payment terms (net 14/30/60) and billing frequency (monthly/quarterly) on quote. Carried to contract on acceptance | 0.25d |
| Quote status management | Status transitions with validation, `updatedAt` conflict detection. Support correction path: ability to revert submitted quote back to draft (prevents error accumulation) | 0.25d |

**Deliverable:** Full component-based quoting with CSV upload, site group/site pricing, versioning, cloning, and approval with notifications.

> **Review changes:** Estimate increased from 5-7d to 8-10d (all reviewers flagged underestimate). Side-by-side version comparison dropped. UX design step added before coding. Clone quote added. TanStack Table specified for the grid. Completeness indicators and margin outlier highlighting added. Notifications integrated into approval workflow.
> **End-user changes:** Mixed-unit calculation engine added (deal breaker). Bulk editing and completeness bar added to quote builder (adoption critical). Margin calculation fixed to use configurable base components, not total. Payment terms and billing frequency added. Quote status revert path added. Estimate increased from 8-10d to 9-11d.

---

### Phase 5: Proposal & Contract (2-3 days)

**Goal:** Generate PDF proposals, track contract lifecycle.

| Task | Details | Est. |
|---|---|---|
| Proposal PDF template | React-PDF template: header, account info, site schedule with component breakdown, totals. Paginated for large site lists | 1d |
| Breakdown vs. all-in | Two PDF variants based on `showBreakdown` flag. Two-step generation dialog: (1) confirm breakdown toggle, (2) generate. Inline preview on quote detail page | 0.5d |
| Proposal generation + storage | Generate PDF and store as immutable snapshot (filesystem, S3-ready interface). Subsequent downloads serve stored file. Re-generation only for draft quotes | 0.5d |
| Contract CRUD | Create from accepted quote, status tracking (Draft → Sent → Signed → Active), upload signed document | 0.5d |
| Contract detail page | View contract details, link to proposal PDF, upload signed version | 0.25d |

**Deliverable:** Downloadable proposal PDFs (stored as snapshots), contract lifecycle tracking with document upload.

> **Review changes:** Contract PDF template dropped — proposal PDF demonstrates the capability, contract PDF is structurally similar and can be added post-MVP. PDFs stored as immutable snapshots per architect recommendation (prevents audit trail issues when proposal is sent then quote data changes).

---

### Phase 6: Dashboard & Integration Testing (2-3 days)

**Goal:** Overview dashboard, notification UI, and end-to-end testing.

| Task | Details | Est. |
|---|---|---|
| Dashboard KPIs | Cards: open leads, active opportunities, pending quotes, signed contracts. Manager view shows per-rep breakdown | 0.5d |
| "My Action Items" view | Rep-focused view: leads needing follow-up, quotes expiring this week, opportunities with upcoming close dates, pending approvals. This is what reps open every morning — not aggregate KPIs | 0.5d |
| Pipeline chart | Deals by stage (bar or funnel chart). Filterable by assigned rep (manager view) | 0.5d |
| Renewals widget | "Contracts expiring soon" list based on `contractEndDate` across accounts and sites | 0.5d |
| Notification UI | Notification bell in header with badge count. Dropdown showing pending approvals and alerts. Mark as read. Visible on login without page refresh | 0.5d |
| Integration testing + bug fixing | End-to-end flow testing, edge case fixes, demo scenario walkthrough. **Test quote builder with 100+ sites** — if it lags, it's not ready | 1d |

**Deliverable:** Functional dashboard with renewals visibility, rep-level "My Action Items" view, in-app notifications, tested end-to-end with 100+ site quote builder performance validated.

> **Review changes:** Global search dropped (list-page filters are sufficient for MVP). Responsive polish dropped (demo on desktop). Conversion funnel replaced with renewals widget (higher user value per PM feedback). Error handling/toasts moved to Phase 0. Explicit integration testing buffer added per developer recommendation.
> **End-user changes:** "My Action Items" view added — reps need a daily action list, not just aggregate KPIs. Pipeline filterable by rep for manager view. Quote builder performance test with 100+ sites explicitly required (deal breaker). Estimate increased from 2-3d to 3-4d.

---

## 3. Phase Summary

| Phase | Module | Duration | Cumulative |
|---|---|---|---|
| 0 | Foundation + Shared Infrastructure | 5-6 days | 5-6 days |
| 1 | Lead Management | 2-3 days | 7-9 days |
| 2 | Account & Site Management | 4-5 days | 11-14 days |
| 3 | Opportunity / Pipeline | 2.25 days | 13-16 days |
| 4 | Pricing & Quoting | 9-11 days | 22-27 days |
| 5 | Proposal & Contract | 2-3 days | 24-30 days |
| 6 | Dashboard & Integration Testing | 3-4 days | 27-34 days |

**Total estimated: 6-7 weeks** for a single developer.

### Changes from peer reviews (Round 1)

| Change | Impact on Timeline | Source |
|---|---|---|
| Phase 0 expanded: service layer, shared UI, auth middleware | +1.5d | Developer, Architect |
| Phase 3 simplified: table view only, no kanban drag-and-drop | -1d | Developer, PM |
| Phase 4 expanded: realistic quote builder estimate, UX design step | +3d | All reviewers |
| Phase 5 reduced: no contract PDF (reuse proposal) | -1d | Developer, PM |
| Phase 6 adjusted: no global search, no responsive polish, add notifications | -0.5d | PM, Developer |
| Integration testing buffer added | +1d | Developer |
| **Round 1 net change** | **+3d** | |

### Changes from end-user review (Round 2)

| Change | Impact on Timeline | Source |
|---|---|---|
| Phase 0: CSV export utility added (shared across all modules) | +0.5d | End-user: "will not use system they can't get data out of" |
| Phase 0: Auto-logging middleware added | +0.5d | End-user: "don't rely on reps to manually log" |
| Phase 2: Site fields expanded (peak/off-peak, voltage, connection type, per-site contract end date) | +0d (form fields only) | End-user: "annual consumption alone cannot produce accurate energy cost" |
| Phase 3: Pricing desk export (site list CSV download) | +0.25d | End-user: "there is no concept of a pricing request or internal handoff" |
| Phase 4: Mixed-unit calculation engine (per-kWh, per-kW/month, per-meter/month) | +0.5d | End-user: **deal breaker** — "every quote will show incorrect numbers" |
| Phase 4: Bulk editing in quote builder, completeness bar | +0.5d | End-user: "without these, my team does not adopt the tool" |
| Phase 4: Payment terms + billing frequency on quote | +0.25d | End-user: "part of every commercial negotiation" |
| Phase 4: Quote status revert (submitted → draft correction path) | +0d (logic change) | End-user: "system will accumulate errors" |
| Phase 4: Margin % against configurable base components (not total) | +0d (logic change) | End-user: "margin will be overstated" |
| Phase 6: "My Action Items" view for reps | +0.5d | End-user: "not just aggregate KPIs" |
| Phase 6: Pipeline filterable by rep (manager view) | +0d (filter addition) | End-user: "I manage 6 reps" |
| Phase 6: Test quote builder with 100+ sites | +0d (part of testing) | End-user: **deal breaker** — "if the page freezes, it is not ready" |
| **Round 2 net change** | **+3d** | |

---

## 4. Key Technical Decisions

### 4.1 Server Components vs. Client Components

- **Server Components** (default): List pages, detail pages, dashboard — data fetching happens server-side
- **Client Components**: Quote builder (heavy interactivity), kanban board (drag-and-drop), CSV import preview (client-side parsing), forms with complex validation

### 4.2 API Design & Service Layer

- **Server Actions** for mutations (create, update, delete) — co-located with pages, type-safe
- **API Routes** for: file upload endpoints, PDF generation/download, external-facing endpoints (future)
- **No REST API layer in MVP** — Server Actions are sufficient and faster to develop
- **Service layer** (`src/lib/services/`) between Server Actions and Prisma:

```
Server Action / API Route
        |
   Service Layer  (business logic, validation, calculations)
        |
   Prisma Client  (data access)
```

This keeps business rules testable without Next.js context and makes wrapping in REST endpoints trivial when integrations are needed.

### 4.3 CSV/Excel Import Strategy

1. Client parses file using Papa Parse (CSV) or SheetJS (Excel)
2. Client validates against Zod schema and shows preview with error highlighting
3. User confirms import
4. Client sends parsed + validated records to server action in batches
5. Server performs database-level validation (uniqueness, foreign keys) and inserts

This keeps file parsing off the server and gives users immediate feedback.

### 4.4 PDF Generation & Storage

- Use `@react-pdf/renderer` for declarative PDF templates
- **Immutable snapshots:** When a proposal is generated for delivery (quote status → "Sent"), store the PDF file and link to the quote version. Subsequent downloads serve the stored file
- Re-generation only available for draft-status quotes
- Storage: local filesystem in MVP with an abstract storage interface (swap to S3 for production)
- Signed contracts stored as uploaded files via the same storage interface

### 4.5 Quote Versioning

- New version = deep copy of all QuoteLines and QuoteLineComponents
- Previous versions are immutable (status set to "Superseded")
- Only the latest version can be edited/approved

---

## 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Quote builder UI complexity | Phase 4 could balloon | UX designed before coding. TanStack Table for the grid. Start with site group-level, add overrides incrementally |
| CSV import edge cases | Unpredictable user data | Column name normalization, encoding handling, per-row error reporting. Max 5MB file size. Batch inserts of 100 |
| PDF layout for large sites | 200+ sites in a proposal | Paginated table in PDF template. Test with 1, 5, 50, 200 sites early in Phase 5 |
| Scope creep in Phase 6 | Testing buffer consumed by features | Phase 6 is strictly dashboard + notifications + bug fixing. No new features |
| Financial precision | Rounding errors compound across sites | Decimal types enforced from schema creation. All calculations in service layer, not UI |
| Concurrent quote editing | Two users overwrite each other | Optimistic locking via `updatedAt` check. Conflict error with "modified by someone else" message |
| Quote-to-site data drift | Site consumption updated after quote created | Quotes use deep-copied `annualKwh` in QuoteLine — frozen at quote creation time |
| Mixed-unit calculation errors | Per-kW/month and per-meter/month totals wrong if calculated like per-kWh | Dedicated calculation engine with unit-aware logic. Tested with real pricing data before demo. **End-user flagged as deal breaker** |
| Quote builder performance at scale | 100+ sites × 6 components = 600+ cells | TanStack Table with **pagination at 50 rows/page** (not virtual scroll — avoids broken Cmd+F and scroll jumpiness per UX review). Test with 200 sites in Phase 6. Summary totals shown across all pages, not just visible page |
| User adoption — data export | Reps will not enter data into a system they cannot get data out of | CSV export on every list page (pipeline, quotes, sites) from Phase 0 |
| Empty activity timelines | Reps will not manually log activities → system appears unused | Auto-log all system events; manual notes are supplementary, not primary |
| **UX Risk 1: Quote builder vs. Excel** | Users unconsciously compare the grid to Excel. The moment they think "I could do this faster in Excel," they switch and never come back | (1) Bulk editing (select + apply) must work flawlessly — this is the feature that keeps users in-tool. (2) CSV import for component values must be smooth (preview, column mapping, error display). (3) Do NOT replicate Excel behaviors (cell copy/paste, drag-fill) — lean into what a web app does better: instant totals, margin highlighting, completeness tracking, one-click proposal generation. (4) Two-line column headers showing units (€/kWh, €/kW/mo) to prevent confusion. (5) Tooltip on total cells showing calculation breakdown to build trust in the engine |
| **UX Risk 2: System creates more work than it reduces** | If the system requires more data entry than Excel + email without proportional time savings, it will be abandoned | (1) Auto-log every system event rigorously — activity timeline has content even if rep never types a note. (2) Auto-calculate `Opportunity.estimatedValue` from latest quote total — never ask users to enter data the system already knows. (3) Make optional fields genuinely optional in UI — collapse into "Additional details" section, hide when empty. (4) "My Action Items" is the key value-delivery moment: system tells the rep what to do today, computed from data they already entered |
| **UX Risk 3: Navigation dead ends and lost context** | Deep data model (Account → Opportunity → Quote → QuoteLine) causes users to lose context. Browser back button breaks with server-rendered pages and query params | (1) Breadcrumbs on every detail page — **non-negotiable**. (2) Related entities shown as clickable links on every detail page (quote shows opportunity + account, opportunity shows all quotes, account shows all opportunities). (3) "Back to Opportunity" link in quote builder header — never orphan the user. (4) After destructive navigation (submit quote, convert lead), redirect to sensible location with toast confirming action. (5) Role-based default landing page: reps → "My Action Items", managers → dashboard |

### 5.1 UX Quick Wins Checklist

Low-effort, high-impact UX improvements to implement throughout all phases (from UX review):

| # | Quick Win | Phase | Effort | Impact |
|---|---|---|---|---|
| 1 | Breadcrumbs on all detail pages | All | 2h (shared component in Phase 0) | Prevents navigation confusion — **non-negotiable** |
| 2 | Auto-calculate `Opportunity.estimatedValue` from latest quote | Phase 3 | 1h | Eliminates a field nobody maintains |
| 3 | Empty states on all list pages ("No leads yet. Create your first lead →") | All | 2h (shared component in Phase 0) | System feels polished, not broken |
| 4 | Two-line column headers in quote builder (name + unit) | Phase 4 | 1h | Prevents unit confusion — addresses deal breaker |
| 5 | Skeleton loading states on all data tables | Phase 0 | 2h (part of shared data table component) | Prevents layout shift, feels fast |
| 6 | Active filter chips below filter row | Phase 0 | 1h (part of shared data table component) | Users forget which filters are active |
| 7 | Stage stepper on opportunity detail | Phase 3 | 3h | Visual progression, replaces kanban need |
| 8 | Tooltip on quote total cells showing calculation breakdown | Phase 4 | 2h | Builds trust in the calculation engine |
| 9 | Sticky bottom action bar for bulk selection in quote builder | Phase 4 | 2h | Core usability for the main screen |
| 10 | Role-based default landing page (reps → actions, managers → dashboard) | Phase 0 | 1h | Right content on login, no extra clicks |

### 5.2 Data Table Consistency Rules

All data tables across all modules must follow these patterns (from UX review):

1. Search input: top-left, always visible, placeholder "Search [entity]..."
2. Filters: below search bar, using shadcn/ui Select components
3. Active filter chips: below filters, showing active filters with × to remove
4. Export button: top-right, "Export CSV" with download icon
5. Pagination: bottom, showing "1-50 of 147 sites", page size selector (25/50/100)
6. Row click: navigates to detail page (entire row clickable, not just a link column)
7. Empty state: illustration + message + primary action button
8. Loading state: skeleton rows matching the table structure
9. Column headers: left-aligned text, sortable columns have sort indicator
10. Optional fields: hidden when empty in detail views, collapsed into "Additional details"
11. Notification badge: 60-second polling, capped at "9+", 4 types only (approval requested, approval granted, quote expiring, stage change)

---

## 6. Seed Data / Demo Scenario

Seed the database with enough data to make the system look like a real team has been using it for a month:

- **4 users**: admin, sales manager, 2 sales reps (to demonstrate per-rep filtering and "My Action Items")
- **6 default price component types**: Energy Cost, Network Charges, Energy Tax, Renewable Levy, Supplier Margin, Green Certificates
- **8-10 leads** at various stages (New, Contacted, Qualified, Disqualified, Converted) with different contract end dates
- **4-5 accounts**: mix of small (3-5 sites) and large (30-50 sites in 2-3 site groups), with `currentSupplier`, `contractEndDate`, voltage levels, and peak/off-peak splits populated. At least one account with 100+ sites to test quote builder performance
- **8-12 opportunities** spread across all pipeline stages, assigned to different reps
- **3-4 quotes**: one draft (being built), one pending approval (below margin threshold), one approved and sent, one accepted
- **1-2 signed contracts** with proposal PDFs stored
- **Activity log entries** across entities so timeline views have content
- **1 pending notification** for the sales manager (quote awaiting approval)

### Recommended Demo Script (12-15 minutes)

1. **"My Action Items"** (as Sales Rep) — "here's what I need to do today: 3 leads to follow up, 1 quote expiring Friday, 1 close date this week"
2. **Dashboard** (switch to Sales Manager) — pipeline with 10+ deals, KPIs per rep, "renewals coming up" widget. Filter pipeline by rep
3. **Drill into a new lead** — show qualification, contract end date, current supplier, convert to account + opportunity
4. **Show multi-site account** — the 50-site account with 3 site groups, imported via CSV. Show voltage levels, peak/off-peak splits
5. **Pricing desk workflow** — export site list CSV from opportunity, explain "pricing desk returns energy costs", import energy costs via CSV upload
6. **Build a quote** — show the component pricing grid, import network charges via CSV, set margin at site group level, override 3 sites. Show completeness bar, bulk-edit margin on 10 sites
7. **Show margin calculation** — "we are at 8% margin across the portfolio, but these 3 sites are below threshold" (highlighted in red). Show mixed-unit totals are correct (per-kWh + per-kW/month + per-meter/month)
8. **Submit for approval** — notification appears for manager. Switch to manager view, approve the quote
9. **Generate proposal PDF** — download, show the all-in vs. breakdown versions
10. **Export quote to CSV** — demonstrate data portability
11. **Create contract** — show status tracking, payment terms, link to proposal
12. **Back to dashboard** — deal moves to Won, pipeline updates. Show auto-logged activity timeline
