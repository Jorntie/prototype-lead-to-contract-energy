# Product Review — Round 2: Lead-to-Contract MVP

**Reviewer:** Product Management
**Date:** 2026-03-18
**Documents Reviewed:** Updated PLAN.md, updated ANALYSIS.md, REVIEW-PRODUCT.md (Round 1), REVIEW-ENDUSER.md

---

## Resolved — Round 1 Concerns Adequately Addressed

**C1. Contract end date and current supplier (Critical).**
Fully resolved. Fields added to both Lead and Account. Lead conversion carries these values to the Account. Renewals widget on dashboard. Contract end date also added per-site (end-user driven). The renewals workflow is now coherent from first touch to pipeline planning.

**C3. No notification mechanism (Critical).**
Fully resolved. Notification table in schema, notification bell with badge count, pending approval alerts, visible on login without page refresh. The approval workflow is now demonstrable without manual explanation.

**C4. Seed data too thin (Important).**
Fully resolved. Seed data expanded to 4 users, 8-10 leads, 4-5 accounts (including one with 100+ sites), 8-12 opportunities, 3-4 quotes at different statuses, 1-2 signed contracts, activity log entries, and a pending notification. The dashboard will tell a story on first load.

**C5. Activity logging UX undefined (Important).**
Resolved. Unified activity timeline on Account detail page aggregating child entities. Auto-logging middleware in Phase 0 ensures timelines have content without relying on reps. Visual differentiation by activity type is implicit in the design.

**C6. No clone quote action (Important).**
Fully resolved. Clone quote action added to Phase 4 with explicit support for cloning to a different opportunity. `sourceQuoteId` added to schema.

**C7. "Lots" terminology (Minor).**
Fully resolved. Renamed to "Site Groups" throughout.

**C8. No quick actions / shortcut workflows (Minor).**
Resolved. "Create Quote" contextual action on opportunity detail page is explicitly called out. Lead conversion buttons are present.

---

## Partially Resolved

**C2. Quote builder UX underspecified (Critical).**
Substantially improved, but one gap remains. The plan now includes: UX design step before coding, default values visually distinct (grey vs. black), completeness bar, sort/filter within builder, margin outlier highlighting (red), bulk editing, TanStack Table for the grid. This is a strong specification.

**Remaining gap:** The default cascade logic (component type default -> site group override -> site override) is mentioned in "site group-level pricing" but the visual representation is not described. When a user looks at a cell, how do they know the value came from the site group default versus being manually entered? This matters because a user needs to know whether changing the site group value will overwrite their cell. Recommendation: use a third visual state (e.g., italic or a small icon) for "inherited from site group" values, distinct from both "system default" (grey) and "manually entered" (black).

---

## End-User Feedback Incorporation

The end-user's Top 5 requests and their resolution:

| # | End-User Request | Status | Notes |
|---|---|---|---|
| 1 | Quote builder usable at scale (bulk edit, completeness, sort/filter, margin highlighting) | **Addressed** | All four sub-items explicitly added to Phase 4. Bulk editing estimated at +0.5d. |
| 2 | Correct total price calculation (per-kWh, per-kW/month, per-meter/month) | **Addressed** | Mixed-unit calculation engine added as dedicated task in Phase 4. Flagged as deal breaker in risks table. Tested with real pricing data before demo. |
| 3 | Data export (CSV/Excel for pipeline, quotes, sites) | **Addressed** | CSV export utility added to Phase 0 as shared infrastructure. Available on all list pages from day one. |
| 4 | "My Action Items" view for reps | **Addressed** | Dedicated task in Phase 6. Defined as: leads needing follow-up, quotes expiring this week, opportunities with upcoming close dates, pending approvals. |
| 5 | Auto-log system events | **Addressed** | Auto-logging middleware added to Phase 0. System events (status changes, entity creation, conversions, approvals) logged automatically. Manual notes supplementary. |

**Additional end-user feedback incorporated:**
- Site fields expanded: peak/off-peak split, voltage level, connection type, per-site contract end date
- Pricing desk export: CSV download of site list from opportunity
- Payment terms and billing frequency on quote
- Quote status revert path (submitted back to draft)
- Margin % against configurable base components
- Pipeline filterable by rep for manager view
- Performance test with 100+ sites required

**End-user feedback NOT incorporated (acceptable deferrals):**
- Multi-year pricing breakdown (year 1/2/3 separately) — complex, not MVP
- Re-contracting from previous contract (vs. cloning a quote) — clone quote is a reasonable substitute
- Pricing desk workflow status ("awaiting pricing" on quote) — the CSV export/import path covers the data flow, even if the formal workflow state is missing
- Read-only kanban view — table with stage grouping is the chosen compromise

These deferrals are defensible. The pricing desk workflow state is the one I would watch most closely in a pilot — if reps consistently need to track "I am waiting for pricing desk to respond," a status or flag will need to be added quickly.

---

## Demo Assessment

The updated 12-step demo script is a significant improvement over Round 1's 9-step script.

**What works well:**
- Opening with "My Action Items" (as Sales Rep) before switching to the manager dashboard is smart. It grounds the demo in a rep's daily reality before zooming out to management views. This was not in Round 1's script.
- The pricing desk workflow (step 5: export site list CSV, explain handoff, import energy costs) tells the real-world story of how energy pricing actually works. This addresses the end-user's concern that the system has no concept of a pricing request.
- Step 6-7 (build quote + show margins) includes bulk editing and mixed-unit totals. These are the credibility moments for domain experts.
- Step 10 (export quote to CSV) is a small but important addition. It demonstrates data portability, which the end-user flagged as a deal breaker.
- The user-switching between rep and manager perspectives (steps 1-2 and step 8) is now explicit in the script.

