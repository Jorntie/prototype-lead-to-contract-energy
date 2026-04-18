# UX Review: Lead-to-Contract MVP

**Reviewer:** Senior UX Designer (B2B enterprise / data-heavy platforms)
**Date:** 2026-03-18
**Documents reviewed:** PLAN.md, ANALYSIS.md, REVIEW-ENDUSER.md
**Review round:** 3 (first UX-specific review)

---

## 1. Quote Builder UX

This is the screen that determines adoption. The end-user review makes this unambiguous: "Get the quote builder wrong and nothing else matters." Below are specific design recommendations achievable with TanStack Table + shadcn/ui.

### 1.1 Grid Layout

The grid should use a frozen-column pattern. The first 3-4 columns (site group, address/meter ID, annual consumption, supply capacity) are pinned left and non-editable in this context. The remaining columns are the 6 price components, scrollable horizontally. A final pinned-right column shows per-site total and margin.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Completeness: 42/50 sites priced ████████████░░░░░ 84%]  [Filter ▾] [Sort ▾] │
├──────┬──────────┬────────┬────────╥──────────┬──────────┬─────────╥────────────┤
│  ☐   │ Site     │ Annual │ Cap.   ║ Energy   │ Network  │ Tax ... ║ Total │ M% │
│      │          │ kWh    │ kW     ║ €/kWh    │ €/kW/mo  │ €/kWh   ║   €   │    │
├──────┼──────────┼────────┼────────╫──────────┼──────────┼─────────╫────────────┤
│  ☐   │ Site A   │ 120000 │  45    ║  0.0821  │  3.45    │ 0.0350  ║ 14,280│8.2%│
│  ☑   │ Site B   │  85000 │  30    ║  0.0821  │  ___     │ 0.0350  ║  ----  │--- │
│  ☐   │ Site C   │ 200000 │  80    ║  0.0795  │  4.10    │ 0.0350  ║ 23,400│2.1%│
│      │          │        │        ║  ▲black  │          │  ▲grey  ║       │▲red│
└──────┴──────────┴────────┴────────╨──────────┴──────────┴─────────╨────────────┘
│ [With selected (1): Set value... | Set margin... | Clear overrides]            │
└────────────────────────────────────────────────────────────────────────────────-┘
```

### 1.2 Defaults vs. Overrides — Visual Treatment

Use two visual signals, not color alone (accessibility):

- **Default values (inherited from component type or site group):** Rendered in `text-muted-foreground` (grey) with normal font weight. On hover, show a tooltip: "Default from [Site Group: Warehouses]" or "Default from component type."
- **User-overridden values:** Rendered in `text-foreground` (black/dark) with `font-medium`. A small dot indicator or subtle left-border on the cell distinguishes overrides at a glance.
- **Empty/missing values:** Show a dash `—` in `text-muted-foreground`. The cell background gets a faint warm tint (`bg-orange-50`) to signal incompleteness without being aggressive.

This is achievable with TanStack Table's `cell` render function and conditional Tailwind classes. No custom rendering library needed.

### 1.3 Bulk Editing

Use the **checkbox-select + action bar** pattern (the same pattern Gmail, Linear, and Notion use). It is the most learnable pattern for power users and already supported by shadcn/ui's data table example.

**Interaction flow:**
1. User checks rows via the left checkbox column. A sticky bottom bar appears: "3 sites selected — [Set Energy Cost] [Set Margin] [Clear Overrides] [Deselect All]"
2. Clicking "Set Energy Cost" opens a popover (not a modal — keeps context visible) with a single input field and "Apply" button.
3. The value applies to all selected rows. Cells change from grey to black, confirming the override.

**"Select all in group" shortcut:** When sites are grouped by site group, clicking the group header checkbox selects all sites in that group. This handles the most common bulk action ("set margin for all warehouses").

Do NOT implement inline multi-select editing (clicking across cells to select a range). It is expensive to build, fragile, and conflicts with TanStack Table's row model. The checkbox + action bar is faster to implement and more reliable.

### 1.4 Completeness Indicator

Two levels:

- **Global progress bar** at the top of the builder (as shown in the wireframe above): "42 of 50 sites fully priced" with a shadcn/ui `Progress` component. "Fully priced" = all required components have a value (default or override). This bar should also show the count of sites with margin warnings.
- **Per-row indicator:** A small icon in the first column. Green check (`CheckCircle2`) = all components filled. Orange warning triangle (`AlertTriangle`) = missing required components. This is a single icon, not a per-cell indicator — keeps visual noise low.

Do NOT add per-cell completeness markers. The per-row icon combined with the empty-cell tint is sufficient. Per-cell markers on a 300-cell grid create visual chaos.

### 1.5 Margin Outlier Highlighting

Use row-level highlighting, not cell-level:

- **Negative margin:** Full row gets `bg-red-50` background. The margin cell shows the value in `text-destructive` (red). This is the "stop and look" signal.
- **Below threshold (e.g., <5%):** Full row gets `bg-amber-50` background. Margin cell in `text-amber-600`. This is the "heads up" signal.
- **Healthy margin:** No highlight. Margin cell in default color.

Add a filter toggle at the top: "Show only: [All] [Below threshold] [Negative]" — lets the user focus on problem sites without scanning the entire grid.

### 1.6 Sort/Filter Within the Builder

Place filter controls in a toolbar row above the grid (not in a sidebar — screen width is precious with 8+ columns):

```
[Site Group ▾ All]  [Consumption ▾]  [Status ▾ Incomplete]  [Search sites...]  [Clear filters]
```

- **Site Group filter:** Dropdown with multiselect. Most common filter based on end-user workflow.
- **Consumption sort:** Click column header (ascending/descending). Standard TanStack Table behavior.
- **Status filter:** "All / Complete / Incomplete / Below margin" — the quickest way to find sites that need attention.
- **Search:** Free text filtering on address or meter ID.

These are all native TanStack Table column filter capabilities. No custom filter engine needed.

### 1.7 Virtual Scrolling for 100+ Sites

TanStack Table with `@tanstack/react-virtual` handles this well, but there are two UX pitfalls to address:

- **Scrollbar position feedback:** When virtualized, users lose their sense of position in the list. Add a small floating indicator that appears during scroll: "Sites 45-65 of 120." This can be a simple `position: sticky` element or a fade-in badge near the scrollbar.
- **Keyboard navigation:** Ensure Tab/Enter moves between editable cells predictably. With virtualization, off-screen cells do not exist in the DOM. TanStack Virtual handles this, but test it explicitly — if a user tabs past the visible rows and nothing happens, it will feel broken.
- **Performance threshold:** If virtualization introduces visible rendering flicker on slower machines, fall back to paginated mode (50 sites per page with "Load more" or page controls). Better to paginate cleanly than to have a janky virtual scroll. Build the paginated fallback into the component from day one — it is 2 hours of work and prevents a last-minute scramble in Phase 6 testing.

### 1.8 Mixed-Unit Display

The column header MUST show the unit for each component. Without this, users will not know what they are entering.

```
│ Energy Cost  │ Network     │ Energy Tax  │ Capacity    │ Meter Fee    │
│ €/kWh        │ €/kW/month  │ €/kWh       │ €/kW/month  │ €/meter/mo   │
```

Use a two-line column header: component name on line 1, unit on line 2 in `text-muted-foreground` and `text-xs`. This is straightforward with TanStack Table's `header` render function.

In the per-site total column and the portfolio summary, show a tooltip or expandable breakdown that explains how the total was derived: "Energy: 0.082 x 120,000 kWh = 9,840 | Network: 3.45 x 45 kW x 12 = 1,863 | ..." — this builds trust in the calculation engine and directly addresses the end-user's deal-breaker concern about incorrect totals.

---

## 2. "My Action Items" View

This should be the **default landing page** for Sales Reps (not the KPI dashboard). The dashboard with KPIs should be the default for Sales Managers.

### Recommended Layout

A single-column list grouped by urgency category, not a card grid. Cards waste space when each item is a single line of actionable information. Use shadcn/ui's grouped list or a simple table with section headers.

```
┌─────────────────────────────────────────────────────────────────┐
│  Good morning, Anna.                            Wed 18 March   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OVERDUE (2)                                              ▼     │
│  ● Follow up lead: Bakkerij van Dijk        3 days overdue     │
│  ● Close date passed: Retail NL Q3 deal     1 day overdue      │
│                                                                 │
│  THIS WEEK (4)                                            ▼     │
│  ● Quote expiring Fri: LogiCorp 45-site     expires in 3d      │
│  ● Approval pending: GreenRetail quote v2   submitted yesterday │
│  ● Follow up lead: TechPark Amsterdam       due Thursday        │
│  ● Expected close: MegaStore renewal        due Friday          │
│                                                                 │
│  COMING UP (3)                                            ▼     │
│  ● Contract renewal: FoodCo portfolio       expires 15 Apr     │
│  ● Follow up lead: DataCenter Eindhoven     due next Monday     │
│  ● Quote expires: IndustriNL 12-site        expires 28 Mar     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Three groups:** Overdue / This Week / Coming Up (next 14 days). Simple, no configuration needed. The categories are computed from dates, not manually assigned.
- **Each item is a clickable row** that navigates directly to the relevant entity (lead detail, quote detail, opportunity detail). One click to action.
- **Left icon indicates entity type:** Small colored dot or icon — lead (blue), quote (purple), opportunity (green), approval (orange). Keeps it scannable without labels on every row.
- **No dismiss/snooze in MVP.** Items disappear when the underlying action is taken (lead contacted, quote extended, deal closed). This avoids building a separate task-tracking system.
- **Manager variant:** Same layout but with a top-level toggle: "My items / My team" — the team view groups by rep instead of by urgency.