**What could be tightened:**
- 12 steps in 12-15 minutes is ambitious. Steps 4-7 (multi-site account, pricing desk, build quote, margin review) are the densest part and could easily consume 8 minutes on their own. Rehearse this section specifically and have a "fast path" version where you show a pre-built quote rather than building from scratch.
- Step 11 (create contract) is low-impact relative to time spent. If the demo is running long, this is the step to compress to a single click and a sentence: "From here, we create the contract and track signing — let me show you one that is already signed."
- The demo does not mention the 100+ site account from the seed data. Consider adding a brief moment: "And here is a customer with 120 sites — notice the quote builder stays responsive." This directly addresses the end-user's deal breaker concern and takes 15 seconds.

**Overall:** The demo script now tells a coherent story from rep's morning routine through a complete deal cycle. It demonstrates domain expertise, not just CRUD operations. This is demo-ready.

---

## Adoption Risks

The four additions (CSV export, "My Action Items," auto-logging, bulk editing) directly target the four main adoption barriers the end-user identified. This is well-prioritized work.

**Remaining adoption risks:**

1. **Quote builder learning curve.** Even with good UX, a 300-cell grid is intimidating on first use. Consider adding a brief onboarding hint or empty-state message in the quote builder: "Start by setting values at the Site Group level, then override individual sites as needed." This is a tooltip, not a feature — zero development cost if done during Phase 4 UI work.

2. **Pipeline table vs. kanban.** The end-user explicitly said the table view does not match how the team thinks about deals. The "stage-grouped view with counts and values" in Phase 3 partially mitigates this, but it is worth confirming during testing whether the stage grouping provides enough visual structure. If not, a simple CSS-based card layout per stage (read-only, no drag) could be added in the testing buffer without significant effort.

3. **No offline or mobile access.** The end-user mentioned reps who visit customer sites. This is correctly deferred for MVP, but it should be on the post-MVP roadmap communication. Reps who cannot access the system on the road will maintain parallel tracking.

---

## Scope Balance

The plan has grown from the original estimate by approximately 6 days across both review rounds (+3d Round 1, +3d Round 2). The total is now 27-34 days (6-7 weeks) for a single developer.

**Is this too large?** It is at the upper boundary of acceptable. The 34-day upper estimate leaves no buffer for unexpected complexity. In practice, Phase 4 (quoting) is the risk — the 9-11 day estimate for the quote builder with all the additions (bulk editing, mixed-unit engine, completeness bar, CSV component upload with column mapping) is realistic but tight.

**If the timeline slips, cut in this order:**
1. **Quote commercial terms** (payment terms, billing frequency) — 0.25d saved. These are text fields on the quote; they can be added in a day post-MVP.
2. **Pricing desk export** — 0.25d saved. Reps can manually create a CSV of their sites. The import path is more important than the export path.
3. **Clone quote** — 0.25d saved. Important but not needed for the demo scenario. Add post-MVP.
4. **Pipeline chart** (bar/funnel) — 0.5d saved. The KPI cards and table view carry the dashboard. The chart is visual polish.

**Do not cut:** Mixed-unit calculation engine, bulk editing, completeness bar, "My Action Items," CSV export, auto-logging. These are the items that moved this plan from "adequate" to "adoptable."

---

## Missing User Stories

Two workflows that are not explicitly covered and may come up during a pilot:

1. **"Add sites to an existing opportunity."** The plan describes site selection when creating an opportunity, but not the flow for adding or removing sites from an opportunity that already has a quote. If a customer says "add 5 more sites to the deal," the rep needs to update the opportunity's site list and then update (or re-version) the quote. The plan should clarify whether this is supported and what happens to existing quote lines when the site list changes.

2. **"Compare two quotes for the same opportunity."** The plan supports versioning (v1, v2, v3) and side-by-side comparison was cut. But the more common scenario is: the rep creates two quotes with different contract durations (1-year vs. 3-year) for the same opportunity, and the customer wants to compare them. Is this supported? The schema allows multiple quotes per opportunity, but the UI flow for creating and comparing alternative quotes (not versions of the same quote) is not described.

Neither of these is a blocker for MVP, but both will surface within the first week of a pilot.

---

## Verdict

**The plan is ready for implementation.** Both rounds of review feedback have been incorporated thoughtfully. The end-user's five requests are fully addressed, and the additions are scoped tightly enough to stay within the 6-7 week timeline.

The biggest remaining risk is Phase 4 execution — the quote builder with bulk editing, mixed-unit calculations, CSV component upload, and completeness indicators is 9-11 days of dense, interdependent work. If this phase delivers, the MVP will be compelling. If it slips or ships with UX compromises, nothing else in the system compensates.

**Three things to watch during implementation:**
1. Test the quote builder with 100+ sites by the end of Phase 4, not in Phase 6. If performance is a problem, you need to know before building the proposal PDF on top of it.
2. The default cascade visualization (system default vs. site group inherited vs. manually entered) should be designed in the Phase 4 UX step. Do not leave it as an implementation-time decision.
3. Rehearse the demo script at least twice before any stakeholder presentation. The 12-step flow is strong but dense — timing and transitions need practice.

No further review rounds needed. Proceed to build.