This view should query across leads (no activity in X days + assigned to me), quotes (validUntil within 14 days), opportunities (expectedCloseDate within 14 days), and notifications (pending approvals). It is a read-only aggregation view, not a new data model.

---

## 3. Navigation & Information Architecture

### Current Structure (Entity-Based)

The sidebar organizes by entity: Leads, Accounts, Opportunities, Quotes, Contracts, Admin. This is the standard CRM pattern and it is **correct for this MVP**. Here is why:

- Power users in B2B sales navigate by entity because they think in terms of "I need to find account X" or "show me all my quotes." They do not think in terms of "I am in the quoting workflow."
- Workflow-based navigation (e.g., "New Deal Wizard" combining lead + account + opportunity creation) is useful for onboarding but frustrating for experienced users who want direct access.
- Entity-based navigation maps 1:1 to the data model, making URL structure predictable (`/quotes/[id]`, `/accounts/[id]`).

### Recommended Adjustments

1. **Add "My Action Items" as the first sidebar item**, above Leads. It is the daily entry point. Use a distinct icon (e.g., `ListChecks` from Lucide) and show a badge count of overdue items.

2. **Group sidebar items visually** using subtle section dividers (not headings — too heavy for 6 items):

```
┌──────────────────┐
│  ⊡ My Actions (3)│  ← personal entry point
│──────────────────│
│  ◉ Dashboard     │  ← overview / analytics
│──────────────────│
│  ○ Leads         │
│  ○ Accounts      │  ← entity navigation
│  ○ Opportunities │
│  ○ Quotes        │
│  ○ Contracts     │
│──────────────────│
│  ⚙ Admin         │  ← configuration (admin/manager only)
└──────────────────┘
```

3. **Breadcrumbs on every detail page** showing the entity hierarchy: `Accounts / LogiCorp / Opportunities / Q3 Renewal / Quote v2`. This is critical because the data model has deep nesting (Account → Opportunity → Quote → QuoteLine) and users will get lost without breadcrumbs. Use shadcn/ui's `Breadcrumb` component.

4. **Do NOT add a global search in MVP** (confirmed cut in the plan). Instead, ensure every list page has a prominent search input at the top of the table. Consistent placement across all modules matters more than a single global search.

---

## 4. Data Table Patterns

Every module uses data tables. Inconsistency between them will feel unpolished and increase cognitive load. Define these patterns once in Phase 0 and enforce them.

### Standard Data Table Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Leads                                          [+ New Lead]   │
├─────────────────────────────────────────────────────────────────┤
│  [Search leads...]   [Status ▾] [Assigned ▾]  [Export CSV ↓]  │
├─────────────────────────────────────────────────────────────────┤
│  Company ▲    │ Contact  │ Status    │ Contract End │ Assigned  │
│───────────────┼──────────┼───────────┼──────────────┼───────────│
│  Bakkerij vD  │ Jan D.   │ ● New     │ 2026-09-01   │ Anna      │
│  LogiCorp     │ Piet S.  │ ● Qual.   │ 2026-06-15   │ Tom       │
│  ...          │          │           │              │           │
├─────────────────────────────────────────────────────────────────┤
│  Showing 1-25 of 42                        [◀ 1  2 ▶]         │
└─────────────────────────────────────────────────────────────────┘
```

### Mandatory Consistency Rules

| Element | Pattern | Rationale |
|---|---|---|
| **Search** | Left-aligned above table, full-width or 300px. Placeholder: "Search [entity]..." | Consistent scan position |
| **Filters** | Inline with search row, as dropdown buttons (`[Status ▾]`). NOT in a sidebar. Max 3 visible filters; additional behind a "More filters" dropdown | Saves vertical space |
| **Active filter indicators** | Show as removable chips below the filter row when active: `Status: Qualified ×` | Users forget which filters are on |
| **Primary action** | Top-right corner: `[+ New Entity]` button. Always same position | Muscle memory |
| **Export** | Right-aligned in the filter row, icon button with tooltip: "Export CSV." Same position on every table | End-user deal breaker — make it always findable |
| **Column sorting** | Click header to toggle asc/desc. Small arrow indicator. Only one column sorted at a time (MVP) | Standard expectation |
| **Pagination** | Bottom-right. Show "1-25 of 42." Page size fixed at 25 for MVP (no page-size selector — premature complexity) | Consistent footer |
| **Row click** | Entire row is clickable, navigates to detail page. Cursor changes to pointer | Reduces clicks vs. requiring a "View" button |
| **Empty state** | Centered illustration or icon with text: "No leads yet. Create your first lead." + primary action button | Empty tables feel broken without this |
| **Loading state** | Skeleton rows (shadcn/ui `Skeleton`) matching the column layout. 5 skeleton rows | Prevents layout shift |

### Column Configuration

Do NOT build a column visibility/reorder feature in MVP. It adds complexity (persistence, defaults, reset) with low return for a prototype. Instead, choose the right default columns per entity and ship those. If a column does not earn its place, remove it.

---

## 5. Pipeline View

The kanban cut is understandable for timeline reasons, but a flat table sorted by stage does not communicate pipeline health. Here is a middle ground that is achievable in under a day of extra work.

### Stage-Grouped Table with Summary Row

```
┌──────────────────────────────────────────────────────────────────┐
│  Pipeline                             [Rep ▾ All] [Export CSV]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ DISCOVERY (3 deals · €245,000) ─────────────────────────┐   │
│  │  MegaStore renewal   │ 45 sites │ €120K │ Close: Apr 15  │   │
│  │  TechPark portfolio  │ 12 sites │ €85K  │ Close: May 01  │   │
│  │  DataCenter bid      │  3 sites │ €40K  │ Close: Apr 30  │   │
│  └──────────────────────────────────────────────────────────-┘   │
│                                                                  │
│  ┌─ QUOTING (2 deals · €310,000) ───────────────────────────┐   │
│  │  LogiCorp 45-site    │ 45 sites │ €210K │ Close: Mar 28  │   │
│  │  RetailNL shops      │ 22 sites │ €100K │ Close: Apr 10  │   │
│  └──────────────────────────────────────────────────────────-┘   │
│                                                                  │
│  ┌─ NEGOTIATION (4 deals · €580,000) ── ⚠ bottleneck ──────┐   │
│  │  ...                                                      │   │
│  └──────────────────────────────────────────────────────────-┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key enhancements over a flat table:**

1. **Collapsible stage sections** with a summary header showing deal count and total value. Uses shadcn/ui `Collapsible` or simply grouped rows with a section header. Users can collapse stages they are not interested in (e.g., collapse "Won" and "Lost" to focus on active deals).

2. **Stage health indicators:** If any stage has more deals than the adjacent downstream stage by a factor of 2x or more, show a subtle "bottleneck" warning on the section header. This gives the spatial/visual sense of pipeline health without needing a kanban. Implementation: a single conditional badge — trivial logic.

3. **Horizontal summary bar** at the very top (optional, one extra component):

```
Discovery(3) ████  Quoting(2) ███  Negotiation(4) ██████  Proposal(1) █  Won(2) ██
```

A simple segmented horizontal bar chart where segment width is proportional to value (not count). This gives the at-a-glance pipeline shape. Implementable with plain `div` elements and Tailwind width utilities — no charting library needed.

4. **"Stuck deals" highlight:** Within each stage group, any deal where `expectedCloseDate` is in the past should be flagged with a red dot or `text-destructive` on the date. This surfaces stale deals without requiring a separate report.

Do NOT build drag-and-drop stage changes. The endpoint investment is not worth it for MVP. Instead, stage changes happen on the opportunity detail page via a clear stage-progression UI (see below).

### Stage Progression on Opportunity Detail

Use a **horizontal stepper** at the top of the opportunity detail page showing all stages. The current stage is highlighted. Completed stages are filled. A "Move to [next stage]" button advances the deal. Moving backward is allowed (via a dropdown on any previous stage). Triggering "Lost" at any point opens the win/loss reason modal.

```
◉ Discovery ──── ◉ Quoting ──── ○ Proposal ──── ○ Negotiation ──── ○ Won
                  ▲ current                                         [Move to Proposal ▸]
```

This is a common pattern in CRMs and can be built with shadcn/ui `Steps` or a custom component using Tailwind flexbox. It gives the visual progression that the end-user misses from the kanban cut.

---

## 6. Proposal PDF

### Generation Flow

Do NOT auto-generate the PDF. Use a two-step flow:

1. **"Generate Proposal" button** on the quote detail page (only visible when quote is Approved). Clicking it opens a dialog:
   - Preview toggle: "Show component breakdown" / "Show all-in price" (maps to `showBreakdown` flag)
   - Payment terms and billing frequency displayed for confirmation (already set on the quote)
   - "Generate PDF" button

2. **After generation, show the PDF inline** (embedded viewer or at minimum a download link) on the quote detail page in a "Proposal" section. No navigation away from the quote — the PDF is an artifact of the quote, not a separate entity.

Why a dialog and not a separate page: The proposal is generated from an already-complete quote. The only decision point is breakdown vs. all-in. A dialog keeps the user in context.

### Post-Generation UX

- Once generated, the PDF is stored (immutable snapshot per the plan). Show it as a downloadable item on the quote detail: `Proposal_LogiCorp_v2_2026-03-18.pdf [Download] [Regenerate]`
- "Regenerate" is only available while the quote is still in Draft/Approved status (before Sent). After the quote is marked as Sent, the PDF is locked. Show a disabled "Regenerate" button with tooltip: "Proposal is locked after quote is sent."

### Template Selection

Do NOT build template selection for MVP. One template is sufficient. If the single template is well-designed (clean header with placeholder for company logo, professional typography, proper site schedule table), it covers the demo requirement. Template selection adds configuration UI, storage, and switching logic — at least 2 days of work for a feature nobody is asking for yet.

---

## 7. Notification System

### Bell + Dropdown Pattern

This is a well-established pattern. For MVP, keep it simple:

```
                                        🔔 (3)
                                        ┌────────────────────────────────────┐
                                        │ Notifications                      │
                                        ├────────────────────────────────────┤
                                        │ ● Quote approval requested         │
                                        │   LogiCorp 45-site v2 · 2h ago    │
                                        │                                    │
                                        │ ● Quote approved                   │
                                        │   RetailNL shops v1 · yesterday   │
                                        │                                    │
                                        │ ○ Lead assigned to you             │
                                        │   TechPark Amsterdam · 2 days ago  │
                                        ├────────────────────────────────────┤
                                        │ Mark all as read                   │
                                        └────────────────────────────────────┘
```

### Recommendations

1. **Badge count** on the bell icon showing unread count. Use shadcn/ui `Badge` with `variant="destructive"` (red). Cap the displayed number at "9+" to avoid layout issues.

2. **Dropdown, not a page.** Max 5 most recent notifications in the dropdown. If more than 5, show a "View all" link at the bottom. For MVP, the "View all" page can simply be a full-page list with the same notification items — no complex notification center needed.

3. **Each notification is clickable** and navigates to the relevant entity (the quote awaiting approval, the assigned lead). After clicking, the notification is marked as read.

4. **Polling, not WebSockets.** For MVP, poll for new notifications every 60 seconds using TanStack Query's `refetchInterval`. WebSockets add infrastructure complexity. 60-second polling is acceptable for approval notifications — nobody expects sub-second delivery for an internal approval workflow.

5. **Notification types for MVP** (keep the list short):
   - Quote submitted for approval (to manager)
   - Quote approved/rejected (to submitter)
   - Lead assigned (to rep)
   - Quote expiring in 3 days (to quote owner)

Do NOT build notification preferences, email notifications, or push notifications in MVP. The in-app bell covers the approval workflow, which is the primary use case.

---

## 8. Top 3 UX Risks That Could Kill Adoption

### Risk 1: Quote Builder Feels Like a Spreadsheet Without the Spreadsheet's Power

The quote builder is a data grid, and users will unconsciously compare it to Excel. Excel has Ctrl+C/V, fill-down, undo, and formula bars. The quote builder has none of those. When users hit the first moment where they think "I could do this faster in Excel," they will switch — and never come back.

**Mitigation:**
- Bulk editing (select + apply) must work flawlessly. This is the feature that keeps users in the tool instead of alt-tabbing to Excel. Prioritize this over any other quote builder feature.
- The CSV import for component values (upload network charges by meter ID) must be smooth — preview, column mapping, error display. This is how pricing desks already work. If the import is clunky, the pricing desk will email an Excel and the rep will manually transcribe values.
- Do NOT try to replicate Excel behaviors (cell-level copy/paste, drag-fill). You will not match Excel and the attempt will feel broken. Instead, lean into what a web app does better: instant totals, margin highlighting, completeness tracking, and one-click proposal generation. Those are the things Excel cannot do.

### Risk 2: The System Creates Work Without Reducing It

The end-user review warns repeatedly: reps will not manually log activities, will not maintain estimated values, will not fill in optional fields. If the system requires more data entry than Excel + email without providing proportional time savings, it will be abandoned.

**Mitigation:**
- Auto-log every system event (already planned — enforce this rigorously). The activity timeline should have content even if a rep never types a single note.
- Auto-calculate `estimatedValue` on Opportunity from the latest quote total. Never ask users to enter data the system already knows.
- Make optional fields genuinely optional in the UI. Do not show empty optional fields prominently — collapse them into an "Additional details" section or show them as inline-editable display fields (click to edit, hidden when empty). This prevents the form from feeling overwhelming and eliminates the guilt of empty fields.
- The "My Action Items" view is the key value-delivery moment: the system tells the rep what to do today, computed from data they already entered. If this view is accurate and useful, it justifies the data entry burden.

### Risk 3: Navigation Dead Ends and Lost Context

The data model is deep: Account → Opportunity → Quote → QuoteLine. Users will navigate down this chain and lose track of where they are, especially when moving between related entities (e.g., from a quote back to the opportunity, then to a different quote on the same opportunity). Without clear breadcrumbs and contextual links, users will rely on the browser back button, which breaks with server-rendered pages and query parameters.

**Mitigation:**
- Breadcrumbs on every detail page (mentioned in section 3). This is non-negotiable.
- On every detail page, show related entities as links: the quote detail page should show the opportunity name (clickable), the account name (clickable), and the list of other quote versions (clickable). The opportunity detail should show all its quotes. The account detail should show all its opportunities.
- The "Create Quote" action on an opportunity should navigate to the new quote builder AND include a "Back to Opportunity" link in the quote builder header. Do not orphan the user in the quote builder.
- After a destructive navigation (submitting a quote, converting a lead), redirect to a sensible location with a toast confirming the action. For quote submission: redirect to the quote detail page with a success toast. For lead conversion: redirect to the new account detail page.

---

## Appendix: Quick Wins List (Prioritized)

Changes that take less than half a day each and materially improve UX:

| Priority | Change | Effort | Impact |
|---|---|---|---|
| 1 | Breadcrumbs on all detail pages | 2h | Prevents navigation confusion |
| 2 | Auto-calculate Opportunity.estimatedValue from latest quote | 1h | Eliminates a field nobody maintains |
| 3 | Empty states on all list pages | 2h | System feels polished, not broken |
| 4 | Two-line column headers in quote builder (name + unit) | 1h | Prevents unit confusion — addresses deal breaker |
| 5 | Skeleton loading states on all data tables | 2h | Prevents layout shift, feels fast |
| 6 | Active filter chips below filter row | 1h | Users forget which filters are active |
| 7 | Stage stepper on opportunity detail | 3h | Gives visual progression, replaces kanban need |
| 8 | Tooltip on quote total cells showing calculation breakdown | 2h | Builds trust in the calculation engine |
| 9 | Sticky bottom action bar for bulk selection in quote builder | 2h | Core usability for the main screen |
| 10 | Role-based default landing page (reps → actions, managers → dashboard) | 1h | Right content on login, no extra clicks |
